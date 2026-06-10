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
# User CRUD Endpoints
# ========================================


@bp.route('/users', methods=['POST'])
@require_admin
def create_user():
    """Create a new user account (admin operation)

    Body:
        - email: User's email address
        - password: Plain text password (min 6 characters)
        - is_admin: Optional boolean, default False
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "error": "Bad Request",
                "message": "Request body is required"
            }), 400

        email = data.get('email', '').strip()
        password = data.get('password', '')
        is_admin = data.get('is_admin', False)

        if not email or not password:
            return jsonify({
                "error": "Bad Request",
                "message": "Email and password are required"
            }), 400

        # Validate email format
        if '@' not in email or '.' not in email:
            return jsonify({
                "error": "Bad Request",
                "message": "Invalid email format"
            }), 400

        if len(password) < 6:
            return jsonify({
                "error": "Bad Request",
                "message": "Password must be at least 6 characters"
            }), 400

        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        current_user = get_current_user()
        if current_user and current_user.get('email') == email:
            return jsonify({
                "error": "Bad Request",
                "message": "Cannot create user with the same email as current admin"
            }), 400

        user = user_service.create_user(email, password, is_admin=is_admin)

        return jsonify({
            "message": "User created successfully",
            "user": user
        }), 201

    except ValueError as e:
        return jsonify({
            "error": "Bad Request",
            "message": str(e)
        }), 400

    except Exception as e:
        logger.error(f"Create user error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to create user"
        }), 500


@bp.route('/users/<email>', methods=['DELETE'])
@require_admin
def delete_user(email: str):
    """Delete a user account (admin operation)

    Prevents:
        - Deleting the last admin user
        - Deleting self (current admin)
    """
    try:
        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        current_user = get_current_user()
        if current_user and current_user.get('email') == email:
            return jsonify({
                "error": "Forbidden",
                "message": "Cannot delete your own account"
            }), 403

        result = user_service.delete_user(email)

        if 'error' in result:
            error_msg = result['error']
            if "not found" in error_msg.lower():
                return jsonify({
                    "error": "Not Found",
                    "message": error_msg
                }), 404
            return jsonify({
                "error": "Bad Request",
                "message": error_msg
            }), 400

        return '', 204

    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            return jsonify({
                "error": "Not Found",
                "message": error_msg
            }), 404
        return jsonify({
            "error": "Bad Request",
            "message": error_msg
        }), 400

    except Exception as e:
        logger.error(f"Delete user error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to delete user"
        }), 500


@bp.route('/users/<email>/role', methods=['PATCH'])
@require_admin
def update_user_role(email: str):
    """Update user's admin status (admin operation)

    Body:
        - is_admin: Boolean indicating new admin status
    """
    try:
        data = request.get_json()
        if not data or 'is_admin' not in data:
            return jsonify({
                "error": "Bad Request",
                "message": "is_admin field is required in request body"
            }), 400

        is_admin = data.get('is_admin')
        if not isinstance(is_admin, bool):
            return jsonify({
                "error": "Bad Request",
                "message": "is_admin must be a boolean value"
            }), 400

        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        result = user_service.update_user_role(email, is_admin)

        if 'error' in result:
            return jsonify({
                "error": "Bad Request",
                "message": result['error']
            }), 400

        return jsonify(result), 200

    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            return jsonify({
                "error": "Not Found",
                "message": error_msg
            }), 404
        return jsonify({
            "error": "Bad Request",
            "message": error_msg
        }), 400

    except Exception as e:
        logger.error(f"Update user role error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to update user role"
        }), 500


@bp.route('/users/<email>/password', methods=['PATCH'])
@require_admin
def update_user_password(email: str):
    """Reset user password (admin override)

    Body:
        - new_password: New plain text password (min 6 characters)
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "error": "Bad Request",
                "message": "Request body is required"
            }), 400

        new_password = data.get('new_password', '')
        if not new_password:
            return jsonify({
                "error": "Bad Request",
                "message": "new_password is required"
            }), 400

        if len(new_password) < 6:
            return jsonify({
                "error": "Bad Request",
                "message": "Password must be at least 6 characters"
            }), 400

        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)

        result = user_service.reset_user_password(email, new_password)

        if 'error' in result:
            return jsonify({
                "error": "Bad Request",
                "message": result['error']
            }), 400

        return jsonify(result), 200

    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            return jsonify({
                "error": "Not Found",
                "message": error_msg
            }), 404
        return jsonify({
            "error": "Bad Request",
            "message": error_msg
        }), 400

    except Exception as e:
        logger.error(f"Reset user password error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to reset user password"
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


# ========================================
# Bulk User Actions
# ========================================

@bp.route('/users/bulk-action', methods=['POST'])
@require_admin
def bulk_user_action():
    """Perform bulk actions on multiple users

    Body:
        - emails: List of user emails
        - action: 'block' | 'unblock' | 'delete'
    """
    try:
        data = request.get_json()
        if not data or 'emails' not in data or 'action' not in data:
            return jsonify({
                "error": "Bad Request",
                "message": "emails list and action are required in request body"
            }), 400

        emails = data.get('emails', [])
        action = data.get('action', '').lower()

        if not isinstance(emails, list) or len(emails) == 0:
            return jsonify({
                "error": "Bad Request",
                "message": "emails must be a non-empty list"
            }), 400

        valid_actions = {'block', 'unblock', 'delete'}
        if action not in valid_actions:
            return jsonify({
                "error": "Bad Request",
                "message": f"Invalid action '{action}'. Must be one of: {', '.join(sorted(valid_actions))}"
            }), 400

        supabase_service = get_supabase_service()
        user_service = UserService(supabase_service)
        current_user = get_current_user()
        current_email = current_user.get('email') if current_user else None

        affected = 0
        skipped = 0
        skipped_reasons = []

        for email in emails:
            if not isinstance(email, str) or not email.strip():
                skipped += 1
                skipped_reasons.append({
                    "email": str(email),
                    "reason": "Invalid email"
                })
                continue

            email = email.strip().lower()

            try:
                user = user_service.get_user_by_email(email)
            except Exception:
                user = None

            if not user:
                skipped += 1
                skipped_reasons.append({
                    "email": email,
                    "reason": "User not found"
                })
                continue

            is_admin_user = user.get('is_admin', False)

            if action in ('block', 'delete') and is_admin_user:
                skipped += 1
                skipped_reasons.append({
                    "email": email,
                    "reason": "Protected admin user"
                })
                continue

            if action == 'delete':
                if current_email and email == current_email:
                    skipped += 1
                    skipped_reasons.append({
                        "email": email,
                        "reason": "Cannot delete your own account"
                    })
                    continue

                try:
                    user_service.delete_user(email)
                    affected += 1
                except ValueError as ve:
                    skipped += 1
                    skipped_reasons.append({
                        "email": email,
                        "reason": str(ve)
                    })
                except Exception as ue:
                    logger.error(f"Bulk delete error for {email}: {ue}")
                    skipped += 1
                    skipped_reasons.append({
                        "email": email,
                        "reason": "Failed to delete user"
                    })
                continue

            if action == 'block':
                try:
                    user_service.block_user(email)
                    affected += 1
                except Exception as e:
                    logger.error(f"Bulk block error for {email}: {e}")
                    skipped += 1
                    skipped_reasons.append({
                        "email": email,
                        "reason": "Failed to block user"
                    })
                continue

            if action == 'unblock':
                try:
                    user_service.unblock_user(email)
                    affected += 1
                except Exception as e:
                    logger.error(f"Bulk unblock error for {email}: {e}")
                    skipped += 1
                    skipped_reasons.append({
                        "email": email,
                        "reason": "Failed to unblock user"
                    })
                continue

        logger.info(
            f"Bulk {action} completed: {affected} affected, {skipped} skipped")

        return jsonify({
            "action": action,
            "affected": affected,
            "skipped": skipped,
            "skipped_details": skipped_reasons
        }), 200

    except Exception as e:
        logger.error(f"Bulk user action error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to perform bulk action"
        }), 500


