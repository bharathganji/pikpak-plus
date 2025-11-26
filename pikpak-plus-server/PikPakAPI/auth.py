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
        self.token_refresh_callback = None
        self.token_refresh_callback_kwargs = {}

    def decode_token(self):
        """Decodes the encoded token to update access and refresh tokens."""
        try:
            decoded_data = json.loads(b64decode(self.encoded_token).decode())
        except (Exception, json.JSONDecodeError):
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
        self.encoded_token = b64encode(json.dumps(token_data).encode()).decode()

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

    async def login(self) -> None:
        """
        Login to PikPak
        """
        # Check for persistence first
        if await self._load_persisted_tokens():
            logging.info("Loaded persisted tokens, skipping login")
            return

        if await self._check_error_cooldown():
             raise PikpakException("Login aborted due to recent frequent operation error (24h cooldown)")

        if await self._check_login_cooldown():
             logging.info("Login skipped due to 15min cooldown, using existing state if available")
             # If we have no tokens and are in cooldown, we might fail, but better than 400
             if self.access_token:
                 return
             # If no token, we must try login but warn
             logging.warning("No token available but in cooldown. Attempting login anyway as fallback.")

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
            result = await self.captcha_init(
                action=f"POST:{login_url}",
                meta=metas,
            )
            captcha_token = result.get("captcha_token", "")
            if not captcha_token:
                raise PikpakException("captcha_token get failed")
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
            
            await self._persist_tokens()
            await self._update_login_timestamp()

        except Exception as e:
            if "too frequent" in str(e).lower():
                await self._set_error_cooldown()
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
            
            await self._persist_tokens()

            if self.token_refresh_callback:
                await self.token_refresh_callback(
                    self, **self.token_refresh_callback_kwargs
                )
        except Exception as e:
             if "too frequent" in str(e).lower():
                await self._set_error_cooldown()
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

    async def _persist_tokens(self):
        data = {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "user_id": self.user_id,
            "encoded_token": self.encoded_token,
            "timestamp": time.time()
        }
        try:
            with open(TOKEN_FILE, "w") as f:
                json.dump(data, f)
        except Exception as e:
            logging.error(f"Failed to persist tokens: {e}")

    async def _load_persisted_tokens(self) -> bool:
        if not os.path.exists(TOKEN_FILE):
            return False
        try:
            with open(TOKEN_FILE, "r") as f:
                data = json.load(f)
            # Optional: Check if token is expired or close to expiry if we had expiry time
            # For now just load it
            self.access_token = data.get("access_token")
            self.refresh_token = data.get("refresh_token")
            self.user_id = data.get("user_id")
            self.encoded_token = data.get("encoded_token")
            return True
        except Exception as e:
            logging.error(f"Failed to load persisted tokens: {e}")
            return False

    async def _update_login_timestamp(self):
        try:
            data = {}
            if os.path.exists("pikpak_login_state.json"):
                 with open("pikpak_login_state.json", "r") as f:
                    data = json.load(f)
            data["last_login"] = time.time()
            with open("pikpak_login_state.json", "w") as f:
                json.dump(data, f)
        except Exception as e:
             logging.error(f"Failed to update login timestamp: {e}")

    async def _check_login_cooldown(self) -> bool:
        if not os.path.exists("pikpak_login_state.json"):
            return False
        try:
            with open("pikpak_login_state.json", "r") as f:
                data = json.load(f)
            last_login = data.get("last_login", 0)
            if time.time() - last_login < LOGIN_COOLDOWN:
                return True
        except Exception:
            pass
        return False

    async def _set_error_cooldown(self):
        try:
            data = {}
            if os.path.exists("pikpak_login_state.json"):
                 with open("pikpak_login_state.json", "r") as f:
                    data = json.load(f)
            data["error_timestamp"] = time.time()
            with open("pikpak_login_state.json", "w") as f:
                json.dump(data, f)
        except Exception as e:
             logging.error(f"Failed to set error cooldown: {e}")

    async def _check_error_cooldown(self) -> bool:
        if not os.path.exists("pikpak_login_state.json"):
            return False
        try:
            with open("pikpak_login_state.json", "r") as f:
                data = json.load(f)
            error_timestamp = data.get("error_timestamp", 0)
            if time.time() - error_timestamp < ERROR_COOLDOWN:
                return True
        except Exception:
            pass
        return False
