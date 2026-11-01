"""
Global constants used across PikPak API modules.
"""

from pathlib import Path

PIKPAK_API_HOST = "api-drive.mypikpak.com"
PIKPAK_USER_HOST = "user.mypikpak.com"
WEBDAV_BASE_URL = "https://api-dav.mypikpak.com"

# Default timeouts and retries
DEFAULT_REQUEST_TIMEOUT = 15.0
DEFAULT_MAX_RETRIES = 3
DEFAULT_INITIAL_BACKOFF = 1.0

# Anti-429 Defense & Rate Limits
DEFAULT_MAX_REQUESTS_PER_SECOND = 3.0
LOGIN_COOLDOWN_SECONDS = 60.0

# Session Cache Configuration
DEFAULT_SESSION_DIR = Path.home() / ".pikpak"
TOKEN_EXPIRY_BUFFER_SECONDS = 300  # 5 minutes buffer before expiry

# Task status mapping for user convenience
TASK_PHASE_MAP = {
    "pending": "PHASE_TYPE_PENDING",
    "running": "PHASE_TYPE_RUNNING",
    "complete": "PHASE_TYPE_COMPLETE",
    "completed": "PHASE_TYPE_COMPLETE",
    "error": "PHASE_TYPE_ERROR",
    "failed": "PHASE_TYPE_ERROR",
}
