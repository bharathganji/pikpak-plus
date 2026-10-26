"""File & Directory Management Routes"""
import logging

from flask import Blueprint, jsonify, request

from app.api.utils.async_helpers import run_async
from app.api.utils.dependencies import get_pikpak_service, get_supabase_service
from app.core.auth import get_current_user, require_auth
from app.services.user_service import UserService
from app.utils.validators import get_json_body, sanitize_identifier

logger = logging.getLogger(__name__)

bp = Blueprint('files', __name__)


@bp.route('/files', methods=['GET'])
@require_auth
def list_files():
    """List directory contents / files with optional parent_id and pagination"""
    async def _async_list_files():
        try:
            user_data = get_current_user()
            if not user_data:
                return jsonify({"error": "Authentication required"}), 401

            user_email = user_data['email']
            supabase_service = get_supabase_service()
            user_service = UserService(supabase_service)

            if user_service.is_user_blocked(user_email):
                return jsonify({
                    "error": "Account blocked",
                    "message": "Your account has been blocked. You cannot perform this action."
                }), 403

            parent_id = request.args.get('parent_id', default=None, type=str)
            if parent_id:
                is_valid, sanitized_parent, _ = sanitize_identifier(parent_id, "parent_id")
                parent_id = sanitized_parent if is_valid else None

            page_token = request.args.get('page_token', default=None, type=str)
            if page_token:
                is_valid, sanitized_token, _ = sanitize_identifier(page_token, "page_token")
                page_token = sanitized_token if is_valid else None

            limit = request.args.get('limit', default=100, type=int)
            if limit < 1 or limit > 500:
                limit = 100

            pikpak_service = get_pikpak_service()
            if not pikpak_service:
                return jsonify({"error": "Service unavailable"}), 503

            result = await pikpak_service.list_files(
                size=limit,
                parent_id=parent_id,
                next_page_token=page_token,
            )
            return jsonify(result), 200
        except Exception as e:
            logger.error(f"Failed to list files: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_list_files())


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


@bp.route('/files/folder', methods=['POST'])
@require_auth
def create_folder():
    """Create a new folder"""
    async def _async_create_folder():
        try:
            user_data = get_current_user()
            if not user_data:
                return jsonify({"error": "Authentication required"}), 401

            user_email = user_data['email']
            supabase_service = get_supabase_service()
            user_service = UserService(supabase_service)

            if user_service.is_user_blocked(user_email):
                return jsonify({
                    "error": "Account blocked",
                    "message": "Your account has been blocked. You cannot perform this action."
                }), 403

            data, err = get_json_body(request)
            if err or not isinstance(data, dict):
                return jsonify({"error": "Invalid JSON body"}), 400

            name = data.get('name')
            if not name or not isinstance(name, str) or not name.strip():
                return jsonify({"error": "Missing 'name' parameter"}), 400

            parent_id = data.get('parent_id')
            if parent_id:
                is_valid, sanitized_parent, _ = sanitize_identifier(parent_id, "parent_id")
                parent_id = sanitized_parent if is_valid else None

            pikpak_service = get_pikpak_service()
            if not pikpak_service:
                return jsonify({"error": "Service unavailable"}), 503

            result = await pikpak_service.create_folder(name=name.strip(), parent_id=parent_id)
            return jsonify(result), 201
        except Exception as e:
            logger.error(f"Failed to create folder: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_create_folder())


@bp.route('/files/<file_id>', methods=['DELETE'])
@require_auth
def delete_file(file_id: str):
    """Delete a file or move it to trash"""
    async def _async_delete_file():
        try:
            user_data = get_current_user()
            if not user_data:
                return jsonify({"error": "Authentication required"}), 401

            user_email = user_data['email']
            supabase_service = get_supabase_service()
            user_service = UserService(supabase_service)

            if user_service.is_user_blocked(user_email):
                return jsonify({
                    "error": "Account blocked",
                    "message": "Your account has been blocked. You cannot perform this action."
                }), 403

            is_valid, sanitized_id, error_msg = sanitize_identifier(file_id, "file_id")
            if not is_valid:
                return jsonify({
                    "error": "Invalid identifier",
                    "message": error_msg or "Path traversal or illegal characters detected in identifier"
                }), 400

            pikpak_service = get_pikpak_service()
            if not pikpak_service:
                return jsonify({"error": "Service unavailable"}), 503

            await pikpak_service.delete_to_trash([sanitized_id])
            return jsonify({"success": True, "message": "File deleted successfully"}), 200
        except Exception as e:
            logger.error(f"Failed to delete file {file_id}: {e}")
            return jsonify({"error": str(e)}), 500

    return run_async(_async_delete_file())

