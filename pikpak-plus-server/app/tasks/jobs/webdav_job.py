"""WebDAV Generation Job - Periodically generate WebDAV clients."""
import logging
from datetime import UTC, datetime, timedelta

import redis
from celery import shared_task

from app.core.config import AppConfig
from app.services.pikpak_service import PikPakService
from app.services.webdav import WebDAVManager
from app.utils.common import CacheManager

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='app.tasks.jobs.webdav_job.scheduled_webdav_generation')
def scheduled_webdav_generation(self):
    """
    Generate WebDAV clients every 24 hours.
    """
    run_time = datetime.now(UTC)
    logger.info(
        f"Running scheduled WebDAV generation job at {run_time.isoformat()}Z...")

    redis_client = None
    try:
        # Initialize services locally
        redis_client = redis.from_url(
            AppConfig.REDIS_URL, decode_responses=True)
        cache_manager = CacheManager(
            AppConfig.TASK_CACHE_TTL, AppConfig.REDIS_URL)

        # Initialize PikPak and generate WebDAV clients with clean socket teardown
        from app.tasks.utils import run_job_async, update_redis_status

        pikpak_user = AppConfig.PIKPAK_USER or ""
        pikpak_pass = AppConfig.PIKPAK_PASS or ""

        async def _do_webdav():
            pikpak_service = PikPakService(pikpak_user, pikpak_pass)
            try:
                await pikpak_service.ensure_logged_in()

                # Create a local WebDAV manager
                local_webdav_manager = WebDAVManager(
                    pikpak_service=pikpak_service,
                    ttl_hours=AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS,
                    cache_manager=cache_manager
                )

                # Generate WebDAV clients
                result = await local_webdav_manager.create_daily_webdav_clients()

                if result.get('success'):
                    logger.info(
                        f"WebDAV generation completed: {result.get('message')}")
                else:
                    logger.warning(
                        f"WebDAV generation skipped: {result.get('message')}")

                next_webdav_time = run_time + \
                    timedelta(hours=AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS)
                update_redis_status(redis_client, run_time,
                                    next_webdav_time, "webdav_generation")
            finally:
                await pikpak_service.aclose()

        run_job_async(_do_webdav)

    except Exception as e:
        from app.services.pikpak_service import RateLimitError

        if isinstance(e, RateLimitError):
            # Rate limited - wait 5 minutes before retry
            logger.warning(
                f"Rate limited by PikPak, will retry in 5 minutes: {e}")
            raise self.retry(exc=e, countdown=300, max_retries=3)

        logger.error(f"Scheduled WebDAV generation failed: {e}", exc_info=True)
        raise self.retry(exc=e, countdown=300, max_retries=3)
    finally:
        if redis_client:
            redis_client.close()
