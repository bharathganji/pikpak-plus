"""Dependency Injection for API Routes"""

from app.services import PikPakService, SupabaseService, WebDAVManager
from app.utils.common import CacheManager

# Global service instances (injected by app initialization)
_pikpak_service: PikPakService | None = None
_supabase_service: SupabaseService | None = None
_cache_manager: CacheManager | None = None
_app_scheduler = None
_webdav_manager: WebDAVManager | None = None
_redis_client = None


def init_dependencies(
    pikpak: PikPakService,
    supabase: SupabaseService,
    cache: CacheManager,
    scheduler=None,
    webdav_mgr: WebDAVManager | None = None,
    redis_cli=None
):
    """Initialize all service dependencies for routes"""
    global _pikpak_service, _supabase_service, _cache_manager, _app_scheduler, _webdav_manager, _redis_client
    _pikpak_service = pikpak
    _supabase_service = supabase
    _cache_manager = cache
    _app_scheduler = scheduler
    _webdav_manager = webdav_mgr
    _redis_client = redis_cli


def get_service(service_name: str):
    """Get a service instance by name"""
    services = {
        'pikpak': _pikpak_service,
        'supabase': _supabase_service,
        'cache': _cache_manager,
        'scheduler': _app_scheduler,
        'webdav': _webdav_manager
    }
    return services.get(service_name)


# Convenience getters
def get_pikpak_service() -> PikPakService | None:
    return _pikpak_service


def get_supabase_service() -> SupabaseService | None:
    return _supabase_service


def get_cache_manager() -> CacheManager | None:
    return _cache_manager


def get_scheduler():
    return _app_scheduler


def get_webdav_manager() -> WebDAVManager | None:
    return _webdav_manager


def get_redis_client():
    return _redis_client
