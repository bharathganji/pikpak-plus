"""Utility functions and helpers"""
import logging
import requests
from diskcache import Cache

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages caching for API responses"""
    
    def __init__(self, cache_dir: str, ttl: int):
        self.cache = Cache(cache_dir)
        self.ttl = ttl
    
    def get(self, key: str):
        """Get value from cache"""
        return self.cache.get(key)
    
    def set(self, key: str, value: any, ttl: int = None):
        """Set value in cache with TTL"""
        expire_time = ttl if ttl is not None else self.ttl
        self.cache.set(key, value, expire=expire_time)
    
    def clear(self):
        """Clear all cache"""
        self.cache.clear()
        logger.info("Cache cleared")
    
    def invalidate_tasks(self):
        """Invalidate all task-related cache entries"""
        self.clear()  # For now, just clear everything


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
            logger.warning(f"WhatsLink returned status {wl_res.status_code} for {url}")
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
