"""
Backward-compatibility stub for file_manager.py forwarding to files.py.
"""

from .files import FilesMixin as FileManagerMixin

__all__ = ["FileManagerMixin"]
