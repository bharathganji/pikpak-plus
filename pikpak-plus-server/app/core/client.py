"""
PikPak Client with Redis-based token management
Simplified for single-server setup with automatic token refresh
"""
import logging
import os
from typing import Any

from app.core.token_manager import get_token_manager
from PikPakAPI import PikPakApi

logger = logging.getLogger(__name__)


def get_or_create_client(username: str, password: str, proxy: str | None = None) -> PikPakApi:
    """
    Get or create a PikPak client configured with Supabase token synchronization.

    1. Loads cached access_token, refresh_token, user_id from Supabase.
    2. Instantiates modernized modular PikPakApi.
    3. Wires token_refresh_callback to token_mgr.on_token_refresh.
    4. Configures HTTP proxy arguments if provided.

    Args:
        username: PikPak username/email
        password: PikPak password
        proxy: Optional proxy URL

    Returns:
        PikPakApi client instance with tokens loaded (if available)
    """
    token_mgr = get_token_manager()

    # Try to load cached tokens from Supabase
    tokens = token_mgr.get_all_tokens()
    access_token = tokens.get('access_token')
    refresh_token = tokens.get('refresh_token')
    user_id = tokens.get('user_id')
    expires_at_raw = tokens.get('access_token_expires_at')

    httpx_client_args: dict[str, Any] = {}
    if proxy:
        httpx_client_args["proxy"] = proxy

    # Create client instance with token_refresh_callback wired to Supabase & Redis synchronization
    client = PikPakApi(
        username=username,
        password=password,
        access_token=access_token,
        refresh_token=refresh_token,
        httpx_client_args=httpx_client_args if httpx_client_args else None,
        token_refresh_callback=token_mgr.on_token_refresh,
    )

    if user_id:
        client.user_id = user_id

    # Sync expires_at if available in Supabase or decode from access_token JWT
    if expires_at_raw:
        try:
            from datetime import datetime
            if isinstance(expires_at_raw, str):
                dt = datetime.fromisoformat(expires_at_raw.replace('Z', '+00:00'))
                client.expires_at = dt.timestamp()
            elif isinstance(expires_at_raw, (int, float)):
                client.expires_at = float(expires_at_raw)
        except Exception:
            pass

    if access_token and not getattr(client, 'expires_at', None):
        try:
            from app.utils.jwt_utils import decode_token
            decoded = decode_token(access_token)
            if decoded and decoded.get('exp'):
                client.expires_at = float(decoded['exp'])
        except Exception:
            pass

    if access_token:
        logger.info("Loaded cached PikPak tokens from Supabase into modern client")
    else:
        logger.info("No cached tokens found in Supabase, will login when needed")

    return client


def create_client_from_env() -> PikPakApi:
    """
    Create client using environment variables
    Prioritizes PIKPAK_USER / PIKPAK_USERNAME over POSIX $USER to avoid collisions.

    Requires:
        - PIKPAK_USER or PIKPAK_USERNAME or user or USER
        - PIKPAK_PASS or PIKPAK_PASSWORD or passwd or PASSWD
        - PIKPAK_PROXY or proxy (optional)

    Returns:
        Authenticated PikPakApi client instance
    """
    username = (
        os.getenv('PIKPAK_USER')
        or os.getenv('PIKPAK_USERNAME')
        or os.getenv('user')
        or os.getenv('USER')
    )
    password = (
        os.getenv('PIKPAK_PASS')
        or os.getenv('PIKPAK_PASSWORD')
        or os.getenv('passwd')
        or os.getenv('PASSWD')
    )
    proxy = (
        os.getenv('PIKPAK_PROXY')
        or os.getenv('proxy')
        or os.getenv('PROXY')
    )
    logger.debug(f"PikPak username resolved from environment: {username}")
    if not username or not password:
        raise ValueError("Missing PIKPAK_USER/PIKPAK_PASS or user/passwd environment variables")

    return get_or_create_client(username, password, proxy)


def logout():
    """
    Logout by clearing all cached tokens
    """
    token_mgr = get_token_manager()
    token_mgr.clear_tokens()
    logger.info("Logged out - tokens cleared")


def clear_all_cache():
    """
    Clear all cached data including credentials
    """
    token_mgr = get_token_manager()
    token_mgr.clear_all()
    logger.info("All cache cleared")


# Backward compatibility functions (deprecated)
def client_from_credit(credfile, proxy=None):
    """
    DEPRECATED: Use get_or_create_client() instead
    Kept for backward compatibility

    Note: credfile and proxy parameters are ignored
    """
    logger.warning("Warning: client_from_credit() is deprecated. Use get_or_create_client() instead")
    logger.warning(f"Ignoring parameters: credfile='{credfile}', proxy='{proxy}'")
    return None, {}


def client_from_password(username, password, credfile='', proxy=None):
    """
    DEPRECATED: Use get_or_create_client() instead
    Kept for backward compatibility

    Note: credfile parameter is ignored
    """
    logger.warning("Warning: client_from_password() is deprecated. Use get_or_create_client() instead")
    logger.warning(f"Ignoring parameter: credfile='{credfile}'")
    client = get_or_create_client(username, password, proxy)
    return client, {}


def create_client(credfile, username, password, proxy=None):
    """
    DEPRECATED: Use get_or_create_client() instead
    Kept for backward compatibility

    Note: credfile parameter is ignored
    """
    logger.warning("Warning: create_client() is deprecated. Use get_or_create_client() instead")
    logger.warning(f"Ignoring parameter: credfile='{credfile}'")
    return get_or_create_client(username, password, proxy)
