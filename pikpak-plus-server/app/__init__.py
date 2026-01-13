"""Application Factory"""
import threading
import os
import logging
import redis
from flask import Flask
from flask_cors import CORS
from flask_compress import Compress
from supabase import create_client

from app.core.config import AppConfig
from app.services import PikPakService, SupabaseService, WebDAVManager
from app.services.user_service import UserService
from app.utils.common import CacheManager
from app.api.routes import init_routes, api_bp
from app.celery_app import celery_app

import json
import uuid
from contextvars import ContextVar
from flask import request, g
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Context variable for correlation ID
correlation_id: ContextVar[str] = ContextVar('correlation_id', default='')


class StructuredLogger(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'correlation_id': correlation_id.get(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }

        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_data)


# Configure Logging with environment-based level
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format='%(message)s'
)
# Apply structured logging
root_logger = logging.getLogger()
for handler in root_logger.handlers:
    handler.setFormatter(StructuredLogger())

logger = logging.getLogger(__name__)

# Reduce verbosity of third-party loggers
# httpx: Only log warnings and errors, not every HTTP request
logging.getLogger('httpx').setLevel(logging.WARNING)

# APScheduler: Reduce noise from scheduler
apscheduler_logger = logging.getLogger('apscheduler')
apscheduler_logger.setLevel(logging.WARNING)

# Reduce werkzeug (Flask) access logs
logging.getLogger('werkzeug').setLevel(logging.WARNING)

# Reduce WebDAV debug noise
webdav_logger = logging.getLogger('PikPakAPI.webdav')
webdav_logger.setLevel(logging.INFO)

# Filter duplicate worker startup logs - only log from primary worker
_worker_initialized = threading.Event()


def _filter_duplicate_logs():
    """Filter startup logs from non-primary workers"""
    worker_id = os.getenv('WORKER_ID', '0')
    if worker_id != '0':
        # Suppress INFO logs for non-primary workers during initialization
        logging.getLogger('app').setLevel(logging.WARNING)


def create_app():
    """Create and configure the Flask application"""
    # Filter duplicate logs from non-primary workers
    _filter_duplicate_logs()

    app = Flask(__name__)
    app.config.from_object(AppConfig())
    CORS(app)
    Compress(app)  # Enable gzip compression for responses

    # Initialize Redis client with connection pooling
    try:
        redis_pool = redis.ConnectionPool.from_url(
            AppConfig.REDIS_URL,
            decode_responses=True,
            max_connections=50
        )
        redis_client = redis.Redis(connection_pool=redis_pool)
        logger.info("Redis client initialized with connection pool")
    except Exception as e:
        logger.error(f"Failed to initialize Redis: {e}")
        redis_client = None

    # Initialize cache manager
    cache_manager = CacheManager(
        AppConfig.TASK_CACHE_TTL, AppConfig.REDIS_URL)

    # Initialize Supabase client
    supabase_client = create_client(
        AppConfig.SUPABASE_URL, AppConfig.SUPABASE_KEY)
    logger.info("Supabase client initialized successfully")

    # Initialize Supabase service
    supabase_service = SupabaseService(supabase_client)

    # Bootstrap Admin User
    try:
        user_service = UserService(supabase_service)
        user_service.bootstrap_admin_user()
    except Exception as e:
        logger.error(f"Failed to bootstrap admin user: {e}")

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
                cache_manager, None, webdav_manager, redis_client)

    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')

    # Rate Limiter disabled
    # Limiter(
    #     app=app,
    #     key_func=get_remote_address,
    #     storage_uri=AppConfig.REDIS_URL,
    #     default_limits=["2000 per day", "500 per hour"]
    # )

    # Middleware to set correlation ID
    @app.before_request
    def set_correlation_id():
        cid = request.headers.get('X-Correlation-ID', str(uuid.uuid4()))
        correlation_id.set(cid)
        g.correlation_id = cid

    return app
