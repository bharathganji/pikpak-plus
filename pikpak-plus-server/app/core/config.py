import os
from dotenv import load_dotenv

load_dotenv()


class AppConfig:
    """Application configuration"""
    # Flask
    SCHEDULER_API_ENABLED = True

    # PikPak
    PIKPAK_USER = os.getenv("USER") or os.getenv("user")
    PIKPAK_PASS = os.getenv("PASSWD") or os.getenv("passwd")

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
        os.getenv("QUOTA_CACHE_TTL_SECONDS", "10800"))  # Default: 3 hours

    # Request Timeout
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "60"))

    # PikPak Login
    PIKPAK_LOGIN_INTERVAL = 720  # 12 minutes in seconds (re-login interval)

    # File Size Limit (in GB) - using whatslink.info API
    MAX_FILE_SIZE_GB = float(os.getenv("MAX_FILE_SIZE_GB", "25"))

    # Scheduler Configuration
    TASK_STATUS_UPDATE_INTERVAL_MINUTES = int(
        os.getenv("TASK_STATUS_UPDATE_INTERVAL_MINUTES", "15"))
    CLEANUP_INTERVAL_HOURS = int(os.getenv("CLEANUP_INTERVAL_HOURS", "24"))

    # Pagination Configuration
    DEFAULT_PAGE_SIZE = int(os.getenv("DEFAULT_PAGE_SIZE", "25"))

    # WebDAV Generation Configuration
    WEBDAV_GENERATION_INTERVAL_HOURS = int(
        os.getenv("WEBDAV_GENERATION_INTERVAL_HOURS", "24"))

    # Authentication Configuration
    # Admin account credentials (auto-created on startup)
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

    # JWT Configuration
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.urandom(64).hex())
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

    # Password Reset Configuration
    PASSWORD_RESET_TOKEN_EXPIRATION_HOURS = int(
        os.getenv("PASSWORD_RESET_TOKEN_EXPIRATION_HOURS", "1"))

    @classmethod
    def validate(cls):
        """Validate that all required config is present"""
        required = [cls.PIKPAK_USER, cls.PIKPAK_PASS,
                    cls.SUPABASE_URL, cls.SUPABASE_KEY, cls.REDIS_URL]
        if not all(required):
            raise ValueError(
                "Missing required environment variables. Please check .env file")
