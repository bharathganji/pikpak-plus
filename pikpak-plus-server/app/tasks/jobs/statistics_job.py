"""Statistics Collection Job - Collect and store daily usage statistics."""
import logging
import json
import asyncio
from datetime import datetime, timedelta, timezone

from app.core.config import AppConfig
from celery import shared_task
from app.services import PikPakService, SupabaseService
from app.core.config import AppConfig
import redis
import asyncio

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='app.tasks.jobs.statistics_job.collect_daily_statistics')
def collect_daily_statistics(self):
    """
    Collect daily statistics and store in Supabase.
    """
    run_time = datetime.now(timezone.utc)
    logger.info(
        f"Running daily statistics collection at {run_time.isoformat()}Z...")

    try:
        # Initialize services locally
        redis_client = redis.from_url(
            AppConfig.REDIS_URL, decode_responses=True)

        # Initialize Supabase
        from supabase import create_client
        supabase_client = create_client(
            AppConfig.SUPABASE_URL, AppConfig.SUPABASE_KEY)
        supabase_service = SupabaseService(supabase_client)

        # Initialize PikPak
        pikpak_service = PikPakService(
            AppConfig.PIKPAK_USER, AppConfig.PIKPAK_PASS)

        # Run async logic in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            loop.run_until_complete(pikpak_service.ensure_logged_in())

            # Determine target date (yesterday)
            target_date = (run_time - timedelta(days=1)).date()
            target_date_str = target_date.isoformat()

            # Check if stats already exist for this date
            existing_stats = loop.run_until_complete(
                asyncio.to_thread(supabase_service.get_daily_stats, limit=1)
            )

            # Simple check: if the latest stat is for our target date, skip
            if existing_stats and existing_stats[0].get('date') == target_date_str:
                logger.info(
                    f"Statistics for {target_date_str} already exist. Skipping.")

                # Update Redis status for next check (1 hour later)
                from app.tasks.utils import update_redis_status
                next_run_time = run_time + timedelta(hours=1)
                update_redis_status(redis_client, run_time,
                                    next_run_time, "statistics_collection")
                return

            logger.info(f"Collecting statistics for {target_date_str}...")

            # Parallelize independent API calls for faster collection
            # We need to access the client directly from the service
            quota_info, transfer_info, vip_info = loop.run_until_complete(asyncio.gather(
                pikpak_service.client.get_quota_info(),
                pikpak_service.client.get_transfer_quota(),
                pikpak_service.client.vip_info()
            ))

            # 1. Get Storage Usage
            storage_quota = quota_info.get("quota", {})
            storage_used = int(storage_quota.get("usage", 0))

            # 2. Get Cloud Download Traffic (Offline Downloads)
            transfer_base = transfer_info.get("base", {})
            offline_info = transfer_base.get("offline", {})
            transfer_used = int(offline_info.get("assets", 0))

            # 3. Get Downstream Traffic (Streaming & Direct Downloads)
            download_info = transfer_base.get("download", {})
            downstream_traffic = int(download_info.get("assets", 0))

            # 4. Count Tasks Added (Target Day 00:00 to 23:59:59)
            start_of_day = datetime.combine(
                target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            end_of_day = start_of_day + timedelta(days=1)

            tasks_added = supabase_service.count_tasks_added_between(
                start_of_day.isoformat(),
                end_of_day.isoformat()
            )

            # 5. Premium Expiration
            premium_expiration = vip_info.get("data", {}).get("expire")

            # Prepare stats data
            stats_data = {
                "date": target_date_str,
                "tasks_added": tasks_added,
                "storage_used": storage_used,
                "transfer_used": transfer_used,
                "downstream_traffic": downstream_traffic,
                "premium_expiration": premium_expiration,
                "created_at": run_time.isoformat()
            }

            # Log to Supabase
            supabase_service.log_daily_stats(stats_data)

            logger.info(
                f"Daily statistics collected successfully for {stats_data['date']}")

            # Update Redis status
            from app.tasks.utils import update_redis_status

            # Check again in 1 hour
            next_run_time = run_time + timedelta(hours=1)
            update_redis_status(redis_client, run_time,
                                next_run_time, "statistics_collection")

        finally:
            loop.close()
            redis_client.close()

    except Exception as e:
        logger.error(f"Failed to collect daily statistics: {e}", exc_info=True)
        raise self.retry(exc=e, countdown=300, max_retries=3)
