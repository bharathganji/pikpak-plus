"""
Token Manager using Supabase Database for PikPak authentication
Replaces Redis-based token storage with Supabase
"""
from supabase import create_client
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict
from app.core.config import AppConfig

logger = logging.getLogger(__name__)


class TokenManager:
    """Manages PikPak authentication tokens using Supabase Database"""

    def __init__(self):
        """Initialize token manager with Supabase client"""
        self.supabase = None
        try:
            self.supabase = create_client(
                AppConfig.SUPABASE_URL, AppConfig.SUPABASE_KEY)
            logger.info("TokenManager initialized with Supabase")
        except Exception as e:
            logger.error(
                f"Failed to connect to Supabase for TokenManager: {e}")
            self.supabase = None

    def _get_tokens_row(self) -> Optional[Dict]:
        """Helper to get the single token row"""
        if not self.supabase:
            logger.warning(
                "Supabase client not initialized, cannot get tokens")
            return None
        try:
            logger.debug("Fetching tokens from Supabase...")
            response = self.supabase.table('pikpak_tokens').select(
                '*').eq('id', 1).single().execute()
            if response.data:
                logger.info("Successfully retrieved tokens from Supabase")
            else:
                logger.warning("No tokens found in Supabase")
            return response.data
        except Exception as e:
            logger.error(f"Failed to get tokens from Supabase: {e}")
            return None

    def _update_tokens_row(self, data: Dict):
        """Helper to update the single token row"""
        if not self.supabase:
            logger.warning(
                "Supabase client not initialized, cannot update tokens")
            return
        try:
            data['id'] = 1  # Enforce singleton
            data['updated_at'] = datetime.now(timezone.utc).isoformat()
            self.supabase.table('pikpak_tokens').upsert(data).execute()
            logger.info("Successfully updated tokens in Supabase")
        except Exception as e:
            logger.error(f"Failed to update tokens in Supabase: {e}")

    def get_credentials(self) -> Optional[Dict[str, str]]:
        """
        Get stored credentials (username, password)

        Returns:
            Dict with 'username' and 'password' or None if not found
        """
        row = self._get_tokens_row()
        if row and row.get('username') and row.get('password'):
            return {
                'username': row['username'],
                'password': row['password']
            }
        return None

    def set_credentials(self, username: str, password: str):
        """
        Store credentials (username, password)

        Args:
            username: PikPak username/email
            password: PikPak password
        """
        self._update_tokens_row({
            'username': username,
            'password': password
        })

    def get_access_token(self) -> Optional[str]:
        """
        Get stored access token

        Returns:
            Access token string or None if expired/not found
        """
        row = self._get_tokens_row()
        if row and row.get('access_token'):
            # Optional: Check expiration if stored
            # expires_at = row.get('access_token_expires_at')
            return row['access_token']
        return None

    def set_access_token(self, token: str):
        """
        Store access token

        Args:
            token: Access token string
        """
        self._update_tokens_row({
            'access_token': token
        })

    def get_refresh_token(self) -> Optional[str]:
        """
        Get stored refresh token

        Returns:
            Refresh token string or None if expired/not found
        """
        row = self._get_tokens_row()
        if row and row.get('refresh_token'):
            return row['refresh_token']
        return None

    def set_refresh_token(self, token: str):
        """
        Store refresh token

        Args:
            token: Refresh token string
        """
        self._update_tokens_row({
            'refresh_token': token
        })

    def get_all_tokens(self) -> Dict[str, Optional[str]]:
        """
        Get both access and refresh tokens

        Returns:
            Dict with 'access_token' and 'refresh_token'
        """
        row = self._get_tokens_row()
        if row:
            return {
                'access_token': row.get('access_token'),
                'refresh_token': row.get('refresh_token')
            }
        return {
            'access_token': None,
            'refresh_token': None
        }

    def set_tokens(self, access_token: str, refresh_token: str):
        """
        Store both tokens at once

        Args:
            access_token: Access token string
            refresh_token: Refresh token string
        """
        self._update_tokens_row({
            'access_token': access_token,
            'refresh_token': refresh_token
        })

    def clear_tokens(self):
        """Clear all stored tokens (useful for logout)"""
        self._update_tokens_row({
            'access_token': None,
            'refresh_token': None
        })

    def clear_all(self):
        """Clear everything including credentials"""
        if not self.supabase:
            return
        try:
            self.supabase.table('pikpak_tokens').delete().eq('id', 1).execute()
        except Exception as e:
            print(f"Failed to clear tokens in Supabase: {e}")

    def close(self):
        """Close the cache (call on app shutdown)"""
        # Supabase client doesn't need explicit closing usually
        pass

    def __enter__(self):
        """Context manager support"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager cleanup"""
        self.close()


# Global singleton instance
_token_manager = None


def get_token_manager() -> TokenManager:
    """
    Get or create the global TokenManager instance

    Returns:
        TokenManager instance
    """
    global _token_manager
    if _token_manager is None:
        _token_manager = TokenManager()
    return _token_manager
