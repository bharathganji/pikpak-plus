"""System Routes (Health, Config)"""
import logging
from flask import Blueprint, jsonify
from app.core.config import AppConfig
from app.api.utils.dependencies import (
    get_pikpak_service,
    get_supabase_service
)

logger = logging.getLogger(__name__)

# Create blueprint
bp = Blueprint('system', __name__)


@bp.route('/config', methods=['GET'])
def get_config():
    """Get public configuration"""
    import json
    import redis

    result = {
        "max_file_size_gb": AppConfig.MAX_FILE_SIZE_GB,
        "task_status_update_interval_minutes": AppConfig.TASK_STATUS_UPDATE_INTERVAL_MINUTES,
        "next_task_status_update": None
    }

    # Get next task status update time from Redis
    try:
        redis_client = redis.from_url(AppConfig.REDIS_URL, decode_responses=True)
        scheduler_status_data = redis_client.get("pikpak_scheduler_status")
        if scheduler_status_data:
            try:
                scheduler_info = json.loads(scheduler_status_data)
                result["next_task_status_update"] = scheduler_info.get("next_task_status_update")
            except json.JSONDecodeError:
                pass  # Ignore if JSON parsing fails
    except Exception as redis_error:
        logger.error(f"Error accessing Redis for task status update info: {redis_error}")

    return jsonify(result)


@bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    status = "ok"
    issues = []

    # Check config
    if not AppConfig.PIKPAK_USER or not AppConfig.PIKPAK_PASS:
        status = "degraded"
        issues.append("PikPak credentials missing")

    if not AppConfig.SUPABASE_URL or not AppConfig.SUPABASE_KEY:
        status = "degraded"
        issues.append("Supabase credentials missing")

    # Check PikPak
    pikpak_service = get_pikpak_service()
    if not pikpak_service or not pikpak_service.client:
        status = "degraded"
        issues.append("PikPak client not initialized")

    # Check Supabase
    supabase_service = get_supabase_service()
    healthy, error = supabase_service.health_check()
    if not healthy:
        status = "degraded"
        issues.append(error)

    return jsonify({"status": status, "issues": issues})
