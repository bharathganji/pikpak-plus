"""WebDAV Traffic Checker"""
import logging
from typing import Optional, Any
from app.core.config import AppConfig

logger = logging.getLogger(__name__)


class TrafficChecker:
    """Checks downstream traffic availability"""

    def __init__(self, pikpak_service, cache_manager=None):
        self.pikpak_service = pikpak_service
        self.cache_manager = cache_manager

    async def is_downstream_traffic_available(self) -> bool:
        """
        Check if downstream traffic quota is available (not 100% exhausted)
        Uses caching to avoid unnecessary API calls.

        Returns:
            bool: True if traffic is available, False if exhausted
        """
        # Use cache if available to avoid repeated API calls
        cache_key = "webdav_traffic_available"
        if self.cache_manager:
            cached_result = self.cache_manager.get(cache_key)
            if cached_result is not None:
                logger.debug(
                    f"Cache hit for traffic availability check (TTL: {AppConfig.QUOTA_CACHE_TTL}s)")
                return cached_result

        try:
            # Try to get quota from cache first via cache manager if possible
            quota_info_cached = None
            if self.cache_manager:
                quota_info_cached = self.cache_manager.get("quota_info")

            if quota_info_cached and "transfer" in quota_info_cached:
                logger.debug("Using cached quota info for traffic check")
                transfer_quota = quota_info_cached["transfer"]
            else:
                # If not in cache, fetch it
                transfer_quota = await self.pikpak_service.get_transfer_quota()

            # Extract quota information from the correct structure
            # API returns: { "base": { "download": { "size": usage, "total_assets": limit } } }
            base_info = transfer_quota.get('base', {})
            download_info = base_info.get('download', {})

            limit = download_info.get('total_assets', 0)
            usage = download_info.get('size', 0)

            if limit == 0:
                # No limit set, traffic is available
                is_available = True
            elif limit == -1:
                # Unlimited quota
                is_available = True
            else:
                # Check if usage is less than limit (not 100% exhausted)
                is_available = usage < limit

            logger.info(
                f"Downstream traffic check: {usage}/{limit} bytes used. Available: {is_available}")

            # Cache the result using the same TTL as quota cache for consistency
            if self.cache_manager:
                self.cache_manager.set(
                    cache_key, is_available, ttl=AppConfig.QUOTA_CACHE_TTL)

            return is_available

        except Exception as e:
            logger.error(f"Failed to check downstream traffic: {e}")
            # Default to True (traffic available) on error to avoid blocking WebDAV creation
            # This is safer than defaulting to False
            if self.cache_manager:
                # Cache for 1 minute on error
                self.cache_manager.set(cache_key, True, ttl=60)
            return True
