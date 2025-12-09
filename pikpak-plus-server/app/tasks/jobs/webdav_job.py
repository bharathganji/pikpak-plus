"""WebDAV Generation Job - Periodically generate WebDAV clients."""
import logging
import json
from datetime import datetime, timedelta, timezone

from app.core.config import AppConfig
from app.services.pikpak_service import PikPakService
from app.services.webdav import WebDAVManager
from celery import shared_task
from app.utils.common import CacheManager
import redis
import asyncio

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='app.tasks.jobs.webdav_job.scheduled_webdav_generation')
def scheduled_webdav_generation(self):
    """
    Generate WebDAV clients every 24 hours.
    """
    run_time = datetime.now(timezone.utc)
    logger.info(
        f"Running scheduled WebDAV generation job at {run_time.isoformat()}Z...")

    try:
        # Initialize services locally
        redis_client = redis.from_url(
            AppConfig.REDIS_URL, decode_responses=True)
        cache_manager = CacheManager(
            AppConfig.TASK_CACHE_TTL, AppConfig.REDIS_URL)

        # Initialize PikPak
        pikpak_service = PikPakService(
            AppConfig.PIKPAK_USER, AppConfig.PIKPAK_PASS)

        # Run async logic in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            loop.run_until_complete(pikpak_service.ensure_logged_in())

            # Create a local WebDAV manager
            local_webdav_manager = WebDAVManager(
                pikpak_service=pikpak_service,
                ttl_hours=AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS,
                cache_manager=cache_manager
            )

            # Generate WebDAV clients
            result = loop.run_until_complete(
                local_webdav_manager.create_daily_webdav_clients())

            if result.get('success'):
                logger.info(
                    f"WebDAV generation completed: {result.get('message')}")
            else:
                logger.warning(
                    f"WebDAV generation skipped: {result.get('message')}")

            # Update Redis status
            from app.tasks.utils import update_redis_status

            next_webdav_time = run_time + \
                timedelta(hours=AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS)
            update_redis_status(redis_client, run_time,
                                next_webdav_time, "webdav_generation")

        finally:
            loop.close()
            redis_client.close()

    except Exception as e:
        from app.services.pikpak_service import RateLimitError

        if isinstance(e, RateLimitError):
            # Rate limited - wait 5 minutes before retry
            logger.warning(
                f"Rate limited by PikPak, will retry in 5 minutes: {e}")
            raise self.retry(exc=e, countdown=300, max_retries=3)

        logger.error(f"Scheduled WebDAV generation failed: {e}", exc_info=True)
        raise self.retry(exc=e, countdown=300, max_retries=3)
