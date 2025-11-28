"""API Routes - Main Aggregator"""
from flask import Blueprint
from app.api.utils.dependencies import init_dependencies
from app.api.routes import tasks, quota, webdav, shares, system

# Create main API blueprint
api_bp = Blueprint('api', __name__)

# Register sub-blueprints
api_bp.register_blueprint(tasks.bp)
api_bp.register_blueprint(quota.bp)
api_bp.register_blueprint(webdav.bp)
api_bp.register_blueprint(shares.bp)
api_bp.register_blueprint(system.bp)


def init_routes(pikpak, supabase, cache, scheduler=None, webdav_mgr=None):
    """Initialize routes with service dependencies"""
    init_dependencies(pikpak, supabase, cache, scheduler, webdav_mgr)
