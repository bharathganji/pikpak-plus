"""
Core HTTP client for the PikPak API.
"""

from __future__ import annotations

import asyncio
import json
import logging
from types import TracebackType
from typing import Any, Self

import httpx

from .constants import (
    DEFAULT_INITIAL_BACKOFF,
    DEFAULT_MAX_RETRIES,
    DEFAULT_REQUEST_TIMEOUT,
    PIKPAK_API_HOST,
    PIKPAK_USER_HOST,
)
from .exceptions import (
    PikpakAuthenticationError,
    PikPakCaptchaRequiredException,
    PikpakException,
    PikpakNotFoundError,
    PikpakRateLimitError,
    PikPakRateLimitExceededException,
    PikpakRequestError,
    PikpakRetryException,
)
from .throttler import Throttler
from .utils import (
    CLIENT_ID,
    CLIENT_VERSION,
    PACKAGE_NAME,
    build_custom_user_agent,
    captcha_sign,
    get_timestamp,
)

logger = logging.getLogger("pikpakapi")


def _parse_retry_after(header_val: str | None) -> float:
    """Parse Retry-After header string into seconds (defaulting to 60.0 if unparseable)."""
    if not header_val:
        return 60.0
    cleaned = header_val.strip()
    if cleaned.isdigit():
        return float(cleaned)
    try:
        return float(cleaned)
    except ValueError:
        return 60.0


