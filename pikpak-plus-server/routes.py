"""API Routes"""
import logging
from typing import Optional
from flask import Blueprint, request, jsonify
from services import PikPakService, SupabaseService, WhatsLinkService
from utils import CacheManager
from app_config import AppConfig
from auth import internal_only

logger = logging.getLogger(__name__)

# Create blueprint
api_bp = Blueprint('api', __name__)

# These will be injected by the app
pikpak_service: Optional[PikPakService] = None
supabase_service: Optional[SupabaseService] = None
cache_manager: Optional[CacheManager] = None
app_scheduler = None
webdav_manager = None


def init_routes(pikpak: PikPakService, supabase: SupabaseService, cache: CacheManager, scheduler=None, webdav_mgr=None):
    """Initialize routes with service dependencies"""
    global pikpak_service, supabase_service, cache_manager, app_scheduler, webdav_manager
    pikpak_service = pikpak
    supabase_service = supabase
    cache_manager = cache
    app_scheduler = scheduler
    webdav_manager = webdav_mgr


@api_bp.route('/add', methods=['POST'])
async def add_task():
    """Add a new download task with file size validation"""
    data = request.json
    url = data.get('url')

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    logger.info(f"Received add request for: {url}")

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
    try:
        task_result = await pikpak_service.add_download(url)
    except Exception as e:
        return jsonify({"error": f"PikPak Error: {str(e)}"}), 500

    # Log to Supabase (task_result contains id, name, file_id, file_name, etc.)
    supabase_service.log_action(url, task_result)

    # Invalidate cache
    cache_manager.invalidate_tasks()

    # Trigger immediate task status update in background
    if app_scheduler:
        try:
            # Trigger the task status update job to run immediately
            app_scheduler.modify_job('task_status_update_job', next_run_time=None)
            logger.info("Triggered immediate task status update")
        except Exception as e:
            logger.warning(f"Failed to trigger immediate task status update: {e}")

    return jsonify({
        "message": "Task added successfully",
        "task": task_result,
        "file_info": file_info
    })


