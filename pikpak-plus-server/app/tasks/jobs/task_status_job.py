"""Task Status Update Job - Synchronize task statuses between PikPak and Supabase."""
import logging
from datetime import UTC, datetime, timedelta

import redis
from celery import shared_task

from app.core.config import AppConfig
from app.services import PikPakService, SupabaseService
from app.utils.common import CacheManager

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='app.tasks.jobs.task_status_job.scheduled_task_status_update')
def scheduled_task_status_update(self, source="scheduled"):
    """
    Update task statuses from PikPak and sync to Supabase.
    """
    run_time = datetime.now(UTC)
    logger.info(
        f"Running {source} task status update at {run_time.isoformat()}Z...")

    redis_client = None
    try:
        # Initialize services locally for the task
        redis_client = redis.from_url(
            AppConfig.REDIS_URL, decode_responses=True)
        cache_manager = CacheManager(
            AppConfig.TASK_CACHE_TTL, AppConfig.REDIS_URL)

        # Initialize Supabase
        from supabase import create_client
        supabase_url = AppConfig.SUPABASE_URL or ""
        supabase_key = AppConfig.SUPABASE_KEY or ""
        supabase_client = create_client(supabase_url, supabase_key)
        supabase_service = SupabaseService(supabase_client)

        # Initialize PikPak and execute with clean socket teardown
        from app.tasks.utils import run_job_async, update_redis_status

        pikpak_user = AppConfig.PIKPAK_USER or ""
        pikpak_pass = AppConfig.PIKPAK_PASS or ""

        async def _do_update():
            pikpak_service = PikPakService(pikpak_user, pikpak_pass)
            try:
                await pikpak_service.ensure_logged_in()

                logger.info("Fetching offline tasks from PikPak...")
                pikpak_tasks_result = await pikpak_service.get_offline_tasks()
                pikpak_tasks = pikpak_tasks_result.get('tasks', [])
                logger.info(f"Fetched {len(pikpak_tasks)} tasks from PikPak")

                # Update Supabase (sync)
                updated_count = supabase_service.update_task_statuses(pikpak_tasks)
                logger.info(f"Updated {updated_count} task statuses in Supabase")

                # Invalidate cache
                cache_manager.invalidate_tasks()
                logger.info("Invalidated task cache")

                next_run_time = run_time + \
                    timedelta(minutes=AppConfig.TASK_STATUS_UPDATE_INTERVAL_MINUTES)
                update_redis_status(redis_client, run_time,
                                    next_run_time, "task_status_update")

                logger.info(
                    f"Task status update completed at {datetime.now(UTC).isoformat()}. "
                    f"Updated {updated_count} tasks."
                )
            finally:
                await pikpak_service.aclose()

        run_job_async(_do_update)

    except Exception as e:
        import httpx

        from app.services.pikpak_service import RateLimitError

        if isinstance(e, httpx.ConnectError):
            logger.error(
                f"Scheduled task status update failed due to connection error: {e}. Please verify SUPABASE_URL and network connectivity.")
        elif isinstance(e, RateLimitError):
            # Rate limited - wait 5 minutes before retry (aligns with global cooldown)
            logger.warning(
                f"Rate limited by PikPak, will retry in 5 minutes: {e}")
            raise self.retry(exc=e, countdown=300, max_retries=3)
        else:
            logger.error(
                f"Scheduled task status update failed: {e}", exc_info=True)
            # Retry the task if it failed (optional, can be configured in decorator)
            raise self.retry(exc=e, countdown=60, max_retries=3)
    finally:
        if redis_client:
            redis_client.close()
