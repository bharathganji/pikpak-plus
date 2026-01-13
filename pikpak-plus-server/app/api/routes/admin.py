"""Admin API Routes - User Management, Content Moderation, Analytics"""
import logging
from flask import Blueprint, request, jsonify
from app.core.config import AppConfig
from app.core.auth import require_admin, get_current_user
from app.api.utils.dependencies import get_supabase_service
from app.api.utils.async_helpers import run_async
from app.services.user_service import UserService
from app.services.pikpak_service import PikPakService

logger = logging.getLogger(__name__)

# Create blueprint
bp = Blueprint('admin', __name__)


# ========================================
# User Management
# ========================================

@bp.route('/users', methods=['GET'])
@require_admin
def get_users():
    """List all users with pagination and filtering

    Query parameters:
        - page: Page number (default: 1)
        - limit: Items per page (default: 25)
        - blocked: Filter by blocked status (true/false, optional)
        - search: Search by email (optional)
    """
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 25))
        blocked_param = request.args.get('blocked')
        search = request.args.get('search', '').strip()

        offset = (page - 1) * limit

        # Parse blocked filter
        blocked_filter = None
        if blocked_param:
            blocked_filter = blocked_param.lower() == 'true'

        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        result = user_service.get_all_users(offset, limit, blocked_filter)

        # Apply search filter if provided (client-side for now)
        if search:
            result['data'] = [
                user for user in result['data']
                if search.lower() in user['email'].lower()
            ]

        return jsonify({
            "data": result['data'],
            "count": result['count'],
            "page": page,
            "limit": limit
        }), 200

    except Exception as e:
        logger.error(f"Get users error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to fetch users"
        }), 500


@bp.route('/users/<email>', methods=['GET'])
@require_admin
def get_user_details(email: str):
    """Get specific user details and statistics"""
    try:
        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        # Get user info
        user = user_service.get_user_by_email(email)

        if not user:
            return jsonify({
                "error": "User not found",
                "message": f"No user found with email: {email}"
            }), 404

        # Get user statistics
        stats = user_service.get_user_stats(email)

        return jsonify({
            "user": user,
            "stats": stats
        }), 200

    except Exception as e:
        logger.error(f"Get user details error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to fetch user details"
        }), 500


@bp.route('/users/<email>/block', methods=['POST'])
@require_admin
def block_user(email: str):
    """Block a user account"""
    try:
        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        # Check if user exists
        user = user_service.get_user_by_email(email)
        if not user:
            return jsonify({
                "error": "User not found",
                "message": f"No user found with email: {email}"
            }), 404

        # Don't allow blocking admin users
        if user.get('is_admin', False):
            return jsonify({
                "error": "Cannot block admin",
                "message": "Admin users cannot be blocked"
            }), 400

        # Block user
        user_service.block_user(email)

        return jsonify({
            "message": "User blocked successfully",
            "email": email
        }), 200

    except Exception as e:
        logger.error(f"Block user error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to block user"
        }), 500


@bp.route('/users/<email>/unblock', methods=['POST'])
@require_admin
def unblock_user(email: str):
    """Unblock a user account"""
    try:
        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        # Check if user exists
        user = user_service.get_user_by_email(email)
        if not user:
            return jsonify({
                "error": "User not found",
                "message": f"No user found with email: {email}"
            }), 404

        # Unblock user
        user_service.unblock_user(email)

        return jsonify({
            "message": "User unblocked successfully",
            "email": email
        }), 200

    except Exception as e:
        logger.error(f"Unblock user error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to unblock user"
        }), 500


# ========================================
# Content Moderation
# ========================================

@bp.route('/logs', methods=['GET'])
@require_admin
def get_logs():
    """Get all system logs with pagination and filtering

    Query parameters:
        - page: Page number (default: 1)
        - limit: Items per page (default: 25)
        - action: Filter by action type ('add', 'share', optional)
        - user_email: Filter by user email (optional)
    """
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 25))
        action_filter = request.args.get('action')
        user_email_filter = request.args.get('user_email')

        offset = (page - 1) * limit

        supabase_service = get_supabase_service()

        # Build query
        query = supabase_service.client.table("public_actions") \
            .select("*", count="exact")

        # Apply filters
        if action_filter:
            query = query.eq("action", action_filter)

        if user_email_filter:
            query = query.eq("user_email", user_email_filter)

        response = query \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()

        return jsonify({
            "data": response.data,
            "count": response.count,
            "page": page,
            "limit": limit
        }), 200

    except Exception as e:
        logger.error(f"Get logs error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to fetch logs"
        }), 500


