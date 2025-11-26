import os
from dotenv import load_dotenv

load_dotenv()

class AppConfig:
    """Application configuration"""
    # Flask
    SCHEDULER_API_ENABLED = True

    # PikPak
    PIKPAK_USER = os.getenv("user")
    PIKPAK_PASS = os.getenv("passwd")

    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")

    # Cache Configuration
    CACHE_DIR = './cache_dir'
    CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "300"))  # Default: 5 minutes
    QUOTA_CACHE_TTL = int(os.getenv("QUOTA_CACHE_TTL_SECONDS", "10800"))  # Default: 3 hours

    # PikPak Login
    PIKPAK_LOGIN_INTERVAL = 720  # 12 minutes in seconds (re-login interval)

    # File Size Limit (in GB) - using whatslink.info API
    MAX_FILE_SIZE_GB = float(os.getenv("MAX_FILE_SIZE_GB", "25"))

    # Scheduler Configuration
    TASK_STATUS_UPDATE_INTERVAL_MINUTES = int(os.getenv("TASK_STATUS_UPDATE_INTERVAL_MINUTES", "15"))
    CLEANUP_INTERVAL_HOURS = int(os.getenv("CLEANUP_INTERVAL_HOURS", "24"))
    TASK_RETENTION_HOURS = int(os.getenv("TASK_RETENTION_HOURS", "24"))

    # Pagination Configuration
    DEFAULT_PAGE_SIZE = int(os.getenv("DEFAULT_PAGE_SIZE", "25"))

    # WebDAV Generation Configuration
    WEBDAV_GENERATION_INTERVAL_HOURS = int(os.getenv("WEBDAV_GENERATION_INTERVAL_HOURS", "24"))
    WEBDAV_CLIENT_TTL_HOURS = int(os.getenv("WEBDAV_CLIENT_TTL_HOURS", "24"))

    @classmethod
    def validate(cls):
        """Validate that all required config is present"""
        required = [cls.PIKPAK_USER, cls.PIKPAK_PASS, cls.SUPABASE_URL, cls.SUPABASE_KEY]
        if not all(required):
            raise ValueError("Missing required environment variables. Please check .env file")
