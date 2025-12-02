from flask import Blueprint
from app.api.utils.dependencies import get_redis_client, get_supabase_service, get_pikpak_service

bp = Blueprint('health', __name__)


@bp.route('/health/live')
async def liveness():
    return {'status': 'ok'}, 200


@bp.route('/health/ready')
async def readiness():
    # Check Redis
    redis_status = False
    try:
        redis_client = get_redis_client()
        if redis_client and redis_client.ping():
            redis_status = True
    except Exception:
        pass

    # Check Supabase
    supabase_status = False
    try:
        supabase = get_supabase_service()
        if supabase and supabase.client:
            supabase_status = True
    except Exception:
        pass

    # Check PikPak
    pikpak_status = False
    try:
        pikpak = get_pikpak_service()
        if pikpak and pikpak.client:
            pikpak_status = True
    except Exception:
        pass

    checks = {
        'redis': redis_status,
        'supabase': supabase_status,
        'pikpak': pikpak_status
    }

    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503

    return {
        'status': 'ready' if all_healthy else 'not_ready',
        'checks': checks
    }, status_code
