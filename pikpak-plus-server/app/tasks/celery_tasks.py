import logging
import asyncio
import json
from datetime import datetime, timezone, timedelta
from flask import current_app
from app.celery_app import celery
from app.core.config import AppConfig
from app.services.pikpak_service import PikPakService
from app.services.webdav import WebDAVManager
from app.tasks.cleanup import run_cleanup

logger = logging.getLogger(__name__)


def update_redis_status(redis_client, run_time, next_run_time, job_name):
    """Update Redis with the next scheduled run time for a job."""
    try:
        if not redis_client:
            return

        scheduler_status_data = redis_client.get("pikpak_scheduler_status")
        scheduler_info = {}
        if scheduler_status_data:
            try:
                scheduler_info = json.loads(scheduler_status_data)
            except json.JSONDecodeError:
                pass

        # Ensure basic fields exist
        if "status" not in scheduler_info:
            scheduler_info["status"] = "running"

        scheduler_info[f"next_{job_name}"] = next_run_time.isoformat().split(
            '+')[0] + 'Z'
        scheduler_info[f"last_{job_name}"] = run_time.isoformat().split(
            '+')[0] + 'Z'

        redis_client.set("pikpak_scheduler_status",
                         json.dumps(scheduler_info), ex=86400)  # 24h TTL

    except Exception as e:
        logger.error(f"Failed to update next {job_name} time in Redis: {e}")


def get_services():
    """Helper to get services from current_app"""
    return (
        current_app.pikpak_service,
        current_app.supabase_service,
        current_app.webdav_manager,
        current_app.cache_manager,
        current_app.redis_client
    )


async def _ensure_local_pikpak_login(pikpak_service):
    """Create a local PikPak service instance and ensure logged in"""
    local_service = PikPakService(
        username=pikpak_service.client.username,
        password=pikpak_service.client.password
    )
    await local_service.ensure_logged_in()
    return local_service


@celery.task(name='cleanup_tasks')
def cleanup_tasks():
    """Celery task for cleaning up old tasks and files"""
    pikpak_service, supabase_service, _, _, _ = get_services()

    async def _run():
        logger.info("Running scheduled cleanup task...")
        try:
            local_pikpak = await _ensure_local_pikpak_login(pikpak_service)

            await run_cleanup(
                local_pikpak,
                supabase_service.client if supabase_service else None,
                age_hours=AppConfig.TASK_RETENTION_HOURS
            )

            # Update Redis Status
            run_time = datetime.now(timezone.utc)
            next_run = run_time + \
                timedelta(hours=AppConfig.CLEANUP_INTERVAL_HOURS)
            update_redis_status(current_app.redis_client,
                                run_time, next_run, "cleanup")

            logger.info("Cleanup task completed successfully")
        except Exception as e:
            logger.error(f"Cleanup task failed: {e}", exc_info=True)
            raise

    # Run async code in sync Celery worker
    asyncio.run(_run())


@celery.task(name='update_task_status')
def update_task_status():
    """Celery task for synchronizing task statuses"""
    pikpak_service, supabase_service, _, cache_manager, _ = get_services()

    async def _run():
        logger.info("Running scheduled task status update...")
        try:
            local_pikpak = await _ensure_local_pikpak_login(pikpak_service)

            # Fetch tasks
            result = await local_pikpak.get_offline_tasks()
            tasks = result.get('tasks', [])

            # Update Supabase (sync operation)
            updated = supabase_service.update_task_statuses(tasks)
            logger.info(f"Updated {updated} task statuses in Supabase")

            # Invalidate cache
            if cache_manager:
                cache_manager.invalidate_tasks()

            # Update Redis Status
            run_time = datetime.now(timezone.utc)
            next_run = run_time + \
                timedelta(minutes=AppConfig.TASK_STATUS_UPDATE_INTERVAL_MINUTES)
            update_redis_status(current_app.redis_client,
                                run_time, next_run, "task_status_update")

        except Exception as e:
            logger.error(f"Task status update failed: {e}", exc_info=True)
            raise

    asyncio.run(_run())


@celery.task(name='generate_webdav_links')
def generate_webdav_links():
    """Celery task for regenerating WebDAV clients"""
    pikpak_service, _, webdav_manager, cache_manager, _ = get_services()

    async def _run():
        logger.info("Running scheduled WebDAV generation...")
        try:
            local_pikpak = await _ensure_local_pikpak_login(pikpak_service)

            local_webdav = WebDAVManager(
                pikpak_service=local_pikpak,
                ttl_hours=webdav_manager.ttl_hours,
                cache_manager=cache_manager
            )

            result = await local_webdav.create_daily_webdav_clients()

            if result.get('success'):
                logger.info(
                    f"WebDAV generation completed: {result.get('message')}")
                # Update global state (best effort for this worker)
                webdav_manager.active_clients = result.get('clients', [])
                webdav_manager.creation_timestamp = datetime.now(timezone.utc)
            else:
                logger.warning(
                    f"WebDAV generation skipped: {result.get('message')}")

        except Exception as e:
            logger.error(f"WebDAV generation failed: {e}", exc_info=True)
            raise

    asyncio.run(_run())


@celery.task(name='collect_stats')
def collect_stats():
    """Celery task for collecting daily statistics"""
    pikpak_service, supabase_service, _, _, _ = get_services()

    async def _run():
        logger.info("Running daily statistics collection...")
        try:
            local_pikpak = await _ensure_local_pikpak_login(pikpak_service)

            # Parallel API calls
            quota_info, transfer_info, vip_info = await asyncio.gather(
                local_pikpak.client.get_quota_info(),
                local_pikpak.client.get_transfer_quota(),
                local_pikpak.client.vip_info()
            )

            # Process data (logic copied from original job)
            storage_quota = quota_info.get("quota", {})
            storage_used = int(storage_quota.get("usage", 0))
            downstream_traffic = int(storage_quota.get("play_times_usage", 0))

            transfer_used = 0
            if "quotas" in transfer_info:
                for q in transfer_info["quotas"]:
                    if q.get("type") == "transfer":
                        transfer_used = int(q.get("usage", 0))
                        break

            yesterday = datetime.now(timezone.utc) - timedelta(days=1)
            tasks_added = supabase_service.count_tasks_added_since(
                yesterday.isoformat())
            premium_expiration = vip_info.get("data", {}).get("expire")

            stats_data = {
                "date": datetime.now(timezone.utc).date().isoformat(),
                "tasks_added": tasks_added,
                "storage_used": storage_used,
                "transfer_used": transfer_used,
                "downstream_traffic": downstream_traffic,
                "premium_expiration": premium_expiration,
                "created_at": datetime.now(timezone.utc).isoformat()
            }

            supabase_service.log_daily_stats(stats_data)

            # Update Redis Status
            run_time = datetime.now(timezone.utc)
            next_run = run_time + timedelta(hours=24)
            update_redis_status(current_app.redis_client,
                                run_time, next_run, "statistics_collection")

            logger.info(f"Statistics collected for {stats_data['date']}")

        except Exception as e:
            logger.error(f"Statistics collection failed: {e}", exc_info=True)
            raise

    asyncio.run(_run())
