"""Authentication and Security Utilities"""
from functools import wraps
from flask import request, jsonify
import logging

logger = logging.getLogger(__name__)

def internal_only(f):
    """
    Decorator to restrict endpoint access to internal/localhost only.
    
    This prevents external users from accessing sensitive endpoints like
    WebDAV management operations (create, delete, toggle).
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get client IP
        client_ip = request.remote_addr
        
        # Allow localhost and common local IPs
        allowed_ips = ['127.0.0.1', 'localhost', '::1']
        
        # Also allow if request is coming from the same server (Docker internal network)
        if client_ip.startswith('172.') or client_ip.startswith('10.'):
            # Docker/internal network IPs
            return f(*args, **kwargs)
        
        if client_ip not in allowed_ips:
            logger.warning(f"Blocked internal-only endpoint access from {client_ip}")
            return jsonify({
                "error": "Access denied",
                "message": "This endpoint is for internal use only"
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function
