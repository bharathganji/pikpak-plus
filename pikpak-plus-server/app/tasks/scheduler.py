"""Scheduler and Background Tasks Module

This module orchestrates periodic background tasks using a modular architecture:
- Jobs are defined in app.tasks.jobs (cleanup, task status updates, WebDAV generation)
- Async/sync execution is handled by app.tasks.runners
- Distributed locking is managed by app.tasks.locking

The scheduler uses Redis-based distributed locking to ensure only one worker
process runs background tasks across multiple Gunicorn workers.
"""
import logging
import json
from datetime import datetime, timedelta, timezone

from app.core.config import AppConfig
from app.tasks.jobs import scheduled_cleanup, scheduled_task_status_update, scheduled_webdav_generation
from app.tasks.runners import run_async_job, ScheduledJobThread
from app.tasks.locking import RedisDistributedLock

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Global service instances (used for configuration and dependency injection)
pikpak_service = None
supabase_service = None
webdav_manager = None
redis_client = None
cache_manager = None

# Background task threads
_task_status_thread = None
_cleanup_thread = None
_webdav_thread = None

# Distributed lock
_distributed_lock = None


def _create_cleanup_job_wrapper():
    """Create a wrapper function for the cleanup job."""
    def wrapper():
        run_async_job(
            scheduled_cleanup,
            pikpak_service,
            supabase_service,
            redis_client
        )
    return wrapper


def _create_task_status_job_wrapper():
    """Create a wrapper function for the task status update job."""
    def wrapper():
        run_async_job(
            scheduled_task_status_update,
            pikpak_service,
            supabase_service,
            cache_manager,
            redis_client
        )
    return wrapper


def _create_webdav_job_wrapper():
    """Create a wrapper function for the WebDAV generation job."""
    def wrapper():
        run_async_job(
            scheduled_webdav_generation,
            pikpak_service,
            webdav_manager,
            cache_manager,
            redis_client
        )
    return wrapper


def _start_background_tasks():
    """Start all background task threads."""
    global _task_status_thread, _cleanup_thread, _webdav_thread

    logger.info(
        f"Starting background tasks at {datetime.now(timezone.utc).isoformat()}...")

    # Create job wrappers
    cleanup_job = _create_cleanup_job_wrapper()
    task_status_job = _create_task_status_job_wrapper()
    webdav_job = _create_webdav_job_wrapper()

    # Start task status update thread
    _task_status_thread = ScheduledJobThread(
        job_func=task_status_job,
        interval_seconds=AppConfig.TASK_STATUS_UPDATE_INTERVAL_MINUTES * 60,
        job_name="task_status_update",
        redis_client=redis_client
    )
    _task_status_thread.start()
    logger.info(
        f"Started task status update thread (every {AppConfig.TASK_STATUS_UPDATE_INTERVAL_MINUTES} minutes)")

    # Start cleanup thread
    _cleanup_thread = ScheduledJobThread(
        job_func=cleanup_job,
        interval_seconds=AppConfig.CLEANUP_INTERVAL_HOURS * 3600,
        job_name="cleanup",
        redis_client=redis_client
    )
    _cleanup_thread.start()
    logger.info(
        f"Started cleanup thread (every {AppConfig.CLEANUP_INTERVAL_HOURS} hours)")

    # Start WebDAV generation thread
    _webdav_thread = ScheduledJobThread(
        job_func=webdav_job,
        interval_seconds=AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS * 3600,
        job_name="webdav_generation",
        redis_client=redis_client
    )
    _webdav_thread.start()
    logger.info(
        f"Started WebDAV generation thread (every {AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS} hours)")

    # Run WebDAV generation immediately on startup
    logger.info("Running initial WebDAV generation on startup...")
    try:
        webdav_job()
    except Exception as e:
        logger.error(f"Initial WebDAV generation failed: {e}")

    # Update Redis with initial scheduler status
    _update_scheduler_status()


def _update_scheduler_status():
    """Update Redis with the current scheduler status and next run times."""
    try:
        # Calculate expected next run times based on current time
        now = datetime.now(timezone.utc)
        next_cleanup_time = now + \
            timedelta(hours=AppConfig.CLEANUP_INTERVAL_HOURS)
        next_webdav_time = now + \
            timedelta(hours=AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS)
        next_task_status_time = now + \
            timedelta(minutes=AppConfig.TASK_STATUS_UPDATE_INTERVAL_MINUTES)

        scheduler_info = {
            "status": "running",
            "next_cleanup": next_cleanup_time.isoformat().split('+')[0] + 'Z',
            "next_webdav_generation": next_webdav_time.isoformat().split('+')[0] + 'Z',
            "next_task_status_update": next_task_status_time.isoformat().split('+')[0] + 'Z',
            "worker_id": _distributed_lock.worker_id if _distributed_lock else "unknown",
            "started_at": now.isoformat().split('+')[0] + 'Z',
            "task_status_interval_minutes": AppConfig.TASK_STATUS_UPDATE_INTERVAL_MINUTES
        }

        if redis_client:
            redis_client.set("pikpak_scheduler_status",
                             json.dumps(scheduler_info), ex=3600)
            logger.info(
                f"Updated scheduler status in Redis. "
                f"Next cleanup: {next_cleanup_time.isoformat()}Z, "
                f"Next WebDAV: {next_webdav_time.isoformat()}Z, "
                f"Next task status update: {next_task_status_time.isoformat()}Z"
            )
    except Exception as e:
        logger.error(f"Failed to update scheduler status in Redis: {e}")


def init_scheduler(pikpak, supabase, webdav, redis_cli, cache):
    """
    Initialize the scheduler with required services.

    This is the main entry point for scheduler initialization. It sets up
    global service instances and attempts to acquire the distributed lock
    to start background tasks.

    Args:
        pikpak: PikPak service instance
        supabase: Supabase service instance
        webdav: WebDAV manager instance
        redis_cli: Redis client instance
        cache: Cache manager instance
    """
    global pikpak_service, supabase_service, webdav_manager, redis_client, cache_manager

    pikpak_service = pikpak
    supabase_service = supabase
    webdav_manager = webdav
    redis_client = redis_cli
    cache_manager = cache

    # Initialize background tasks with distributed locking
    init_background_tasks_lock()


def init_background_tasks_lock():
    """
    Initialize background tasks with Redis-based distributed locking.

    This ensures that only one worker process across multiple Gunicorn workers
    will run the scheduler. Other workers will log that the lock is held by
    another worker and skip scheduler initialization.
    """
    global _distributed_lock

    if not redis_client:
        logger.warning(
            "Redis client not available, skipping distributed lock init")
        return

    try:
        # Create and try to acquire the distributed lock
        _distributed_lock = RedisDistributedLock(redis_client)

        if _distributed_lock.acquire():
            # We got the lock, start background tasks
            _start_background_tasks()
        else:
            # Another worker has the lock
            logger.info("Scheduler is running in another worker")

    except Exception as e:
        logger.error(
            f"Error initializing background tasks: {e}", exc_info=True)
