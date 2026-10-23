"""
Persistent session storage and token guardian for PikPak API.

Prevents unnecessary logins and eliminates 429 rate-limit risks by caching
access tokens, refresh tokens, expiration timestamps, and device fingerprints locally.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from pathlib import Path
from typing import Any

from .constants import DEFAULT_SESSION_DIR, TOKEN_EXPIRY_BUFFER_SECONDS

logger = logging.getLogger("pikpakapi.session")


class SessionStore:
    """
    Manages local, keyed session files stored per username to avoid repeated
    authentication requests to the PikPak API.
    """

    def __init__(self, session_dir: Path | str | None = None) -> None:
        if session_dir is None:
            self.session_dir = Path(DEFAULT_SESSION_DIR)
        else:
            self.session_dir = Path(session_dir)
        self._ensure_dir()

    def _ensure_dir(self) -> None:
        """Create session directory if missing, with secure user-only permissions."""
        try:
            self.session_dir.mkdir(parents=True, exist_ok=True)
            if os.name == "posix":
                os.chmod(self.session_dir, 0o700)
        except OSError as exc:
            logger.warning("Could not set permissions on session dir %s: %s", self.session_dir, exc)

    def get_session_file(self, username: str) -> Path:
        """Compute the deterministic keyed session file path for a username."""
        normalized = username.strip().lower()
        key = hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]
        return self.session_dir / f"session_{key}.json"

    def load(self, username: str) -> dict[str, Any] | None:
        """
        Load session data for a given username.

        Returns None if no session file exists or if the file contains invalid JSON.
        """
        if not username:
            return None
        file_path = self.get_session_file(username)
        if not file_path.exists():
            return None

        try:
            content = file_path.read_text(encoding="utf-8")
            data = json.loads(content)
            if isinstance(data, dict):
                return data
            return None
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Failed to read session file %s: %s", file_path, exc)
            return None

    def save(self, username: str, data: dict[str, Any]) -> None:
        """
        Save session data to disk.

        Stores access_token, refresh_token, expires_at, device_id, and user_id.
        """
        if not username:
            return
        self._ensure_dir()
        file_path = self.get_session_file(username)

        payload = {
            "username": username,
            "access_token": data.get("access_token"),
            "refresh_token": data.get("refresh_token"),
            "expires_at": data.get("expires_at"),
            "device_id": data.get("device_id"),
            "user_id": data.get("user_id"),
            "updated_at": int(time.time()),
        }

        try:
            temp_file = file_path.with_suffix(".tmp")
            temp_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
            if os.name == "posix":
                os.chmod(temp_file, 0o600)
            temp_file.replace(file_path)
        except OSError as exc:
            logger.warning("Failed to save session to %s: %s", file_path, exc)

    def clear(self, username: str) -> None:
        """Remove the session file for a username if invalidated."""
        if not username:
            return
        file_path = self.get_session_file(username)
        if file_path.exists():
            try:
                file_path.unlink()
            except OSError as exc:
                logger.warning("Failed to delete session file %s: %s", file_path, exc)

    @staticmethod
    def is_token_valid(
        session_data: dict[str, Any] | None,
        buffer_seconds: int = TOKEN_EXPIRY_BUFFER_SECONDS,
    ) -> bool:
        """
        Check if the cached access token is valid and has not expired.

        A token is considered valid if:
        1. access_token is present and non-empty.
        2. expires_at is present and greater than current time + buffer_seconds (default 5 min).
        """
        if not session_data:
            return False

        token = session_data.get("access_token")
        if not token or not isinstance(token, str):
            return False

        expires_at = session_data.get("expires_at")
        if expires_at is None:
            return False

        try:
            exp_val = float(expires_at)
            # If timestamp is in milliseconds (> 1e11), convert to seconds
            if exp_val > 1e11:
                exp_val /= 1000.0
            return exp_val > (time.time() + buffer_seconds)
        except (ValueError, TypeError):
            return False

    @staticmethod
    def has_refresh_token(session_data: dict[str, Any] | None) -> bool:
        """Check if the session contains a usable refresh token."""
        if not session_data:
            return False
        rt = session_data.get("refresh_token")
        return bool(rt and isinstance(rt, str) and rt.strip())
