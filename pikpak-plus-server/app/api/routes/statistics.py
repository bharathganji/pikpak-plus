"""Statistics Routes"""
import logging
from flask import Blueprint, jsonify, request
from app.api.utils.dependencies import get_supabase_service

logger = logging.getLogger(__name__)

bp = Blueprint('statistics', __name__)


@bp.route('/statistics', methods=['GET'])
def get_statistics():
    """Get daily statistics history"""
    try:
        limit = int(request.args.get('limit', 30))
        supabase_service = get_supabase_service()

        stats = supabase_service.get_daily_stats(limit)

        return jsonify(stats)
    except Exception as e:
        logger.error(f"Failed to fetch statistics: {e}")
        return jsonify({"error": str(e)}), 500
