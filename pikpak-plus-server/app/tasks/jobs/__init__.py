"""Job implementations for the scheduler.

This package contains individual job implementations that are executed
by the scheduler on a periodic basis.
"""

from app.tasks.jobs.cleanup_job import scheduled_cleanup
from app.tasks.jobs.task_status_job import scheduled_task_status_update
from app.tasks.jobs.webdav_job import scheduled_webdav_generation

__all__ = [
    'scheduled_cleanup',
    'scheduled_task_status_update',
    'scheduled_webdav_generation',
]
