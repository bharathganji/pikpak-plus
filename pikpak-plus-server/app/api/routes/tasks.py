"""Task Management Routes"""
import logging

from flask import Blueprint, jsonify, request

from app.api.utils.async_helpers import run_async
from app.api.utils.dependencies import (
    get_cache_manager,
    get_pikpak_service,
    get_supabase_service,
)
from app.core.auth import get_current_user, require_auth
from app.core.config import AppConfig
from app.services import WhatsLinkService
from app.services.user_service import UserService
from app.utils.common import extract_e2dk_hash, extract_magnet_hash, validate_link
from app.utils.validators import get_json_body, validate_pagination

logger = logging.getLogger(__name__)

# Create blueprint
bp = Blueprint('tasks', __name__)


def check_duplicate_task(url: str):
    """Check if a task with the same hash already exists (supports both magnet and E2DK)"""
    # Try to extract magnet hash first
    magnet_hash = extract_magnet_hash(url)
    if magnet_hash:
        supabase_service = get_supabase_service()
        return supabase_service.check_existing_task_by_hash(magnet_hash)
    
    # Try to extract E2DK hash
    e2dk_hash = extract_e2dk_hash(url)
    if e2dk_hash:
        supabase_service = get_supabase_service()
        return supabase_service.check_existing_task_by_hash(e2dk_hash)
    
    return None


@bp.route('/add', methods=['POST'])
@require_auth
def add_task():
    """Add a new download task (magnet or E2DK) with file size validation and user tracking"""
    async def _async_add_task():
        # Get current user
        user_data = get_current_user()
        if not user_data:
            return jsonify({"error": "Authentication required"}), 401

        user_email = user_data['email']

        # Check if user is blocked
        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        if user_service.is_user_blocked(user_email):
            return jsonify({
                "error": "Account blocked",
                "message": "Your account has been blocked. You cannot perform this action."
            }), 403

        data, err = get_json_body(request)
        if err:
            return err[0], err[1]
        url = data.get('url')

        if not url or not isinstance(url, str):
            return jsonify({"error": "No URL provided"}), 400

        url = url.strip()
        if len(url) > 4096:
            return jsonify({"error": "URL length exceeds maximum limit of 4096 characters"}), 400

        logger.info(f"Received add request for: {url}")

        # Validate link type (magnet or E2DK)
        is_valid, error_msg, link_type = validate_link(url)
        if not is_valid:
            logger.warning(f"Invalid link format for {url}: {error_msg}")
            return jsonify({"error": error_msg}), 400

        logger.info(f"Processing {link_type} link: {url}")

        # Check for existing task (deduplication)
        existing_task = check_duplicate_task(url)
        if existing_task:
            logger.info(f"Duplicate task found for url {url}")
            return jsonify({
                "message": "Task already exists",
                "task": existing_task,
                "file_info": {}  # No need to re-fetch file info
            })

        # Check file size using WhatsLink.info API
        is_valid, error_msg, file_info = await WhatsLinkService.check_file_size_limit(
            url,
            AppConfig.MAX_FILE_SIZE_GB
        )

        if not is_valid:
            logger.warning(f"File size limit exceeded for {url}: {error_msg}")
            return jsonify({
                "error": error_msg,
                "file_info": file_info
            }), 400

        # Add to PikPak
        pikpak_service = get_pikpak_service()
        try:
            task_result = await pikpak_service.add_download(url)
        except Exception as e:
            return jsonify({"error": f"PikPak Error: {e!s}"}), 500

        # Log to Supabase with WhatsLink metadata and user email
        supabase_service.log_action(
            url, task_result, file_info, user_email=user_email)

        # Invalidate cache
        cache_manager = get_cache_manager()
        cache_manager.invalidate_tasks()

        return jsonify({
            "message": "Task added successfully",
            "task": task_result,
            "file_info": file_info
        })

    return run_async(_async_add_task())


@bp.route('/tasks', methods=['GET'])
@require_auth
def get_tasks():
    """Get paginated list of user's tasks with caching"""
    try:
        # Get current user
        user_data = get_current_user()
        if not user_data:
            return jsonify({"error": "Authentication required"}), 401

        user_email = user_data['email']

        page, limit, err = validate_pagination(
            request.args,
            default_page=1,
            default_limit=AppConfig.DEFAULT_PAGE_SIZE,
            max_limit=100
        )
        if err:
            return err[0], err[1]

        offset = (page - 1) * limit

        # Fetch user-specific tasks
        supabase_service = get_supabase_service()
        data = supabase_service.get_user_tasks(user_email, offset, limit)

        result = {
            "data": data["data"],
            "count": data["count"],
            "page": page,
            "limit": limit
        }

        return jsonify(result)

    except Exception as e:
        logger.error(f"Failed to fetch tasks: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route('/task/<int:task_id>', methods=['GET'])
def get_task_by_id(task_id: int):
    """Get a specific task by ID for preview"""
    try:
        supabase_service = get_supabase_service()
        task = supabase_service.get_task_by_id(task_id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        return jsonify(task)
    except Exception as e:
        logger.error(f"Failed to fetch task {task_id}: {e}")
        return jsonify({"error": str(e)}), 500
