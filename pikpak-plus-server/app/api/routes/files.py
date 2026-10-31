"""File Metadata Routes"""

import logging

from flask import Blueprint, jsonify

from app.api.utils.async_helpers import run_async
from app.api.utils.dependencies import get_pikpak_service
from app.core.auth import get_current_user, require_auth
from app.utils.validators import sanitize_identifier

logger = logging.getLogger(__name__)

bp = Blueprint("files", __name__)


@bp.route("/file/<file_id>", methods=["GET"])
@require_auth
def get_file(file_id: str):
    """Get metadata for a specific file"""

    async def _async_get_file():
        try:
            user_data = get_current_user()
            if not user_data:
                return jsonify({"error": "Authentication required"}), 401

            is_valid, sanitized_id, error_msg = sanitize_identifier(file_id, "file_id")
            if not is_valid:
                return jsonify(
                    {
                        "error": "Invalid identifier",
                        "message": error_msg
                        or "Path traversal or illegal characters detected in identifier",
                    }
                ), 400

            pikpak_service = get_pikpak_service()
            if not pikpak_service:
                return jsonify({"error": "Service unavailable"}), 503

            result = await pikpak_service.get_file(sanitized_id)
            return jsonify(result), 200
        except Exception as e:  # noqa: BLE001
            logger.error(f"Failed to get file {file_id}: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_get_file())
