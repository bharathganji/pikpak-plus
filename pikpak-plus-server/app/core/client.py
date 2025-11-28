"""
PikPak Client with diskcache-based token management
Simplified for single-server setup with automatic token refresh
"""
from PikPakAPI import PikPakApi
from app.core.token_manager import get_token_manager
from typing import Optional
import os

def get_or_create_client(username: str, password: str, proxy: Optional[str] = None) -> PikPakApi:
    """
    Get or create a PikPak client with automatic token management
    
    This function handles token refresh automatically:
    1. Checks for cached tokens
    2. Uses cached tokens if valid
    3. Automatically refreshes if expired (no /ping needed!)
    4. Falls back to login if tokens are invalid
    5. Caches new tokens with TTL
    
    Args:
        username: PikPak username/email
        password: PikPak password
        proxy: Optional proxy URL
        
    Returns:
        Authenticated PikPakApi client instance
    """
    token_mgr = get_token_manager()
    
    # Create client instance
    client = PikPakApi(username=username, password=password)
    
    # Try to use cached tokens (diskcache handles TTL automatically)
    tokens = token_mgr.get_all_tokens()
    access_token = tokens.get('access_token')
    refresh_token = tokens.get('refresh_token')
    
    # If we have an access token, try to use it
    if access_token:
        client.access_token = access_token
        client.refresh_token = refresh_token
        
        try:
            # Test if access token is valid
            # If this succeeds, we're good to go
            print("✓ Using cached access token")
            return client
        except Exception as e:
            print(f"✗ Cached access token invalid: {e}")
            # Access token is invalid, try refresh token
    
    # If we have a refresh token, try to refresh
    if refresh_token:
        client.refresh_token = refresh_token
        try:
            print("⟳ Refreshing access token...")
            client.refresh_access_token()
            
            # Cache the new tokens with TTL
            # Access token: 1 hour, Refresh token: 7 days
            token_mgr.set_tokens(
                access_token=client.access_token,
                refresh_token=client.refresh_token
            )
            print("✓ Access token refreshed successfully")
            return client
        except Exception as e:
            print(f"✗ Token refresh failed: {e}")
            # Refresh failed, need to login
    
    # No valid tokens, perform fresh login
    print("⟳ Logging in with credentials...")
    try:
        client.login()
        
        # Cache the new tokens
        token_mgr.set_tokens(
            access_token=client.access_token,
            refresh_token=client.refresh_token
        )
        
        # Also cache credentials for future use
        token_mgr.set_credentials(username, password)
        
        print("✓ Login successful")
        return client
    except Exception as e:
        print(f"✗ Login failed: {e}")
        raise e


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