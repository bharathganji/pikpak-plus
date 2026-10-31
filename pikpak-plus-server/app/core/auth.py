"""Authentication and Security Utilities"""

import ipaddress
import logging
import secrets
from datetime import UTC, datetime, timedelta
from functools import wraps
from typing import Any

import bcrypt
import jwt
from flask import jsonify, request

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash

    Args:
        password: Plain text password to verify
        password_hash: Hashed password to check against

    Returns:
        True if password matches, False otherwise
    """
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception as e:  # noqa: BLE001
        logger.error(f"Password verification error: {e}")
        return False


def create_access_token(
    user_data: dict[str, Any], secret_key: str, expiration_hours: int = 24
) -> str:
    """Generate a JWT access token

    Args:
        user_data: Dictionary containing user information (email, is_admin, etc.)
        secret_key: Secret key for signing the token
        expiration_hours: Token expiration time in hours

    Returns:
        JWT token string
    """
    payload = {
        "email": user_data["email"],
        "is_admin": user_data.get("is_admin", False),
        "exp": datetime.now(UTC) + timedelta(hours=expiration_hours),
        "iat": datetime.now(UTC),
    }

    token = jwt.encode(payload, secret_key, algorithm="HS256")
    return token


def create_password_reset_token() -> str:
    """Generate a secure random token for password reset

    Returns:
        Random token string (32 bytes hex)
    """
    return secrets.token_urlsafe(32)


def verify_access_token(token: str, secret_key: str) -> dict[str, Any] | None:
    """Validate and decode a JWT access token

    Args:
        token: JWT token string
        secret_key: Secret key for verification

    Returns:
        Decoded token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None


def verify_reset_token(token: str, stored_token: str, expires_at: Any) -> bool:
    """Validate a password reset token

    Args:
        token: Token provided by user
        stored_token: Token stored in database
        expires_at: Token expiration timestamp (datetime or ISO string)

    Returns:
        True if token is valid and not expired, False otherwise
    """
    if not token or not stored_token:
        return False

    if token != stored_token:
        return False

    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(expires_at)
        except (ValueError, TypeError):
            logger.warning("Failed to parse reset token expiration timestamp")
            return False

    if not isinstance(expires_at, datetime):
        return False

    now = datetime.now(UTC)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)

    if now > expires_at:
        logger.warning("Reset token has expired")
        return False

    return True


def get_current_user():
    """Decorator helper to extract user from JWT token in request headers or cookies

    Supports:
    - Authorization: Bearer <token> (API clients, scripts, backward compatibility)
    - access_token / token cookie (Secure, HttpOnly browser session cookies)

    Returns:
        User data from token or None
    """
    from app.core.config import AppConfig

    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")
    elif "token" in request.cookies:
        token = request.cookies.get("token")

    if not token:
        return None

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
            return jsonify(
                {
                    "error": "Authentication required",
                    "message": "Please log in to access this resource",
                }
            ), 401

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
            return jsonify(
                {
                    "error": "Authentication required",
                    "message": "Please log in to access this resource",
                }
            ), 401

        if not user.get("is_admin", False):
            return jsonify(
                {
                    "error": "Access denied",
                    "message": "Administrator privileges required",
                }
            ), 403

        return f(*args, **kwargs)

    return decorated_function


def _get_trusted_proxies() -> set[str]:
    """Retrieve set of trusted reverse proxy IP addresses."""
    from app.core.config import AppConfig

    raw = getattr(AppConfig, "TRUSTED_PROXIES", "127.0.0.1,::1")
    if isinstance(raw, str):
        return {ip.strip() for ip in raw.split(",") if ip.strip()}
    return set(raw)


def _resolve_client_ip() -> str:
    """
    Resolve the true client IP safely.
    Only inspects X-Forwarded-For if request.remote_addr originates from a trusted proxy.
    Walks the proxy chain backwards from right to left; the first untrusted IP is the true client.
    """
    peer_ip = request.remote_addr or "127.0.0.1"
    trusted_proxies = _get_trusted_proxies()

    if peer_ip in trusted_proxies:
        xff = request.headers.get("X-Forwarded-For")
        if xff:
            ips = [ip.strip() for ip in xff.split(",") if ip.strip()]
            for ip in reversed(ips):
                if ip not in trusted_proxies:
                    return ip

    return peer_ip


INTERNAL_NETWORKS = (
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("fc00::/7"),
)


def _is_internal_ip(ip_str: str) -> bool:
    """Validate if an IP string is strictly a loopback or private network address (RFC 1918 / RFC 4193)."""
    if ip_str in {"localhost", "::1"}:
        return True
    try:
        ip_obj = ipaddress.ip_address(ip_str)
        if ip_obj.is_loopback:
            return True
        return any(ip_obj in net for net in INTERNAL_NETWORKS)
    except ValueError:
        return False


def internal_only(f):
    """
    Decorator to restrict endpoint access to internal/localhost callers.

    Protects against IP spoofing behind reverse proxies and allows trusted
    internal automation via X-Internal-Token.
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        from app.core.config import AppConfig

        # Check internal service token header
        internal_key = getattr(AppConfig, "INTERNAL_API_KEY", None)
        req_token = request.headers.get("X-Internal-Token") or request.headers.get(
            "X-Internal-Key"
        )
        if (
            internal_key
            and req_token
            and secrets.compare_digest(internal_key, req_token)
        ):
            return f(*args, **kwargs)

        client_ip = _resolve_client_ip()

        if not _is_internal_ip(client_ip):
            logger.warning(
                f"Blocked internal-only endpoint [{request.method} {request.path}] "
                f"from client_ip={client_ip} (socket_peer={request.remote_addr})"
            )
            return jsonify(
                {
                    "error": "Access denied",
                    "message": "This endpoint is for internal use only",
                }
            ), 403

        return f(*args, **kwargs)

    return decorated_function
