from flask import Blueprint
from app.api.utils.dependencies import get_redis_client, get_supabase_service, get_pikpak_service

bp = Blueprint('health', __name__)


def _check_redis_health():
    """Check Redis service health"""
    try:
        redis_client = get_redis_client()
        return redis_client and redis_client.ping()
    except Exception:
        return False


def _check_supabase_health():
    """Check Supabase service health"""
    try:
        supabase = get_supabase_service()
        return bool(supabase and supabase.client)
    except Exception:
        return False


def _check_pikpak_health():
    """Check PikPak service health"""
    try:
        pikpak = get_pikpak_service()
        return bool(pikpak and pikpak.client)
    except Exception:
        return False


def _perform_health_checks():
    """Perform all service health checks"""
    return {
        'redis': _check_redis_health(),
        'supabase': _check_supabase_health(),
        'pikpak': _check_pikpak_health()
    }


@bp.route('/health/live')
async def liveness():
    """Lightweight liveness check - just ensure the app is responding"""
    return {'status': 'ok'}, 200


@bp.route('/health/ready')
async def readiness():
    """Comprehensive readiness check"""
    checks = _perform_health_checks()
    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503

    return {
        'status': 'ready' if all_healthy else 'not_ready',
        'checks': checks
    }, status_code
