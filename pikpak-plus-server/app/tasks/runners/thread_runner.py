"""Thread Runner - Manages background threads for periodic job execution."""
import logging
import time
import threading
import os

logger = logging.getLogger(__name__)


class ScheduledJobThread:
    """
    A background thread that runs a job periodically with distributed lock checking.

    This class handles:
    - Running a job at regular intervals
    - Checking Redis lock ownership before each execution
    - Graceful shutdown on lock loss
    - Error recovery and logging
    """

    def __init__(self, job_func, interval_seconds, job_name, redis_client):
        """
        Initialize a scheduled job thread.

        Args:
            job_func: The function to execute periodically (should be callable)
            interval_seconds: How often to run the job (in seconds)
            job_name: Human-readable name for the job (for logging)
            redis_client: Redis client for lock checking
            worker_id: Optional worker ID to use (defaults to generated ID)
        """
        self.job_func = job_func
        self.interval_seconds = interval_seconds
        self.job_name = job_name
        self.redis_client = redis_client
        self.worker_id = worker_id if worker_id else f"{os.getpid()}-{int(time.time())}"
        self.thread = None
        self._running = False

    def _run(self):
        """Internal method that runs in the background thread."""
        logger.info(
            f"Started {self.job_name} thread (interval: {self.interval_seconds}s)")

        while self._running:
            try:
                # Check if we still own the scheduler lock
                if self.redis_client and self.redis_client.get("pikpak_scheduler_lock") == self.worker_id:
                    # Execute the job
                    self.job_func()
                else:
                    logger.warning(
                        f"Lost scheduler lock, stopping {self.job_name}")
                    break

            except Exception as e:
                logger.error(
                    f"Error in {self.job_name} thread: {e}", exc_info=True)
                # Continue running despite errors (error recovery)

            # Sleep for the configured interval
            time.sleep(self.interval_seconds)

        logger.info(f"Stopped {self.job_name} thread")

    def start(self):
        """Start the background thread."""
        if self._running:
            logger.warning(f"{self.job_name} thread is already running")
            return

        self._running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def stop(self):
        """Stop the background thread gracefully."""
        self._running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)

    def is_alive(self):
        """Check if the thread is still running."""
        return self.thread and self.thread.is_alive()
