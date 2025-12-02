"""Task Status Update Job - Synchronize task statuses between PikPak and Supabase."""
import logging
import json
from datetime import datetime, timedelta, timezone

from app.core.config import AppConfig
from app.services.pikpak_service import PikPakService
from app.tasks.utils import update_redis_status

logger = logging.getLogger(__name__)


async def scheduled_task_status_update(pikpak_service, supabase_service, cache_manager, redis_client):
    """
    Update task statuses from PikPak and sync to Supabase.

    Args:
        pikpak_service: Global PikPak service instance (for credentials)
        supabase_service: Supabase service instance
        cache_manager: Cache manager for invalidating task cache
        redis_client: Redis client for updating scheduler status
    """
    run_time = datetime.now(timezone.utc)
    logger.info(
        f"Running scheduled task status update at {run_time.isoformat()}Z...")
    logger.info(
        f"Configured interval: {AppConfig.TASK_STATUS_UPDATE_INTERVAL_MINUTES} minutes")

    # Validate required services
    if not pikpak_service or not pikpak_service.client:
        logger.warning(
            "Global PikPak service not initialized, skipping task status update")
        return

    if not supabase_service:
        logger.warning(
            "Supabase client not initialized, skipping task status update")
        return

    try:
        # Create a local service instance for this thread to avoid event loop conflicts
        local_pikpak_service = PikPakService(
            username=pikpak_service.client.username,
            password=pikpak_service.client.password
        )

        # Ensure logged in (will use persisted tokens if available)
        await local_pikpak_service.ensure_logged_in()

        # Fetch tasks from PikPak
        logger.info("Fetching offline tasks from PikPak...")
        pikpak_tasks_result = await local_pikpak_service.get_offline_tasks()
        pikpak_tasks = pikpak_tasks_result.get('tasks', [])
        logger.info(f"Fetched {len(pikpak_tasks)} tasks from PikPak")

        # Update Supabase with latest task statuses
        # Note: Supabase service is synchronous, so we can use the global instance
        logger.info("Updating task statuses in Supabase...")
        updated_count = supabase_service.update_task_statuses(pikpak_tasks)
        logger.info(f"Updated {updated_count} task statuses in Supabase")

        # Invalidate cache to force refresh on next request
        if cache_manager:
            cache_manager.invalidate_tasks()
            logger.info("Invalidated task cache")

        # Calculate next run time from THIS run time to prevent schedule drift
        next_task_status_time = run_time + timedelta(
            minutes=AppConfig.TASK_STATUS_UPDATE_INTERVAL_MINUTES
        )

        # Update scheduler status in Redis
        update_redis_status(
            redis_client,
            run_time,
            next_task_status_time,
            "task_status_update"
        )

        logger.info(
            f"Task status update completed at {datetime.now(timezone.utc).isoformat()}. "
            f"Updated {updated_count} tasks."
        )

    except Exception as e:
        import httpx
        if isinstance(e, httpx.ConnectError):
            logger.error(
                f"Scheduled task status update failed due to connection error: {e}. Please verify SUPABASE_URL and network connectivity.")
        else:
            logger.error(
                f"Scheduled task status update failed: {e}", exc_info=True)
