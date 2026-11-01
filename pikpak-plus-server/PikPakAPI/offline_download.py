"""
Backward-compatibility stub for offline_download.py forwarding to tasks.py.
"""

from .tasks import TasksMixin as OfflineDownloadMixin

__all__ = ["OfflineDownloadMixin"]
