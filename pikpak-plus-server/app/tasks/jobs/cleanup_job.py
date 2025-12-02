"""Cleanup Job - Periodically clean up old tasks and files from PikPak and Supabase."""
import logging
import json
from datetime import datetime, timedelta, timezone

from app.core.config import AppConfig
from app.tasks.cleanup import run_cleanup
from app.services.pikpak_service import PikPakService
from app.tasks.utils import update_redis_status

logger = logging.getLogger(__name__)


async def scheduled_cleanup(pikpak_service, supabase_service, redis_client):
    """
    Execute the cleanup job to remove old tasks and files.

    Args:
        pikpak_service: Global PikPak service instance (for credentials)
        supabase_service: Supabase service instance
        redis_client: Redis client for updating scheduler status
    """
    run_time = datetime.now(timezone.utc)
    logger.info(f"Running scheduled cleanup job at {run_time.isoformat()}Z...")

    # Validate that we have the required services
    if not pikpak_service or not pikpak_service.client:
        logger.warning(
            "Global PikPak service not initialized, skipping cleanup")
        return

    try:
        # Create a local service instance for this thread to avoid event loop conflicts
        local_pikpak_service = PikPakService(
            username=pikpak_service.client.username,
            password=pikpak_service.client.password
        )

        # Ensure logged in (will use persisted tokens if available)
        await local_pikpak_service.ensure_logged_in()

        # Run the cleanup with configured retention period
        await run_cleanup(
            local_pikpak_service,
            supabase_service.client if supabase_service else None,
            age_hours=AppConfig.TASK_RETENTION_HOURS
        )

        # Calculate next run time from THIS run time to prevent schedule drift
        next_cleanup_time = run_time + \
            timedelta(hours=AppConfig.CLEANUP_INTERVAL_HOURS)

        # Update scheduler status in Redis
        update_redis_status(
            redis_client,
            run_time,
            next_cleanup_time,
            "cleanup"
        )

        logger.info(
            f"Cleanup job completed successfully at {datetime.now(timezone.utc).isoformat()}Z")

    except Exception as e:
        logger.error(f"Scheduled cleanup failed: {e}", exc_info=True)
