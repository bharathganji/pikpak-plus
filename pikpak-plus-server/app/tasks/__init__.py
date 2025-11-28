"""Background Tasks and Scheduler

This package provides periodic background task execution with distributed locking.

Main entry point:
    init_scheduler() - Initialize the scheduler with required services

The scheduler automatically handles:
- Task status updates from PikPak
- Cleanup of old tasks and files
- WebDAV client generation
- Distributed locking across multiple workers
"""

from app.tasks.scheduler import init_scheduler

__all__ = ['init_scheduler']
