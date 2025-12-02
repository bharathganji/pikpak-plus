"""Utility functions and helpers"""
import logging
import requests
import json
import redis
import diskcache
from typing import Optional, Any
from collections import OrderedDict

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages caching for API responses with Redis support"""

    def __init__(self, cache_dir: str, ttl: int, redis_url: Optional[str] = None):
        self.ttl = ttl
        self.redis_client = None
        self.disk_cache = None
        self.memory_cache = OrderedDict()  # Simple in-memory LRU cache
        self.memory_cache_max_size = 100  # Limit memory cache size

        # Initialize Redis cache (primary)
        if redis_url:
            try:
                self.redis_client = redis.from_url(
                    redis_url, decode_responses=True)
                # Test Redis connection
                self.redis_client.ping()
                logger.info("Redis cache initialized successfully")
            except Exception as e:
                logger.warning(
                    f"Failed to connect to Redis: {e}. Using fallback caching.")
                self.redis_client = None

        # Initialize disk cache (fallback)
        try:
            self.disk_cache = diskcache.Cache(cache_dir)
            logger.info(f"Disk cache initialized at {cache_dir}")
        except Exception as e:
            logger.warning(f"Failed to initialize disk cache: {e}")
            self.disk_cache = None

    def get(self, key: str):
        """Get value from cache with multi-tier fallback (Redis → Disk → Memory)"""
        # Try Redis first (L1)
        if self.redis_client:
            try:
                value = self.redis_client.get(key)
                if value is not None:
                    logger.debug(f"Cache hit (Redis) for key: {key}")
                    result = json.loads(value)
                    # Promote to memory cache
                    self._set_memory_cache(key, result)
                    return result
            except Exception as e:
                logger.warning(
                    f"Redis get error: {e}. Trying fallback caches.")

        # Try disk cache (L2)
        if self.disk_cache:
            try:
                value = self.disk_cache.get(key)
                if value is not None:
                    logger.debug(f"Cache hit (Disk) for key: {key}")
                    # Promote to memory and Redis
                    self._set_memory_cache(key, value)
                    if self.redis_client:
                        try:
                            self.redis_client.setex(
                                key, self.ttl, json.dumps(value, default=str))
                        except Exception:
                            pass  # Silent fail on promotion
                    return value
            except Exception as e:
                logger.warning(
                    f"Disk cache get error: {e}. Trying memory cache.")

        # Try memory cache (L3)
        if key in self.memory_cache:
            logger.debug(f"Cache hit (Memory) for key: {key}")
            # Move to end (LRU)
            self.memory_cache.move_to_end(key)
            return self.memory_cache[key]

        logger.debug(f"Cache miss for key: {key}")
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
        """Set value in all available caches with TTL"""
        expire_time = ttl if ttl is not None else self.ttl

        # Try Redis (L1)
        if self.redis_client:
            try:
                self.redis_client.setex(
                    key, expire_time, json.dumps(value, default=str))
                logger.debug(
                    f"Value set in Redis cache: {key}, TTL: {expire_time}")
            except Exception as e:
                logger.warning(f"Redis set error: {e}. Using fallback caches.")

        # Set in disk cache (L2)
        if self.disk_cache:
            try:
                self.disk_cache.set(key, value, expire=expire_time)
                logger.debug(f"Value set in disk cache: {key}")
            except Exception as e:
                logger.warning(f"Disk cache set error: {e}")

        # Set in memory cache (L3)
        self._set_memory_cache(key, value)

    def _set_memory_cache(self, key: str, value: Any):
        """Internal method to set value in memory cache with LRU eviction"""
        if key in self.memory_cache:
            self.memory_cache.move_to_end(key)
        self.memory_cache[key] = value

        # Evict oldest if over limit
        if len(self.memory_cache) > self.memory_cache_max_size:
            self.memory_cache.popitem(last=False)

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
