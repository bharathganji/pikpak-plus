from celery import shared_task
from app.core.config import AppConfig
from app.tasks.utils import update_redis_status
from datetime import datetime, timezone
import redis
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='app.tasks.jobs.heartbeat_job.scheduler_heartbeat')
def scheduler_heartbeat(self):
    """
    Update the scheduler heartbeat in Redis.
    This allows the API to know that the scheduler is running.
    """
    run_time = datetime.now(timezone.utc)

    try:
        redis_client = redis.from_url(
            AppConfig.REDIS_URL, decode_responses=True)
        try:
            # We don't have a "next run" for heartbeat in the same way,
            # but we can just pass current time as next run or ignore it in utils if job_name is None
            # Actually, let's pass None for job_name to only update heartbeat
            update_redis_status(redis_client, run_time, run_time, None)
            # logger.debug(f"Scheduler heartbeat updated at {run_time.isoformat()}")
        finally:
            redis_client.close()

    except Exception as e:
        logger.error(f"Failed to update scheduler heartbeat: {e}")
