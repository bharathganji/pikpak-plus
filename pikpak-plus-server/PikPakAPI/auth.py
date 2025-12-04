import json
import logging
import re
import time
import os
from base64 import b64decode, b64encode
from hashlib import md5
from typing import Dict, Any, Optional

from .PikpakException import PikpakException
from .utils import (
    CLIENT_ID,
    CLIENT_SECRET,
    CLIENT_VERSION,
    PACKAG_ENAME,
    captcha_sign,
    get_timestamp,
)
from .settings import PIKPAK_USER_HOST

TOKEN_FILE = "pikpak_tokens.json"
LOGIN_STATE_FILE = "pikpak_login_state.json"
LOGIN_COOLDOWN = 900  # 15 minutes
ERROR_COOLDOWN = 86400  # 24 hours


class AuthMixin:
    def __init__(self):
        self.username = None
        self.password = None
        self.encoded_token = None
        self.access_token = None
        self.refresh_token = None
        self.user_id = None
        self.device_id = None
        self.captcha_token = None
        self.captcha_expires_at = None  # Track when captcha expires
        self.token_refresh_callback = None
        self.token_refresh_callback_kwargs = {}

    def decode_token(self):
        """Decodes the encoded token to update access and refresh tokens."""
        try:
            decoded_data = json.loads(b64decode(self.encoded_token).decode())
        except Exception:
            raise PikpakException("Invalid encoded token")
        if not decoded_data.get("access_token") or not decoded_data.get("refresh_token"):
            raise PikpakException("Invalid encoded token")
        self.access_token = decoded_data.get("access_token")
        self.refresh_token = decoded_data.get("refresh_token")

    def encode_token(self):
        """Encodes the access and refresh tokens into a single string."""
        token_data = {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
        }
        self.encoded_token = b64encode(
            json.dumps(token_data).encode()).decode()

    async def captcha_init(self, action: str, meta: dict = None) -> Dict[str, Any]:
        url = f"https://{PIKPAK_USER_HOST}/v1/shield/captcha/init"
        if not meta:
            t = f"{get_timestamp()}"
            meta = {
                "captcha_sign": captcha_sign(self.device_id, t),
                "client_version": CLIENT_VERSION,
                "package_name": PACKAG_ENAME,
                "user_id": self.user_id,
                "timestamp": t,
            }
        params = {
            "client_id": CLIENT_ID,
            "action": action,
            "device_id": self.device_id,
            "meta": meta,
        }
        return await self._request_post(url, data=params)

    async def _get_valid_captcha_token(self, action: str, meta: dict = None) -> str:
        """
        Get a valid captcha token, regenerating if expired or missing

        Args:
            action: The action for which captcha is needed
            meta: Optional metadata for captcha generation

        Returns:
            Valid captcha token
        """
        import time

        # Check if we have a captcha token and it's not expired
        if self.captcha_token and self.captcha_expires_at:
            # Add 10 second buffer to avoid edge cases
            if time.time() < (self.captcha_expires_at - 10):
                return self.captcha_token

        # Generate new captcha token
        result = await self.captcha_init(action=action, meta=meta)
        captcha_token = result.get("captcha_token", "")
        expires_in = result.get("expires_in", 300)  # Default 5 minutes

        if not captcha_token:
            raise PikpakException("captcha_token get failed")

        # Store token and expiry time
        self.captcha_token = captcha_token
        self.captcha_expires_at = time.time() + expires_in

        return captcha_token

    async def login(self) -> None:
        """
        Login to PikPak

        Note: Token persistence is now handled by app/core/client.py and TokenManager.
        This method only performs the actual login API call.
        """
        login_url = f"https://{PIKPAK_USER_HOST}/v1/auth/signin"
        metas = {}
        if not self.username or not self.password:
            raise PikpakException("username and password are required")
        if re.match(r"\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*", self.username):
            metas["email"] = self.username
        elif re.match(r"\d{11,18}", self.username):
            metas["phone_number"] = self.username
        else:
            metas["username"] = self.username

        try:
            # Get valid captcha token (will regenerate if expired)
            captcha_token = await self._get_valid_captcha_token(
                action=f"POST:{login_url}",
                meta=metas,
            )
            login_data = {
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "password": self.password,
                "username": self.username,
                "captcha_token": captcha_token,
            }
            user_info = await self._request_post(
                login_url,
                login_data,
                {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            self.access_token = user_info["access_token"]
            self.refresh_token = user_info["refresh_token"]
            self.user_id = user_info["sub"]
            self.encode_token()

            self._persist_tokens()
            self._update_login_timestamp()

        except Exception as e:
            error_msg = str(e).lower()

            # If rate limited or captcha invalid, clear captcha to force regeneration
            if "too frequent" in error_msg or "captcha" in error_msg:
                self.captcha_token = None
                self.captcha_expires_at = None

            if "too frequent" in error_msg:
                self._set_error_cooldown()
            raise e

    async def refresh_access_token(self) -> None:
        """
        Refresh access token
        """
        refresh_url = f"https://{PIKPAK_USER_HOST}/v1/auth/token"
        refresh_data = {
            "client_id": CLIENT_ID,
            "refresh_token": self.refresh_token,
            "grant_type": "refresh_token",
        }
        try:
            user_info = await self._request_post(refresh_url, refresh_data)
            self.access_token = user_info["access_token"]
            self.refresh_token = user_info["refresh_token"]
            self.user_id = user_info["sub"]
            self.encode_token()

            self._persist_tokens()

            if self.token_refresh_callback:
                await self.token_refresh_callback(
                    self, **self.token_refresh_callback_kwargs
                )
        except Exception as e:
            if "too frequent" in str(e).lower():
                self._set_error_cooldown()
            raise e

    def get_user_info(self) -> Dict[str, Optional[str]]:
        """
        Get user info
        """
        return {
            "username": self.username,
            "user_id": self.user_id,
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "encoded_token": self.encoded_token,
        }

    def _persist_tokens(self):
        # Token persistence is now handled by app/core/token_manager.py (Supabase)
        # This method is kept as a no-op for compatibility
        pass

    def _load_persisted_tokens(self) -> bool:
        # Token loading is now handled by app/core/token_manager.py (Supabase)
        # This method is kept as a no-op for compatibility
        return False

    def _update_login_timestamp(self):
        # Login timestamp tracking disabled - handled at app layer if needed
        pass

    def _check_login_cooldown(self) -> bool:
        # Login cooldown disabled - handled at app layer if needed
        return False

    def _set_error_cooldown(self):
        # Error cooldown disabled - handled at app layer if needed
        pass

    def _check_error_cooldown(self) -> bool:
        # Error cooldown disabled - handled at app layer if needed
        return False
