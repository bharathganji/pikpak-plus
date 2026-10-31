"""Share Link Management Routes"""
import logging
from typing import Any

from flask import Blueprint, jsonify, request

from app.api.utils.async_helpers import run_async
from app.api.utils.dependencies import get_pikpak_service, get_supabase_service
from app.core.auth import get_current_user, require_auth
from app.services.user_service import UserService
from app.utils.validators import get_json_body, sanitize_identifier, validate_pagination

logger = logging.getLogger(__name__)

# Create blueprint
bp = Blueprint('shares', __name__)


def _validate_share_request(data):
    """Validate share request data and return file_id or error response."""
    if not isinstance(data, dict):
        return None, (jsonify({"error": "Missing 'id' parameter"}), 400)
    file_id = data.get('id')
    if not file_id or not isinstance(file_id, str) or not file_id.strip():
        return None, (jsonify({"error": "Missing 'id' parameter"}), 400)

    is_valid, sanitized_id, error_msg = sanitize_identifier(file_id, "id")
    if not is_valid:
        return None, (jsonify({
            "error": "Invalid identifier",
            "message": error_msg or "Path traversal or illegal characters detected in identifier"
        }), 400)

    return sanitized_id, None


def _check_existing_share(file_id):
    """Check if a share already exists for the given file_id."""
    supabase_service = get_supabase_service()
    if not supabase_service:
        return None

    existing_share = supabase_service.get_existing_share_by_file_id(file_id)
    if isinstance(existing_share, dict):
        logger.info(f"Returning existing share for file: {file_id}")
        return {**existing_share, "is_existing": True}

    return None


async def _create_new_share(file_id, need_password, expiration_days):
    """Create a new share link via PikPak API."""
    logger.info(f"Creating new share link for file: {file_id}")
    pikpak_service = get_pikpak_service()
    if not pikpak_service:
        raise RuntimeError("PikPak service unavailable")
    result = await pikpak_service.create_share(
        file_ids=[file_id],
        need_password=need_password,
        expiration_days=expiration_days
    )
    result["is_existing"] = False
    return result


def _store_share_globally(file_id: str, share_data: dict[str, Any], user_email: str | None = None, file_name: str | None = None):
    """Store share in Supabase for global deduplication and user tracking."""
    supabase_service = get_supabase_service()
    if not supabase_service:
        return

    try:
        supabase_service.store_share(file_id, share_data, user_email or "", file_name=file_name)
        logger.info(
            f"Stored share in public_actions for file: {file_id} (user: {user_email})")
    except Exception as e:
        logger.warning(f"Failed to store share in Supabase: {e}")


@bp.route('/share', methods=['POST'])
@require_auth
def create_share():
    """Create a share link for a file (with global deduplication)"""
    async def _async_create_share():
        try:
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
            if err or not isinstance(data, dict):
                return jsonify({"error": "Missing 'id' parameter"}), 400

            # Validate request
            file_id, error_response = _validate_share_request(data)
            if error_response or not file_id:
                return error_response or (jsonify({"error": "Missing 'id' parameter"}), 400)

            file_name = data.get('file_name')
            logger.info(f"Share request for file: {file_id} (file_name: {file_name})")

            # Check for existing share (global deduplication)
            existing_share = _check_existing_share(file_id)
            if existing_share:
                # Ensure the user's activity log records this share
                _store_share_globally(file_id, existing_share, user_email, file_name=file_name)
                return jsonify(existing_share)

            # Create new share
            need_password = data.get('need_password', False)
            if not isinstance(need_password, bool):
                return jsonify({"error": "Invalid parameter", "message": "need_password must be a boolean"}), 400

            expiration_days = data.get('expiration_days', -1)
            if not isinstance(expiration_days, int) or expiration_days < -1 or expiration_days > 365:
                return jsonify({"error": "Invalid parameter", "message": "expiration_days must be an integer between -1 and 365"}), 400

            result = await _create_new_share(file_id, need_password, expiration_days)

            # Store share globally with user email and file_name
            _store_share_globally(file_id, result, user_email, file_name=file_name)

            return jsonify(result)
        except Exception as e:
            logger.error(f"Failed to create share: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_create_share())


@bp.route('/shares', methods=['GET'])
@require_auth
def list_shares():
    """List active shares created by the authenticated user from Supabase"""
    try:
        user_data = get_current_user()
        if not user_data:
            return jsonify({"error": "Authentication required"}), 401

        user_email = user_data['email']
        supabase_service = get_supabase_service()
        if not supabase_service:
            return jsonify({"error": "Database service unavailable"}), 503
        user_service = UserService(supabase_service)

        if user_service.is_user_blocked(user_email):
            return jsonify({
                "error": "Account blocked",
                "message": "Your account has been blocked. You cannot perform this action."
            }), 403

        page, limit, err = validate_pagination(
            request.args,
            default_page=1,
            default_limit=20,
            max_limit=100
        )
        if err:
            return err[0], err[1]

        offset = (page - 1) * limit
        result = supabase_service.get_user_shares(user_email, offset=offset, limit=limit)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Failed to list shares: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route('/shares/<share_id>', methods=['DELETE'])
@require_auth
def delete_share(share_id: str):
    """Delete or revoke a share link from user's Supabase activity"""
    try:
        user_data = get_current_user()
        if not user_data:
            return jsonify({"error": "Authentication required"}), 401

        user_email = user_data['email']
        supabase_service = get_supabase_service()
        if not supabase_service:
            return jsonify({"error": "Database service unavailable"}), 503
        user_service = UserService(supabase_service)

        if user_service.is_user_blocked(user_email):
            return jsonify({
                "error": "Account blocked",
                "message": "Your account has been blocked. You cannot perform this action."
            }), 403

        is_valid, sanitized_id, error_msg = sanitize_identifier(share_id, "share_id")
        if not is_valid:
            return jsonify({
                "error": "Invalid identifier",
                "message": error_msg or "Path traversal or illegal characters detected in identifier"
            }), 400

        supabase_service.delete_user_share(user_email, sanitized_id)
        return jsonify({"success": True, "message": "Share link deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Failed to delete share {share_id}: {e}")
        return jsonify({"error": str(e)}), 500