class BaseClient:
    """
    Base asynchronous HTTP client handling request retries, lifecycle,
    authentication headers, anti-429 defense, and error mapping.
    """

    PIKPAK_API_HOST: str = PIKPAK_API_HOST
    PIKPAK_USER_HOST: str = PIKPAK_USER_HOST

    def __init__(
        self,
        httpx_client_args: dict[str, Any] | None = None,
        request_max_retries: int = DEFAULT_MAX_RETRIES,
        request_initial_backoff: float = DEFAULT_INITIAL_BACKOFF,
        device_id: str | None = None,
        throttler: Throttler | None = None,
    ) -> None:
        self.max_retries: int = request_max_retries
        self.initial_backoff: float = request_initial_backoff
        self.device_id: str | None = device_id
        self.captcha_token: str | None = None
        self.captcha_expires_at: float | None = None
        self.captcha_tokens: dict[str, Any] = {}
        self.user_agent: str | None = None

        self.username: str | None = None
        self.password: str | None = None
        self.user_id: str | None = None
        self.access_token: str | None = None
        self.refresh_token: str | None = None
        self.expires_at: float | None = None
        self.encoded_token: str | None = None
        self._path_id_cache: dict[str, Any] = {}

        # Anti-429 Rate Throttler & Circuit Breaker
        self.throttler: Throttler = throttler if throttler is not None else Throttler()

        # Client session configuration
        client_kwargs: dict[str, Any] = {
            "timeout": DEFAULT_REQUEST_TIMEOUT,
            "follow_redirects": True,
        }
        if httpx_client_args:
            client_kwargs.update(httpx_client_args)

        self._httpx_client = httpx.AsyncClient(**client_kwargs)
        self._is_closed: bool = False

    @property
    def httpx_client(self) -> httpx.AsyncClient:
        if self._is_closed or self._httpx_client.is_closed:
            raise PikpakException("Client session has been closed.")
        return self._httpx_client

    async def aclose(self) -> None:
        """Close the underlying HTTPX client session."""
        if not self._is_closed and not self._httpx_client.is_closed:
            await self._httpx_client.aclose()
            self._is_closed = True

    async def close(self) -> None:
        """Alias for aclose()."""
        await self.aclose()

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        await self.aclose()

    def build_custom_user_agent(self) -> str:
        user_id = self.user_id or ""
        device_id = self.device_id or ""
        self.user_agent = build_custom_user_agent(
            device_id=device_id,
            user_id=user_id,
        )
        return self.user_agent

    def get_headers(self, access_token: str | None = None) -> dict[str, str]:
        headers: dict[str, str] = {
            "User-Agent": (
                self.build_custom_user_agent()
                if self.captcha_token
                else "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            ),
            "Content-Type": "application/json; charset=utf-8",
        }
        token = access_token or self.access_token
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if self.captcha_token:
            headers["X-Captcha-Token"] = self.captcha_token
        if self.device_id:
            headers["X-Device-Id"] = self.device_id
        return headers

    async def refresh_access_token(self, force: bool = False) -> dict[str, Any]:
        """Implemented by AuthMixin; stubbed here for type safety."""
        return {}

    async def ensure_authenticated(self, force_refresh: bool = False) -> None:
        """Implemented by AuthMixin; stubbed here for type safety."""

    async def _make_request(
        self,
        method: str,
        url: str,
        data: dict[str, Any] | str | None = None,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Send HTTP request with anti-429 defense, automatic retry, and circuit breaker."""
        # Step 1: Ensure valid authentication before sending protected requests
        if not ("/v1/auth/" in url or "/v1/shield/" in url):
            await self.ensure_authenticated()

        last_error: Exception | None = None

        # Clean None values from query parameters
        cleaned_params = (
            {k: v for k, v in params.items() if v is not None} if params else None
        )

        for attempt in range(self.max_retries):
            # Step 2: Acquire throttler token & respect circuit breaker
            is_login_endpoint = "/v1/auth/signin" in url
            await self.throttler.acquire(is_login=is_login_endpoint)

            try:
                response = await self._send_request(
                    method=method,
                    url=url,
                    data=data,
                    params=cleaned_params,
                    headers=headers,
                )
                return await self._handle_response(response)
            except PikpakRetryException as error:
                logger.info(
                    "Retry attempt %d/%d: %s", attempt + 1, self.max_retries, error
                )
                last_error = error
                # Fix Defect 5: Refresh Authorization header in retry headers
                if headers is not None and self.access_token:
                    auth_key = next(
                        (k for k in headers if k.lower() == "authorization"),
                        "Authorization",
                    )
                    headers[auth_key] = f"Bearer {self.access_token}"
            except PikPakRateLimitExceededException:
                # Do NOT retry in an infinite loop on 429! Immediately raise to protect account.
                raise
            except (
                PikpakAuthenticationError,
                PikpakNotFoundError,
                PikpakRateLimitError,
                PikPakCaptchaRequiredException,
            ):
                raise
            except httpx.HTTPStatusError as error:
                status_code = error.response.status_code
                if status_code == 404:
                    raise PikpakNotFoundError(f"Resource not found: {url}") from error
                if status_code in (401, 403):
                    raise PikpakAuthenticationError(
                        f"Authentication failed: {error}"
                    ) from error
                if status_code == 429:
                    retry_after = _parse_retry_after(error.response.headers.get("Retry-After"))
                    self.throttler.record_429(retry_after)
                    raise PikPakRateLimitExceededException(
                        f"HTTP 429 Rate Limit Exceeded: PikPak anti-abuse protection triggered. Cooldown for {retry_after}s.",
                        retry_after=retry_after,
                        details=error.response.text,
                    ) from error
                last_error = PikpakRequestError(f"HTTP Status {status_code}: {error}")
            except httpx.HTTPError as error:
                logger.warning(
                    "HTTP network error on attempt %d/%d: %s",
                    attempt + 1,
                    self.max_retries,
                    error,
                )
                last_error = PikpakRequestError(f"Network error: {error}")
            except Exception as error:  # noqa: BLE001
                logger.error(
                    "Unexpected error on attempt %d/%d: %s",
                    attempt + 1,
                    self.max_retries,
                    error,
                )
                last_error = error

            if attempt < self.max_retries - 1:
                await asyncio.sleep(self.initial_backoff * (2**attempt))

        if isinstance(last_error, PikpakException):
            raise last_error
        raise PikpakException(f"Max retries reached. Last error: {last_error}")

    async def _send_request(
        self,
        method: str,
        url: str,
        data: dict[str, Any] | str | None,
        params: dict[str, Any] | None,
        headers: dict[str, str] | None,
    ) -> httpx.Response:
        req_headers = dict(headers) if headers is not None else self.get_headers()
        json_data = data if isinstance(data, dict) else None
        content_data = data if isinstance(data, (str, bytes)) else None

        # Check if form encoded
        if req_headers.get("Content-Type", "").startswith(
            "application/x-www-form-urlencoded"
        ) and isinstance(data, dict):
            return await self.httpx_client.request(
                method,
                url,
                data=data,
                params=params,
                headers=req_headers,
            )

        return await self.httpx_client.request(
            method,
            url,
            json=json_data,
            content=content_data,
            params=params,
            headers=req_headers,
        )

    async def _handle_response(self, response: httpx.Response) -> dict[str, Any]:
        """Handle response body and error status mapping."""
        url_str = str(response.url)
        is_auth_endpoint = "/v1/auth/" in url_str or "/v1/shield/" in url_str

        # HTTP 429 Check
        if response.status_code == 429:
            retry_after = _parse_retry_after(response.headers.get("Retry-After"))
            self.throttler.record_429(retry_after)
            raise PikPakRateLimitExceededException(
                f"HTTP 429 Rate Limit Exceeded: PikPak anti-abuse protection triggered. Cooldown for {retry_after}s.",
                retry_after=retry_after,
                details=response.text,
            )

        if response.status_code == 404:
            error_desc = "Resource not found"
            try:
                body = response.json()
                if isinstance(body, dict):
                    error_desc = str(
                        body.get("error_description") or body.get("error") or error_desc
                    )
            except (ValueError, json.JSONDecodeError):
                logger.debug("Failed to decode 404 response body as JSON")
            raise PikpakNotFoundError(f"{error_desc}: {response.url}")

        if response.status_code == 401:
            if is_auth_endpoint:
                error_desc = response.text
                try:
                    body = response.json()
                    if isinstance(body, dict):
                        error_desc = str(
                            body.get("error_description") or body.get("error") or error_desc
                        )
                except (ValueError, json.JSONDecodeError):
                    pass
                raise PikpakAuthenticationError(
                    f"Authentication failed on {url_str}: {error_desc}"
                )
            try:
                body = response.json()
                if isinstance(body, dict) and (
                    body.get("error_code") == 16 or body.get("error") == "unauthorized"
                ):
                    await self.refresh_access_token()
                    raise PikpakRetryException("Token refreshed, retrying request")
            except (ValueError, json.JSONDecodeError):
                logger.debug("Failed to decode 401 response body as JSON")
            raise PikpakAuthenticationError(f"Unauthorized: {response.text}")

        # Empty body for success (200, 201, 204)
        if response.status_code in (200, 201, 204) and not response.content:
            self.throttler.record_success()
            return {}

        try:
            json_data: Any = response.json()
        except ValueError:
            if 200 <= response.status_code < 300:
                self.throttler.record_success()
                return {}
            raise PikpakRetryException(
                f"Invalid non-JSON response with status {response.status_code}"
            )

        if not json_data and 200 <= response.status_code < 300:
            self.throttler.record_success()
            return {}

        if isinstance(json_data, dict):
            if "error" not in json_data and "error_code" not in json_data:
                self.throttler.record_success()
                return json_data

            error_type = str(json_data.get("error", ""))
            error_code = json_data.get("error_code")
            error_desc = str(json_data.get("error_description", str(json_data)))

            # CAPTCHA defense check
            if error_code == 1001 or "captcha" in error_type.lower() or "captcha" in error_desc.lower():
                raise PikPakCaptchaRequiredException.from_response(
                    json_data, captcha_token=self.captcha_token
                )

            if error_type == "invalid_account_or_password":
                raise PikpakAuthenticationError("Invalid username or password.")

            if error_code == 16:
                if is_auth_endpoint:
                    raise PikpakAuthenticationError(
                        f"Authentication failed on {url_str}: {error_desc}"
                    )
                await self.refresh_access_token()
                raise PikpakRetryException("Token refreshed, retrying request")

            if error_code == 5 or error_type == "not_found":
                raise PikpakNotFoundError(error_desc)

            if error_code == 8 or error_type == "rate_limit":
                self.throttler.record_429(60.0)
                raise PikPakRateLimitExceededException(
                    f"Rate limit exceeded: {error_desc}", retry_after=60.0, details=json_data
                )

            int_code = (
                int(error_code)
                if isinstance(error_code, int)
                or (isinstance(error_code, str) and error_code.isdigit())
                else None
            )
            raise PikpakException(error_desc, code=int_code, details=json_data)

        self.throttler.record_success()
        return {"data": json_data}

    async def _request_get(
        self,
        url: str,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        return await self._make_request("get", url, params=params, headers=headers)

    async def _request_post(
        self,
        url: str,
        data: dict[str, Any] | str | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        return await self._make_request("post", url, data=data, headers=headers)

    async def _request_patch(
        self,
        url: str,
        data: dict[str, Any] | str | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        return await self._make_request("patch", url, data=data, headers=headers)

    async def _request_delete(
        self,
        url: str,
        params: dict[str, Any] | None = None,
        data: dict[str, Any] | str | None = None,
    ) -> dict[str, Any]:
        return await self._make_request("delete", url, params=params, data=data)

    async def captcha_init(
        self, action: str, meta: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Initializes captcha verification required for certain operations."""
        url = f"https://{self.PIKPAK_USER_HOST}/v1/shield/captcha/init"
        if not meta:
            t = f"{get_timestamp()}"
            user_id = self.user_id or ""
            meta = {
                "captcha_sign": captcha_sign(self.device_id or "", t),
                "client_version": CLIENT_VERSION,
                "package_name": PACKAGE_NAME,
                "user_id": user_id,
                "timestamp": t,
            }
        payload: dict[str, Any] = {
            "client_id": CLIENT_ID,
            "action": action,
            "device_id": self.device_id,
            "meta": meta,
        }
        return await self._request_post(url, data=payload)
