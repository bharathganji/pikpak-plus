"""Application Factory"""
import logging
import redis
from flask import Flask
from flask_cors import CORS
from supabase import create_client

from app.core.config import AppConfig
from app.services import PikPakService, SupabaseService, WebDAVManager
from app.utils.common import CacheManager
from app.api.routes import init_routes, api_bp
from app.tasks.scheduler import init_scheduler

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Also configure the APScheduler logger to show INFO level logs
apscheduler_logger = logging.getLogger('apscheduler')
apscheduler_logger.setLevel(logging.INFO)


def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    app.config.from_object(AppConfig())
    CORS(app)

    # Initialize Redis client
    try:
        redis_client = redis.from_url(
            AppConfig.REDIS_URL, decode_responses=True)
        logger.info("Redis client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Redis: {e}")
        redis_client = None

    # Initialize cache manager
    cache_manager = CacheManager(
        './cache_dir', AppConfig.CACHE_TTL, AppConfig.REDIS_URL)

    # Initialize Supabase client
    supabase_client = create_client(
        AppConfig.SUPABASE_URL, AppConfig.SUPABASE_KEY)
    logger.info("Supabase client initialized successfully")

    # Initialize Supabase service
    supabase_service = SupabaseService(supabase_client)

    # Initialize PikPak service
    pikpak_service = PikPakService(
        AppConfig.PIKPAK_USER, AppConfig.PIKPAK_PASS)
    logger.info("PikPak client initialized successfully")

    # Initialize WebDAV manager
    webdav_manager = None
    try:
        webdav_manager = WebDAVManager(
            pikpak_service, ttl_hours=AppConfig.WEBDAV_GENERATION_INTERVAL_HOURS, cache_manager=cache_manager)
        logger.info("WebDAV manager initialized")
    except Exception as e:
        logger.warning(f"WebDAV manager initialization failed: {e}")

    # Initialize routes with services
    init_routes(pikpak_service, supabase_service,
                cache_manager, None, webdav_manager)

    # Register blueprints
    app.register_blueprint(api_bp)

    # Initialize scheduler and background tasks
    # We pass services to the scheduler module so it can use them in jobs
    init_scheduler(app, pikpak_service, supabase_service,
                   webdav_manager, redis_client, cache_manager)

    return app
