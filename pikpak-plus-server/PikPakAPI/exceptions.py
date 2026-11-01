"""
Custom exceptions for the PikPak API client.
"""

from __future__ import annotations

from typing import Any


class PikpakException(Exception):
    """Base exception for all PikPak API errors."""

    def __init__(
        self,
        message: str,
        code: int | None = None,
        details: object | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(message={self.message!r}, code={self.code!r})"


class PikpakRetryException(PikpakException):
    """Internal exception indicating that the request should be retried."""


class PikpakAuthenticationError(PikpakException):
    """Raised when authentication fails (invalid credentials, expired token, etc.)."""


class PikpakNotFoundError(PikpakException):
    """Raised when the requested file, folder, task, or share is not found."""


class PikpakRateLimitError(PikpakException):
    """Raised when API rate limits or captcha verification are triggered."""


class PikPakRateLimitExceededException(PikpakRateLimitError):
    """
    Raised when HTTP 429 Too Many Requests is returned by PikPak, or when the
    internal Anti-429 Circuit Breaker is active.

    Halts further execution to protect the client IP and account from a long-term (24h) ban.
    """

    def __init__(
        self,
        message: str,
        retry_after: float | None = None,
        code: int | None = 8,
        details: object | None = None,
    ) -> None:
        super().__init__(message, code=code, details=details)
        self.retry_after = retry_after

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"message={self.message!r}, "
            f"retry_after={self.retry_after!r}, "
            f"code={self.code!r})"
        )


class PikpakRequestError(PikpakException):
    """Raised when an HTTP transport or network-level error occurs."""


class PikpakCaptchaRequiredException(PikpakException):
    """
    Raised when a PikPak operation is blocked by a CAPTCHA or human-verification
    challenge that the SDK cannot resolve automatically.

    This typically occurs during:
    - Username / password login (``/v1/auth/signin``).
    - High-volume or rapid ``add_link`` (offline download) submissions.
    - Rapid ``share_restore`` calls that trigger abuse-prevention checks.

    Attributes
    ----------
    captcha_token : str | None
        The raw captcha token returned by the ``/v1/shield/captcha/init``
        endpoint, if available.
    error_url : str | None
        A URL pointing to a human-solvable verification page, if returned by the API.
    verification_sign : str | None
        The ``captcha_sign`` value that was submitted with the failing request.
    """

    def __init__(
        self,
        message: str,
        code: int | None = None,
        details: object | None = None,
        captcha_token: str | None = None,
        error_url: str | None = None,
        verification_sign: str | None = None,
    ) -> None:
        super().__init__(message, code=code, details=details)
        self.captcha_token = captcha_token
        self.error_url = error_url
        self.verification_sign = verification_sign

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"message={self.message!r}, "
            f"code={self.code!r}, "
            f"captcha_token={self.captcha_token!r})"
        )

    @classmethod
    def from_response(
        cls,
        response_body: dict[str, Any],
        captcha_token: str | None = None,
        verification_sign: str | None = None,
    ) -> PikpakCaptchaRequiredException:
        """Construct a PikpakCaptchaRequiredException from a raw API response dictionary."""
        error_desc = str(
            response_body.get("error_description")
            or response_body.get("error")
            or "CAPTCHA verification required"
        )
        error_code_raw = response_body.get("error_code")
        error_code = int(error_code_raw) if isinstance(error_code_raw, int) else None

        # Attempt to extract a verification URL from the description
        error_url: str | None = None
        if "http" in error_desc:
            import re

            url_match = re.search(r"https?://[^\s\"']+", error_desc)
            if url_match:
                error_url = url_match.group(0)

        return cls(
            message=error_desc,
            code=error_code,
            details=response_body,
            captcha_token=captcha_token,
            error_url=error_url,
            verification_sign=verification_sign,
        )


class PikPakCircuitBreakerOpenError(PikPakRateLimitExceededException):
    """
    Raised when HTTP operations are blocked by the Anti-429 Circuit Breaker.

    This exception is raised in two conditions:
    1. CircuitState.OPEN: The cooling-off period after a 429 is active.
    2. CircuitState.HALF_OPEN: A single canary probe request is already in-flight,
       and concurrent requests are rejected to isolate the probe.
    """

    def __init__(
        self,
        message: str = "Circuit is half-open; probe in progress",
        retry_after: float | None = None,
        state: str | None = None,
        code: int | None = 8,
        details: object | None = None,
    ) -> None:
        super().__init__(message=message, retry_after=retry_after, code=code, details=details)
        self.state = state


# Backward-compatibility and ergonomic naming aliases
PikpakRateLimitExceededException = PikPakRateLimitExceededException
PikPakCaptchaRequiredException = PikpakCaptchaRequiredException
PikpakCircuitBreakerOpenError = PikPakCircuitBreakerOpenError
PikPakAuthError = PikpakAuthenticationError
PikpakAuthError = PikpakAuthenticationError

