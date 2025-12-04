"""Quota and Status Routes"""
import logging
import json
from datetime import datetime, timedelta, timezone
import redis
from flask import Blueprint, jsonify
from app.core.config import AppConfig
from app.api.utils.async_helpers import run_async
from app.api.utils.dependencies import (
    get_pikpak_service,
    get_cache_manager,
    get_scheduler
)

logger = logging.getLogger(__name__)

# Create blueprint
bp = Blueprint('quota', __name__)


def _parse_scheduler_data(data):
    try:
        scheduler_info = json.loads(data)
        if scheduler_info.get("status") == "running":
            return {
                "scheduler_running": True,
                "next_cleanup": scheduler_info.get("next_cleanup"),
                "message": (
                    f"Distributed scheduler is running on worker {scheduler_info.get('worker_id')}. "
                    f"Next cleanup: {scheduler_info.get('next_cleanup')}"
                )
            }
        else:
            return {"message": "Distributed scheduler is not currently running on any worker"}
    except json.JSONDecodeError:
        if data == "running":
            return {
                "scheduler_running": True,
                "message": "Distributed scheduler is running on one of the workers"
            }
        else:
            return {"message": "Distributed scheduler is not currently running on any worker"}


def _get_redis_scheduler_status():
    try:
        redis_client = redis.from_url(
            AppConfig.REDIS_URL, decode_responses=True)
        try:
            scheduler_status_data = redis_client.get("pikpak_scheduler_status")
            if scheduler_status_data:
                return _parse_scheduler_data(scheduler_status_data)
            else:
                return {"message": "No scheduler status found in Redis"}
        finally:
            redis_client.close()
    except Exception as redis_error:
        logger.error(
            f"Error accessing Redis for scheduler status: {redis_error}")
        return {"message": f"Could not access Redis for scheduler status: {str(redis_error)}"}


def _handle_cleanup_job(job):
    next_run = getattr(job, 'next_run_time', None)
    if next_run:
        return {
            "next_cleanup": next_run.isoformat(),
            "message": (
                f"Local scheduler running on this worker. Next cleanup: {next_run.isoformat()}"
            )
        }
    else:
        return {"message": "Job exists but next run time not yet calculated"}


def _get_local_scheduler_status():
    try:
        app_scheduler = get_scheduler()
        if app_scheduler and app_scheduler.running:
            job = app_scheduler.get_job('cleanup_job')
            if job:
                updates = _handle_cleanup_job(job)
                updates["scheduler_running"] = app_scheduler.running
                return updates
            else:
                return {"scheduler_running": app_scheduler.running}
    except Exception as scheduler_error:
        logger.error(
            f"Error accessing local scheduler status: {scheduler_error}")
    return {}


def _calculate_next_refresh_time(cached_at_str, remaining_ttl):
    """Calculate the next refresh time based on cached_at or remaining TTL"""
    next_refresh_utc = None

    if cached_at_str:
        try:
            cached_at = datetime.fromisoformat(cached_at_str)
            if cached_at.tzinfo is None:
                cached_at = cached_at.replace(tzinfo=timezone.utc)

            next_refresh_dt = cached_at + \
                timedelta(seconds=AppConfig.QUOTA_CACHE_TTL)
            next_refresh_utc = next_refresh_dt.isoformat()
            if next_refresh_utc.endswith('+00:00'):
                next_refresh_utc = next_refresh_utc.replace('+00:00', 'Z')
        except ValueError:
            pass

    if not next_refresh_utc:
        next_refresh_utc = (
            datetime.now(timezone.utc) +
            timedelta(seconds=remaining_ttl)
        ).isoformat() + 'Z'

    return next_refresh_utc


def _add_refresh_info(quota_data, remaining_ttl):
    """Add refresh information to quota data"""
    next_refresh_utc = _calculate_next_refresh_time(
        quota_data.get("cached_at"), remaining_ttl)

    quota_data["refresh_info"] = {
        "quota_refresh_interval_seconds": AppConfig.QUOTA_CACHE_TTL,
        "quota_next_refresh": next_refresh_utc,
        "webdav_generation_interval_hours": AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS,
        "webdav_next_refresh": None
    }
    return quota_data