@bp.route('/users/<email>/logs', methods=['GET'])
@require_admin
def get_user_logs(email: str):
    """Get user-specific logs

    Query parameters:
        - page: Page number (default: 1)
        - limit: Items per page (default: 25)
    """
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 25))
        offset = (page - 1) * limit

        supabase_service = get_supabase_service()

        result = supabase_service.get_user_tasks(email, offset, limit)

        return jsonify({
            "data": result['data'],
            "count": result['count'],
            "page": page,
            "limit": limit,
            "user_email": email
        }), 200

    except Exception as e:
        logger.error(f"Get user logs error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to fetch user logs"
        }), 500


@bp.route('/tasks/<int:task_id>', methods=['DELETE'])
@require_admin
def delete_task(task_id: int):
    """Delete a task/action by ID and cleanup PikPak content"""
    try:
        supabase_service = get_supabase_service()

        # 1. Fetch action details to extract PikPak IDs
        action = supabase_service.get_action_by_id(task_id)
        if action:
            data = action.get("data", {})

            # Extract task and file IDs (handle nested structure)
            task_wrapper = data.get("task", {})
            if isinstance(task_wrapper, dict) and "task" in task_wrapper:
                task_info = task_wrapper.get("task", {})
                file_info = task_wrapper.get("file", {})
            else:
                task_info = task_wrapper
                file_info = task_wrapper

            p_task_id = task_info.get("id") if isinstance(
                task_info, dict) else None
            p_file_id = file_info.get("id") if isinstance(
                file_info, dict) else None

            # Also check for file_id in task_info
            if not p_file_id and isinstance(task_info, dict):
                p_file_id = task_info.get("file_id")

            # 2. Cleanup PikPak if IDs are found
            cleanup_success = True
            if p_task_id or p_file_id:
                async def _cleanup_pikpak():
                    success = True
                    pikpak_service = PikPakService(
                        AppConfig.PIKPAK_USER,
                        AppConfig.PIKPAK_PASS
                    )
                    if p_task_id:
                        try:
                            await pikpak_service.delete_task(p_task_id)
                        except Exception as e:
                            # If task not found, we consider it a success (it's already gone)
                            if "not found" not in str(e).lower():
                                logger.error(
                                    f"Failed to delete PikPak task {p_task_id}: {e}")
                                success = False
                            else:
                                logger.info(
                                    f"Task {p_task_id} already not found in PikPak")

                    if p_file_id:
                        try:
                            await pikpak_service.delete_file_forever(p_file_id)
                        except Exception as e:
                            # If file not found, we consider it a success
                            if "not found" not in str(e).lower():
                                logger.error(
                                    f"Failed to delete PikPak file {p_file_id}: {e}")
                                success = False
                            else:
                                logger.info(
                                    f"File {p_file_id} already not found in PikPak")

                    return success

                try:
                    cleanup_success = run_async(_cleanup_pikpak())
                except Exception as e:
                    logger.error(f"Error during PikPak cleanup: {e}")
                    cleanup_success = False

            if not cleanup_success:
                logger.warning(
                    f"PikPak deletion failed for task/file in action {task_id}, but proceeding to delete Supabase log as requested.")

            # 3. Delete the action from Supabase
            supabase_service.delete_action_by_id(task_id)

            return jsonify({
                "message": "Task and associated content deleted successfully",
                "task_id": task_id
            }), 200

        else:
            return jsonify({
                "error": "Not Found",
                "message": "Log entry not found"
            }), 404

    except Exception as e:
        logger.error(f"Delete task error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to delete task"
        }), 500


# ========================================
# Analytics
# ========================================

@bp.route('/stats/overview', methods=['GET'])
@require_admin
def get_stats_overview():
    """Get total counts for dashboard overview"""
    try:
        supabase_service = get_supabase_service()

        stats = supabase_service.get_admin_statistics()

        return jsonify(stats), 200

    except Exception as e:
        logger.error(f"Get stats overview error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to fetch statistics"
        }), 500


@bp.route('/stats/daily', methods=['GET'])
@require_admin
def get_stats_daily():
    """Get daily statistics with user-related metrics

    Query parameters:
        - limit: Number of days to retrieve (default: 30)
    """
    try:
        limit = int(request.args.get('limit', 30))

        supabase_service = get_supabase_service()

        # Get daily statistics
        daily_stats = supabase_service.get_daily_stats(limit)

        return jsonify({
            "data": daily_stats
        }), 200

    except Exception as e:
        logger.error(f"Get daily stats error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to fetch daily statistics"
        }), 500