@api_bp.route('/tasks', methods=['GET'])
def get_tasks():
    """Get paginated list of tasks with caching"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', AppConfig.DEFAULT_PAGE_SIZE))
        offset = (page - 1) * limit
        
        # Create cache key
        cache_key = f"tasks_page_{page}_limit_{limit}"
        
        # Try cache first
        cached_result = cache_manager.get(cache_key)
        if cached_result is not None:
            logger.info(f"Cache hit for {cache_key}")
            return jsonify(cached_result)
        
        # Cache miss - query Supabase
        logger.info(f"Cache miss for {cache_key}, querying Supabase")
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


@api_bp.route('/task/<int:task_id>', methods=['GET'])
def get_task_by_id(task_id: int):
    """Get a specific task by ID for preview"""
    try:
        task = supabase_service.get_task_by_id(task_id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        return jsonify(task)
    except Exception as e:
        logger.error(f"Failed to fetch task {task_id}: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/quota', methods=['GET'])
async def get_quota():
    """Get storage and transfer quota information with caching (3 hours)"""
    try:
        # Check cache first (cache for 3 hours)
        cache_key = "quota_info"
        cached_quota = cache_manager.get(cache_key)

        if cached_quota is not None:
            logger.info("Returning cached quota information")
            return jsonify(cached_quota)

        # Cache miss - fetch from PikPak
        logger.info("Cache miss - fetching quota from PikPak")

        # Get both quota types
        storage_quota = await pikpak_service.get_quota_info()
        transfer_quota = await pikpak_service.get_transfer_quota()

        # Combine the results
        quota_data = {
            "storage": storage_quota,
            "transfer": transfer_quota
        }

        # Cache the result for 3 hours
        from app_config import AppConfig
        cache_manager.set(cache_key, quota_data, ttl=AppConfig.QUOTA_CACHE_TTL)

        logger.info("Successfully retrieved and cached quota information (3 hours)")
        return jsonify(quota_data)
    except Exception as e:
        logger.error(f"Failed to get quota: {e}")
        return jsonify({"error": str(e)}), 500




@api_bp.route('/cleanup/status', methods=['GET'])
def cleanup_status():
    """Get cleanup schedule status"""
    try:
        from datetime import datetime, timezone
        
        result = {
            "cleanup_interval_hours": AppConfig.CLEANUP_INTERVAL_HOURS,
            "task_retention_hours": AppConfig.TASK_RETENTION_HOURS,
            "scheduler_running": False,
            "next_cleanup": None
        }
        
        if app_scheduler:
            result["scheduler_running"] = app_scheduler.running
            
            # Get the cleanup job
            job = app_scheduler.get_job('cleanup_job')
            if job:
                # Get next run time
                next_run = job.next_run_time
                if next_run:
                    # Convert to ISO format string
                    result["next_cleanup"] = next_run.isoformat()
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Failed to fetch cleanup status: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/webdav/applications', methods=['GET'])
@internal_only
async def get_webdav_applications():
    """
    Get WebDAV configuration and application list
    
    INTERNAL ONLY - Not accessible from external systems
    """
    try:
        result = await pikpak_service.get_webdav_applications()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Failed to get WebDAV applications: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/webdav/toggle', methods=['POST'])
@internal_only
async def toggle_webdav():
    """
    Toggle WebDAV status
    
    INTERNAL ONLY - Not accessible from external systems
    """
    try:
        data = request.json
        enable = data.get('enable')
        
        if enable is None:
            return jsonify({"error": "Missing 'enable' parameter"}), 400
        
        result = await pikpak_service.toggle_webdav(enable)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Failed to toggle WebDAV: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/webdav/application', methods=['POST'])
@internal_only
async def create_webdav_application():
    """
    Create a new WebDAV application
    
    INTERNAL ONLY - Not accessible from external systems
    Used by scheduled job to generate planet-named clients
    """
    try:
        data = request.json
        application_name = data.get('application_name')
        
        if not application_name:
            return jsonify({"error": "Missing 'application_name' parameter"}), 400
        
        result = await pikpak_service.create_webdav_application(application_name)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Failed to create WebDAV application: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/webdav/application', methods=['DELETE'])
@internal_only
async def delete_webdav_application():
    """
    Delete a WebDAV application
    
    INTERNAL ONLY - Not accessible from external systems
    Used by scheduled job to cleanup expired clients
    """
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({"error": "Missing 'username' or 'password' parameter"}), 400
        
        result = await pikpak_service.delete_webdav_application(username, password)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Failed to delete WebDAV application: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/webdav/active-clients', methods=['GET'])
async def get_active_webdav_clients():
    """
    Get list of active WebDAV clients with TTL info
    
    EXTERNAL ENDPOINT - Accessible from frontend
    """
    try:
        if not webdav_manager:
            return jsonify({
                "available": False,
                "message": "WebDAV manager not initialized",
                "clients": []
            }), 500
        
        result = await webdav_manager.get_active_clients()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Failed to get active WebDAV clients: {e}")
        return jsonify({
            "available": False,
            "message": f"Error: {str(e)}",
            "clients": []
        }), 500


@api_bp.route('/share', methods=['POST'])
async def create_share():
    """Create a share link for a file"""
    try:
        data = request.json
        file_id = data.get('id')
        email = data.get('email')
        need_password = data.get('need_password', False)
        expiration_days = data.get('expiration_days', -1)

        if not file_id:
            return jsonify({"error": "Missing 'id' parameter"}), 400

        logger.info(f"Creating share link for file: {file_id}")

        # Create share using PikPak service
        result = await pikpak_service.create_share(
            file_ids=[file_id],
            need_password=need_password,
            expiration_days=expiration_days
        )

        # Store share action in Supabase if email provided
        if email and supabase_service:
            try:
                supabase_service.store_user_action(
                    email=email,
                    action="share",
                    data=result
                )
                logger.info(f"Stored share action for user: {email}")
            except Exception as e:
                logger.warning(f"Failed to store share action: {e}")

        return jsonify(result)
    except Exception as e:
        logger.error(f"Failed to create share: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route('/config', methods=['GET'])
def get_config():
    """Get public configuration"""
    return jsonify({
        "max_file_size_gb": AppConfig.MAX_FILE_SIZE_GB
    })


@api_bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    status = "ok"
    issues = []

    # Check config
    if not AppConfig.PIKPAK_USER or not AppConfig.PIKPAK_PASS:
        status = "degraded"
        issues.append("PikPak credentials missing")

    if not AppConfig.SUPABASE_URL or not AppConfig.SUPABASE_KEY:
        status = "degraded"
        issues.append("Supabase credentials missing")

    # Check PikPak
    if not pikpak_service or not pikpak_service.client:
        status = "degraded"
        issues.append("PikPak client not initialized")

    # Check Supabase
    healthy, error = supabase_service.health_check()
    if not healthy:
        status = "degraded"
        issues.append(error)

    return jsonify({"status": status, "issues": issues})
