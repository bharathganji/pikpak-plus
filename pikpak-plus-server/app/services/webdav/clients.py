"""WebDAV Client Manager"""
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Any

from app.core.config import AppConfig
from .constants import PLANET_NAMES, PLANET_EMOJIS

logger = logging.getLogger(__name__)


class ClientManager:
    """Manages WebDAV client lifecycle"""

    def __init__(self, pikpak_service, traffic_checker, ttl_hours: int = 24, cache_manager=None):
        self.pikpak_service = pikpak_service
        self.traffic_checker = traffic_checker
        self.ttl_hours = ttl_hours
        self.cache_manager = cache_manager
        self.active_clients: List[Dict[str, Any]] = []
        self.creation_timestamp: Optional[datetime] = None

    def is_client_refresh_needed(self) -> bool:
        """
        Check if WebDAV clients need to be refreshed based on TTL

        Returns:
            bool: True if clients need to be refreshed, False otherwise
        """
        if self.creation_timestamp is None:
            # No clients have been created yet
            return True

        # Check if the time since creation exceeds the TTL (in hours)
        elapsed_time = datetime.now(timezone.utc) - self.creation_timestamp
        return elapsed_time.total_seconds() > (self.ttl_hours * 3600)

    async def create_daily_webdav_clients(self) -> Dict[str, Any]:
        """
        Create 8 WebDAV clients with planet names, delete old ones

        Returns:
            dict: Result with created clients or error message
        """
        try:
            # Check if downstream traffic is available
            if not await self.traffic_checker.is_downstream_traffic_available():
                logger.warning(
                    "Downstream traffic exhausted, skipping WebDAV client creation")
                return {
                    "success": False,
                    "message": "Downstream traffic quota exhausted",
                    "clients": []
                }

            # Clean up old clients first
            await self.cleanup_expired_clients()

            created_clients = []
            server_url = "https://dav.mypikpak.com"

            # Create 8 clients with planet names
            for planet_name in PLANET_NAMES:
                try:
                    # Create WebDAV application
                    result = await self.pikpak_service.create_webdav_application(planet_name)

                    # Extract credentials from result
                    username = result.get('username', '')
                    password = result.get('password', '')

                    # Build client info
                    created_at = datetime.now(timezone.utc)
                    expires_at = created_at + timedelta(hours=self.ttl_hours)

                    client_info = {
                        "planetName": planet_name,
                        "planetEmoji": PLANET_EMOJIS.get(planet_name, "🪐"),
                        "username": username,
                        "password": password,
                        "serverUrl": server_url,
                        "createdAt": created_at.isoformat() + "Z",
                        "expiresAt": expires_at.isoformat() + "Z",
                        "ttlHours": self.ttl_hours
                    }

                    created_clients.append(client_info)
                    logger.info(f"Created WebDAV client: {planet_name}")

                except Exception as e:
                    logger.error(
                        f"Failed to create WebDAV client for {planet_name}: {e}")
                    continue

            # Store active clients and timestamp
            self.active_clients = created_clients
            self.creation_timestamp = datetime.now(timezone.utc)

            # Cache the active clients in Redis as well for immediate access
            if self.cache_manager:
                cache_key = "webdav_active_clients"
                webdav_result = {
                    "available": True,
                    "message": f"Created {len(created_clients)} WebDAV clients",
                    "clients": created_clients
                }
                # Cache for the duration specified in WEBDAV_GENERATION_INTERVAL_HOURS (24 hours)
                webdav_cache_ttl_seconds = AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS * 3600
                self.cache_manager.set(
                    cache_key, webdav_result, ttl=webdav_cache_ttl_seconds)
                logger.info(
                    f"Caching WebDAV clients for {AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS} hours ({webdav_cache_ttl_seconds} seconds) matching WEBDAV_GENERATION_INTERVAL_HOURS")

            logger.info(
                f"Successfully created {len(created_clients)} WebDAV clients")

            return {
                "success": True,
                "message": f"Created {len(created_clients)} WebDAV clients",
                "clients": created_clients
            }

        except Exception as e:
            logger.error(f"Failed to create daily WebDAV clients: {e}")
            return {
                "success": False,
                "message": f"Error: {str(e)}",
                "clients": []
            }

    async def cleanup_expired_clients(self) -> int:
        """
        Delete all existing WebDAV clients (cleanup before creating new ones)
        This method is called by the scheduled job to refresh the clients every 24 hours
        or when traffic quota is available for new clients.

        Returns:
            int: Number of clients deleted
        """
        try:
            # Get current WebDAV applications
            result = await self.pikpak_service.get_webdav_applications()
            applications = result.get('applications', [])

            deleted_count = 0

            for app in applications:
                try:
                    username = app.get('username', '')
                    password = app.get('password', '')

                    if username and password:
                        await self.pikpak_service.delete_webdav_application(username, password)
                        deleted_count += 1
                        logger.info(f"Deleted WebDAV client: {username}")

                except Exception as e:
                    logger.error(
                        f"Failed to delete WebDAV client {username}: {e}")
                    continue

            logger.info(
                f"Cleaned up {deleted_count} WebDAV clients (daily refresh)")

            # Clear the cache since clients have been deleted
            if self.cache_manager:
                cache_key = "webdav_active_clients"
                # Use TTL of 0 to effectively delete the key
                self.cache_manager.set(cache_key, {
                                       "available": True, "message": "No WebDAV clients currently active. They will be created on the next scheduled run.", "clients": []}, ttl=1)  # Expire immediately
                logger.info("Cleared WebDAV clients cache after cleanup")

            return deleted_count

        except Exception as e:
            logger.error(f"Failed to cleanup WebDAV clients: {e}")
            return 0

    async def get_active_clients(self) -> Dict[str, Any]:
        """
        Get list of active WebDAV clients with TTL info

        Returns:
            dict: Active clients or message if none available
        """
        try:
            logger.info("=== WebDAV Service get_active_clients Debug ===")
            # First, try to get existing clients from cache or memory
            cache_key = "webdav_active_clients"
            cached_result = None

            logger.info(
                f"Cache manager exists: {self.cache_manager is not None}")

            if self.cache_manager:
                cached_result = self.cache_manager.get(cache_key)
                if cached_result is not None:
                    logger.debug("Cache hit for active WebDAV clients")
                    logger.info(f"Cached result: {cached_result}")

            # If not in cache, check memory
            if cached_result is None and self.active_clients:
                logger.info(
                    f"Found {len(self.active_clients)} clients in memory")
                cached_result = {
                    "available": True,
                    "message": f"{len(self.active_clients)} active clients",
                    "clients": self.active_clients
                }
                # Cache it for future requests
                if self.cache_manager:
                    webdav_cache_ttl_seconds = AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS * 3600
                    self.cache_manager.set(
                        cache_key, cached_result, ttl=webdav_cache_ttl_seconds)
                    logger.info(
                        f"Cached clients from memory for {AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS} hours ({webdav_cache_ttl_seconds} seconds)")

            # Now check if downstream traffic is available
            logger.info("Checking downstream traffic availability...")
            traffic_available = await self.traffic_checker.is_downstream_traffic_available()
            logger.info(f"Traffic available: {traffic_available}")

            # If we have clients (from cache or memory)
            if cached_result and cached_result.get("clients"):
                logger.info(
                    f"Returning {len(cached_result['clients'])} clients from cache/memory")
                # Update availability based on traffic status
                if not traffic_available:
                    # Traffic exhausted but clients exist - show them with warning
                    logger.info(
                        "Traffic exhausted but returning existing clients with warning")
                    return {
                        "available": False,
                        "message": "Downstream traffic quota exhausted. WebDAV clients exist but cannot be used until traffic is available.",
                        "clients": cached_result["clients"]
                    }
                else:
                    # Traffic available and clients exist - all good
                    return {
                        "available": True,
                        "message": cached_result.get("message", f"{len(cached_result['clients'])} active clients"),
                        "clients": cached_result["clients"]
                    }

            # No clients exist
            logger.info("No clients found in cache or memory")
            if not traffic_available:
                # No traffic and no clients
                logger.info(
                    "No traffic available and no clients - returning empty result")
                return {
                    "available": False,
                    "message": "Downstream traffic quota exhausted. No WebDAV clients available.",
                    "clients": []
                }
            else:
                # Traffic available but no clients yet - create them immediately
                logger.info(
                    "Traffic available but no clients - triggering immediate creation")

                # Trigger creation in background (or await it if we want immediate result)
                # Since the user wants them "on load", we should await it here
                creation_result = await self.create_daily_webdav_clients()

                if creation_result.get("success"):
                    return {
                        "available": True,
                        "message": creation_result.get("message"),
                        "clients": creation_result.get("clients")
                    }
                else:
                    return {
                        "available": False,
                        "message": f"Failed to create clients: {creation_result.get('message')}",
                        "clients": []
                    }

        except Exception as e:
            logger.error(f"Failed to get active clients: {e}")
            return {
                "available": False,
                "message": f"Error: {str(e)}",
                "clients": []
            }
