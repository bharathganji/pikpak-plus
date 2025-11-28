"""Utility functions and helpers"""
import logging
import requests
import json
import redis
from typing import Optional, Any

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages caching for API responses with Redis support"""

    def __init__(self, cache_dir: str, ttl: int, redis_url: Optional[str] = None):
        self.ttl = ttl
        self.redis_client = None

        # Initialize Redis cache (cache_dir is kept for compatibility but not used)
        if redis_url:
            try:
                self.redis_client = redis.from_url(
                    redis_url, decode_responses=True)
                # Test Redis connection
                self.redis_client.ping()
                logger.info("Redis cache initialized successfully")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                raise
        else:
            raise ValueError("Redis URL is required for CacheManager")

    def get(self, key: str):
        """Get value from Redis cache"""
        try:
            value = self.redis_client.get(key)
            if value is not None:
                logger.debug(f"Cache hit (Redis) for key: {key}")
                return json.loads(value)
            else:
                logger.debug(f"Cache miss (Redis) for key: {key}")
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return None

        return None

    def get_ttl(self, key: str) -> int:
        """Get remaining TTL for a key in seconds"""
        try:
            ttl = self.redis_client.ttl(key)
            return ttl if ttl > 0 else 0
        except Exception as e:
            logger.error(f"Redis TTL error: {e}")
            return 0

    def set(self, key: str, value: Any, ttl: int = None):
        """Set value in Redis cache with TTL"""
        expire_time = ttl if ttl is not None else self.ttl

        try:
            self.redis_client.setex(
                key, expire_time, json.dumps(value, default=str))
            logger.debug(
                f"Value set in Redis cache: {key}, TTL: {expire_time}")
        except Exception as e:
            logger.error(f"Redis set error: {e}")

    def clear(self):
        """Clear all cache entries"""
        try:
            self.redis_client.flushdb()
            logger.info("Redis cache cleared")
        except Exception as e:
            logger.error(f"Redis clear error: {e}")

    def invalidate_tasks(self):
        """Invalidate all task-related cache entries"""
        try:
            # Delete all keys matching the pattern "tasks_*" (task pagination cache)
            task_keys = self.redis_client.keys("tasks_*")
            if task_keys:
                self.redis_client.delete(*task_keys)
                logger.info(
                    f"Invalidated {len(task_keys)} task cache entries from Redis")
        except Exception as e:
            logger.error(f"Redis invalidate tasks error: {e}")
            # Fallback to clearing all cache
            self.clear()


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