# ========================================
# System Configuration
# ========================================

@bp.route('/config', methods=['GET'])
@require_admin
def get_config():
    """Return public-safe configuration values

    Does NOT return secrets like JWT_SECRET_KEY, API keys, etc.
    """
    try:
        return jsonify({
            "MAX_FILE_SIZE_GB": AppConfig.MAX_FILE_SIZE_GB,
            "CLEANUP_INTERVAL_HOURS": AppConfig.CLEANUP_INTERVAL_HOURS,
            "TASK_STATUS_UPDATE_INTERVAL_MINUTES": AppConfig.TASK_STATUS_UPDATE_INTERVAL_MINUTES,
            "WEBDAV_GENERATION_INTERVAL_HOURS": AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS,
            "DEFAULT_PAGE_SIZE": AppConfig.DEFAULT_PAGE_SIZE,
            "SCHEDULER_API_ENABLED": AppConfig.SCHEDULER_API_ENABLED,
            "TASK_CACHE_TTL": AppConfig.TASK_CACHE_TTL,
            "QUOTA_CACHE_TTL": AppConfig.QUOTA_CACHE_TTL,
            "REQUEST_TIMEOUT": AppConfig.REQUEST_TIMEOUT,
        }), 200

    except Exception as e:
        logger.error(f"Get config error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to fetch configuration"
        }), 500


