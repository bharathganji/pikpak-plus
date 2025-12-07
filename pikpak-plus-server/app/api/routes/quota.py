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
    get_cache_manager
)

logger = logging.getLogger(__name__)

# Timezone format constants
UTC_TIMEZONE_OFFSET = '+00:00'
UTC_ZULU_FORMAT = 'Z'

# Create blueprint
bp = Blueprint('quota', __name__)


def _get_scheduler_status():
    """Get scheduler status from Redis"""
    try:
        redis_client = redis.from_url(
            AppConfig.REDIS_URL, decode_responses=True)
        try:
            status_data = redis_client.get("pikpak_scheduler_status")
            if status_data:
                return json.loads(status_data)
        finally:
            redis_client.close()
    except Exception as e:
        logger.error(f"Error fetching scheduler status: {e}")
    return {}


def _is_scheduler_running(scheduler_info):
    """Check if scheduler is running based on heartbeat"""
    if not scheduler_info:
        return False

    last_heartbeat = scheduler_info.get("last_heartbeat")
    if not last_heartbeat:
        return False

    try:
        # Check if heartbeat is recent (within last 3 minutes)
        heartbeat_time = datetime.fromisoformat(
            last_heartbeat.replace(UTC_ZULU_FORMAT, UTC_TIMEZONE_OFFSET))
        now = datetime.now(timezone.utc)
        return (now - heartbeat_time).total_seconds() < 180
    except Exception:
        return False


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
            if next_refresh_utc.endswith(UTC_TIMEZONE_OFFSET):
                next_refresh_utc = next_refresh_utc.replace(
                    UTC_TIMEZONE_OFFSET, UTC_ZULU_FORMAT)
        except ValueError:
            pass

    if not next_refresh_utc:
        next_refresh_utc = (
            datetime.now(timezone.utc) +
            timedelta(seconds=remaining_ttl)
        ).isoformat() + UTC_ZULU_FORMAT

    return next_refresh_utc


def _add_refresh_info(quota_data, remaining_ttl):
    """Add refresh information to quota data"""
    next_refresh_utc = _calculate_next_refresh_time(
        quota_data.get("cached_at"), remaining_ttl)

    # Get WebDAV refresh info from Redis
    scheduler_info = _get_scheduler_status()
    webdav_next = scheduler_info.get("next_webdav_generation")
    next_cleanup = scheduler_info.get("next_cleanup")

    # Fallback calculation if missing (startup scenario)
    now = datetime.now(timezone.utc)

    if not webdav_next:
        if scheduler_info.get("status") == "running":
            webdav_next = "Pending (Starting...)"
        else:
            webdav_next = "Scheduler Not Running"

    if not next_cleanup:
        # Cleanup runs every CLEANUP_INTERVAL_HOURS hours at minute 0
        interval = AppConfig.CLEANUP_INTERVAL_HOURS
        current_hour = now.hour
        hours_until_next = interval - (current_hour % interval)
        next_run = now.replace(
            minute=0, second=0, microsecond=0) + timedelta(hours=hours_until_next)
        if next_run <= now:
            next_run += timedelta(hours=interval)
        next_cleanup = next_run.isoformat() + UTC_ZULU_FORMAT

    quota_data["refresh_info"] = {
        "quota_refresh_interval_seconds": AppConfig.QUOTA_CACHE_TTL,
        "quota_next_refresh": next_refresh_utc,
        "webdav_generation_interval_hours": AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS,
        "webdav_next_refresh": webdav_next,
        "next_cleanup": next_cleanup
    }
    return quota_data


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
        scheduler_info = _get_scheduler_status()
        is_running = _is_scheduler_running(scheduler_info)
        next_cleanup = scheduler_info.get("next_cleanup")

        message = "Scheduler is running" if is_running else "Scheduler is not running or heartbeat is stale"
        if is_running and next_cleanup:
            message += f". Next cleanup: {next_cleanup}"

        result = {
            "scheduler_running": is_running,
            "next_cleanup": next_cleanup,
            "message": message,
            "cleanup_interval_hours": AppConfig.CLEANUP_INTERVAL_HOURS,
            "task_retention_hours": AppConfig.TASK_RETENTION_HOURS
        }
        return jsonify(result)

    except Exception as e:
        logger.error(f"Failed to fetch cleanup status: {e}")
        return jsonify({"error": str(e)}), 500
