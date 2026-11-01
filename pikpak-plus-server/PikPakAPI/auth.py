"""
Authentication and session-guardian management for PikPak API.
"""

from __future__ import annotations

import binascii
import inspect
import json
import logging
import re
import time
from base64 import b64decode, b64encode
from collections.abc import Callable
from hashlib import md5
from pathlib import Path
from typing import Any

from .client import BaseClient
from .constants import TOKEN_EXPIRY_BUFFER_SECONDS
from .exceptions import PikpakAuthenticationError, PikpakException
from .session_store import SessionStore
from .utils import CLIENT_ID, CLIENT_SECRET, AsyncRLock

logger = logging.getLogger("pikpakapi.auth")


class AuthMixin(BaseClient):
    """
    Mixin providing bulletproof authentication, session persistence, and token handling.
    """

    def __init__(
        self,
        username: str | None = None,
        password: str | None = None,
        access_token: str | None = None,
        refresh_token: str | None = None,
        encoded_token: str | None = None,
        session_dir: Path | str | None = None,
        token_refresh_callback: Callable[..., Any] | None = None,
        token_refresh_callback_kwargs: dict[str, Any] | None = None,
        device_id: str | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(device_id=device_id, **kwargs)

        self.username = username
        self.password = password
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.encoded_token = encoded_token
        self.token_refresh_callback = token_refresh_callback
        self.token_refresh_callback_kwargs = token_refresh_callback_kwargs or {}

        # Concurrency reentrant lock to prevent race-condition duplicate logins and refresh storms
        self._auth_lock: AsyncRLock = AsyncRLock()

        # Session store for zero-login reuse
        self.session_store = SessionStore(session_dir=session_dir)

        # 1. Resolve device ID
        if device_id:
            self.device_id = device_id
        elif self.username and self.password:
            self.device_id = md5(f"{self.username}{self.password}".encode()).hexdigest()
        else:
            self.device_id = md5(b"pikpak_default_device_seed").hexdigest()

        # 2. Check local session cache if username is provided
        if self.username:
            cached_session = self.session_store.load(self.username)
            if cached_session:
                logger.info("Found cached session for user: %s", self.username)
                if not self.access_token:
                    self.access_token = cached_session.get("access_token")
                if not self.refresh_token:
                    self.refresh_token = cached_session.get("refresh_token")
                if not self.expires_at:
                    self.expires_at = cached_session.get("expires_at")
                if not self.user_id:
                    self.user_id = cached_session.get("user_id")

        # 3. Direct token initialization if supplied
        if self.encoded_token:
            self.decode_token()
        elif self.access_token:
            self._extract_user_id_from_jwt(self.access_token)
            self._extract_exp_from_jwt(self.access_token)
            self.encode_token()
        elif self.username and self.password:
            # Credentials present; will auto-authenticate on first API request
            pass
        elif not self.access_token:
            raise PikpakException(
                "At least one authentication method (username/password or access_token) is required."
            )

    def _extract_user_id_from_jwt(self, token: str) -> None:
        """Attempt to extract the user_id (sub) from JWT payload without verification."""
        try:
            parts = token.split(".")
            if len(parts) >= 2:
                padded = parts[1] + "=" * (-len(parts[1]) % 4)
                payload_val: Any = json.loads(b64decode(padded).decode("utf-8"))
                if (
                    isinstance(payload_val, dict)
                    and "sub" in payload_val
                    and not self.user_id
                ):
                    self.user_id = str(payload_val["sub"])
        except (binascii.Error, json.JSONDecodeError, UnicodeDecodeError) as exc:
            logger.debug("Could not extract user_id from JWT payload: %s", exc)

    def _extract_exp_from_jwt(self, token: str) -> float | None:
        """Attempt to extract the exp timestamp from JWT payload."""
        try:
            parts = token.split(".")
            if len(parts) >= 2:
                padded = parts[1] + "=" * (-len(parts[1]) % 4)
                payload_val: Any = json.loads(b64decode(padded).decode("utf-8"))
                if isinstance(payload_val, dict) and "exp" in payload_val:
                    exp_val = float(payload_val["exp"])
                    if self.expires_at is None:
                        self.expires_at = exp_val
                    return exp_val
        except (binascii.Error, json.JSONDecodeError, UnicodeDecodeError, ValueError) as exc:
            logger.debug("Could not extract exp from JWT payload: %s", exc)
        return None

    def decode_token(self) -> None:
        """Decodes the encoded base64 token to update access and refresh tokens."""
        if not self.encoded_token:
            raise PikpakException("No encoded token provided.")
        try:
            decoded_val: Any = json.loads(b64decode(self.encoded_token).decode("utf-8"))
        except (binascii.Error, json.JSONDecodeError) as e:
            raise PikpakException(f"Invalid encoded token: {e}") from e

        if not isinstance(decoded_val, dict):
            raise PikpakException("Invalid encoded token structure.")

        access_tok = decoded_val.get("access_token")
        refresh_tok = decoded_val.get("refresh_token")

        self.access_token = str(access_tok) if access_tok else None
        self.refresh_token = str(refresh_tok) if refresh_tok else None

        if not self.access_token and not self.refresh_token:
            raise PikpakException(
                "Encoded token does not contain access_token or refresh_token."
            )

        if self.access_token:
            self._extract_user_id_from_jwt(self.access_token)
            self._extract_exp_from_jwt(self.access_token)

    def encode_token(self) -> str:
        """Encodes current access and refresh tokens into a single base64 string."""
        token_data: dict[str, str | None] = {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
        }
        self.encoded_token = b64encode(json.dumps(token_data).encode("utf-8")).decode(
            "utf-8"
        )
        return self.encoded_token

    async def _get_valid_captcha_token(
        self, action: str, meta: dict[str, Any] | None = None
    ) -> str:
        """
        Get a valid captcha token, regenerating if expired or missing (backward compatibility).
        """
        if action in self.captcha_tokens:
            info = self.captcha_tokens[action]
            if info.get("expires_at") and time.time() < (info["expires_at"] - 10):
                return str(info["token"])

        result = await self.captcha_init(action=action, meta=meta)
        captcha_token = str(result.get("captcha_token", ""))
        expires_in = result.get("expires_in", 300)

        if not captcha_token:
            raise PikpakException("captcha_token get failed")

        self.captcha_tokens[action] = {
            "token": captcha_token,
            "expires_at": time.time() + float(expires_in),
        }
        self.captcha_token = captcha_token
        self.captcha_expires_at = time.time() + float(expires_in)
        return captcha_token

    async def _trigger_token_refresh_callback(self) -> None:
        """Safely invoke token_refresh_callback supporting sync/async and flexible signatures."""
        if not self.token_refresh_callback:
            return

        token_data = {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "user_id": self.user_id,
            "expires_at": self.expires_at,
        }

        try:
            sig = inspect.signature(self.token_refresh_callback)
            params = list(sig.parameters.values())
            if params and params[0].name in ("token_data", "tokens", "data"):
                result = self.token_refresh_callback(
                    token_data, **self.token_refresh_callback_kwargs
                )
            else:
                result = self.token_refresh_callback(
                    self, **self.token_refresh_callback_kwargs
                )

            if inspect.isawaitable(result):
                await result
        except Exception as exc:  # noqa: BLE001
            logger.error("Error executing token_refresh_callback: %s", exc)

    async def ensure_authenticated(self, force_refresh: bool = False) -> None:
        """
        Guarantees that the client holds a valid, unexpired access token before sending an API call.
        Protected by asyncio.Lock to prevent concurrent duplicate login storms.

        Auth Resolution Order:
        1. Check local session / memory cache. If access_token has >5 minutes before expiry, reuse (0 network calls).
        2. If expired, use refresh_token via /v1/auth/token. Never re-execute full login if refresh_token is present.
        3. Perform full username/password signin only if no session exists or if refresh token was invalidated.
        """
        async with self._auth_lock:
            now = time.time()

            # Step 1: Check if current access_token is still valid (> 5 minutes before expiry)
            if not force_refresh and self.access_token:
                if self.expires_at is not None:
                    if self.expires_at > (now + TOKEN_EXPIRY_BUFFER_SECONDS):
                        # Token is fresh, 0 network calls required!
                        return
                else:
                    # Check JWT exp claim
                    exp = self._extract_exp_from_jwt(self.access_token)
                    if exp is not None and exp > (now + TOKEN_EXPIRY_BUFFER_SECONDS):
                        self.expires_at = exp
                        return
                    elif exp is None:
                        # Static / Mock token without expiration - assume valid
                        return

            # Step 2: Attempt token refresh using refresh_token if available
            if self.refresh_token:
                try:
                    logger.info("Access token expired or missing; attempting renewal via refresh_token.")
                    await self.refresh_access_token()
                    return
                except PikpakAuthenticationError as exc:
                    logger.warning(
                        "Refresh token rejected (%s); falling back to username/password signin.",
                        exc,
                    )
                    self.refresh_token = None
                    self.access_token = ""
                    if self.username:
                        self.session_store.clear(self.username)

            # Step 3: Full username & password login (only when needed)
            if self.username and self.password:
                logger.info("Performing full username/password login for %s.", self.username)
                await self.login()
                return

            if not self.access_token:
                raise PikpakAuthenticationError(
                    "No valid authentication token or credentials available."
                )

    async def login(self) -> dict[str, Any]:
        """
        Authenticate with PikPak using username and password.
        Updates access_token, refresh_token, user_id, and caches session to disk.
        """
        if not self.username or not self.password:
            raise PikpakException("username and password are required for login.")

        login_url = f"https://{self.PIKPAK_USER_HOST}/v1/auth/signin"
        metas: dict[str, str] = {}
        if re.match(r"^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$", self.username):
            metas["email"] = self.username
        elif re.match(r"^\d{11,18}$", self.username):
            metas["phone_number"] = self.username
        else:
            metas["username"] = self.username

        result = await self.captcha_init(
            action=f"POST:{login_url}",
            meta=metas,
        )
        captcha_token = result.get("captcha_token", "")
        if not captcha_token:
            raise PikpakException("Failed to obtain captcha token during login.")

        login_data: dict[str, str] = {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "password": self.password,
            "username": self.username,
            "captcha_token": str(captcha_token),
        }

        user_info = await self._request_post(
            login_url,
            login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        self.access_token = str(user_info["access_token"])
        if "refresh_token" in user_info:
            self.refresh_token = str(user_info["refresh_token"])
        if "sub" in user_info:
            self.user_id = str(user_info["sub"])

        # Calculate expires_at
        expires_in = user_info.get("expires_in", 7200)
        try:
            self.expires_at = time.time() + float(expires_in)
        except (ValueError, TypeError):
            self.expires_at = time.time() + 7200.0

        self.encode_token()

        # Save session to persistent store
        if self.username:
            self.session_store.save(
                self.username,
                {
                    "access_token": self.access_token,
                    "refresh_token": self.refresh_token,
                    "expires_at": self.expires_at,
                    "device_id": self.device_id,
                    "user_id": self.user_id,
                },
            )

        await self._trigger_token_refresh_callback()

        return user_info

    async def refresh_access_token(self, force: bool = False) -> dict[str, Any]:
        """
        Refresh the access token using the stored refresh token.
        Guarded by self._auth_lock and double-checked token freshness to prevent
        concurrent token refresh storms and race conditions on token rotation.
        """
        if not self.refresh_token:
            raise PikpakAuthenticationError(
                "No refresh token available to refresh access token."
            )

        prior_token = self.access_token
        async with self._auth_lock:
            now = time.time()

            # Double-check: if another concurrent coroutine has already refreshed the token
            # while this task was waiting for the lock, reuse the fresh token data without
            # making a duplicate network request.
            if not force and self.access_token and self.access_token != prior_token:
                logger.info(
                    "Access token refreshed by concurrent task; returning fresh token without network call."
                )
                return {
                    "access_token": self.access_token,
                    "token_type": "Bearer",
                    "refresh_token": self.refresh_token,
                    "sub": self.user_id,
                    "user_id": self.user_id,
                    "expires_in": int(max(0.0, (self.expires_at or now) - now)),
                    "expires_at": self.expires_at,
                }

            refresh_url = f"https://{self.PIKPAK_USER_HOST}/v1/auth/token"
            refresh_data: dict[str, str] = {
                "client_id": CLIENT_ID,
                "refresh_token": self.refresh_token,
                "grant_type": "refresh_token",
            }

            user_info = await self._request_post(refresh_url, refresh_data)
            self.access_token = str(user_info["access_token"])
            if "refresh_token" in user_info:
                self.refresh_token = str(user_info["refresh_token"])
            if "sub" in user_info:
                self.user_id = str(user_info["sub"])

            # Update expires_at
            expires_in = user_info.get("expires_in", 7200)
            try:
                self.expires_at = time.time() + float(expires_in)
            except (ValueError, TypeError):
                self.expires_at = time.time() + 7200.0

            self.encode_token()

            # Update persistent session
            if self.username:
                self.session_store.save(
                    self.username,
                    {
                        "access_token": self.access_token,
                        "refresh_token": self.refresh_token,
                        "expires_at": self.expires_at,
                        "device_id": self.device_id,
                        "user_id": self.user_id,
                    },
                )

            await self._trigger_token_refresh_callback()

            return user_info

    def get_user_info(self) -> dict[str, str | None]:
        """Return local session credentials."""
        return {
            "username": self.username,
            "user_id": self.user_id,
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "encoded_token": self.encoded_token,
        }
