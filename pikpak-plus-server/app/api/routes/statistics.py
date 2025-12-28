"""Statistics Routes"""
import logging
import json
import redis
from flask import Blueprint, jsonify, request
from app.api.utils.dependencies import get_supabase_service
from app.core.config import AppConfig

logger = logging.getLogger(__name__)

bp = Blueprint('statistics', __name__)


def _get_statistics_schedule_info():
    """Get statistics collection schedule info from Redis"""
    try:
        redis_client = redis.from_url(
            AppConfig.REDIS_URL, decode_responses=True)
        try:
            scheduler_status_data = redis_client.get("pikpak_scheduler_status")
            if scheduler_status_data:
                scheduler_info = json.loads(scheduler_status_data)
                return {
                    "next_update": scheduler_info.get("next_statistics_collection"),
                    "last_update": scheduler_info.get("last_statistics_collection"),
                    "scheduler_running": scheduler_info.get("status") == "running"
                }
        finally:
            redis_client.close()
    except Exception as e:
        logger.error(f"Error getting statistics schedule info: {e}")

    return {
        "next_update": None,
        "last_update": None,
        "scheduler_running": False
    }


@bp.route('/statistics', methods=['GET'])
def get_statistics():
    """Get daily statistics history with schedule info"""
    try:
        limit = int(request.args.get('limit', 30))
        supabase_service = get_supabase_service()

        stats = supabase_service.get_daily_stats(limit)
        schedule_info = _get_statistics_schedule_info()

        return jsonify({
            "data": stats,
            "schedule": schedule_info
        })
    except Exception as e:
        logger.error(f"Failed to fetch statistics: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route('/statistics/status', methods=['GET'])
def get_statistics_status():
    """Get statistics collection schedule status"""
    try:
        schedule_info = _get_statistics_schedule_info()
        return jsonify(schedule_info)
    except Exception as e:
        logger.error(f"Failed to fetch statistics status: {e}")
        return jsonify({"error": str(e)}), 500
