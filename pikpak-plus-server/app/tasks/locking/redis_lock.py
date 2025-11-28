"""Redis Distributed Lock - Ensures only one worker runs the scheduler."""
import logging
import time
import os
import json
import threading
import atexit
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class RedisDistributedLock:
    """
    A distributed lock using Redis to ensure only one worker process
    runs the scheduler across multiple Gunicorn workers.

    Features:
    - Automatic lock acquisition with unique worker ID
    - Periodic lock renewal (heartbeat)
    - Automatic lock release on process exit
    - Lock health monitoring and logging
    """

    LOCK_KEY = "pikpak_scheduler_lock"
    LOCK_TIMEOUT = 120  # seconds
    HEARTBEAT_INTERVAL = 60  # seconds

    def __init__(self, redis_client):
        """
        Initialize the distributed lock.

        Args:
            redis_client: Redis client instance
        """
        self.redis_client = redis_client
        self.worker_id = f"{os.getpid()}-{int(time.time())}"
        self._renewal_thread = None
        self._is_locked = False

    def acquire(self):
        """
        Try to acquire the distributed lock.

        Returns:
            bool: True if lock was acquired, False otherwise
        """
        if not self.redis_client:
            logger.warning("Redis client not available, cannot acquire lock")
            return False

        try:
            # Check if lock already exists
            current_lock = self.redis_client.get(self.LOCK_KEY)

            if current_lock:
                logger.info(
                    f"Scheduler lock held by {current_lock.decode() if isinstance(current_lock, bytes) else current_lock}")
                return False

            # Try to acquire the lock
            if self.redis_client.set(self.LOCK_KEY, self.worker_id, nx=True, ex=self.LOCK_TIMEOUT):
                logger.info(
                    f"Acquired scheduler lock. Worker: {self.worker_id}")
                self._is_locked = True

                # Start the renewal thread
                self._start_renewal_thread()

                # Register exit handler to release lock
                atexit.register(self.release)

                return True
            else:
                logger.info("Failed to acquire lock (race condition)")
                return False

        except Exception as e:
            logger.error(f"Error acquiring lock: {e}", exc_info=True)
            return False

    def release(self):
        """Release the distributed lock if we own it."""
        try:
            if self._is_locked and self.redis_client:
                current_lock = self.redis_client.get(self.LOCK_KEY)

                # Only release if we still own it
                if current_lock and (current_lock.decode() if isinstance(current_lock, bytes) else current_lock) == self.worker_id:
                    self.redis_client.delete(self.LOCK_KEY)
                    logger.info("Released scheduler lock")

                self._is_locked = False
        except Exception as e:
            logger.error(f"Error releasing lock: {e}")

    def is_locked(self):
        """Check if we currently hold the lock."""
        return self._is_locked

    def _owns_lock(self):
        """Check if this worker still owns the lock."""
        current_lock = self.redis_client.get(self.LOCK_KEY)
        if not current_lock:
            return False
        lock_value = current_lock.decode() if isinstance(
            current_lock, bytes) else current_lock
        return lock_value == self.worker_id

    def _renew_lock_once(self):
        """Attempt to renew the lock once. Returns True if successful, False if lock was lost."""
        if not self._owns_lock():
            logger.warning("Lost scheduler lock, stopping renewal")
            self._is_locked = False
            return False

        self.redis_client.set(
            self.LOCK_KEY, self.worker_id, ex=self.LOCK_TIMEOUT)
        logger.debug("Renewed scheduler lock")
        return True

    def _start_renewal_thread(self):
        """Start a background thread to periodically renew the lock."""
        def renew_lock():
            heartbeat_counter = 0

            while self._is_locked:
                try:
                    time.sleep(self.HEARTBEAT_INTERVAL)
                    heartbeat_counter += 1

                    # Try to renew the lock
                    if not self._renew_lock_once():
                        break

                    # Log heartbeat every 15 minutes
                    if heartbeat_counter % 15 == 0:
                        self._log_heartbeat()

                except Exception as e:
                    logger.error(f"Error renewing lock: {e}")
                    break

        self._renewal_thread = threading.Thread(target=renew_lock, daemon=True)
        self._renewal_thread.start()

    def _log_heartbeat(self):
        """Log a heartbeat message with scheduler status."""
        current_time = datetime.now(timezone.utc).isoformat()

        try:
            # Read current scheduler status from Redis
            scheduler_status_data = self.redis_client.get(
                "pikpak_scheduler_status")
            if scheduler_status_data:
                scheduler_info = json.loads(scheduler_status_data)
                next_task_run = scheduler_info.get(
                    "next_task_status_update", "unknown")
                logger.info(
                    f"SCHEDULER HEARTBEAT at {current_time} - "
                    f"Task status update next run: {next_task_run}"
                )
            else:
                logger.info(f"SCHEDULER HEARTBEAT at {current_time}")
        except Exception as e:
            logger.debug(f"Error reading scheduler status: {e}")
            logger.info(f"SCHEDULER HEARTBEAT at {current_time}")
