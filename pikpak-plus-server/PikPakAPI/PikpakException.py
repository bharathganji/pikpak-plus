# ruff: noqa: N999
"""
Backward-compatibility stub for PikpakException.
"""

from .exceptions import (
    PikpakAuthenticationError,
    PikPakCaptchaRequiredException,
    PikpakCaptchaRequiredException,
    PikpakException,
    PikpakNotFoundError,
    PikpakRateLimitError,
    PikPakRateLimitExceededException,
    PikpakRateLimitExceededException,
    PikpakRequestError,
    PikpakRetryException,
)

__all__ = [
    "PikPakCaptchaRequiredException",
    "PikPakRateLimitExceededException",
    "PikpakAuthenticationError",
    "PikpakCaptchaRequiredException",
    "PikpakException",
    "PikpakNotFoundError",
    "PikpakRateLimitError",
    "PikpakRateLimitExceededException",
    "PikpakRequestError",
    "PikpakRetryException",
]
