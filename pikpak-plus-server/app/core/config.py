import hashlib
import logging
import os
import platform
import secrets
import uuid
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


def _resolve_jwt_secret(base_dir: Path | None = None) -> str:
    """
    Resolve JWT secret key deterministically across multiple worker processes.

    Precedence:
    1. os.getenv("JWT_SECRET_KEY")
    2. Persisted secret file (.jwt_secret)
    3. Deterministic machine-derived key (fallback for read-only environments)
    """
    env_secret = os.getenv("JWT_SECRET_KEY")
    if env_secret and len(env_secret.strip()) >= 32:
        return env_secret.strip()

    if base_dir is None:
        env_root = os.getenv("PIKPAK_PROJECT_ROOT")
        if env_root:
            base_dir = Path(env_root)
        else:
            base_dir = Path(__file__).resolve().parent.parent.parent

    secret_file = Path(base_dir) / ".jwt_secret"

    # Try reading existing secret
    if secret_file.exists():
        try:
            with open(secret_file, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if len(content) >= 32:
                    return content
        except OSError as e:
            logger.warning(f"Failed to read existing .jwt_secret: {e}")

    # Generate new cryptographically secure secret and persist atomically
    new_secret = secrets.token_hex(64)
    tmp_file = base_dir / f".jwt_secret.tmp.{os.getpid()}"

    try:
        with open(tmp_file, "w", encoding="utf-8") as f:
            f.write(new_secret)
        # Apply restrictive permissions on POSIX if available
        try:
            os.chmod(tmp_file, 0o600)
        except (AttributeError, OSError):
            pass
        os.replace(tmp_file, secret_file)
        return new_secret
    except OSError as e:
        logger.warning(
            f"Failed to persist .jwt_secret atomically ({e}). "
            "Falling back to deterministic host-bound key."
        )
        try:
            if tmp_file.exists():
                tmp_file.unlink()
        except OSError as cleanup_err:
            logger.debug(f"Failed to cleanup temporary secret file: {cleanup_err}")

        # Deterministic host fallback
        host_ident = f"pikpak-plus:{platform.node()}:{uuid.getnode()}".encode()
        return hashlib.sha256(host_ident).hexdigest()


class AppConfig:
    """Application configuration"""

    # Flask
    SCHEDULER_API_ENABLED = True

    # PikPak - prioritized to avoid POSIX $USER collisions
    PIKPAK_USER = (
        os.getenv("PIKPAK_USER")
        or os.getenv("PIKPAK_USERNAME")
        or os.getenv("user")
        or os.getenv("USER")
    )
    PIKPAK_PASS = (
        os.getenv("PIKPAK_PASS")
        or os.getenv("PIKPAK_PASSWORD")
        or os.getenv("passwd")
        or os.getenv("PASSWD")
    )
    PIKPAK_PROXY = os.getenv("PIKPAK_PROXY") or os.getenv("proxy") or os.getenv("PROXY")

    # Reverse proxy and internal route protection
    TRUSTED_PROXIES = os.getenv("TRUSTED_PROXIES", "127.0.0.1,::1")
    INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")

    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")

    # Redis Cache Configuration
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL

    # Default: 5 minutes
    TASK_CACHE_TTL = int(os.getenv("TASK_CACHE_TTL_SECONDS", "300"))
    QUOTA_CACHE_TTL = int(
        os.getenv("QUOTA_CACHE_TTL_SECONDS", "10800")
    )  # Default: 3 hours

    # Request Timeout
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "60"))

    # PikPak Login
    PIKPAK_LOGIN_INTERVAL = 720  # 12 minutes in seconds (re-login interval)

    # File Size Limit (in GB) - using whatslink.info API
    MAX_FILE_SIZE_GB = float(os.getenv("MAX_FILE_SIZE_GB", "25"))

    # Scheduler Configuration
    TASK_STATUS_UPDATE_INTERVAL_MINUTES = int(
        os.getenv("TASK_STATUS_UPDATE_INTERVAL_MINUTES", "15")
    )
    CLEANUP_INTERVAL_HOURS = int(os.getenv("CLEANUP_INTERVAL_HOURS", "24"))

    # Pagination Configuration
    DEFAULT_PAGE_SIZE = int(os.getenv("DEFAULT_PAGE_SIZE", "25"))

    # WebDAV Generation Configuration
    WEBDAV_GENERATION_INTERVAL_HOURS = int(
        os.getenv("WEBDAV_GENERATION_INTERVAL_HOURS", "24")
    )

    # Authentication Configuration
    # Admin account credentials (auto-created on startup)
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

    # JWT Configuration - resolved deterministically across multi-worker instances
    JWT_SECRET_KEY = _resolve_jwt_secret()
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

    # Password Reset Configuration
    PASSWORD_RESET_TOKEN_EXPIRATION_HOURS = int(
        os.getenv("PASSWORD_RESET_TOKEN_EXPIRATION_HOURS", "1")
    )

    # SMTP / Brevo Email Configuration (optional, falls back to dev logging if unconfigured)
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
    SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes")
    SMTP_FROM_EMAIL = (
        os.getenv("SMTP_FROM_EMAIL")
        or os.getenv("SMTP_USER")
        or "noreply@pikpakplus.com"
    )
    SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "PikPak Plus")
    FRONTEND_URL = (
        os.getenv("FRONTEND_URL") or os.getenv("APP_URL") or "http://localhost:3000"
    )

    @classmethod
    def validate(cls):
        """Validate that all required config is present and alert on POSIX collisions."""
        required = [
            cls.PIKPAK_USER,
            cls.PIKPAK_PASS,
            cls.SUPABASE_URL,
            cls.SUPABASE_KEY,
            cls.REDIS_URL,
        ]
        if not all(required):
            raise ValueError(
                "Missing required environment variables. Please check .env file"
            )

        if cls.PIKPAK_USER in {"root", "ubuntu", "runner", "appuser", "node", "daemon"}:
            logger.warning(
                f"PIKPAK_USER is set to '{cls.PIKPAK_USER}', which appears to be a local POSIX username. "
                "Ensure your PikPak account email is declared as PIKPAK_USER in .env."
            )
