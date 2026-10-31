# ruff: noqa: N999
"""
PikPak API Python SDK
Modern, asynchronous, and robust client for the PikPak cloud service with WebDAV integration.
Achieves 100% feature parity with the official PikPak MCP server.
"""

from __future__ import annotations

import inspect
from collections.abc import Callable
from pathlib import Path
from typing import Any

from .account import AccountMixin
from .auth import AuthMixin
from .client import BaseClient
from .constants import (
    DEFAULT_INITIAL_BACKOFF,
    DEFAULT_MAX_REQUESTS_PER_SECOND,
    DEFAULT_MAX_RETRIES,
    DEFAULT_SESSION_DIR,
    LOGIN_COOLDOWN_SECONDS,
    PIKPAK_API_HOST,
    PIKPAK_USER_HOST,
    TOKEN_EXPIRY_BUFFER_SECONDS,
    WEBDAV_BASE_URL,
)
from .enums import DownloadStatus, FileKind, TaskPhase, UrlType
from .exceptions import (
    PikpakAuthenticationError,
    PikPakAuthError,
    PikpakAuthError,
    PikPakCaptchaRequiredException,
    PikpakCaptchaRequiredException,
    PikPakCircuitBreakerOpenError,
    PikpakCircuitBreakerOpenError,
    PikpakException,
    PikpakNotFoundError,
    PikpakRateLimitError,
    PikPakRateLimitExceededException,
    PikpakRateLimitExceededException,
    PikpakRequestError,
    PikpakRetryException,
)
from .files import FilesMixin
from .models import (
    AccountInfo,
    FileInfo,
    FolderStats,
    StorageQuota,
    UserProfile,
    VipInfo,
    format_bytes,
)
from .session_store import SessionStore
from .shares import SharesMixin
from .tasks import TasksMixin
from .throttler import CircuitState, Throttler
from .webdav import WebDavMixin

# Python 3.8/3.9 compatibility for NoneType
NoneType = type(None)


class PikPakApi(
    AuthMixin,
    FilesMixin,
    TasksMixin,
    SharesMixin,
    AccountMixin,
    WebDavMixin,
):
    """
    Main client interface for the PikPak API.

    Provides complete access to:
    - User authentication with local session caching and auto token refresh
    - Anti-429 defense with client-side rate throttling and circuit breaker
    - File and folder management (listing, uploading, moving, copying, trash, search)
    - Offline / cloud downloads and task watching
    - Share link generation, password encryption, and file restoration
    - Account metrics, VIP subscription details, and storage quotas
    - WebDAV application provisioning and service toggling
    """

    def __init__(
        self,
        username: str | None = None,
        password: str | None = None,
        access_token: str | None = None,
        refresh_token: str | None = None,
        encoded_token: str | None = None,
        session_dir: Path | str | None = None,
        throttler: Throttler | None = None,
        httpx_client_args: dict[str, Any] | None = None,
        device_id: str | None = None,
        request_max_retries: int = DEFAULT_MAX_RETRIES,
        request_initial_backoff: float = DEFAULT_INITIAL_BACKOFF,
        token_refresh_callback: Callable[..., Any] | None = None,
        token_refresh_callback_kwargs: dict[str, Any] | None = None,
    ) -> None:
        BaseClient.__init__(
            self,
            httpx_client_args=httpx_client_args,
            request_max_retries=request_max_retries,
            request_initial_backoff=request_initial_backoff,
            device_id=device_id,
            throttler=throttler,
        )
        AuthMixin.__init__(
            self,
            username=username,
            password=password,
            access_token=access_token,
            refresh_token=refresh_token,
            encoded_token=encoded_token,
            session_dir=session_dir,
            token_refresh_callback=token_refresh_callback,
            token_refresh_callback_kwargs=token_refresh_callback_kwargs,
            device_id=self.device_id,
        )
        self._path_id_cache: dict[str, Any] = {}

    @property
    def files(self) -> FilesMixin:
        """Namespace for file and folder operations."""
        return self

    @property
    def tasks(self) -> TasksMixin:
        """Namespace for cloud download tasks."""
        return self

    @property
    def shares(self) -> SharesMixin:
        """Namespace for link sharing operations."""
        return self

    @property
    def account(self) -> AccountMixin:
        """Namespace for account and quota metrics."""
        return self

    @property
    def webdav(self) -> WebDavMixin:
        """Namespace for WebDAV provisioning operations."""
        return self

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PikPakApi:
        """Reconstruct a PikPakApi instance from a serialized dictionary."""
        params = inspect.signature(cls).parameters
        filtered_data = {key: data[key] for key in params if key in data}
        client = cls(**filtered_data)
        for k, v in data.items():
            if k not in ("_httpx_client", "_is_closed", "_auth_lock", "session_store", "throttler"):
                setattr(client, k, v)
        return client

    def to_dict(self) -> dict[str, Any]:
        """Serialize client state into a dictionary for caching or session storage."""
        data = self.__dict__.copy()
        # Filter non-serializable objects and private handles
        keys_to_delete = [
            k
            for k, v in data.items()
            if k.startswith("_httpx_client")
            or k in ("_auth_lock", "session_store", "throttler")
            or not isinstance(v, (str, int, float, bool, list, dict, type(None)))
        ]
        for k in keys_to_delete:
            data.pop(k, None)
        return data


__all__ = [
    "DEFAULT_INITIAL_BACKOFF",
    "DEFAULT_MAX_REQUESTS_PER_SECOND",
    "DEFAULT_MAX_RETRIES",
    "DEFAULT_SESSION_DIR",
    "LOGIN_COOLDOWN_SECONDS",
    "PIKPAK_API_HOST",
    "PIKPAK_USER_HOST",
    "TOKEN_EXPIRY_BUFFER_SECONDS",
    "WEBDAV_BASE_URL",
    "AccountInfo",
    "AccountMixin",
    "AuthMixin",
    "BaseClient",
    "CircuitState",
    "DownloadStatus",
    "FileInfo",
    "FileKind",
    "FilesMixin",
    "FolderStats",
    "NoneType",
    "PikPakApi",
    "PikPakAuthError",
    "PikPakCaptchaRequiredException",
    "PikPakCircuitBreakerOpenError",
    "PikPakRateLimitExceededException",
    "PikpakAuthError",
    "PikpakAuthenticationError",
    "PikpakCaptchaRequiredException",
    "PikpakCircuitBreakerOpenError",
    "PikpakException",
    "PikpakNotFoundError",
    "PikpakRateLimitError",
    "PikpakRateLimitExceededException",
    "PikpakRequestError",
    "PikpakRetryException",
    "SessionStore",
    "SharesMixin",
    "StorageQuota",
    "TaskPhase",
    "TasksMixin",
    "Throttler",
    "UrlType",
    "UserProfile",
    "VipInfo",
    "WebDavMixin",
    "format_bytes",
]
