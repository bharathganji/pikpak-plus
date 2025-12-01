"""API Routes Package"""
import logging
from flask import Blueprint
from app.api.routes import tasks, quota, webdav, shares, system, statistics

logger = logging.getLogger(__name__)

# Create combined API blueprint
api_bp = Blueprint('api', __name__)

# Register all route blueprints
api_bp.register_blueprint(tasks.bp, url_prefix='/')
api_bp.register_blueprint(quota.bp, url_prefix='/')
api_bp.register_blueprint(webdav.bp, url_prefix='/')
api_bp.register_blueprint(shares.bp, url_prefix='/')
api_bp.register_blueprint(system.bp, url_prefix='/')
api_bp.register_blueprint(statistics.bp, url_prefix='/')


def init_routes(pikpak_service, supabase_service, cache_manager, scheduler, webdav_manager, redis_client=None):
    """
    Initialize routes with required services

    Args:
        pikpak_service: PikPak service instance
        supabase_service: Supabase service instance  
        cache_manager: Cache manager instance
        scheduler: APScheduler instance
        webdav_manager: WebDAV manager instance
        redis_client: Redis client instance
    """
    logger.info("Initializing API routes with services")

    # Initialize services in the global dependencies module
    from app.api.utils.dependencies import init_dependencies
    init_dependencies(
        pikpak=pikpak_service,
        supabase=supabase_service,
        cache=cache_manager,
        scheduler=scheduler,
        webdav_mgr=webdav_manager,
        redis_cli=redis_client
    )

    logger.info("API routes initialized successfully")


__all__ = ['init_routes', 'api_bp']
