"""
JWT Token Utility
Decode and validate PikPak JWT tokens to check expiration
"""
import jwt
import time
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode a JWT token without verification

    Args:
        token: JWT token string

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        # Decode without verification (we just need to read the payload)
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded
    except Exception as e:
        logger.debug(f"Failed to decode token: {e}")
        return None


def is_token_expired(token: str, buffer_seconds: int = 300) -> bool:
    """
    Check if a JWT token is expired

    Args:
        token: JWT token string
        buffer_seconds: Consider token expired this many seconds before actual expiry (default: 5 minutes)

    Returns:
        True if token is expired or will expire within buffer_seconds, False otherwise
    """
    decoded = decode_token(token)
    if not decoded:
        logger.warning("Could not decode token, considering it expired")
        return True

    exp = decoded.get('exp')
    if not exp:
        logger.warning("Token has no expiration field, considering it expired")
        return True

    current_time = int(time.time())
    expires_at = int(exp)
    time_until_expiry = expires_at - current_time

    # Consider expired if within buffer window
    is_expired = time_until_expiry <= buffer_seconds

    if is_expired:
        logger.info(
            f"Token expired or expiring soon (expires in {time_until_expiry}s)")
    else:
        logger.debug(f"Token valid for {time_until_expiry}s")

    return is_expired


def get_token_info(token: str) -> Dict[str, Any]:
    """
    Get detailed information about a JWT token

    Args:
        token: JWT token string

    Returns:
        Dictionary with token information
    """
    decoded = decode_token(token)
    if not decoded:
        return {
            "valid": False,
            "error": "Could not decode token"
        }

    exp = decoded.get('exp')
    iat = decoded.get('iat')
    current_time = int(time.time())

    info = {
        "valid": True,
        "subject": decoded.get('sub'),
        "audience": decoded.get('aud'),
        "issuer": decoded.get('iss'),
        "scope": decoded.get('scope'),
        "issued_at": iat,
        "expires_at": exp,
        "current_time": current_time,
    }

    if exp:
        info["expires_in_seconds"] = exp - current_time
        info["is_expired"] = exp <= current_time
        info["expires_soon"] = (exp - current_time) <= 300  # 5 minutes

    return info
