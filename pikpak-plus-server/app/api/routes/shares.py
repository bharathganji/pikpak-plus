"""Share Link Management Routes"""
import logging
from flask import Blueprint, request, jsonify
from app.api.utils.async_helpers import run_async
from app.api.utils.dependencies import (
    get_pikpak_service,
    get_supabase_service
)
from app.core.auth import require_auth, get_current_user
from app.services.user_service import UserService

logger = logging.getLogger(__name__)

# Create blueprint
bp = Blueprint('shares', __name__)


def _validate_share_request(data):
    """Validate share request data and return file_id or error response."""
    file_id = data.get('id')
    if not file_id:
        return None, (jsonify({"error": "Missing 'id' parameter"}), 400)
    return file_id, None


def _check_existing_share(file_id):
    """Check if a share already exists for the given file_id."""
    supabase_service = get_supabase_service()
    if not supabase_service:
        return None

    existing_share = supabase_service.get_existing_share_by_file_id(file_id)
    if existing_share:
        logger.info(f"Returning existing share for file: {file_id}")
        return {**existing_share, "is_existing": True}

    return None


async def _create_new_share(file_id, need_password, expiration_days):
    """Create a new share link via PikPak API."""
    logger.info(f"Creating new share link for file: {file_id}")
    pikpak_service = get_pikpak_service()
    result = await pikpak_service.create_share(
        file_ids=[file_id],
        need_password=need_password,
        expiration_days=expiration_days
    )
    result["is_existing"] = False
    return result


def _store_share_globally(file_id, share_data, user_email=None):
    """Store share in Supabase for global deduplication and user tracking."""
    supabase_service = get_supabase_service()
    if not supabase_service:
        return

    try:
        supabase_service.store_share(file_id, share_data, user_email)
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

            data = request.json

            # Validate request
            file_id, error_response = _validate_share_request(data)
            if error_response:
                return error_response

            logger.info(f"Share request for file: {file_id}")

            # Check for existing share (global deduplication)
            # We skip this check if we want to force new share creation per user?
            # Requirement says "No change with related to pikpak", so we keep global deduplication logic.
            # But the user might want to track this action even if share exists?
            # For now, let's keep it as is - if share exists, return it.
            existing_share = _check_existing_share(file_id)
            if existing_share:
                return jsonify(existing_share)

            # Create new share
            need_password = data.get('need_password', False)
            expiration_days = data.get('expiration_days', -1)
            result = await _create_new_share(file_id, need_password, expiration_days)

            # Store share globally with user email
            _store_share_globally(file_id, result, user_email)

            return jsonify(result)

            return jsonify(result)
        except Exception as e:
            logger.error(f"Failed to create share: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_create_share())
