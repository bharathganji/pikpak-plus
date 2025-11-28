"""WebDAV Management Routes"""
import logging
import json
from datetime import datetime, timedelta
import redis
from flask import Blueprint, request, jsonify
from app.core.config import AppConfig
from app.core.auth import internal_only
from app.api.utils.async_helpers import run_async
from app.api.utils.dependencies import (
    get_pikpak_service,
    get_webdav_manager,
    get_cache_manager
)

logger = logging.getLogger(__name__)

# Create blueprint
bp = Blueprint('webdav', __name__)


@bp.route('/webdav/applications', methods=['GET'])
@internal_only
def get_webdav_applications():
    """
    Get WebDAV configuration and application list

    INTERNAL ONLY - Not accessible from external systems
    """
    async def _async_get_webdav_applications():
        try:
            pikpak_service = get_pikpak_service()
            result = await pikpak_service.get_webdav_applications()
            return jsonify(result)
        except Exception as e:
            logger.error(f"Failed to get WebDAV applications: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_get_webdav_applications())


@bp.route('/webdav/toggle', methods=['POST'])
@internal_only
def toggle_webdav():
    """
    Toggle WebDAV status

    INTERNAL ONLY - Not accessible from external systems
    """
    async def _async_toggle_webdav():
        try:
            data = request.json
            enable = data.get('enable')

            if enable is None:
                return jsonify({"error": "Missing 'enable' parameter"}), 400

            pikpak_service = get_pikpak_service()
            result = await pikpak_service.toggle_webdav(enable)
            return jsonify(result)
        except Exception as e:
            logger.error(f"Failed to toggle WebDAV: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_toggle_webdav())


@bp.route('/webdav/application', methods=['POST'])
@internal_only
def create_webdav_application():
    """
    Create a new WebDAV application

    INTERNAL ONLY - Not accessible from external systems
    Used by scheduled job to generate planet-named clients
    """
    async def _async_create_webdav_application():
        try:
            data = request.json
            application_name = data.get('application_name')

            if not application_name:
                return jsonify({"error": "Missing 'application_name' parameter"}), 400

            pikpak_service = get_pikpak_service()
            result = await pikpak_service.create_webdav_application(application_name)
            return jsonify(result)
        except Exception as e:
            logger.error(f"Failed to create WebDAV application: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_create_webdav_application())


@bp.route('/webdav/application', methods=['DELETE'])
@internal_only
def delete_webdav_application():
    """
    Delete a WebDAV application

    INTERNAL ONLY - Not accessible from external systems
    Used by scheduled job to cleanup expired clients
    """
    async def _async_delete_webdav_application():
        try:
            data = request.json
            username = data.get('username')
            password = data.get('password')

            if not username or not password:
                return jsonify({"error": "Missing 'username' or 'password' parameter"}), 400

            pikpak_service = get_pikpak_service()
            result = await pikpak_service.delete_webdav_application(username, password)
            return jsonify(result)
        except Exception as e:
            logger.error(f"Failed to delete WebDAV application: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_delete_webdav_application())


@bp.route('/webdav/active-clients', methods=['GET'])
def get_active_webdav_clients():
    """
    Get list of active WebDAV clients with TTL info

    EXTERNAL ENDPOINT - Accessible from frontend
    """
    async def _async_get_active_webdav_clients():
        try:
            webdav_manager = get_webdav_manager()
            cache_manager = get_cache_manager()

            logger.info("=== WebDAV API Debug ===")
            logger.info(f"WebDAV Manager exists: {webdav_manager is not None}")
            logger.info(f"Cache Manager exists: {cache_manager is not None}")

            if not webdav_manager:
                logger.error("WebDAV manager is not initialized")
                # Get actual remaining TTL from Redis for quota cache
                quota_cache_key = "quota_info"
                remaining_quota_ttl = 0
                if cache_manager:
                    remaining_quota_ttl = cache_manager.get_ttl(quota_cache_key)

                result = {
                    "available": False,
                    "message": "WebDAV manager not initialized",
                    "clients": [],
                    "refresh_info": {
                        "webdav_generation_interval_hours": AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS,
                        "webdav_next_refresh": None,
                        "quota_refresh_interval_seconds": AppConfig.QUOTA_CACHE_TTL,
                        "quota_next_refresh": (datetime.utcnow() + timedelta(seconds=remaining_quota_ttl)).isoformat()
                    }
                }
                logger.error(f"Returning error response: {result}")
                return jsonify(result), 500

            logger.info("Calling webdav_manager.get_active_clients()")
            result = await webdav_manager.get_active_clients()
            logger.info(f"WebDAV manager returned: {result}")

            # Get actual remaining TTL from Redis for quota cache
            quota_cache_key = "quota_info"
            remaining_quota_ttl = 0
            if cache_manager:
                remaining_quota_ttl = cache_manager.get_ttl(quota_cache_key)

            # Simplified response structure
            simple_result = {
                "available": result.get("available", False),
                "clients": result.get("clients", []),
                "message": result.get("message", ""),
                "refresh_info": {
                    "webdav_generation_interval_hours": AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS,
                    "webdav_next_refresh": None,
                    "quota_refresh_interval_seconds": AppConfig.QUOTA_CACHE_TTL,
                    "quota_next_refresh": (datetime.utcnow() + timedelta(seconds=remaining_quota_ttl)).isoformat()
                }
            }

            # logger.info(f"Final response structure: {simple_result}")
            logger.info(f"Clients count: {len(simple_result.get('clients', []))}")

            # Get WebDAV refresh info from Redis
            try:
                redis_client = redis.from_url(
                    AppConfig.REDIS_URL, decode_responses=True)
                scheduler_status_data = redis_client.get(
                    "pikpak_scheduler_status")
                if scheduler_status_data:
                    try:
                        scheduler_info = json.loads(scheduler_status_data)
                        simple_result["refresh_info"]["webdav_next_refresh"] = scheduler_info.get(
                            "next_cleanup")
                        logger.info(f"Found scheduler info: {scheduler_info}")
                    except json.JSONDecodeError:
                        logger.warning("Failed to parse scheduler status JSON")
                        pass  # Ignore if JSON parsing fails
            except Exception as redis_error:
                logger.warning(
                    f"Error accessing Redis for WebDAV refresh info: {redis_error}")

            logger.info("=== WebDAV API Debug Complete ===")
            return jsonify(simple_result)
        except Exception as e:
            logger.error(f"Failed to get active WebDAV clients: {e}")
            result = {
                "available": False,
                "message": f"Error: {str(e)}",
                "clients": []
            }
            return jsonify(result), 500

    return run_async(_async_get_active_webdav_clients())
