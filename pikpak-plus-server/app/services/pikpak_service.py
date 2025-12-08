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

logger = logging.getLogger(__name__)

PIKPAK_CLIENT_NOT_INITIALIZED = "PikPak client not initialized"

# Circuit breaker for PikPak API calls
pikpak_breaker = CircuitBreaker(
    fail_max=5,  # Open circuit after 5 consecutive failures
    reset_timeout=60,  # Keep circuit open for 60 seconds
    name="PikPakAPI"
)


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
        Ensures the PikPak client is logged in

        Args:
            force_refresh: If True, clears persistence and forces a fresh login
        """
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        # Try to use existing token if not forcing refresh
        if not force_refresh and await self._try_use_existing_token():
            return self.client

        # Acquire lock to prevent concurrent login attempts
        async with self._login_lock:
            # Double-check: maybe another thread logged in while we were waiting
            if not force_refresh and await self._try_use_existing_token():
                logger.debug(
                    "Token refreshed by another thread while waiting for lock")
                return self.client

            # Clear persistence if forcing refresh
            if force_refresh:
                self._clear_persistence()

            # Perform full login
            return await self._perform_login()

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

        except Exception as e:
            logger.error(f"Failed to clear persistence: {e}")

    async def _perform_login(self) -> PikPakApi:
        """Perform full login and save tokens"""
        try:
            await self.client.login()

            # Save new tokens to Supabase
            from app.core.token_manager import get_token_manager
            token_mgr = get_token_manager()
            token_mgr.set_tokens(
                access_token=self.client.access_token,
                refresh_token=self.client.refresh_token
            )
            logger.info("Updated tokens in Supabase after login")

            return self.client
        except Exception as e:
            logger.error(f"PikPak login failed: {e}")
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
