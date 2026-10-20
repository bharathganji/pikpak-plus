"""Utility functions and helpers"""
import logging
import requests
import json
import redis
from typing import Optional, Any

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages caching for API responses using Redis"""

    def __init__(self, ttl: int, redis_url: str):
        self.ttl = ttl
        self.redis_client = None

        # Initialize Redis cache
        if redis_url:
            try:
                self.redis_client = redis.from_url(
                    redis_url, decode_responses=True)
                # Test Redis connection
                self.redis_client.ping()
                logger.info("Redis cache initialized successfully")
            except Exception as e:
                logger.error(
                    f"Failed to connect to Redis: {e}. Caching will be disabled.")
                self.redis_client = None
        else:
            logger.warning("No Redis URL provided. Caching is disabled.")

    def get(self, key: str):
        """Get value from Redis cache"""
        if not self.redis_client:
            return None

        try:
            value = self.redis_client.get(key)
            if value is not None:
                logger.debug(f"Cache hit (Redis) for key: {key}")
                return json.loads(value)
        except Exception as e:
            logger.warning(f"Redis get error: {e}")

        logger.debug(f"Cache miss for key: {key}")
        return None

    def get_ttl(self, key: str) -> int:
        """Get remaining TTL for a key in seconds"""
        if not self.redis_client:
            return 0

        try:
            ttl = self.redis_client.ttl(key)
            return ttl if ttl > 0 else 0
        except Exception as e:
            logger.error(f"Redis TTL error: {e}")
            return 0

    def set(self, key: str, value: Any, ttl: int = None):
        """Set value in Redis cache with TTL"""
        if not self.redis_client:
            return

        expire_time = ttl if ttl is not None else self.ttl

        try:
            self.redis_client.setex(
                key, expire_time, json.dumps(value, default=str))
            logger.debug(
                f"Value set in Redis cache: {key}, TTL: {expire_time}")
        except Exception as e:
            logger.warning(f"Redis set error: {e}")

    def clear(self):
        """Clear all cache entries"""
        if not self.redis_client:
            return

        try:
            self.redis_client.flushdb()
            logger.info("Redis cache cleared")
        except Exception as e:
            logger.error(f"Redis clear error: {e}")

    def invalidate_tasks(self):
        """Invalidate all task-related cache entries from Redis"""
        if not self.redis_client:
            return

        try:
            task_keys = self.redis_client.keys("tasks_*")
            if task_keys:
                self.redis_client.delete(*task_keys)
                logger.info(
                    f"Invalidated {len(task_keys)} task cache entries from Redis")
            else:
                logger.debug("No task cache entries found to invalidate")
        except Exception as e:
            logger.error(f"Redis invalidate tasks error: {e}")


def analyze_link(url: str) -> dict:
    """Analyze a link using WhatsLink API"""
    meta = {}
    try:
        wl_res = requests.get(
            f"https://whatslink.info/api/v1/link?url={url}",
            timeout=10
        )
        if wl_res.status_code == 200:
            meta = wl_res.json()
        else:
            logger.warning(
                f"WhatsLink returned status {wl_res.status_code} for {url}")
            meta = {"error": f"Status {wl_res.status_code}"}
    except Exception as e:
        logger.error(f"WhatsLink Error for {url}: {e}")
        meta = {"error": str(e)}

    return meta


def validate_magnet_link(url: str) -> tuple[bool, str]:
    """Validate that a URL is a valid magnet link"""
    if not url or not url.strip():
        return False, "No URL provided"

    if not url.startswith("magnet:"):
        return False, "URL must be a magnet link"

    return True, ""


def validate_e2dk_link(url: str) -> tuple[bool, str]:
    """Validate that a URL is a valid E2DK (End-to-End Encrypted Download Key) link"""
    if not url or not url.strip():
        return False, "No URL provided"

    url = url.strip()
    
    # E2DK links start with 'ed2k://' protocol
    if not url.startswith("ed2k://"):
        return False, "URL must be an E2DK link (starting with 'ed2k://')"

    # Basic E2DK format validation: ed2k://|file|filename|size|hash|/
    # Example: ed2k://|file|example.zip|123456|abcdef1234567890abcdef1234567890|/
    try:
        # Remove protocol prefix
        content = url[7:]  # Remove 'ed2k://'
        
        if not content.startswith("|file|"):
            return False, "Invalid E2DK format: must start with 'ed2k://|file|'"
        
        # Count pipes to ensure proper format (at least 5: |file|name|size|hash|/)
        pipe_count = url.count("|")
        if pipe_count < 5:
            return False, "Invalid E2DK format: incomplete file information"
        
        if not url.endswith("|/"):
            return False, "Invalid E2DK format: must end with '|/'"
            
        return True, ""
    except Exception as e:
        logger.error(f"E2DK validation error: {e}")
        return False, f"E2DK validation failed: {str(e)}"


def validate_link(url: str) -> tuple[bool, str, str]:
    """
    Validate a URL and determine its type (magnet or E2DK)
    
    Args:
        url: The URL to validate
    
    Returns:
        Tuple of (is_valid, error_message, link_type)
        link_type can be 'magnet', 'e2dk', or 'unknown'
    """
    if not url or not url.strip():
        return False, "No URL provided", "unknown"
    
    url = url.strip()
    
    # Check magnet link
    if url.startswith("magnet:"):
        valid, error = validate_magnet_link(url)
        return valid, error, "magnet"
    
    # Check E2DK link
    if url.startswith("ed2k://"):
        valid, error = validate_e2dk_link(url)
        return valid, error, "e2dk"
    
    return False, "URL must be either a magnet link (magnet:) or E2DK link (ed2k://)", "unknown"


def extract_magnet_hash(url: str) -> Optional[str]:
    """
    Extract the info hash from a magnet link

    Args:
        url: The magnet link URL

    Returns:
        The info hash if found, None otherwise
    """
    if not url or not url.startswith("magnet:"):
        return None

    try:
        # Extract query parameters
        query = url.split("?", 1)[1] if "?" in url else ""
        from urllib.parse import parse_qs
        params = parse_qs(query)

        # Look for 'xt' parameter (Exact Topic)
        xt_params = params.get("xt", [])
        for xt in xt_params:
            if xt.startswith("urn:btih:"):
                return xt.split(":")[-1].lower()

    except Exception as e:
        logger.error(f"Failed to extract hash from magnet link: {e}")

    return None


def extract_e2dk_hash(url: str) -> Optional[str]:
    """
    Extract the MD5 hash from an E2DK link

    Args:
        url: The E2DK link URL

    Returns:
        The MD5 hash if found, None otherwise
    """
    if not url or not url.startswith("ed2k://"):
        return None

    try:
        # E2DK format: ed2k://|file|filename|size|hash|/
        # Extract the parts between pipes
        content = url[7:]  # Remove 'ed2k://'
        parts = content.split("|")
        
        # parts[0] = 'file'
        # parts[1] = filename
        # parts[2] = size
        # parts[3] = hash (MD5)
        # parts[4] = '' (empty before final /)
        
        if len(parts) >= 4 and parts[0] == "file":
            return parts[3].lower()
    except Exception as e:
        logger.error(f"Failed to extract hash from E2DK link: {e}")

    return None
