"""Task Management Routes"""
import logging
from flask import Blueprint, request, jsonify
from app.core.config import AppConfig
from app.services import WhatsLinkService
from app.api.utils.async_helpers import run_async
from app.api.utils.dependencies import (
    get_pikpak_service,
    get_supabase_service,
    get_cache_manager,
    get_scheduler
)
from app.utils.common import extract_magnet_hash

logger = logging.getLogger(__name__)

# Create blueprint
bp = Blueprint('tasks', __name__)


def check_duplicate_task(url: str):
    """Check if a task with the same magnet hash already exists"""
    magnet_hash = extract_magnet_hash(url)
    if magnet_hash:
        supabase_service = get_supabase_service()
        return supabase_service.check_existing_task_by_hash(magnet_hash)
    return None


@bp.route('/add', methods=['POST'])
def add_task():
    """Add a new download task with file size validation"""
    async def _async_add_task():
        data = request.json
        url = data.get('url')

        if not url:
            return jsonify({"error": "No URL provided"}), 400

        logger.info(f"Received add request for: {url}")

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
        is_valid, error_msg, file_info = WhatsLinkService.check_file_size_limit(
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
            return jsonify({"error": f"PikPak Error: {str(e)}"}), 500

        # Log to Supabase (task_result contains id, name, file_id, file_name, etc.)
        supabase_service = get_supabase_service()
        supabase_service.log_action(url, task_result)

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
def get_tasks():
    """Get paginated list of tasks with caching"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', AppConfig.DEFAULT_PAGE_SIZE))
        offset = (page - 1) * limit

        # Create cache key
        cache_key = f"tasks_page_{page}_limit_{limit}"

        # Try cache first
        cache_manager = get_cache_manager()
        cached_result = cache_manager.get(cache_key)
        if cached_result is not None:
            logger.info(f"Cache hit for {cache_key}")
            return jsonify(cached_result)

        # Cache miss - query Supabase
        logger.info(f"Cache miss for {cache_key}, querying Supabase")
        supabase_service = get_supabase_service()
        data = supabase_service.get_tasks(offset, limit)

        result = {
            "data": data["data"],
            "count": data["count"],
            "page": page,
            "limit": limit
        }

        # Store in cache
        cache_manager.set(cache_key, result)

        return jsonify(result)

    except Exception as e:
        logger.error(f"Failed to fetch tasks: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route('/tasks/my-tasks', methods=['POST'])
def get_my_tasks():
    """Get tasks matching specific URLs (user's tasks from localStorage)"""
    try:
        data = request.json
        urls = data.get('urls', [])

        if not urls or not isinstance(urls, list):
            return jsonify({"error": "URLs array required"}), 400

        # No caching for user-specific queries
        supabase_service = get_supabase_service()
        tasks = supabase_service.get_tasks_by_urls(urls)

        return jsonify({
            "data": tasks,
            "count": len(tasks)
        })
    except Exception as e:
        logger.error(f"Failed to fetch my tasks: {e}")
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
