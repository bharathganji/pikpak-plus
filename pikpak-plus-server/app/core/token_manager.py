"""
Token Manager using Supabase Database for PikPak authentication
Replaces Redis-based token storage with Supabase
"""
import logging
from datetime import UTC, datetime
from typing import Any

from supabase import create_client

from app.core.config import AppConfig

logger = logging.getLogger(__name__)


class TokenManager:
    """Manages PikPak authentication tokens using Supabase Database"""

    def __init__(self):
        """Initialize token manager with Supabase client"""
        self.supabase = None
        try:
            supabase_url = AppConfig.SUPABASE_URL or ""
            supabase_key = AppConfig.SUPABASE_KEY or ""
            self.supabase = create_client(supabase_url, supabase_key)
            logger.info("TokenManager initialized with Supabase")
        except Exception as e:
            logger.error(
                f"Failed to connect to Supabase for TokenManager: {e}")
            self.supabase = None

    def _get_tokens_row(self) -> dict[str, Any] | None:
        """Helper to get the single token row"""
        if not self.supabase:
            logger.warning(
                "Supabase client not initialized, cannot get tokens")
            return None
        try:
            logger.debug("Fetching tokens from Supabase...")
            response = self.supabase.table('pikpak_tokens').select(
                '*').eq('id', 1).single().execute()
            if response.data and isinstance(response.data, dict):
                logger.info("Successfully retrieved tokens from Supabase")
                return response.data
            else:
                logger.warning("No tokens found in Supabase")
                return None
        except Exception as e:
            logger.error(f"Failed to get tokens from Supabase: {e}")
            return None

    def _update_tokens_row(self, data: dict):
        """Helper to update the single token row"""
        if not self.supabase:
            logger.warning(
                "Supabase client not initialized, cannot update tokens")
            return
        try:
            data['id'] = 1  # Enforce singleton
            data['updated_at'] = datetime.now(UTC).isoformat()
            self.supabase.table('pikpak_tokens').upsert(data).execute()
            logger.info("Successfully updated tokens in Supabase")
        except Exception as e:
            logger.error(f"Failed to update tokens in Supabase: {e}")

    def get_credentials(self) -> dict[str, str] | None:
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

    def get_access_token(self) -> str | None:
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

    def get_refresh_token(self) -> str | None:
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

    def get_all_tokens(self) -> dict[str, Any | None]:
        """
        Get all tokens including access, refresh, user_id, and expiration timestamp.
        Note: Captcha tokens are managed via Redis, not Supabase

        Returns:
            Dict with token fields
        """
        row = self._get_tokens_row()
        if row:
            return {
                'access_token': row.get('access_token'),
                'refresh_token': row.get('refresh_token'),
                'user_id': row.get('user_id'),
                'access_token_expires_at': row.get('access_token_expires_at'),
            }
        return {
            'access_token': None,
            'refresh_token': None,
            'user_id': None,
            'access_token_expires_at': None,
        }

    def set_tokens(
        self,
        access_token: str | None = None,
        refresh_token: str | None = None,
        user_id: str | None = None,
        access_token_expires_at: float | datetime | str | None = None,
        refresh_token_expires_at: float | datetime | str | None = None,
    ) -> None:
        """
        Store tokens in Supabase with expiration timestamps.
        Note: Captcha tokens are managed via Redis, not Supabase

        Args:
            access_token: Access token string
            refresh_token: Refresh token string
            user_id: PikPak user ID
            access_token_expires_at: Timestamp when access token expires
            refresh_token_expires_at: Timestamp when refresh token expires
        """
        data: dict[str, Any] = {}
        if access_token is not None:
            data['access_token'] = access_token
        if refresh_token is not None:
            data['refresh_token'] = refresh_token
        if user_id is not None:
            data['user_id'] = user_id

        if access_token_expires_at is not None:
            if isinstance(access_token_expires_at, (int, float)):
                data['access_token_expires_at'] = datetime.fromtimestamp(
                    float(access_token_expires_at), tz=UTC
                ).isoformat()
            elif isinstance(access_token_expires_at, datetime):
                data['access_token_expires_at'] = access_token_expires_at.isoformat()
            else:
                data['access_token_expires_at'] = str(access_token_expires_at)

        if refresh_token_expires_at is not None:
            if isinstance(refresh_token_expires_at, (int, float)):
                data['refresh_token_expires_at'] = datetime.fromtimestamp(
                    float(refresh_token_expires_at), tz=UTC
                ).isoformat()
            elif isinstance(refresh_token_expires_at, datetime):
                data['refresh_token_expires_at'] = refresh_token_expires_at.isoformat()
            else:
                data['refresh_token_expires_at'] = str(refresh_token_expires_at)

        if data:
            self._update_tokens_row(data)

    def on_token_refresh(self, token_data: dict[str, Any]) -> None:
        """
        Bridge callback for PikPakApi.token_refresh_callback.
        Executed whenever tokens are rotated (login, refresh, or 401 retry).
        Updates Supabase pikpak_tokens table and syncs Redis DistributedLoginLock.
        """
        access_token = token_data.get('access_token')
        refresh_token = token_data.get('refresh_token')
        user_id = token_data.get('user_id')
        expires_at = token_data.get('expires_at')

        logger.info("Executing token_refresh_callback: persisting rotated tokens to Supabase")
        self.set_tokens(
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=user_id,
            access_token_expires_at=expires_at,
        )

        # Synchronize with Redis DistributedLoginLock
        try:
            from app.utils.redis_lock import get_login_lock
            login_lock = get_login_lock()
            login_lock.set_login_completed()
            if expires_at:
                login_lock.set_token_valid_until(float(expires_at))
            elif access_token:
                from app.utils.jwt_utils import decode_token
                decoded = decode_token(access_token)
                if decoded and decoded.get('exp'):
                    login_lock.set_token_valid_until(float(decoded['exp']))
            logger.info("Synchronized token expiration with Redis DistributedLoginLock")
        except Exception as redis_exc:
            logger.warning(f"Could not sync Redis login lock on token refresh: {redis_exc}")

    def clear_tokens(self) -> None:
        """Clear all stored tokens (useful for logout)"""
        self._update_tokens_row({
            'access_token': None,
            'refresh_token': None,
            'user_id': None,
            'access_token_expires_at': None,
            'refresh_token_expires_at': None,
        })

    def clear_all(self):
        """Clear everything including credentials"""
        if not self.supabase:
            return
        try:
            self.supabase.table('pikpak_tokens').delete().eq('id', 1).execute()
        except Exception as e:
            logger.error(f"Failed to clear tokens in Supabase: {e}")

    def close(self):
        """Close the cache (call on app shutdown)"""
        # Supabase client doesn't need explicit closing usually

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
