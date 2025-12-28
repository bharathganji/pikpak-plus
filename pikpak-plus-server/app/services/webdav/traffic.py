import logging
from datetime import datetime, timezone
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
            # Always fetch fresh transfer quota for traffic check to avoid 3-hour cache lag
            # This ensures that when a user buys extra premium, the WebDAV clients update promptly.
            transfer_quota = await self.pikpak_service.get_transfer_quota()

            # Update the global quota_info cache with the newly fetched transfer quota
            # so other parts of the UI also reflect the update.
            if self.cache_manager:
                # Clear the traffic-specific cache immediately to ensure fresh calculation
                self.cache_manager.set(cache_key, None, ttl=0)

                quota_info_cached = self.cache_manager.get("quota_info")
                if quota_info_cached:
                    quota_info_cached["transfer"] = transfer_quota
                    quota_info_cached["cached_at"] = datetime.now(
                        timezone.utc).isoformat()
                    self.cache_manager.set(
                        "quota_info", quota_info_cached, ttl=AppConfig.QUOTA_CACHE_TTL)

            # Extract quota information from the updated structure (Dec 2024):
            # API returns: {
            #   "base": { "download": { "size": usage, "assets": usage, "total_assets": monthly_base_limit } },
            #   "transfer": { "download": { "assets": 0, "total_assets": monthly_total_limit } },
            #   "data": [ { "status": "active", "product": "..." } ]
            # }
            # NOTE: "transfer" now contains the TOTAL monthly quota (base + extra combined)
            #       "base" contains the ACTUAL usage. So we read:
            #       - Usage from base.download.size (or base.download.assets)
            #       - Total limit from transfer.download.total_assets (or fallback to base.download.total_assets)

            # Base contains actual usage
            base_info = transfer_quota.get('base', {})
            base_download = base_info.get('download', {})
            # Use 'size' as it tracks actual consumed bytes accurately
            actual_usage = base_download.get('size', base_download.get('assets', 0))

            # Transfer contains the monthly quota totals (base + extra premium combined)
            transfer_info = transfer_quota.get('transfer', {})
            transfer_download = transfer_info.get('download', {})
            # total_assets in transfer bucket = combined monthly limit
            total_limit = transfer_download.get('total_assets', 0)
            
            # Fallback: If transfer.download.total_assets is 0 or missing,
            # use base.download.total_assets as the limit
            if total_limit == 0:
                total_limit = base_download.get('total_assets', 0)

            # Fallback: Check if there are active products in the 'data' array
            active_products = [p for p in transfer_quota.get(
                'data', []) if p.get('status') == 'active']

            if total_limit == 0:
                # No limit set, traffic is available
                is_available = True
            elif total_limit == -1:
                # Unlimited quota
                is_available = True
            else:
                # Check if usage is less than limit (not 100% exhausted)
                is_available = actual_usage < total_limit

            logger.info(
                f"Downstream traffic check: {actual_usage}/{total_limit} bytes used. Active Products: {len(active_products)}. Available: {is_available}")

            # Cache the result for 5 minutes (much shorter than quota cache)
            if self.cache_manager:
                self.cache_manager.set(
                    cache_key, is_available, ttl=300)

            return is_available

        except Exception as e:
            logger.error(f"Failed to check downstream traffic: {e}")
            # Default to True (traffic available) on error to avoid blocking WebDAV creation
            # This is safer than defaulting to False
            if self.cache_manager:
                # Cache for 1 minute on error
                self.cache_manager.set(cache_key, True, ttl=60)
            return True
