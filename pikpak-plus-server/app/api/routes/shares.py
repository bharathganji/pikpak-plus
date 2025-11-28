"""Share Link Management Routes"""
import logging
from flask import Blueprint, request, jsonify
from app.api.utils.async_helpers import run_async
from app.api.utils.dependencies import (
    get_pikpak_service,
    get_supabase_service
)

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


def _store_share_globally(file_id, share_data):
    """Store share in Supabase for global deduplication."""
    supabase_service = get_supabase_service()
    if not supabase_service:
        return

    try:
        supabase_service.store_share(file_id, share_data)
        logger.info(f"Stored share in public_actions for file: {file_id}")
    except Exception as e:
        logger.warning(f"Failed to store share in Supabase: {e}")


def _store_user_action(email, share_data):
    """Store share action for user tracking."""
    supabase_service = get_supabase_service()
    if not supabase_service:
        return

    try:
        supabase_service.store_user_action(
            email=email,
            action="share",
            data=share_data
        )
        logger.info(f"Stored share action for user: {email}")
    except Exception as e:
        logger.warning(f"Failed to store user action: {e}")


@bp.route('/share', methods=['POST'])
def create_share():
    """Create a share link for a file (with global deduplication)"""
    async def _async_create_share():
        try:
            data = request.json

            # Validate request
            file_id, error_response = _validate_share_request(data)
            if error_response:
                return error_response

            logger.info(f"Share request for file: {file_id}")

            # Check for existing share (global deduplication)
            existing_share = _check_existing_share(file_id)
            if existing_share:
                return jsonify(existing_share)

            # Create new share
            need_password = data.get('need_password', False)
            expiration_days = data.get('expiration_days', -1)
            result = await _create_new_share(file_id, need_password, expiration_days)

            # Store share globally
            _store_share_globally(file_id, result)

            # Store user action if email provided
            email = data.get('email')
            if email:
                _store_user_action(email, result)

            return jsonify(result)
        except Exception as e:
            logger.error(f"Failed to create share: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_create_share())
