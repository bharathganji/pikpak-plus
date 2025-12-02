"""Shared utilities for task scheduling and Redis operations."""
import logging
import json

logger = logging.getLogger(__name__)


def update_redis_status(redis_client, run_time, next_run_time, job_name):
    """
    Update Redis with the next scheduled run time for a job.

    Args:
        redis_client: Redis client instance
        run_time: When the job actually ran
        next_run_time: When the job should run next
        job_name: Name of the job (cleanup, task_status_update, webdav_generation, statistics_collection)
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
