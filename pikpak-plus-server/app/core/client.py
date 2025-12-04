"""
PikPak Client with Redis-based token management
Simplified for single-server setup with automatic token refresh
"""
from PikPakAPI import PikPakApi
from app.core.token_manager import get_token_manager
from typing import Optional
import os


def get_or_create_client(username: str, password: str, proxy: Optional[str] = None) -> PikPakApi:
    """
    Get or create a PikPak client with token management

    This function loads cached tokens from Supabase and sets them on the client.
    The actual login/refresh is handled by ensure_logged_in() when needed.

    Args:
        username: PikPak username/email
        password: PikPak password
        proxy: Optional proxy URL

    Returns:
        PikPakApi client instance with tokens loaded (if available)
    """
    token_mgr = get_token_manager()

    # Create client instance
    client = PikPakApi(username=username, password=password)

    # Try to load cached tokens from Supabase
    tokens = token_mgr.get_all_tokens()
    access_token = tokens.get('access_token')
    refresh_token = tokens.get('refresh_token')

    # If we have tokens, set them on the client
    # The actual validation and refresh will be done by ensure_logged_in()
    if access_token:
        client.access_token = access_token
        client.refresh_token = refresh_token
        print("✓ Loaded tokens from Supabase")
    else:
        print("ℹ No cached tokens found, will login when needed")

    return client


def create_client_from_env() -> PikPakApi:
    """
    Create client using environment variables

    Requires:
        - PIKPAK_USERNAME or user
        - PIKPAK_PASSWORD or passwd
        - PIKPAK_PROXY (optional)

    Returns:
        Authenticated PikPakApi client instance
    """
    username = os.getenv('user')
    password = os.getenv('passwd')
    proxy = os.getenv('proxy')
    print(f"user: {username}")
    print(f"passwd: {password}")
    print(f"proxy: {proxy}")
    if not username or not password:
        raise ValueError("Missing user or passwd environment variables")

    return get_or_create_client(username, password, proxy)


def logout():
    """
    Logout by clearing all cached tokens
    """
    token_mgr = get_token_manager()
    token_mgr.clear_tokens()
    print("✓ Logged out - tokens cleared")


def clear_all_cache():
    """
    Clear all cached data including credentials
    """
    token_mgr = get_token_manager()
    token_mgr.clear_all()
    print("✓ All cache cleared")


# Backward compatibility functions (deprecated)
def client_from_credit(credfile, proxy=None):
    """
    DEPRECATED: Use get_or_create_client() instead
    Kept for backward compatibility

    Note: credfile and proxy parameters are ignored
    """
    print("⚠ Warning: client_from_credit() is deprecated. Use get_or_create_client() instead")
    print(f"⚠ Ignoring parameters: credfile='{credfile}', proxy='{proxy}'")
    return None, {}


def client_from_password(username, password, credfile='', proxy=None):
    """
    DEPRECATED: Use get_or_create_client() instead
    Kept for backward compatibility

    Note: credfile parameter is ignored
    """
    print("⚠ Warning: client_from_password() is deprecated. Use get_or_create_client() instead")
    print(f"⚠ Ignoring parameter: credfile='{credfile}'")
    client = get_or_create_client(username, password, proxy)
    return client, {}


def create_client(credfile, username, password, proxy=None):
    """
    DEPRECATED: Use get_or_create_client() instead
    Kept for backward compatibility

    Note: credfile parameter is ignored
    """
    print("⚠ Warning: create_client() is deprecated. Use get_or_create_client() instead")
    print(f"⚠ Ignoring parameter: credfile='{credfile}'")
    return get_or_create_client(username, password, proxy)
