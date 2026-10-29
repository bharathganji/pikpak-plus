"""Direct File Metadata & Download Routes"""
import logging

from flask import Blueprint, jsonify, request

from app.api.utils.async_helpers import run_async
from app.api.utils.dependencies import get_pikpak_service
from app.core.auth import get_current_user, require_auth
from app.utils.validators import get_json_body, sanitize_identifier

logger = logging.getLogger(__name__)

bp = Blueprint('files', __name__)


@bp.route('/file/<file_id>', methods=['GET'])
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
                return jsonify({
                    "error": "Invalid identifier",
                    "message": error_msg or "Path traversal or illegal characters detected in identifier"
                }), 400

            pikpak_service = get_pikpak_service()
            if not pikpak_service:
                return jsonify({"error": "Service unavailable"}), 503

            result = await pikpak_service.get_file(sanitized_id)
            return jsonify(result), 200
        except Exception as e:
            logger.error(f"Failed to get file {file_id}: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_get_file())


@bp.route('/file/download-url', methods=['POST'])
@require_auth
def get_download_url():
    """Get direct download link for a file"""
    async def _async_get_download_url():
        try:
            user_data = get_current_user()
            if not user_data:
                return jsonify({"error": "Authentication required"}), 401

            data, err = get_json_body(request)
            if err or not isinstance(data, dict):
                return jsonify({"error": "Invalid JSON body"}), 400

            file_id = data.get('id')
            if not file_id or not isinstance(file_id, str):
                return jsonify({"error": "Missing 'id' parameter"}), 400

            is_valid, sanitized_id, error_msg = sanitize_identifier(file_id, "id")
            if not is_valid:
                return jsonify({
                    "error": "Invalid identifier",
                    "message": error_msg or "Path traversal or illegal characters detected in identifier"
                }), 400

            pikpak_service = get_pikpak_service()
            if not pikpak_service:
                return jsonify({"error": "Service unavailable"}), 503

            result = await pikpak_service.get_download_url(sanitized_id)
            if isinstance(result, str):
                return jsonify({"url": result, "download_url": result}), 200
            elif isinstance(result, dict):
                dl_url = result.get("url") or result.get("download_url") or result.get("web_content_link")
                return jsonify({**result, "url": dl_url, "download_url": dl_url}), 200
            return jsonify(result), 200
        except Exception as e:
            logger.error(f"Failed to get download URL: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_get_download_url())

