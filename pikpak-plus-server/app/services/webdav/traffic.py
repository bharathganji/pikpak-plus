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

            # Extract quota information from the correct structure
            # API returns: {
            #   "base": { "download": { "size": usage, "total_assets": limit } },
            #   "transfer": { "download": { "assets": extra_usage, "total_assets": extra_limit } },
            #   "data": [ { "status": "active", "product": "..." } ]
            # }

            # Base Download Quota
            base_info = transfer_quota.get('base', {})
            base_download = base_info.get('download', {})
            base_limit = base_download.get('total_assets', 0)
            # Use 'size' if available as it tracks actual overflow bytes better than 'assets'
            base_usage = base_download.get(
                'size', base_download.get('assets', 0))

            # Extra/Transfer Download Quota
            extra_total = transfer_quota.get('transfer', {})
            extra_download = extra_total.get('download', {})
            extra_limit = extra_download.get('total_assets', 0)
            # Transfer bucket usually uses 'assets', but we check 'size' too just in case
            extra_usage = extra_download.get(
                'size', extra_download.get('assets', 0))

            # Sum them up (e.g., 4TB Base + 4TB Extra = 8TB Limit)
            total_limit = base_limit + extra_limit
            total_usage = base_usage + extra_usage

            # Fallback: Check if there are active products in the 'data' array
            # as a secondary indicator of extra premium status.
            active_products = [p for p in transfer_quota.get(
                'data', []) if p.get('status') == 'active']
            has_active_premium = len(active_products) > 0

            if total_limit == 0:
                # No limit set, traffic is available
                is_available = True
            elif total_limit == -1:
                # Unlimited quota
                is_available = True
            else:
                # Check if usage is less than limit (not 100% exhausted)
                # If we have active premium products but the buckets are barely over,
                # we might be in an "overflow" state where PikPak hasn't shifted the counters yet.
                is_available = total_usage < total_limit

            logger.info(
                f"Downstream traffic check: {total_usage}/{total_limit} bytes used (Base: {base_usage}/{base_limit}, Extra: {extra_usage}/{extra_limit}). Active Products: {len(active_products)}. Available: {is_available}")

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
