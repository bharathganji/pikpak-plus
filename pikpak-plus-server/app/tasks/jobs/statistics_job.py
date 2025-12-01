"""Statistics Collection Job - Collect and store daily usage statistics."""
import logging
import json
from datetime import datetime, timedelta, timezone

from app.core.config import AppConfig
from app.services.pikpak_service import PikPakService

logger = logging.getLogger(__name__)


async def collect_daily_statistics(pikpak_service, supabase_service, redis_client):
    """
    Collect daily statistics and store in Supabase.

    Args:
        pikpak_service: Global PikPak service instance
        supabase_service: Supabase service instance
        redis_client: Redis client for updating scheduler status
    """
    run_time = datetime.now(timezone.utc)
    logger.info(
        f"Running daily statistics collection at {run_time.isoformat()}Z...")

    # Validate required services
    if not pikpak_service or not pikpak_service.client:
        logger.warning(
            "Global PikPak service not initialized, skipping statistics collection")
        return

    if not supabase_service:
        logger.warning(
            "Supabase client not initialized, skipping statistics collection")
        return

    try:
        # Create a local service instance for this thread
        local_pikpak_service = PikPakService(
            username=pikpak_service.client.username,
            password=pikpak_service.client.password
        )
        await local_pikpak_service.ensure_logged_in()

        # 1. Get Storage Usage
        quota_info = await local_pikpak_service.client.get_quota_info()
        storage_quota = quota_info.get("quota", {})
        storage_used = int(storage_quota.get("usage", 0))
        
        # 2. Get Downstream Traffic (Play Times Usage)
        downstream_traffic = int(storage_quota.get("play_times_usage", 0))

        # 3. Get Transfer (Cloud Download) Usage
        transfer_info = await local_pikpak_service.client.get_transfer_quota()
        transfer_used = 0
        if "quotas" in transfer_info:
            for q in transfer_info["quotas"]:
                if q.get("type") == "transfer":
                    transfer_used = int(q.get("usage", 0))
                    break

        # 4. Count Tasks Added (Last 24 hours)
        yesterday = run_time - timedelta(days=1)
        tasks_added = supabase_service.count_tasks_added_since(
            yesterday.isoformat())

        # 5. Premium Expiration
        vip_info = await local_pikpak_service.client.vip_info()
        premium_expiration = vip_info.get("data", {}).get("expire")

        # Prepare stats data
        stats_data = {
            "date": run_time.date().isoformat(),
            "tasks_added": tasks_added,
            "storage_used": storage_used,
            "transfer_used": transfer_used,
            "downstream_traffic": downstream_traffic,
            "premium_expiration": premium_expiration,
            "created_at": run_time.isoformat()
        }

        # Log to Supabase
        supabase_service.log_daily_stats(stats_data)

        # Update Redis status
        # Calculate next run time (24 hours from now)
        next_run_time = run_time + timedelta(hours=24)

        _update_redis_status(
            redis_client,
            run_time,
            next_run_time,
            "statistics_collection"
        )

        logger.info(
            f"Daily statistics collected successfully for {stats_data['date']}")

    except Exception as e:
        logger.error(f"Failed to collect daily statistics: {e}", exc_info=True)


def _update_redis_status(redis_client, run_time, next_run_time, job_name):
    """Helper to update Redis status (duplicated from task_status_job to avoid circular imports if shared utils not available)"""
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
    except Exception as e:
        logger.error(f"Failed to update next {job_name} time in Redis: {e}")
