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

        # Check for existing task (mediator multi-user deduplication)
        task_hash = extract_magnet_hash(url) or extract_e2dk_hash(url)
        if task_hash:
            # 1. Check if the current user already has this task
            if supabase_service.user_has_task_by_hash(user_email, task_hash):
                logger.info(f"Duplicate task already recorded for user {user_email} (hash: {task_hash})")
                existing_record = supabase_service.find_existing_task_record_by_hash(task_hash)
                existing_data = (existing_record or {}).get("data", {})
                existing_task = existing_data.get("task", {})
                existing_file_info = (
                    existing_data.get("whatslink")
                    or existing_data.get("file_info")
                    or {}
                )
                return jsonify({
                    "message": "Task already exists",
                    "task": existing_task,
                    "file_info": existing_file_info
                })

            # 2. Check if task exists globally (added previously by another user)
            existing_record = supabase_service.find_existing_task_record_by_hash(task_hash)
            if existing_record:
                logger.info(
                    f"Existing task found globally for hash {task_hash}. Linking to user {user_email}"
                )
                existing_data = existing_record.get("data", {})
                existing_task = existing_data.get("task", {})
                existing_file_info = (
                    existing_data.get("whatslink")
                    or existing_data.get("file_info")
                    or {}
                )

                # Link existing task to user B so it appears in their tasks & recent activity
                supabase_service.link_existing_task_to_user(
                    url=url,
                    existing_data=existing_data,
                    user_email=user_email
                )

                # Invalidate cache so user's task list refreshes immediately
                cache_manager = get_cache_manager()
                if cache_manager:
                    cache_manager.invalidate_tasks()

                return jsonify({
                    "message": "Task added successfully",
                    "task": existing_task,
                    "file_info": existing_file_info
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
        except Exception as e:  # noqa: BLE001
            logger.error(f"Failed to add download to PikPak for {url}: {e}")
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

    except Exception as e:  # noqa: BLE001
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
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to fetch task {task_id}: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route('/tasks/bulk', methods=['DELETE'])
@require_auth
def delete_tasks_bulk():
    """Bulk delete multiple tasks for the authenticated user"""
    try:
        user_data = get_current_user()
        if not user_data:
            return jsonify({"error": "Authentication required"}), 401

        user_email = user_data.get('email')
        if not user_email:
            return jsonify({"error": "User email not found in token"}), 401

        supabase_service = get_supabase_service()
        if not supabase_service:
            return jsonify({"error": "Database service unavailable"}), 503

        user_service = UserService(supabase_service)
        if user_service.is_user_blocked(user_email):
            return jsonify({
                "error": "Account blocked",
                "message": "Your account has been blocked. You cannot perform this action."
            }), 403

        data, err = get_json_body(request, required_fields=["ids"], field_types={"ids": list})
        if err or data is None:
            return (err[0], err[1]) if err else (jsonify({"error": "Bad Request"}), 400)

        ids = data.get("ids")
        if not isinstance(ids, list) or len(ids) == 0:
            return jsonify({
                "error": "Invalid payload",
                "message": "'ids' must be a non-empty list"
            }), 400

        if len(ids) > 500:
            return jsonify({
                "error": "Invalid payload",
                "message": "Cannot delete more than 500 items at once"
            }), 400

        valid_ids: list[int] = []
        for item in ids:
            if isinstance(item, bool):
                return jsonify({
                    "error": "Invalid payload",
                    "message": "All elements in 'ids' must be valid numeric IDs"
                }), 400
            if isinstance(item, int) and item > 0:
                valid_ids.append(item)
            elif isinstance(item, str) and item.strip().isdigit() and int(item.strip()) > 0:
                valid_ids.append(int(item.strip()))
            else:
                return jsonify({
                    "error": "Invalid payload",
                    "message": "All elements in 'ids' must be valid numeric IDs"
                }), 400

        deleted_count = supabase_service.delete_user_tasks_bulk(user_email, valid_ids)

        cache_manager = get_cache_manager()
        if cache_manager:
            cache_manager.invalidate_tasks()

        return jsonify({
            "success": True,
            "count": deleted_count,
            "message": f"{deleted_count} tasks deleted successfully"
        }), 200
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to bulk delete tasks: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to delete tasks"
        }), 500


@bp.route('/tasks/<int:task_id>', methods=['DELETE'])
@require_auth
def delete_task_by_id(task_id: int):
    """Delete a single task belonging to the authenticated user"""
    try:
        user_data = get_current_user()
        if not user_data:
            return jsonify({"error": "Authentication required"}), 401

        user_email = user_data.get('email')
        if not user_email:
            return jsonify({"error": "User email not found in token"}), 401

        supabase_service = get_supabase_service()
        if not supabase_service:
            return jsonify({"error": "Database service unavailable"}), 503

        user_service = UserService(supabase_service)
        if user_service.is_user_blocked(user_email):
            return jsonify({
                "error": "Account blocked",
                "message": "Your account has been blocked. You cannot perform this action."
            }), 403

        deleted_count = supabase_service.delete_user_tasks_bulk(user_email, [task_id])
        if deleted_count == 0:
            return jsonify({
                "error": "Task not found",
                "message": f"Task {task_id} not found or does not belong to you"
            }), 404

        cache_manager = get_cache_manager()
        if cache_manager:
            cache_manager.invalidate_tasks()

        return jsonify({
            "success": True,
            "message": "Task deleted successfully"
        }), 200
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to delete task {task_id}: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to delete task"
        }), 500
