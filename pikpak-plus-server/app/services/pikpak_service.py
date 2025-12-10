"""PikPak Service Module"""
import logging
import time
import os
import json
import asyncio
from random import uniform
from typing import Optional, Dict, Any, Callable, Tuple
from PikPakAPI import PikPakApi
from app.core.config import AppConfig
from app.core.client import get_or_create_client
from pybreaker import CircuitBreaker
from app.utils.redis_lock import get_login_lock
from app.utils.jwt_utils import is_token_expired, decode_token

logger = logging.getLogger(__name__)

PIKPAK_CLIENT_NOT_INITIALIZED = "PikPak client not initialized"

# Circuit breaker for PikPak API calls
pikpak_breaker = CircuitBreaker(
    fail_max=5,  # Open circuit after 5 consecutive failures
    reset_timeout=60,  # Keep circuit open for 60 seconds
    name="PikPakAPI"
)


class RateLimitError(Exception):
    """Raised when PikPak rate limits the login attempt."""
    pass


class PikPakService:
    """Service for PikPak operations"""

    def __init__(self, username: str, password: str):
        self.client: Optional[PikPakApi] = None
        self._last_login_time: float = 0
        self._login_lock = asyncio.Lock()
        try:
            # Use get_or_create_client which handles token management via Supabase
            self.client = get_or_create_client(
                username=username, password=password)
            logger.info("PikPak client initialized successfully")
        except Exception as e:
            logger.error(f"PikPak client init failed: {e}")

    async def ensure_logged_in(self, force_refresh: bool = False) -> PikPakApi:
        """
        Ensures the PikPak client is logged in with distributed lock coordination.

        Uses Redis-based distributed lock to prevent multiple workers from
        attempting login simultaneously.

        Args:
            force_refresh: If True, clears persistence and forces a fresh login
        """
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        login_lock = get_login_lock()

        # Step 1: Check if we already have a valid token locally
        if not force_refresh and await self._try_use_existing_token():
            # Ensure captcha token is valid before returning
            await self._ensure_valid_captcha_token()
            return self.client

        # Step 2: Check if another worker has a valid token (via Redis)
        if not force_refresh and login_lock.is_token_still_valid():
            # Reload tokens from Supabase (another worker may have updated them)
            await self._reload_tokens_from_supabase()
            if await self._try_use_existing_token():
                logger.info("Using token refreshed by another worker")
                await self._ensure_valid_captcha_token()
                return self.client

        # Step 3: Check cooldown - if a login just happened, wait and reload
        if not force_refresh and login_lock.is_in_cooldown():
            logger.info(
                "Login cooldown active, reloading tokens from Supabase")
            await self._reload_tokens_from_supabase()
            if await self._try_use_existing_token():
                await self._ensure_valid_captcha_token()
                return self.client
            # If still no valid token after cooldown reload, we need to wait or abort
            logger.warning(
                "No valid token after cooldown, waiting for lock release")
            if login_lock.is_locked():
                await login_lock.wait_for_lock_release(timeout_seconds=30)
                await self._reload_tokens_from_supabase()
                if await self._try_use_existing_token():
                    await self._ensure_valid_captcha_token()
                    return self.client

            # Still in cooldown with no token - DON'T try to login, abort and retry later
            # This is critical to prevent bypassing the rate limit cooldown
            raise RateLimitError(
                "Login cooldown active but no valid token available. "
                "Will retry after cooldown expires."
            )

        # Step 4: Try to acquire distributed lock for login
        if not login_lock.try_acquire():
            # Another worker is logging in, wait for it
            logger.info("Another worker is performing login, waiting...")
            await login_lock.wait_for_lock_release(timeout_seconds=60)

            # Reload tokens after other worker completes
            await self._reload_tokens_from_supabase()
            if await self._try_use_existing_token():
                logger.info("Using token from concurrent worker login")
                # Force fresh captcha - shared captcha may have wrong action/meta
                self.client.captcha_token = None
                self.client.captcha_expires_at = None
                self.client.captcha_tokens = {}  # Clear action-specific captcha tokens
                await self._ensure_valid_captcha_token()
                return self.client

            # If still no valid token, try to acquire lock again
            if not login_lock.try_acquire():
                raise RuntimeError(
                    "Failed to acquire login lock after waiting")

        try:
            # Step 5: Acquire local lock to prevent concurrent async calls within this process
            async with self._login_lock:
                # Double-check after acquiring lock
                if not force_refresh and await self._try_use_existing_token():
                    logger.debug(
                        "Token refreshed while waiting for local lock")
                    await self._ensure_valid_captcha_token()
                    return self.client

                # Clear persistence if forcing refresh
                if force_refresh:
                    self._clear_persistence()

                # Perform full login
                client = await self._perform_login()

                # Record successful login in Redis
                login_lock.set_login_completed()

                # Record token expiration in Redis for other workers
                if self.client.access_token:
                    decoded = decode_token(self.client.access_token)
                    if decoded and decoded.get('exp'):
                        login_lock.set_token_valid_until(float(decoded['exp']))

                return client
        finally:
            # Always release the distributed lock
            login_lock.release()

    async def _reload_tokens_from_supabase(self) -> None:
        """Reload tokens from Supabase into the client."""
        try:
            from app.core.token_manager import get_token_manager
            token_mgr = get_token_manager()
            tokens = token_mgr.get_all_tokens()

            if tokens.get('access_token'):
                self.client.access_token = tokens['access_token']
                self.client.refresh_token = tokens.get('refresh_token')

                # Load user_id from Supabase (or extract from JWT)
                if tokens.get('user_id'):
                    self.client.user_id = tokens['user_id']
                else:
                    self._extract_user_id_from_token()

                # Note: Captcha tokens are managed locally (short-lived, ~5 mins)
                # No need to persist/reload from Supabase

                logger.debug("Reloaded tokens from Supabase")
        except Exception as e:
            logger.warning(f"Failed to reload tokens from Supabase: {e}")

    async def _ensure_valid_captcha_token(self, action: str = "GET:/drive/v1/about") -> None:
        """
        Ensure client has a valid captcha token before API calls.

        PikPak requires x-captcha-token header for all API requests.
        This token is generated via captcha_init and has a short expiry.

        Args:
            action: The specific action for which captcha is needed
        """
        import time

        # Check if we have a valid captcha token for this specific action
        if action in self.client.captcha_tokens:
            captcha_info = self.client.captcha_tokens[action]
            if captcha_info['expires_at'] and time.time() < (captcha_info['expires_at'] - 30):
                logger.debug(f"Captcha token is valid for action: {action}")
                return

        logger.info(
            f"Captcha token missing or expired for action: {action}, generating new one...")
        try:
            # Ensure user_id is set before generating captcha
            self._extract_user_id_from_token()

            # Generate a new captcha token for the specific action
            await self.client._get_valid_captcha_token(action=action)
            logger.info(
                f"Captcha token generated successfully for action: {action}")
        except Exception as e:
            logger.error(
                f"Failed to generate captcha token for action {action}: {e}")
            raise

    def _extract_user_id_from_token(self) -> None:
        """
        Extract user_id from access token JWT.

        The 'sub' claim in the JWT contains the user_id, which is required
        for captcha_init meta. Without this, captcha tokens will be invalid.
        """
        if not self.client.access_token:
            return

        # Skip if user_id is already set
        if self.client.user_id:
            return

        try:
            decoded = decode_token(self.client.access_token)
            if decoded and decoded.get('sub'):
                self.client.user_id = decoded['sub']
                logger.debug(
                    f"Extracted user_id from JWT: {self.client.user_id}")
        except Exception as e:
            logger.warning(f"Failed to extract user_id from token: {e}")

    async def _try_use_existing_token(self) -> bool:
        """
        Try to use existing access token or refresh it if needed.
        Returns True if client is ready to use, False otherwise.
        """
        if not self.client.access_token:
            return False

        from app.utils.jwt_utils import is_token_expired

        # Check if access token (JWT) is expired or expiring soon (within 5 minutes)
        if not is_token_expired(self.client.access_token, buffer_seconds=300):
            # Extract user_id if not already set (required for captcha_init)
            self._extract_user_id_from_token()
            logger.debug("Client has valid access token, skipping login")
            return True

        logger.info(
            "Access token expired or expiring soon, checking refresh token...")

        if not self.client.refresh_token:
            logger.info("No refresh token available, will attempt login")
            return False

        logger.info("Refresh token exists, attempting proactive refresh")
        try:
            await self.refresh_token_if_needed()
            return True
        except Exception as e:
            logger.warning(
                f"Proactive refresh failed: {e}, will attempt login")
            return False

    def _clear_persistence(self) -> None:
        """Clear all persisted tokens and state"""
        logger.warning("Forcing PikPak login refresh - clearing persistence")
        try:
            # Clear TokenManager
            from app.core.token_manager import get_token_manager
            token_mgr = get_token_manager()
            token_mgr.clear_tokens()

            # Reset client state
            self.client.access_token = None
            self.client.refresh_token = None
            self.client.encoded_token = None
            self.client.captcha_token = None
            self.client.captcha_expires_at = None
            self.client.captcha_tokens = {}  # Clear action-specific captcha tokens
            self.client.user_id = None

        except Exception as e:
            logger.error(f"Failed to clear persistence: {e}")

    async def _perform_login(self) -> PikPakApi:
        """Perform full login and save tokens"""
        try:
            logger.info("Performing PikPak login...")
            await self.client.login()

            # Save new tokens to Supabase (access, refresh, user_id)
            # Note: Captcha tokens are managed locally (short-lived, ~5 mins)
            from app.core.token_manager import get_token_manager
            token_mgr = get_token_manager()

            token_mgr.set_tokens(
                access_token=self.client.access_token,
                refresh_token=self.client.refresh_token,
                user_id=self.client.user_id
            )
            logger.info("Updated tokens in Supabase after login")

            return self.client
        except Exception as e:
            error_msg = str(e).lower()
            logger.error(f"PikPak login failed: {e}")

            # If rate limited, set a global cooldown to stop ALL workers
            if "too frequent" in error_msg or "rate limit" in error_msg:
                from app.utils.redis_lock import get_login_lock
                login_lock = get_login_lock()
                login_lock.set_rate_limit_cooldown()

                # Raise a specific error that should NOT be retried immediately
                raise RateLimitError(str(e)) from e

            raise

    async def refresh_token_if_needed(self):
        """
        Refresh the access token if it's expired
        Called when API operations fail with auth errors
        """
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        try:
            logger.info("Attempting to refresh access token...")
            await self.client.refresh_access_token()

            # Save refreshed tokens to Supabase
            from app.core.token_manager import get_token_manager
            token_mgr = get_token_manager()
            token_mgr.set_tokens(
                access_token=self.client.access_token,
                refresh_token=self.client.refresh_token
            )
            logger.info("Successfully refreshed and saved tokens to Supabase")

        except Exception as e:
            logger.warning(
                f"Token refresh failed: {e}, attempting full login...")
            # If refresh fails, try full login
            await self.ensure_logged_in(force_refresh=True)

    async def _execute_protected(self, operation: Callable, *args, **kwargs) -> Any:
        """Execute operation with circuit breaker and timeout protection"""
        @pikpak_breaker
        async def protected_operation():
            return await asyncio.wait_for(operation(*args, **kwargs), timeout=AppConfig.REQUEST_TIMEOUT)
        return await protected_operation()

    def _is_auth_error(self, error_str: str) -> bool:
        """Check if error is related to authentication"""
        return (
            "Verification code is invalid" in error_str or
            "invalid" in error_str.lower() or
            "401" in error_str or
            "Unauthorized" in error_str
        )

    async def _try_recover_auth(self, operation: Callable, *args, **kwargs) -> Tuple[bool, Any, Optional[Exception]]:
        """
        Attempts to recover from auth error.
        Returns: (success, result, exception_if_failed)
        """
        logger.warning("Auth error encountered. Force refreshing login...")
        try:
            await self.ensure_logged_in(force_refresh=True)
            return True, await self._execute_protected(operation, *args, **kwargs), None
        except Exception as e:
            return False, None, e

    async def _handle_attempt_exception(self, e: Exception, attempt: int, max_retries: int, operation, *args, **kwargs) -> Tuple[bool, Any, str]:
        error_str = str(e)
        is_last_attempt = (attempt == max_retries - 1)

        if self._is_auth_error(error_str):
            success, result, retry_exc = await self._try_recover_auth(operation, *args, **kwargs)
            if success:
                return True, result, ""

            if is_last_attempt:
                logger.error(f"Retry failed after forced login: {retry_exc}")
                raise retry_exc

            error_str = str(retry_exc)

        elif is_last_attempt:
            raise e

        return False, None, error_str

    async def _execute_with_retry(self, operation: Callable, *args, max_retries: int = 3, **kwargs) -> Any:
        """
        Execute an operation with exponential backoff retry logic and circuit breaker protection

        Args:
            operation: The async operation to execute
            max_retries: Maximum number of retry attempts (default: 3)
            *args, **kwargs: Arguments to pass to the operation
        """
        base_delay = 1.0
        max_delay = 60.0

        for attempt in range(max_retries):
            try:
                await self.ensure_logged_in()
                return await self._execute_protected(operation, *args, **kwargs)

            except Exception as e:
                should_return, result, error_str = await self._handle_attempt_exception(e, attempt, max_retries, operation, *args, **kwargs)
                if should_return:
                    return result

                # Calculate backoff
                if "operation is too frequent" in str(e).lower() or "too frequent" in error_str.lower():
                    delay = 30.0  # Force 30s delay for rate limits
                    logger.warning("Rate limit detected, backing off for 30s")
                else:
                    # Exponential backoff with jitter
                    delay = min(base_delay * (2 ** attempt), max_delay)
                jitter = uniform(0, delay * 0.1)
                total_delay = delay + jitter

                logger.warning(
                    f"Attempt {attempt + 1}/{max_retries} failed: {error_str}. "
                    f"Retrying in {total_delay:.2f}s..."
                )
                await asyncio.sleep(total_delay)

    async def add_download(self, url: str) -> dict:
        """Add a download to PikPak with retry logic"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        async def _do_add():
            result = await self.client.offline_download(url)
            logger.info(f"PikPak Task Result for {url}: {result}")
            return result

        return await self._execute_with_retry(_do_add)

    async def get_webdav_applications(self) -> dict:
        """Get WebDAV configuration and application list"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        async def _do_get_apps():
            result = await self.client.get_webdav_applications()
            logger.info("Retrieved WebDAV applications successfully")
            return result

        return await self._execute_with_retry(_do_get_apps)

    async def toggle_webdav(self, enable: bool) -> dict:
        """Toggle WebDAV status"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        async def _do_toggle():
            result = await self.client.toggle_webdav(enable)
            logger.info(
                f"WebDAV toggled to {'enabled' if enable else 'disabled'}")
            return result

        return await self._execute_with_retry(_do_toggle)

    async def create_webdav_application(self, application_name: str) -> dict:
        """Create a new WebDAV application"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        async def _do_create():
            result = await self.client.create_webdav_application(application_name)
            logger.info(f"Created WebDAV application: {application_name}")
            return result

        return await self._execute_with_retry(_do_create)

    async def delete_webdav_application(self, username: str, password: str) -> dict:
        """Delete a WebDAV application"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        async def _do_delete():
            result = await self.client.delete_webdav_application(username, password)
            logger.info(f"Deleted WebDAV application: {username}")
            return result

        return await self._execute_with_retry(_do_delete)

    async def modify_webdav_application(self, username: str, password: str, modify_props: Dict[str, Any]) -> dict:
        """Modify WebDAV application properties"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        async def _do_modify():
            result = await self.client.modify_webdav_application(username, password, modify_props)
            logger.info(
                f"Modified WebDAV application: {username} with props: {modify_props}")
            return result

        return await self._execute_with_retry(_do_modify)

    async def get_offline_tasks(self) -> dict:
        """Get all offline download tasks from PikPak"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        async def _do_get_tasks():
            # Get all tasks (running, error, complete, pending)
            result = await self.client.offline_list(
                size=10000,
                phase=["PHASE_TYPE_RUNNING", "PHASE_TYPE_ERROR",
                       "PHASE_TYPE_COMPLETE", "PHASE_TYPE_PENDING"]
            )
            logger.info(
                f"Retrieved {len(result.get('tasks', []))} offline tasks from PikPak")
            return result

        return await self._execute_with_retry(_do_get_tasks)

    async def get_quota_info(self) -> dict:
        """Get storage quota information from PikPak"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        async def _do_get_quota():
            result = await self.client.get_quota_info()
            logger.info("Retrieved quota info from PikPak")
            return result

        return await self._execute_with_retry(_do_get_quota)

    async def get_transfer_quota(self) -> dict:
        """Get transfer quota information from PikPak"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        async def _do_get_transfer_quota():
            result = await self.client.get_transfer_quota()
            logger.info("Retrieved transfer quota from PikPak")
            return result

        return await self._execute_with_retry(_do_get_transfer_quota)

    async def create_share(self, file_ids: list, need_password: bool = False, expiration_days: int = -1) -> dict:
        """Create a share link for files"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        async def _do_create_share():
            result = await self.client.file_batch_share(
                ids=file_ids,
                need_password=need_password,
                expiration_days=expiration_days
            )
            logger.info(f"Created share link for {len(file_ids)} file(s)")
            return result

        return await self._execute_with_retry(_do_create_share)