@bp.route('/config', methods=['PATCH'])
@require_admin
def update_config():
    """Update runtime-adjustable configuration values

    Body:
        - cleanup_interval_hours?: int (positive)
        - task_status_update_interval_minutes?: int (positive)
        - webdav_generation_interval_hours?: int (positive)
        - max_file_size_gb?: float (positive)
    """
    try:
        redis_client = None
        try:
            import redis as redis_lib
            redis_client = redis_lib.from_url(
                AppConfig.REDIS_URL, decode_responses=True)
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            return jsonify({
                "error": "Service Unavailable",
                "message": "Configuration storage (Redis) is unavailable"
            }), 503

        data = request.get_json()
        if not data:
            return jsonify({
                "error": "Bad Request",
                "message": "Request body is required"
            }), 400

        allowed_keys = {
            'cleanup_interval_hours',
            'task_status_update_interval_minutes',
            'webdav_generation_interval_hours',
            'max_file_size_gb',
        }

        updates = {}
        for key, value in data.items():
            if key not in allowed_keys:
                return jsonify({
                    "error": "Bad Request",
                    "message": f"Unsupported config key: {key}"
                }), 400

            if not isinstance(value, (int, float)):
                return jsonify({
                    "error": "Bad Request",
                    "message": f"{key} must be a number"
                }), 400

            if value <= 0:
                return jsonify({
                    "error": "Bad Request",
                    "message": f"{key} must be a positive number"
                }), 400

            updates[key] = value

        if not updates:
            return jsonify({
                "error": "Bad Request",
                "message": "No valid configuration keys provided"
            }), 400

        existing_config = {}
        try:
            raw = redis_client.get("system_config")
            if raw:
                import json
                existing_config = json.loads(raw)
        except Exception as e:
            logger.error(f"Failed to read existing config from Redis: {e}")
            return jsonify({
                "error": "Internal server error",
                "message": "Failed to read existing configuration"
            }), 500

        updated_config = {**existing_config, **updates}

        try:
            import json
            redis_client.set(
                "system_config",
                json.dumps(updated_config),
                ex=3600
            )
        except Exception as e:
            logger.error(f"Failed to write config to Redis: {e}")
            return jsonify({
                "error": "Internal server error",
                "message": "Failed to save configuration"
            }), 500

        logger.info(f"Config updated: {list(updates.keys())}")

        return jsonify({
            "updated": updates,
            "config": updated_config
        }), 200

    except Exception as e:
        logger.error(f"Update config error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to update configuration"
        }), 500


# ========================================
# Cleanup Control
# ========================================

@bp.route('/cleanup/trigger', methods=['POST'])
@require_admin
def trigger_cleanup():
    """Manually trigger the cleanup job

    Returns immediately with trigger confirmation. The cleanup job runs
    asynchronously in the background via Celery.
    """
    try:
        from app.tasks.jobs.cleanup_job import scheduled_cleanup

        scheduled_cleanup.delay()

        logger.info("Manual cleanup triggered by admin")

        return jsonify({
            "status": "triggered",
            "message": "Cleanup job started"
        }), 200

    except Exception as e:
        logger.error(f"Trigger cleanup error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to trigger cleanup job"
        }), 500


# ========================================
# Scheduler Status
# ========================================

@bp.route('/scheduler/status', methods=['GET'])
@require_admin
def get_scheduler_status():
    """Return scheduler status from Redis

    Includes last/next run times for cleanup, task-status, webdav, and heartbeat.
    """
    try:
        redis_client = None
        try:
            import redis as redis_lib
            redis_client = redis_lib.from_url(
                AppConfig.REDIS_URL, decode_responses=True)
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            return jsonify({
                "error": "Service Unavailable",
                "message": "Scheduler status storage (Redis) is unavailable"
            }), 503

        raw_status = redis_client.get("pikpak_scheduler_status")
        if not raw_status:
            return jsonify({
                "status": "unknown",
                "message": "Scheduler status not available"
            }), 404

        import json
        scheduler_info = json.loads(raw_status)

        jobs = [
            {
                "name": "cleanup",
                "last_run": scheduler_info.get("last_cleanup"),
                "next_run": scheduler_info.get("next_cleanup")
            },
            {
                "name": "task-status",
                "last_run": scheduler_info.get("last_task_status_update"),
                "next_run": scheduler_info.get("next_task_status_update")
            },
            {
                "name": "webdav",
                "last_run": scheduler_info.get("last_webdav_generation"),
                "next_run": scheduler_info.get("next_webdav_generation")
            },
            {
                "name": "heartbeat",
                "last_run": scheduler_info.get("last_heartbeat"),
                "next_run": None
            }
        ]

        return jsonify({
            "status": scheduler_info.get("status", "unknown"),
            "jobs": jobs
        }), 200

    except Exception as e:
        logger.error(f"Get scheduler status error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": "Failed to fetch scheduler status"
        }), 500
