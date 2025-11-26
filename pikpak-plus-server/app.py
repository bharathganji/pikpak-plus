"""
PikPak Plus Server - Modularized Application
"""
import logging
import asyncio
from flask import Flask
from flask_cors import CORS
from flask_apscheduler import APScheduler
from supabase import create_client

from app_config import AppConfig
from services import PikPakService, SupabaseService
from utils import CacheManager
from routes import api_bp, init_routes

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(AppConfig())
CORS(app)

# Initialize scheduler
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

# Initialize services
logger.info("Initializing services...")

# Cache
cache_manager = CacheManager(AppConfig.CACHE_DIR, AppConfig.CACHE_TTL)

# Supabase
supabase_client = None
try:
    supabase_client = create_client(AppConfig.SUPABASE_URL, AppConfig.SUPABASE_KEY)
    logger.info("Supabase client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Supabase: {e}")

supabase_service = SupabaseService(supabase_client)

# PikPak
pikpak_service = PikPakService(AppConfig.PIKPAK_USER, AppConfig.PIKPAK_PASS)

# WebDAV Manager
from webdav_manager import WebDAVManager
webdav_manager = WebDAVManager(pikpak_service, AppConfig.WEBDAV_CLIENT_TTL_HOURS)
logger.info("WebDAV manager initialized")

# Initialize routes with services
init_routes(pikpak_service, supabase_service, cache_manager, scheduler, webdav_manager)

# Register blueprints
app.register_blueprint(api_bp)


# Scheduled cleanup job
def scheduled_cleanup():
    """Wrapper to run async cleanup job"""
    logger.info("Running scheduled cleanup job...")

    if not pikpak_service.client:
        logger.warning("PikPak client not initialized, skipping cleanup")
        return

    try:
        from cleanup import run_cleanup
        asyncio.run(run_cleanup(pikpak_service.client, supabase_client, age_hours=AppConfig.TASK_RETENTION_HOURS))
    except Exception as e:
        logger.error(f"Scheduled cleanup failed: {e}")


# Scheduled task status update job
def scheduled_task_status_update():
    """Update task statuses from PikPak"""
    logger.info("Running scheduled task status update...")

    if not pikpak_service.client:
        logger.warning("PikPak client not initialized, skipping task status update")
        return

    if not supabase_client:
        logger.warning("Supabase client not initialized, skipping task status update")
        return

    try:
        # Get tasks from PikPak
        pikpak_tasks_result = asyncio.run(pikpak_service.get_offline_tasks())
        pikpak_tasks = pikpak_tasks_result.get('tasks', [])

        # Update Supabase with latest task statuses
        updated_count = supabase_service.update_task_statuses(pikpak_tasks)

        # Invalidate cache to force refresh on next request
        cache_manager.invalidate_tasks()

        logger.info(f"Task status update completed. Updated {updated_count} tasks.")
    except Exception as e:
        logger.error(f"Scheduled task status update failed: {e}")


# Schedule cleanup job
scheduler.add_job(
    id='cleanup_job',
    func=scheduled_cleanup,
    trigger='interval',
    hours=AppConfig.CLEANUP_INTERVAL_HOURS
)

# Schedule task status update job
scheduler.add_job(
    id='task_status_update_job',
    func=scheduled_task_status_update,
    trigger='interval',
    minutes=AppConfig.TASK_STATUS_UPDATE_INTERVAL_MINUTES
)


# Scheduled WebDAV generation job
def scheduled_webdav_generation():
    """Generate WebDAV clients every 24 hours"""
    logger.info("Running scheduled WebDAV generation job...")
    
    try:
        result = asyncio.run(webdav_manager.create_daily_webdav_clients())
        if result.get('success'):
            logger.info(f"WebDAV generation completed: {result.get('message')}")
        else:
            logger.warning(f"WebDAV generation skipped: {result.get('message')}")
    except Exception as e:
        logger.error(f"Scheduled WebDAV generation failed: {e}")


# Schedule WebDAV generation job
scheduler.add_job(
    id='webdav_generation_job',
    func=scheduled_webdav_generation,
    trigger='interval',
    hours=AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS
)

logger.info(f"WebDAV generation job scheduled (every {AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS} hours)")

# Run WebDAV generation immediately on startup
logger.info("Running initial WebDAV generation on startup...")
try:
    asyncio.run(webdav_manager.create_daily_webdav_clients())
except Exception as e:
    logger.error(f"Initial WebDAV generation failed: {e}")


if __name__ == '__main__':
    # Validate config on startup
    try:
        AppConfig.validate()
    except ValueError as e:
        logger.error(str(e))
    
    app.run(host='0.0.0.0', port=5000, debug=True)
