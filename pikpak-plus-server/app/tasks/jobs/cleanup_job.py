"""Cleanup Job - Periodically clean up old tasks and files from PikPak and Supabase."""
import logging
from datetime import datetime, timedelta, timezone

from celery import shared_task
import redis
import asyncio

from app.core.config import AppConfig
from app.tasks.cleanup import run_cleanup
from app.services import PikPakService, SupabaseService

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='app.tasks.jobs.cleanup_job.scheduled_cleanup')
def scheduled_cleanup(self):
    """
    Execute the cleanup job to remove old tasks and files.

    Flow:
    1. Get all task IDs and file IDs from Supabase public_actions table
    2. Delete tasks from PikPak (in batches of 100)
    3. Delete files permanently from PikPak (not trash)
    4. After both succeed, empty the public_actions table (all rows)
    """
    run_time = datetime.now(timezone.utc)
    logger.info(f"Running scheduled cleanup job at {run_time.isoformat()}Z...")

    try:
        # Initialize services locally
        redis_client = redis.from_url(
            AppConfig.REDIS_URL, decode_responses=True)

        # Initialize Supabase
        from supabase import create_client
        supabase_client = create_client(
            AppConfig.SUPABASE_URL, AppConfig.SUPABASE_KEY)

        # Initialize PikPak
        pikpak_service = PikPakService(
            AppConfig.PIKPAK_USER, AppConfig.PIKPAK_PASS)

        # Run async logic in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            loop.run_until_complete(pikpak_service.ensure_logged_in())

            # Run the cleanup (no age_hours - cleans everything)
            loop.run_until_complete(run_cleanup(
                pikpak_service,
                supabase_client
            ))

            logger.info(
                f"Cleanup job completed successfully at {datetime.now(timezone.utc).isoformat()}Z")

            # Update Redis status
            from app.tasks.utils import update_redis_status

            next_cleanup_time = run_time + \
                timedelta(hours=AppConfig.CLEANUP_INTERVAL_HOURS)
            update_redis_status(redis_client, run_time,
                                next_cleanup_time, "cleanup")

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

        logger.error(f"Scheduled cleanup failed: {e}", exc_info=True)
        raise self.retry(exc=e, countdown=300, max_retries=3)
