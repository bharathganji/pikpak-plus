"""WebDAV Manager Facade"""
import logging
from typing import Dict, Any

from .traffic import TrafficChecker
from .clients import ClientManager

logger = logging.getLogger(__name__)


class WebDAVManager:
    """Manages automated WebDAV client creation and lifecycle"""

    def __init__(self, pikpak_service, ttl_hours: int = 24, cache_manager=None):
        """
        Initialize WebDAV Manager

        Args:
            pikpak_service: PikPakService instance
            ttl_hours: Time-to-live for WebDAV clients in hours
            cache_manager: CacheManager instance for caching
        """
        self.traffic_checker = TrafficChecker(pikpak_service, cache_manager)
        self.client_manager = ClientManager(
            pikpak_service, self.traffic_checker, ttl_hours, cache_manager)

    def is_client_refresh_needed(self) -> bool:
        """
        Check if WebDAV clients need to be refreshed based on TTL

        Returns:
            bool: True if clients need to be refreshed, False otherwise
        """
        return self.client_manager.is_client_refresh_needed()

    async def is_downstream_traffic_available(self) -> bool:
        """
        Check if downstream traffic quota is available (not 100% exhausted)

        Returns:
            bool: True if traffic is available, False if exhausted
        """
        return await self.traffic_checker.is_downstream_traffic_available()

    async def create_daily_webdav_clients(self) -> Dict[str, Any]:
        """
        Create 8 WebDAV clients with planet names, delete old ones

        Returns:
            dict: Result with created clients or error message
        """
        return await self.client_manager.create_daily_webdav_clients()

    async def cleanup_expired_clients(self) -> int:
        """
        Delete all existing WebDAV clients (cleanup before creating new ones)

        Returns:
            int: Number of clients deleted
        """
        return await self.client_manager.cleanup_expired_clients()

    async def get_active_clients(self) -> Dict[str, Any]:
        """
        Get list of active WebDAV clients with TTL info

        Returns:
            dict: Active clients or message if none available
        """
        return await self.client_manager.get_active_clients()
