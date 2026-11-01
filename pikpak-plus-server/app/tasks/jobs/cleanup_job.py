"""Cleanup Job - Periodically clean up old tasks and files from PikPak and Supabase."""
import logging
from datetime import UTC, datetime, timedelta

import redis
from celery import shared_task

from app.core.config import AppConfig
from app.services import PikPakService
from app.tasks.cleanup import run_cleanup

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
    run_time = datetime.now(UTC)
    logger.info(f"Running scheduled cleanup job at {run_time.isoformat()}Z...")

    redis_client = None
    try:
        # Initialize services locally
        redis_client = redis.from_url(
            AppConfig.REDIS_URL, decode_responses=True)

        # Initialize Supabase
        from supabase import create_client
        supabase_url = AppConfig.SUPABASE_URL or ""
        supabase_key = AppConfig.SUPABASE_KEY or ""
        supabase_client = create_client(supabase_url, supabase_key)

        # Initialize PikPak and run cleanup with clean socket teardown
        from app.tasks.utils import run_job_async, update_redis_status

        pikpak_user = AppConfig.PIKPAK_USER or ""
        pikpak_pass = AppConfig.PIKPAK_PASS or ""

        async def _do_cleanup():
            pikpak_service = PikPakService(pikpak_user, pikpak_pass)
            try:
                await pikpak_service.ensure_logged_in()

                # Run the cleanup (no age_hours - cleans everything)
                await run_cleanup(
                    pikpak_service,
                    supabase_client
                )

                logger.info(
                    f"Cleanup job completed successfully at {datetime.now(UTC).isoformat()}Z")

                next_cleanup_time = run_time + \
                    timedelta(hours=AppConfig.CLEANUP_INTERVAL_HOURS)
                update_redis_status(redis_client, run_time,
                                    next_cleanup_time, "cleanup")
            finally:
                await pikpak_service.aclose()

        run_job_async(_do_cleanup)

    except Exception as e:
        from app.services.pikpak_service import RateLimitError

        if isinstance(e, RateLimitError):
            # Rate limited - wait 5 minutes before retry
            logger.warning(
                f"Rate limited by PikPak, will retry in 5 minutes: {e}")
            raise self.retry(exc=e, countdown=300, max_retries=3)

        logger.error(f"Scheduled cleanup failed: {e}", exc_info=True)
        raise self.retry(exc=e, countdown=300, max_retries=3)
    finally:
        if redis_client:
            redis_client.close()
