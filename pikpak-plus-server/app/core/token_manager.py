"""
Token Manager using diskcache for PikPak authentication
Replaces file-based token storage with efficient disk cache
"""
from diskcache import Cache
import os
from typing import Optional, Dict

class TokenManager:
    """Manages PikPak authentication tokens using diskcache"""
    
    def __init__(self, cache_dir: str = ".cache/pikpak"):
        """
        Initialize token manager with disk cache
        
        Args:
            cache_dir: Directory to store cache files (default: .cache/pikpak)
        """
        self.cache = Cache(cache_dir)
        # Default TTL for access tokens (1 hour)
        self.access_token_ttl = 3600
        # Refresh tokens typically last longer (7 days)
        self.refresh_token_ttl = 604800
    
    def get_credentials(self) -> Optional[Dict[str, str]]:
        """
        Get stored credentials (username, password)
        
        Returns:
            Dict with 'username' and 'password' or None if not found
        """
        return self.cache.get('credentials')
    
    def set_credentials(self, username: str, password: str):
        """
        Store credentials (username, password)
        
        Args:
            username: PikPak username/email
            password: PikPak password
        """
        self.cache.set('credentials', {
            'username': username,
            'password': password
        }, expire=None)  # Never expire
    
    def get_access_token(self) -> Optional[str]:
        """
        Get stored access token
        
        Returns:
            Access token string or None if expired/not found
        """
        return self.cache.get('access_token')
    
    def set_access_token(self, token: str, ttl: Optional[int] = None):
        """
        Store access token with TTL
        
        Args:
            token: Access token string
            ttl: Time to live in seconds (default: 3600)
        """
        expire_time = ttl or self.access_token_ttl
        self.cache.set('access_token', token, expire=expire_time)
    
    def get_refresh_token(self) -> Optional[str]:
        """
        Get stored refresh token
        
        Returns:
            Refresh token string or None if expired/not found
        """
        return self.cache.get('refresh_token')
    
    def set_refresh_token(self, token: str, ttl: Optional[int] = None):
        """
        Store refresh token with TTL
        
        Args:
            token: Refresh token string
            ttl: Time to live in seconds (default: 604800 - 7 days)
        """
        expire_time = ttl or self.refresh_token_ttl
        self.cache.set('refresh_token', token, expire=expire_time)
    
    def get_all_tokens(self) -> Dict[str, Optional[str]]:
        """
        Get both access and refresh tokens
        
        Returns:
            Dict with 'access_token' and 'refresh_token'
        """
        return {
            'access_token': self.get_access_token(),
            'refresh_token': self.get_refresh_token()
        }
    
    def set_tokens(self, access_token: str, refresh_token: str, 
                   access_ttl: Optional[int] = None, 
                   refresh_ttl: Optional[int] = None):
        """
        Store both tokens at once
        
        Args:
            access_token: Access token string
            refresh_token: Refresh token string
            access_ttl: Access token TTL in seconds
            refresh_ttl: Refresh token TTL in seconds
        """
        self.set_access_token(access_token, access_ttl)
        self.set_refresh_token(refresh_token, refresh_ttl)
    
    def clear_tokens(self):
        """Clear all stored tokens (useful for logout)"""
        self.cache.delete('access_token')
        self.cache.delete('refresh_token')
    
    def clear_all(self):
        """Clear everything including credentials"""
        self.cache.clear()
    
    def close(self):
        """Close the cache (call on app shutdown)"""
        self.cache.close()
    
    def __enter__(self):
        """Context manager support"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager cleanup"""
        self.close()


# Global singleton instance
_token_manager = None

def get_token_manager(cache_dir: str = ".cache/pikpak") -> TokenManager:
    """
    Get or create the global TokenManager instance
    
    Args:
        cache_dir: Directory for cache storage
        
    Returns:
        TokenManager instance
    """
    global _token_manager
    if _token_manager is None:
        _token_manager = TokenManager(cache_dir)
    return _token_manager
