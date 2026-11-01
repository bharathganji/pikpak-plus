"""PikPak Service Module"""

import asyncio
import logging
import time
from collections.abc import Callable
from random import uniform
from types import TracebackType
from typing import Any, Self

from PikPakAPI import PikPakApi
from pybreaker import CircuitBreaker

from app.core.client import get_or_create_client
from app.core.config import AppConfig
from app.utils.jwt_utils import decode_token, is_token_expired
from app.utils.redis_lock import get_login_lock

logger = logging.getLogger(__name__)

PIKPAK_CLIENT_NOT_INITIALIZED = "PikPak client not initialized"

# Circuit breaker for PikPak API calls
pikpak_breaker = CircuitBreaker(
    fail_max=5,  # Open circuit after 5 consecutive failures
    reset_timeout=60,  # Keep circuit open for 60 seconds
    name="PikPakAPI",
)


class RateLimitError(Exception):
    """Raised when PikPak rate limits the login attempt."""


class PikPakService:
    """Service for PikPak operations"""

    def _get_client(self) -> PikPakApi:
        """Helper to get a non-null PikPakApi client instance."""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)
        return self.client

    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.client: PikPakApi | None = None
        self._last_login_time: float = 0
        self._login_lock = asyncio.Lock()
        try:
            # Use get_or_create_client which handles token management via Supabase
            self.client = get_or_create_client(username=username, password=password)
            logger.info("PikPak client initialized successfully")
        except Exception as e:  # noqa: BLE001
            logger.error(f"PikPak client init failed: {e}")

    async def aclose(self) -> None:
        """Gracefully close the underlying PikPakApi HTTPX client session."""
        if self.client and hasattr(self.client, "aclose"):
            client = self.client
            await client.aclose()
            logger.debug("Closed PikPakApi HTTP client session")

    def close(self) -> None:
        """Synchronous close helper for non-async cleanup."""
        if self.client and not getattr(self.client, "_is_closed", False):
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(self.client.aclose())
                else:
                    loop.run_until_complete(self.client.aclose())
            except Exception as e:  # noqa: BLE001
                logger.debug(f"Ignored error during synchronous close: {e}")

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        await self.aclose()

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

        client = self._get_client()
        login_lock = get_login_lock()

        # Step 1: Check if we already have a valid token locally
        if not force_refresh and await self._try_use_existing_token():
            # Ensure captcha token is valid before returning
            await self._ensure_valid_captcha_token()
            return client

        # Step 2: Check if another worker has a valid token (via Redis)
        if not force_refresh and login_lock.is_token_still_valid():
            # Reload tokens from Supabase (another worker may have updated them)
            await self._reload_tokens_from_supabase()
            if await self._try_use_existing_token():
                logger.info("Using token refreshed by another worker")
                await self._ensure_valid_captcha_token()
                return client

        # Step 3: Check cooldown - if a login just happened, wait and reload
        if not force_refresh and login_lock.is_in_cooldown():
            logger.info("Login cooldown active, reloading tokens from Supabase")
            await self._reload_tokens_from_supabase()
            if await self._try_use_existing_token():
                await self._ensure_valid_captcha_token()
                return client
            # If still no valid token after cooldown reload, we need to wait or abort
            logger.warning("No valid token after cooldown, waiting for lock release")
            if login_lock.is_locked():
                await login_lock.wait_for_lock_release(timeout_seconds=30)
                await self._reload_tokens_from_supabase()
                if await self._try_use_existing_token():
                    await self._ensure_valid_captcha_token()
                    return client

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
                return client

            # If still no valid token, try to acquire lock again
            if not login_lock.try_acquire():
                raise RuntimeError("Failed to acquire login lock after waiting")

        try:
            # Step 5: Acquire local lock to prevent concurrent async calls within this process
            async with self._login_lock:
                # Double-check after acquiring lock
                if not force_refresh and await self._try_use_existing_token():
                    logger.debug("Token refreshed while waiting for local lock")
                    await self._ensure_valid_captcha_token()
                    return client

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
                    if decoded and decoded.get("exp"):
                        login_lock.set_token_valid_until(float(decoded["exp"]))

                return client
        finally:
            # Always release the distributed lock
            login_lock.release()

    async def _reload_tokens_from_supabase(self) -> None:
        """Reload tokens from Supabase into the client and synchronize expiration state."""
        if not self.client:
            return
        client = self.client
        try:
            from app.core.token_manager import get_token_manager

            token_mgr = get_token_manager()
            tokens = token_mgr.get_all_tokens()

            if tokens.get("access_token"):
                client.access_token = tokens["access_token"]
                client.refresh_token = tokens.get("refresh_token")

                # Load user_id from Supabase (or extract from JWT)
                if tokens.get("user_id"):
                    client.user_id = tokens["user_id"]
                else:
                    self._extract_user_id_from_token()

                # Synchronize expires_at so ensure_authenticated recognizes token validity
                if hasattr(client, "_extract_exp_from_jwt"):
                    try:
                        raw_tok = client.access_token
                        if isinstance(raw_tok, str):
                            client.expires_at = client._extract_exp_from_jwt(raw_tok)
                    except Exception as e:  # noqa: BLE001
                        logger.debug(f"Failed to extract exp from JWT: {e}")
                elif tokens.get("access_token_expires_at"):
                    try:
                        from datetime import datetime

                        iso_exp = tokens["access_token_expires_at"]
                        if isinstance(iso_exp, str):
                            dt = datetime.fromisoformat(iso_exp)
                            client.expires_at = dt.timestamp()
                        elif isinstance(iso_exp, (int, float)):
                            client.expires_at = float(iso_exp)
                    except (ValueError, TypeError, OverflowError) as exp_err:
                        logger.debug(
                            f"Could not parse access_token_expires_at: {exp_err}"
                        )

                if hasattr(client, "encode_token"):
                    try:
                        client.encode_token()
                    except (AttributeError, TypeError) as enc_err:
                        logger.debug(f"encode_token skipped: {enc_err}")

                logger.debug("Reloaded and synchronized tokens from Supabase")
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Failed to reload tokens from Supabase: {e}")

    async def _ensure_valid_captcha_token(
        self, action: str = "GET:/drive/v1/about"
    ) -> None:
        """
        Ensure client has a valid captcha token before API calls.

        PikPak requires x-captcha-token header for all API requests.
        This token is generated via captcha_init and has a short expiry.

        Args:
            action: The specific action for which captcha is needed
        """

        if not self.client:
            return
        client = self.client
        # Check if we have a valid captcha token for this specific action
        if action in client.captcha_tokens:
            captcha_info = client.captcha_tokens[action]
            if captcha_info["expires_at"] and time.time() < (
                captcha_info["expires_at"] - 30
            ):
                logger.debug(f"Captcha token is valid for action: {action}")
                return

        logger.info(
            f"Captcha token missing or expired for action: {action}, generating new one..."
        )
        try:
            # Ensure user_id is set before generating captcha
            self._extract_user_id_from_token()

            # Generate a new captcha token for the specific action
            await client._get_valid_captcha_token(action=action)
            logger.info(f"Captcha token generated successfully for action: {action}")
        except Exception as e:
            logger.error(f"Failed to generate captcha token for action {action}: {e}")
            raise

    def _extract_user_id_from_token(self) -> None:
        """
        Extract user_id from access token JWT.

        The 'sub' claim in the JWT contains the user_id, which is required
        for captcha_init meta. Without this, captcha tokens will be invalid.
        """
        if not self.client:
            return
        client = self.client
        if not client.access_token or client.user_id:
            return

        try:
            decoded = decode_token(client.access_token)
            if decoded and decoded.get("sub"):
                client.user_id = str(decoded["sub"])
                logger.debug(f"Extracted user_id from JWT: {client.user_id}")
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Failed to extract user_id from token: {e}")

    async def _try_use_existing_token(self) -> bool:
        """
        Try to use existing access token or refresh it if needed.
        Returns True if client is ready to use, False otherwise.
        """
        if not self.client:
            return False
        client = self.client
        if not client.access_token:
            return False

        # Check if access token (JWT) is expired or expiring soon (within 5 minutes)
        if not is_token_expired(client.access_token, buffer_seconds=300):
            # Extract user_id if not already set (required for captcha_init)
            self._extract_user_id_from_token()
            logger.debug("Client has valid access token, skipping login")
            return True

        logger.info("Access token expired or expiring soon, checking refresh token...")

        if not client.refresh_token:
            logger.info("No refresh token available, will attempt login")
            return False

        logger.info("Refresh token exists, attempting proactive refresh")
        try:
            await self.refresh_token_if_needed()
            return True
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Proactive refresh failed: {e}, will attempt login")
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
            if self.client:
                client = self.client
                client.access_token = None
                client.refresh_token = None
                client.encoded_token = None
                client.captcha_token = None
                client.captcha_expires_at = None
                client.captcha_tokens = {}
                client.user_id = None

        except Exception as e:  # noqa: BLE001
            logger.error(f"Failed to clear persistence: {e}")

    async def _perform_login(self) -> PikPakApi:
        """Perform full login and save tokens"""
        client = self._get_client()
        try:
            logger.info("Performing PikPak login...")
            await client.login()

            from app.core.token_manager import get_token_manager

            token_mgr = get_token_manager()

            token_mgr.set_tokens(
                access_token=client.access_token,
                refresh_token=client.refresh_token,
                user_id=client.user_id,
            )
            logger.info("Updated tokens in Supabase after login")

            return client
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
        client = self._get_client()

        try:
            logger.info("Attempting to refresh access token...")
            await client.refresh_access_token()

            # Save refreshed tokens to Supabase
            from app.core.token_manager import get_token_manager

            token_mgr = get_token_manager()
            token_mgr.set_tokens(
                access_token=client.access_token, refresh_token=client.refresh_token
            )
            logger.info("Successfully refreshed and saved tokens to Supabase")

        except Exception as e:  # noqa: BLE001
            logger.warning(f"Token refresh failed: {e}, attempting full login...")
            # If refresh fails, try full login
            await self.ensure_logged_in(force_refresh=True)

    async def _execute_protected(self, operation: Callable, *args, **kwargs) -> Any:
        """Execute operation with circuit breaker and timeout protection"""

        @pikpak_breaker
        async def protected_operation():
            return await asyncio.wait_for(
                operation(*args, **kwargs), timeout=AppConfig.REQUEST_TIMEOUT
            )

        return await protected_operation()

    def _is_auth_error(self, error_str: str) -> bool:
        """Check if error is related to authentication"""
        return (
            "Verification code is invalid" in error_str
            or "invalid" in error_str.lower()
            or "401" in error_str
            or "Unauthorized" in error_str
        )

    async def _try_recover_auth(
        self, operation: Callable, *args, **kwargs
    ) -> tuple[bool, Any, Exception | None]:
        """
        Attempts to recover from auth error.
        Returns: (success, result, exception_if_failed)
        """
        logger.warning("Auth error encountered. Force refreshing login...")
        try:
            await self.ensure_logged_in(force_refresh=True)
            return True, await self._execute_protected(operation, *args, **kwargs), None
        except Exception as e:  # noqa: BLE001
            return False, None, e

    async def _handle_attempt_exception(
        self, e: Exception, attempt: int, max_retries: int, operation, *args, **kwargs
    ) -> tuple[bool, Any, str]:
        error_str = str(e)
        is_last_attempt = attempt == max_retries - 1

        if self._is_auth_error(error_str):
            success, result, retry_exc = await self._try_recover_auth(
                operation, *args, **kwargs
            )
            if success:
                return True, result, ""

            if is_last_attempt:
                logger.error(f"Retry failed after forced login: {retry_exc}")
                if retry_exc:
                    raise retry_exc
                raise e

            error_str = str(retry_exc)

        elif is_last_attempt:
            raise e

        return False, None, error_str

    async def _execute_with_retry(
        self, operation: Callable, *args, max_retries: int = 3, **kwargs
    ) -> Any:
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

            except Exception as e:  # noqa: BLE001
                should_return, result, error_str = await self._handle_attempt_exception(
                    e, attempt, max_retries, operation, *args, **kwargs
                )
                if should_return:
                    return result

                # Calculate backoff
                if (
                    "operation is too frequent" in str(e).lower()
                    or "too frequent" in error_str.lower()
                ):
                    delay = 30.0  # Force 30s delay for rate limits
                    logger.warning("Rate limit detected, backing off for 30s")
                else:
                    # Exponential backoff with jitter
                    delay = min(base_delay * (2**attempt), max_delay)
                jitter = uniform(0, delay * 0.1)
                total_delay = delay + jitter

                logger.warning(
                    f"Attempt {attempt + 1}/{max_retries} failed: {error_str}. "
                    f"Retrying in {total_delay:.2f}s..."
                )
                await asyncio.sleep(total_delay)

    async def add_download(self, url: str) -> dict:
        """Add a download to PikPak with retry logic"""
        client = self._get_client()

        async def _do_add():
            result = await client.offline_download(url)
            logger.info(f"PikPak Task Result for {url}: {result}")
            return result

        return await self._execute_with_retry(_do_add)

    async def get_webdav_applications(self) -> dict:
        """Get WebDAV configuration and application list"""
        client = self._get_client()

        async def _do_get_apps():
            result = await client.get_webdav_applications()
            logger.info("Retrieved WebDAV applications successfully")
            return result

        return await self._execute_with_retry(_do_get_apps)

    async def toggle_webdav(self, enable: bool) -> dict:
        """Toggle WebDAV status"""
        client = self._get_client()

        async def _do_toggle():
            result = await client.toggle_webdav(enable)
            logger.info(f"WebDAV toggled to {'enabled' if enable else 'disabled'}")
            return result

        return await self._execute_with_retry(_do_toggle)

    async def create_webdav_application(self, application_name: str) -> dict:
        """Create a new WebDAV application"""
        client = self._get_client()

        async def _do_create():
            result = await client.create_webdav_application(application_name)
            logger.info(f"Created WebDAV application: {application_name}")
            return result

        return await self._execute_with_retry(_do_create)

    async def delete_webdav_application(self, username: str, password: str) -> dict:
        """Delete a WebDAV application"""
        client = self._get_client()

        async def _do_delete():
            result = await client.delete_webdav_application(username, password)
            logger.info(f"Deleted WebDAV application: {username}")
            return result

        return await self._execute_with_retry(_do_delete)

    async def modify_webdav_application(
        self, username: str, password: str, modify_props: dict[str, Any]
    ) -> dict:
        """Modify WebDAV application properties"""
        client = self._get_client()

        async def _do_modify():
            result = await client.modify_webdav_application(
                username, password, modify_props
            )
            logger.info(
                f"Modified WebDAV application: {username} with props: {modify_props}"
            )
            return result

        return await self._execute_with_retry(_do_modify)

    async def get_offline_tasks(self) -> dict:
        """Get all offline download tasks from PikPak"""
        client = self._get_client()

        async def _do_get_tasks():
            # Get all tasks (running, error, complete, pending)
            result = await client.offline_list(
                size=10000,
                phase=[
                    "PHASE_TYPE_RUNNING",
                    "PHASE_TYPE_ERROR",
                    "PHASE_TYPE_COMPLETE",
                    "PHASE_TYPE_PENDING",
                ],
            )
            logger.info(
                f"Retrieved {len(result.get('tasks', []))} offline tasks from PikPak"
            )
            return result

        return await self._execute_with_retry(_do_get_tasks)

    async def get_quota_info(self) -> dict:
        """Get storage quota information from PikPak"""
        client = self._get_client()

        async def _do_get_quota():
            result = await client.get_quota_info()
            logger.info("Retrieved quota info from PikPak")
            return result

        return await self._execute_with_retry(_do_get_quota)

    async def get_transfer_quota(self) -> dict:
        """Get transfer quota information from PikPak"""
        client = self._get_client()

        async def _do_get_transfer_quota():
            result = await client.get_transfer_quota()
            logger.info("Retrieved transfer quota from PikPak")
            return result

        return await self._execute_with_retry(_do_get_transfer_quota)

    async def create_share(
        self, file_ids: list, need_password: bool = False, expiration_days: int = -1
    ) -> dict:
        """Create a share link for files"""
        client = self._get_client()

        async def _do_create_share():
            result = await client.file_batch_share(
                ids=file_ids,
                need_password=need_password,
                expiration_days=expiration_days,
            )
            logger.info(f"Created share link for {len(file_ids)} file(s)")
            return result

        return await self._execute_with_retry(_do_create_share)

    async def delete_task(self, task_id: str, delete_files: bool = False):
        """Delete a task from PikPak"""
        client = self._get_client()

        async def _do_delete():

            await client.delete_tasks([task_id], delete_files=delete_files)
            logger.info(f"Deleted PikPak task: {task_id}")

        await self._execute_with_retry(_do_delete)

    async def delete_file_forever(self, file_id: str):
        """Delete a file permanently from PikPak"""
        client = self._get_client()

        async def _do_delete():

            await client.delete_forever([file_id])
            logger.info(f"Deleted PikPak file permanently: {file_id}")

        await self._execute_with_retry(_do_delete)

    async def vip_info(self) -> dict:
        """Get VIP status and privilege information from PikPak."""
        client = self._get_client()

        async def _do_vip():

            return await client.vip_info()

        return await self._execute_with_retry(_do_vip)

    async def list_files(
        self,
        size: int = 100,
        parent_id: str | None = None,
        next_page_token: str | None = None,
        kind: str | None = None,
    ) -> dict:
        """List files and folders in directory."""
        client = self._get_client()

        async def _do_list():

            return await client.file_list(
                size=size,
                parent_id=parent_id,
                next_page_token=next_page_token,
                kind=kind,
            )

        return await self._execute_with_retry(_do_list)

    async def get_file(
        self, file_id: str, url_type: str = "all", raw: bool = False
    ) -> dict:
        """Get detailed metadata and download URLs for a file."""
        client = self._get_client()

        async def _do_get():

            return await client.get_file(file_id=file_id, url_type=url_type, raw=raw)

        return await self._execute_with_retry(_do_get)

    async def create_folder(self, name: str, parent_id: str | None = None) -> dict:
        """Create a new folder."""
        client = self._get_client()

        async def _do_mkdir():

            return await client.create_folder(name=name, parent_id=parent_id)

        return await self._execute_with_retry(_do_mkdir)

    async def delete_to_trash(self, ids: list) -> dict:
        """Move files or folders to trash."""
        client = self._get_client()

        async def _do_trash():

            return await client.delete_to_trash(ids=ids)

        return await self._execute_with_retry(_do_trash)

    async def get_share_info(
        self, share_link_or_id: str, pass_code: str | None = None
    ) -> dict:
        """Get share link metadata and contents."""
        client = self._get_client()

        async def _do_get_share():

            return await client.get_share_info(
                share_link_or_id=share_link_or_id, pass_code=pass_code
            )

        return await self._execute_with_retry(_do_get_share)

    async def restore_share(
        self,
        share_id: str,
        file_ids: list | None = None,
        to_parent_id: str | None = None,
        password: str | None = None,
    ) -> dict:
        """Restore shared files to drive."""
        client = self._get_client()

        async def _do_restore():

            return await client.restore(
                share_id=share_id,
                file_ids=file_ids,
                to_parent_id=to_parent_id,
                password=password,
            )

        return await self._execute_with_retry(_do_restore)

    async def list_shares(
        self, limit: int = 20, next_page_token: str | None = None
    ) -> dict:
        """List active shares created by user."""
        client = self._get_client()

        async def _do_list_shares():

            return await client.share_list(limit=limit, next_page_token=next_page_token)

        return await self._execute_with_retry(_do_list_shares)

    async def delete_share(self, share_id: str) -> None:
        """Delete/revoke a share link."""
        client = self._get_client()

        async def _do_delete_share():

            return await client.share_batch_delete(share_id)

        return await self._execute_with_retry(_do_delete_share)
