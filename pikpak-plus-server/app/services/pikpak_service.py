"""PikPak Service Module"""
import logging
import time
import os
import json
import asyncio
from typing import Optional, Dict, Any, Callable
from PikPakAPI import PikPakApi
from app.core.config import AppConfig

logger = logging.getLogger(__name__)

PIKPAK_CLIENT_NOT_INITIALIZED = "PikPak client not initialized"


class PikPakService:
    """Service for PikPak operations"""

    def __init__(self, username: str, password: str):
        self.client: Optional[PikPakApi] = None
        self._last_login_time: float = 0
        try:
            self.client = PikPakApi(username=username, password=password)
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

        if force_refresh:
            logger.warning(
                "Forcing PikPak login refresh - clearing persistence")
            try:
                # Clear persistence files
                for file in ["pikpak_tokens.json", "pikpak_login_state.json"]:
                    if os.path.exists(file):
                        os.remove(file)
                        logger.info(f"Removed {file}")

                # Reset client state
                self.client.access_token = None
                self.client.refresh_token = None
                self.client.encoded_token = None

            except Exception as e:
                logger.error(f"Failed to clear persistence: {e}")

        # The PikPakApi.login() method now handles persistence and rate limiting internally.
        # We can simply call it. It will skip actual login if token is valid and persisted,
        # or if we are in a cooldown period.
        try:
            await self.client.login()
            return self.client
        except Exception as e:
            logger.error(f"PikPak login failed: {e}")
            raise

    async def _execute_with_retry(self, operation: Callable, *args, **kwargs) -> Any:
        """
        Execute an operation with retry logic for 401 errors
        """
        try:
            await self.ensure_logged_in()
            return await asyncio.wait_for(operation(*args, **kwargs), timeout=AppConfig.REQUEST_TIMEOUT)
        except Exception as e:
            error_str = str(e)
            if "401" in error_str or "Unauthorized" in error_str:
                logger.warning(
                    f"Encountered 401 error: {e}. Retrying with forced login...")
                try:
                    await self.ensure_logged_in(force_refresh=True)
                    return await asyncio.wait_for(operation(*args, **kwargs), timeout=AppConfig.REQUEST_TIMEOUT)
                except Exception as retry_e:
                    logger.error(f"Retry failed after forced login: {retry_e}")
                    raise retry_e
            raise e

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
