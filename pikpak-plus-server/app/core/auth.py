"""Authentication and Security Utilities"""
import bcrypt
import jwt
import secrets
from functools import wraps
from flask import request, jsonify
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash

    Args:
        password: Plain text password to verify
        password_hash: Hashed password to check against

    Returns:
        True if password matches, False otherwise
    """
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def create_access_token(user_data: Dict[str, Any], secret_key: str, expiration_hours: int = 24) -> str:
    """Generate a JWT access token

    Args:
        user_data: Dictionary containing user information (email, is_admin, etc.)
        secret_key: Secret key for signing the token
        expiration_hours: Token expiration time in hours

    Returns:
        JWT token string
    """
    payload = {
        'email': user_data['email'],
        'is_admin': user_data.get('is_admin', False),
        'exp': datetime.utcnow() + timedelta(hours=expiration_hours),
        'iat': datetime.utcnow()
    }

    token = jwt.encode(payload, secret_key, algorithm='HS256')
    return token


def create_password_reset_token() -> str:
    """Generate a secure random token for password reset

    Returns:
        Random token string (32 bytes hex)
    """
    return secrets.token_urlsafe(32)


def verify_access_token(token: str, secret_key: str) -> Optional[Dict[str, Any]]:
    """Validate and decode a JWT access token

    Args:
        token: JWT token string
        secret_key: Secret key for verification

    Returns:
        Decoded token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None


def verify_reset_token(token: str, stored_token: str, expires_at: datetime) -> bool:
    """Validate a password reset token

    Args:
        token: Token provided by user
        stored_token: Token stored in database
        expires_at: Token expiration timestamp

Returns:
        True if token is valid and not expired, False otherwise
    """
    if not token or not stored_token:
        return False

    if token != stored_token:
        return False

    if datetime.utcnow() > expires_at.replace(tzinfo=None):
        logger.warning("Reset token has expired")
        return False

    return True


def get_current_user():
    """Decorator helper to extract user from JWT token in request headers

    Returns:
        User data from token or None
    """
    from app.core.config import AppConfig

    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None

    token = auth_header.split(' ')[1]
    user_data = verify_access_token(token, AppConfig.JWT_SECRET_KEY)

    return user_data


def require_auth(f):
    """Decorator to require authentication for an endpoint

    Usage:
        @require_auth
        def my_protected_route():
            user = get_current_user()
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()

        if not user:
            return jsonify({
                "error": "Authentication required",
                "message": "Please log in to access this resource"
            }), 401

        return f(*args, **kwargs)

    return decorated_function


def require_admin(f):
    """Decorator to require admin privileges for an endpoint

    Usage:
        @require_admin
        def my_admin_route():
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()

        if not user:
            return jsonify({
                "error": "Authentication required",
                "message": "Please log in to access this resource"
            }), 401

        if not user.get('is_admin', False):
            return jsonify({
                "error": "Access denied",
                "message": "Administrator privileges required"
            }), 403

        return f(*args, **kwargs)

    return decorated_function


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
            logger.warning(
                f"Blocked internal-only endpoint access from {client_ip}")
            return jsonify({
                "error": "Access denied",
                "message": "This endpoint is for internal use only"
            }), 403

        return f(*args, **kwargs)

    return decorated_function