def _get_webdav_refresh_info(quota_data):
    """Get WebDAV refresh information from Redis"""
    try:
        redis_client = redis.from_url(
            AppConfig.REDIS_URL, decode_responses=True)
        try:
            scheduler_status_data = redis_client.get("pikpak_scheduler_status")
            if scheduler_status_data:
                try:
                    scheduler_info = json.loads(scheduler_status_data)
                    quota_data["refresh_info"]["webdav_next_refresh"] = scheduler_info.get(
                        "next_webdav_generation")
                except json.JSONDecodeError:
                    pass  # Ignore if JSON parsing fails
        finally:
            redis_client.close()
    except Exception as redis_error:
        logger.error(
            f"Error accessing Redis for WebDAV refresh info: {redis_error}")


async def _get_quota_data():
    """Main function to get quota data with proper separation of concerns"""
    cache_key = "quota_info"
    cache_manager = get_cache_manager()
    cached_quota = cache_manager.get(cache_key)

    if cached_quota is not None:
        return _handle_cached_quota(cached_quota, cache_manager, cache_key)

    return await _handle_cache_miss(cache_key, cache_manager)


def _handle_cached_quota(cached_quota, cache_manager, cache_key):
    """Handle the case when quota data is found in cache"""
    logger.info("Returning cached quota information")
    remaining_ttl = cache_manager.get_ttl(cache_key)
    logger.info(f"Remaining TTL for quota cache: {remaining_ttl} seconds")

    quota_with_refresh = _add_refresh_info(cached_quota.copy(), remaining_ttl)
    logger.info(
        f"Calculated next refresh time: {quota_with_refresh['refresh_info']['quota_next_refresh']}")

    _get_webdav_refresh_info(quota_with_refresh)

    return jsonify(quota_with_refresh)


async def _handle_cache_miss(cache_key, cache_manager):
    """Handle the case when quota data is not found in cache"""
    logger.info("Cache miss - fetching quota from PikPak")

    # Get both quota types
    pikpak_service = get_pikpak_service()
    storage_quota = await pikpak_service.get_quota_info()
    transfer_quota = await pikpak_service.get_transfer_quota()

    # Combine the results (cache only the actual quota data, not refresh_info)
    quota_data_to_cache = {
        "storage": storage_quota,
        "transfer": transfer_quota,
        "cached_at": datetime.now(timezone.utc).isoformat()
    }

    # Cache the result for 3 hours (without refresh_info)
    cache_manager.set(cache_key, quota_data_to_cache,
                      ttl=AppConfig.QUOTA_CACHE_TTL)
    logger.info("Successfully retrieved and cached quota information (3 hours)")

    quota_data = _add_refresh_info(
        quota_data_to_cache, AppConfig.QUOTA_CACHE_TTL)
    _get_webdav_refresh_info(quota_data)

    return jsonify(quota_data)


@bp.route('/quota', methods=['GET'])
def get_quota():
    """Get storage and transfer quota information with caching (3 hours)"""
    async def _async_get_quota():
        try:
            return await _get_quota_data()
        except Exception as e:
            logger.error(f"Failed to get quota: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_get_quota())


@bp.route('/cleanup/status', methods=['GET'])
def cleanup_status():
    """Get cleanup schedule status"""
    try:
        result = {
            "cleanup_interval_hours": AppConfig.CLEANUP_INTERVAL_HOURS,
            "task_retention_hours": AppConfig.TASK_RETENTION_HOURS,
            "scheduler_running": False,
            "next_cleanup": None,
            "message": "Checking distributed scheduler status..."
        }

        redis_updates = _get_redis_scheduler_status()
        result.update(redis_updates)

        local_updates = _get_local_scheduler_status()
        result.update(local_updates)

        # Simplified response
        simple_result = {
            "scheduler_running": result["scheduler_running"],
            "next_cleanup": result["next_cleanup"],
            "message": result["message"],
            "cleanup_interval_hours": result["cleanup_interval_hours"],
            "task_retention_hours": result["task_retention_hours"]
        }
        return jsonify(simple_result)

    except Exception as e:
        logger.error(f"Failed to fetch cleanup status: {e}")
        return jsonify({"error": str(e)}), 500
