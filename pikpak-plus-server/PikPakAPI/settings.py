import os
from dotenv import load_dotenv

load_dotenv()

IS_DEVELOPMENT = os.getenv("IS_DEVELOPMENT", "false").lower() == "true"
print(f"PikPakAPI initialized in {'DEVELOPMENT (MOCK)' if IS_DEVELOPMENT else 'REALTIME (LIVE)'} mode")

PIKPAK_API_HOST = "api-drive.mypikpak.com"
PIKPAK_USER_HOST = "user.mypikpak.com"
WEBDAV_BASE_URL = "https://api-dav.mypikpak.com"

# Default timeout for requests
DEFAULT_TIMEOUT = 30.0
