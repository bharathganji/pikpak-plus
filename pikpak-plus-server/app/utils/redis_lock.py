"""
Distributed Lock for PikPak Login Coordination
Prevents multiple workers from attempting login simultaneously
"""
import asyncio
import logging
import time

import redis

from app.core.config import AppConfig

logger = logging.getLogger(__name__)


class DistributedLoginLock:
    """
    Redis-based distributed lock for PikPak login coordination.

    Ensures only one worker can perform login at a time across all
    Celery workers and server processes.
    """

    LOCK_KEY = "pikpak:login_lock"
    COOLDOWN_KEY = "pikpak:last_login_time"
    VALID_TOKEN_KEY = "pikpak:token_valid_until"
    LOCK_TTL = 60  # Lock expires after 60 seconds
    COOLDOWN_SECONDS = 120  # 2 minutes cooldown between logins
    POLL_INTERVAL = 0.5  # Check lock status every 0.5 seconds

    def __init__(self, redis_url: str | None = None):
        """Initialize with Redis connection."""
        self._redis_url = redis_url or AppConfig.REDIS_URL
        self._redis: redis.Redis | None = None
        self._lock_acquired = False

    @property
    def redis(self) -> redis.Redis:
        """Lazy Redis connection."""
        if self._redis is None:
            self._redis = redis.from_url(
                self._redis_url, decode_responses=True)
        return self._redis

    def try_acquire(self) -> bool:
        """
        Try to acquire the login lock.

        Returns:
            True if lock was acquired, False if another worker holds it.
        """
        try:
            # Use SETNX (SET if Not eXists) with TTL
            acquired = self.redis.set(
                self.LOCK_KEY,
                "1",
                nx=True,
                ex=self.LOCK_TTL
            )
            self._lock_acquired = bool(acquired)
            if self._lock_acquired:
                logger.debug("Acquired distributed login lock")
            else:
                logger.debug(
                    "Failed to acquire lock - another worker holds it")
            return self._lock_acquired
        except (redis.RedisError, ValueError, TypeError) as e:
            logger.error(f"Failed to acquire login lock: {e}")
            return False

    def release(self) -> None:
        """Release the login lock."""
        if not self._lock_acquired:
            return
        try:
            self.redis.delete(self.LOCK_KEY)
            self._lock_acquired = False
            logger.debug("Released distributed login lock")
        except (redis.RedisError, ValueError, TypeError) as e:
            logger.error(f"Failed to release login lock: {e}")

    def is_locked(self) -> bool:
        """Check if the login lock is currently held."""
        try:
            return self.redis.exists(self.LOCK_KEY) > 0
        except (redis.RedisError, ValueError, TypeError) as e:
            logger.error(f"Failed to check lock status: {e}")
            return False

    def is_in_cooldown(self) -> bool:
        """
        Check if we're still in login cooldown period based on Redis TTL.

        Returns:
            True if a login occurred within the cooldown period.
        """
        try:
            ttl = self.redis.ttl(self.COOLDOWN_KEY)
            if ttl > 0:
                logger.debug(f"Login cooldown active, {ttl}s remaining")
                return True
            return False
        except (redis.RedisError, ValueError, TypeError) as e:
            logger.error(f"Failed to check cooldown: {e}")
            return False

    def get_cooldown_remaining(self) -> float:
        """
        Get remaining cooldown seconds, or 0.0 if not in cooldown.
        """
        try:
            ttl = self.redis.ttl(self.COOLDOWN_KEY)
            return max(0.0, float(ttl)) if ttl > 0 else 0.0
        except (redis.RedisError, ValueError, TypeError) as e:
            logger.debug(f"Failed to get cooldown TTL: {e}")
            return 0.0

    def clear_cooldown(self) -> None:
        """Clear login cooldown (useful when valid token is restored)."""
        try:
            self.redis.delete(self.COOLDOWN_KEY)
            logger.debug("Cleared login cooldown")
        except (redis.RedisError, ValueError, TypeError) as e:
            logger.error(f"Failed to clear cooldown: {e}")

    def set_login_completed(self) -> None:
        """Record that a login was successfully completed."""
        try:
            self.redis.set(
                self.COOLDOWN_KEY,
                str(time.time()),
                ex=self.COOLDOWN_SECONDS
            )
            logger.debug("Recorded login completion timestamp")
        except (redis.RedisError, ValueError, TypeError) as e:
            logger.error(f"Failed to set login timestamp: {e}")

    def set_rate_limit_cooldown(self, cooldown_seconds: int = 300) -> None:
        """
        Set a longer cooldown after hitting rate limit.

        This prevents all workers from hammering the API when rate limited.
        Uses a 5-minute cooldown instead of the normal 2-minute cooldown.
        """
        try:
            self.redis.set(
                self.COOLDOWN_KEY,
                str(time.time()),
                ex=cooldown_seconds
            )
            logger.warning(
                f"Rate limit detected - setting {cooldown_seconds}s cooldown for ALL workers")
        except (redis.RedisError, ValueError, TypeError) as e:
            logger.error(f"Failed to set rate limit cooldown: {e}")

    def set_token_valid_until(self, expires_at: float) -> None:
        """
        Record when the current token expires.

        Args:
            expires_at: Unix timestamp when token expires
        """
        try:
            # Store with TTL matching the token expiration
            ttl = max(1, int(expires_at - time.time()))
            self.redis.set(self.VALID_TOKEN_KEY, str(expires_at), ex=ttl)
            logger.debug(f"Set token valid until {expires_at}")
        except (redis.RedisError, ValueError, TypeError) as e:
            logger.error(f"Failed to set token validity: {e}")

    def is_token_still_valid(self, buffer_seconds: int = 300) -> bool:
        """
        Check if there's a known valid token (from another worker's login).

        Args:
            buffer_seconds: Consider token invalid this many seconds before expiry

        Returns:
            True if a valid token exists
        """
        try:
            expires_at = self.redis.get(self.VALID_TOKEN_KEY)
            if not expires_at:
                return False

            expires_at = float(expires_at)
            remaining = expires_at - time.time()

            if remaining > buffer_seconds:
                logger.debug(f"Token still valid for {remaining:.0f}s")
                return True
            return False
        except (redis.RedisError, ValueError, TypeError) as e:
            logger.error(f"Failed to check token validity: {e}")
            return False

    async def wait_for_lock_release(self, timeout_seconds: int = 60) -> bool:
        """
        Wait for another worker to complete login.

        Args:
            timeout_seconds: Maximum seconds to wait

        Returns:
            True if lock was released, False if timeout occurred
        """
        logger.info("Waiting for another worker to complete login...")

        async def _wait_loop():
            while self.is_locked():
                await asyncio.sleep(self.POLL_INTERVAL)
            return True

        try:
            async with asyncio.timeout(timeout_seconds):
                result = await _wait_loop()
                logger.info("Lock released, proceeding")
                return result
        except TimeoutError:
            logger.warning(
                f"Timeout waiting for login lock after {timeout_seconds}s")
            return False

    def close(self) -> None:
        """Close Redis connection."""
        if self._redis:
            try:
                self._redis.close()
            except (redis.RedisError, OSError) as e:
                logger.debug(f"Ignored error closing Redis connection: {e}")
            self._redis = None

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - ensure lock is released."""
        self.release()
        self.close()


# Global singleton instance
_login_lock: DistributedLoginLock | None = None


def get_login_lock() -> DistributedLoginLock:
    """Get or create the global DistributedLoginLock instance."""
    global _login_lock
    if _login_lock is None:
        _login_lock = DistributedLoginLock()
    return _login_lock
