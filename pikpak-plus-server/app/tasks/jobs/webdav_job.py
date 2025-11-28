"""WebDAV Generation Job - Periodically generate WebDAV clients."""
import logging
import json
from datetime import datetime, timedelta, timezone

from app.core.config import AppConfig
from app.services.pikpak_service import PikPakService
from app.services.webdav import WebDAVManager

logger = logging.getLogger(__name__)


async def scheduled_webdav_generation(pikpak_service, webdav_manager, cache_manager, redis_client):
    """
    Generate WebDAV clients every 24 hours.

    Args:
        pikpak_service: Global PikPak service instance (for credentials)
        webdav_manager: Global WebDAV manager instance
        cache_manager: Cache manager instance
        redis_client: Redis client for updating scheduler status
    """
    run_time = datetime.now(timezone.utc)
    logger.info(
        f"Running scheduled WebDAV generation job at {run_time.isoformat()}Z...")

    # Validate required services
    if not webdav_manager:
        logger.warning("WebDAV manager not initialized, skipping generation")
        return

    if not pikpak_service or not pikpak_service.client:
        logger.warning(
            "Global PikPak service not initialized, skipping WebDAV generation")
        return

    try:
        # Create a local service instance for this thread to avoid event loop conflicts
        local_pikpak_service = PikPakService(
            username=pikpak_service.client.username,
            password=pikpak_service.client.password
        )

        # Ensure logged in (will use persisted tokens if available)
        await local_pikpak_service.ensure_logged_in()

        # Create a local WebDAV manager with the local service
        local_webdav_manager = WebDAVManager(
            pikpak_service=local_pikpak_service,
            ttl_hours=webdav_manager.ttl_hours,
            cache_manager=cache_manager
        )

        # Generate WebDAV clients
        result = await local_webdav_manager.create_daily_webdav_clients()

        # Update global manager state if generation was successful
        if result.get('success'):
            logger.info(
                f"WebDAV generation completed: {result.get('message')}")

            # Update global manager's in-memory state
            # Note: This is not perfectly thread-safe, but the app should primarily
            # read from cache/Redis for the most up-to-date state
            webdav_manager.active_clients = result.get('clients', [])
            webdav_manager.creation_timestamp = datetime.now(timezone.utc)
        else:
            logger.warning(
                f"WebDAV generation skipped: {result.get('message')}")

        # Calculate next run time from THIS run time to prevent schedule drift
        next_webdav_time = run_time + timedelta(
            hours=AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS
        )

        # Update scheduler status in Redis
        _update_redis_status(
            redis_client,
            run_time,
            next_webdav_time,
            "webdav_generation"
        )

    except Exception as e:
        logger.error(f"Scheduled WebDAV generation failed: {e}", exc_info=True)


def _update_redis_status(redis_client, run_time, next_run_time, job_name):
    """
    Update Redis with the next scheduled run time for a job.

    Args:
        redis_client: Redis client instance
        run_time: When the job actually ran
        next_run_time: When the job should run next
        job_name: Name of the job (cleanup, task_status_update, webdav_generation)
    """
    try:
        if not redis_client:
            return

        scheduler_status_data = redis_client.get("pikpak_scheduler_status")
        if scheduler_status_data:
            scheduler_info = json.loads(scheduler_status_data)
            scheduler_info[f"next_{job_name}"] = next_run_time.isoformat().split(
                '+')[0] + 'Z'
            scheduler_info[f"last_{job_name}"] = run_time.isoformat().split(
                '+')[0] + 'Z'
            redis_client.set("pikpak_scheduler_status",
                             json.dumps(scheduler_info), ex=3600)

            logger.info(
                f"Updated next {job_name} time in Redis: {next_run_time.isoformat()}Z "
                f"(based on run time {run_time.isoformat()}Z)"
            )
    except Exception as e:
        logger.error(f"Failed to update next {job_name} time in Redis: {e}")
