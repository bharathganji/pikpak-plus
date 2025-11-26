"""Services module for business logic"""
import logging
import requests
import time
from typing import Optional, Dict, Any
from PikPakAPI import PikPakApi
from supabase import Client
from app_config import AppConfig

logger = logging.getLogger(__name__)

PIKPAK_CLIENT_NOT_INITIALIZED = "PikPak client not initialized"
SUPABASE_CLIENT_NOT_INITIALIZED = "Supabase client not initialized"

class PikPakService:
    """Service for PikPak operations"""

    def __init__(self, username: str, password: str):
        self.client: Optional[PikPakApi] = None
        self._last_login_time: float = 0
        try:
            self.client = PikPakApi(username=username, password=password)
            logger.info("PikPak client initialized successfully")
        except Exception as e:
            logger.error(f"PikPak client init failed: {e}")

    async def ensure_logged_in(self) -> PikPakApi:
        """Ensures the PikPak client is logged in"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        # The PikPakApi.login() method now handles persistence and rate limiting internally.
        # We can simply call it. It will skip actual login if token is valid and persisted,
        # or if we are in a cooldown period.
        try:
            await self.client.login()
            return self.client
        except Exception as e:
            logger.error(f"PikPak login failed: {e}")
            raise
    
    async def add_download(self, url: str) -> dict:
        """Add a download to PikPak with retry logic"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        try:
            await self.ensure_logged_in()
            result = await self.client.offline_download(url)
            logger.info(f"PikPak Task Result for {url}: {result}")
            return result
        except Exception as e:
            logger.error(f"PikPak Error for {url}: {e}")
            # Retry once more (PikPakApi handles token refresh automatically)
            try:
                logger.warning(f"Retrying download for {url}...")
                result = await self.client.offline_download(url)
                logger.info(f"PikPak Task Result after retry for {url}: {result}")
                return result
            except Exception as retry_e:
                logger.error(f"PikPak Error even after retry for {url}: {retry_e}")
                raise
    
    async def get_webdav_applications(self) -> dict:
        """Get WebDAV configuration and application list"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)
        
        try:
            await self.ensure_logged_in()
            result = await self.client.get_webdav_applications()
            logger.info("Retrieved WebDAV applications successfully")
            return result
        except Exception as e:
            logger.error(f"Failed to get WebDAV applications: {e}")
            raise
    
    async def toggle_webdav(self, enable: bool) -> dict:
        """Toggle WebDAV status"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)
        
        try:
            await self.ensure_logged_in()
            result = await self.client.toggle_webdav(enable)
            logger.info(f"WebDAV toggled to {'enabled' if enable else 'disabled'}")
            return result
        except Exception as e:
            logger.error(f"Failed to toggle WebDAV: {e}")
            raise
    
    async def create_webdav_application(self, application_name: str) -> dict:
        """Create a new WebDAV application"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)
        
        try:
            await self.ensure_logged_in()
            result = await self.client.create_webdav_application(application_name)
            logger.info(f"Created WebDAV application: {application_name}")
            return result
        except Exception as e:
            logger.error(f"Failed to create WebDAV application: {e}")
            raise
    
    async def delete_webdav_application(self, username: str, password: str) -> dict:
        """Delete a WebDAV application"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        try:
            await self.ensure_logged_in()
            result = await self.client.delete_webdav_application(username, password)
            logger.info(f"Deleted WebDAV application: {username}")
            return result
        except Exception as e:
            logger.error(f"Failed to delete WebDAV application: {e}")
            raise

    async def get_offline_tasks(self) -> dict:
        """Get all offline download tasks from PikPak"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        try:
            await self.ensure_logged_in()
            # Get all tasks (running, error, complete, pending)
            result = await self.client.offline_list(
                size=10000,
                phase=["PHASE_TYPE_RUNNING", "PHASE_TYPE_ERROR", "PHASE_TYPE_COMPLETE", "PHASE_TYPE_PENDING"]
            )
            logger.info(f"Retrieved {len(result.get('tasks', []))} offline tasks from PikPak")
            return result
        except Exception as e:
            logger.error(f"Failed to get offline tasks: {e}")
            raise

    async def get_quota_info(self) -> dict:
        """Get storage quota information from PikPak"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        try:
            await self.ensure_logged_in()
            result = await self.client.get_quota_info()
            logger.info("Retrieved quota info from PikPak")
            return result
        except Exception as e:
            logger.error(f"Failed to get quota info: {e}")
            raise

    async def get_transfer_quota(self) -> dict:
        """Get transfer quota information from PikPak"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        try:
            await self.ensure_logged_in()
            result = await self.client.get_transfer_quota()
            logger.info("Retrieved transfer quota from PikPak")
            return result
        except Exception as e:
            logger.error(f"Failed to get transfer quota: {e}")
            raise

    async def create_share(self, file_ids: list, need_password: bool = False, expiration_days: int = -1) -> dict:
        """Create a share link for files"""
        if not self.client:
            raise RuntimeError(PIKPAK_CLIENT_NOT_INITIALIZED)

        try:
            await self.ensure_logged_in()
            result = await self.client.file_batch_share(
                ids=file_ids,
                need_password=need_password,
                expiration_days=expiration_days
            )
            logger.info(f"Created share link for {len(file_ids)} file(s)")
            return result
        except Exception as e:
            logger.error(f"Failed to create share: {e}")
            raise


class SupabaseService:
    """Service for Supabase operations"""
    
    def __init__(self, client: Client):
        self.client = client
    
    def log_action(self, url: str, task_result: dict):
        """Log an action to Supabase"""
        if not self.client:
            logger.warning("Supabase client not available, skipping logging")
            return
        
        try:
            self.client.table("public_actions").insert({
                "action": "add",
                "data": {
                    "url": url,
                    "task": task_result
                }
            }).execute()
            logger.info(f"Logged action to Supabase for {url}")
        except Exception as e:
            logger.error(f"Supabase Log Error for {url}: {e}")
            # Don't fail the request just because logging failed
    
    def get_tasks(self, offset: int, limit: int):
        """Get paginated tasks from Supabase"""
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)
        
        response = self.client.table("public_actions") \
            .select("*", count="exact") \
            .eq("action", "add") \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
        
        return {
            "data": response.data,
            "count": response.count
        }
    
    def get_task_by_id(self, task_id: int):
        """Get a specific task by ID"""
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)
        
        response = self.client.table("public_actions") \
            .select("*") \
            .eq("id", task_id) \
            .eq("action", "add") \
            .single() \
            .execute()
        
        return response.data
    
    def store_user_action(self, email: str, action: str, data: dict):
        """Store a user action in Supabase"""
        if not self.client:
            logger.warning("Supabase client not available, skipping user action storage")
            return

        try:
            self.client.table("user_actions").insert({
                "email": email,
                "actions": action,
                "data": data
            }).execute()
            logger.info(f"Stored {action} action for user {email}")
        except Exception as e:
            logger.error(f"Failed to store user action: {e}")
            raise

    def health_check(self):
        """Perform a health check on Supabase connection"""
        if not self.client:
            return False, SUPABASE_CLIENT_NOT_INITIALIZED

        try:
            self.client.from_("public_actions").select("id").limit(1).execute()
            return True, None
        except Exception as e:
            return False, f"Supabase connectivity check failed: {e}"

    def update_task_statuses(self, pikpak_tasks: list):
        """
        Update task statuses in Supabase based on PikPak task data

        Args:
            pikpak_tasks: List of task dictionaries from PikPak offline_list
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        updated_count = 0

        try:
            # Get all tasks from Supabase
            response = self.client.table("public_actions") \
                .select("id, data") \
                .eq("action", "add") \
                .execute()

            supabase_tasks = response.data

            # Create a mapping of task_id to PikPak task data
            pikpak_task_map = {task['id']: task for task in pikpak_tasks}

            # Update each Supabase task with latest PikPak data
            for supabase_task in supabase_tasks:
                task_data = supabase_task.get('data', {})

                # Handle nested structure: data.task.task
                task_wrapper = task_data.get('task', {})
                task_info = task_wrapper.get('task', {})
                task_id = task_info.get('id')

                if task_id and task_id in pikpak_task_map:
                    pikpak_task = pikpak_task_map[task_id]

                    # Update the task data with latest info from PikPak
                    task_info.update({
                        'phase': pikpak_task.get('phase'),
                        'progress': pikpak_task.get('progress'),
                        'message': pikpak_task.get('message'),
                        'file_size': pikpak_task.get('file_size'),
                        'updated_time': pikpak_task.get('updated_time'),
                    })

                    # Update in Supabase
                    self.client.table("public_actions") \
                        .update({"data": task_data}) \
                        .eq("id", supabase_task['id']) \
                        .execute()

                    updated_count += 1

            logger.info(f"Updated {updated_count} task statuses in Supabase")
            return updated_count

        except Exception as e:
            logger.error(f"Failed to update task statuses: {e}")
            raise


class WhatsLinkService:
    """Service for WhatsLink.info API operations"""

    BASE_URL = "https://whatslink.info/api/v1/link"

    @staticmethod
    def check_file_info(url: str, timeout: int = 10) -> Dict[str, Any]:
        """
        Check file information using WhatsLink.info API

        Args:
            url: The URL to check
            timeout: Request timeout in seconds

        Returns:
            Dictionary containing file metadata:
            - type: Content type
            - file_type: Type of content (unknown, folder, video, text, image, audio, archive, font, document)
            - name: Content name
            - size: Total size in bytes
            - count: Number of included files
            - screenshots: List of screenshots
            - error: Error message if request failed
        """
        try:
            logger.info(f"Checking file info for URL: {url}")
            response = requests.get(
                WhatsLinkService.BASE_URL,
                params={"url": url},
                timeout=timeout
            )

            if response.status_code == 200:
                data = response.json()
                logger.info(f"WhatsLink response for {url}: {data}")
                return data
            else:
                logger.warning(f"WhatsLink returned status {response.status_code} for {url}")
                return {"error": f"WhatsLink API returned status {response.status_code}"}

        except requests.exceptions.Timeout:
            logger.error(f"WhatsLink API timeout for {url}")
            return {"error": "WhatsLink API request timed out"}
        except requests.exceptions.RequestException as e:
            logger.error(f"WhatsLink API error for {url}: {e}")
            return {"error": f"WhatsLink API error: {str(e)}"}
        except Exception as e:
            logger.error(f"Unexpected error checking file info for {url}: {e}")
            return {"error": f"Unexpected error: {str(e)}"}

    @staticmethod
    def check_file_size_limit(url: str, max_size_gb: float) -> tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Check if file size is within the allowed limit

        Args:
            url: The URL to check
            max_size_gb: Maximum allowed size in GB

        Returns:
            Tuple of (is_valid, error_message, file_info)
            - is_valid: True if file is within limit or size couldn't be determined
            - error_message: Error message if file exceeds limit
            - file_info: File metadata from WhatsLink API
        """
        file_info = WhatsLinkService.check_file_info(url)

        # If there's an error getting file info, log it but allow the download
        # (fail open - don't block downloads if the API is unavailable)
        if file_info.get("error"):
            logger.warning(f"Could not check file size for {url}: {file_info['error']}")
            return True, None, file_info

        # Check if size information is available
        size_bytes = file_info.get("size")
        if size_bytes is None:
            logger.warning(f"No size information available for {url}")
            return True, None, file_info

        # Convert bytes to GB
        size_gb = size_bytes / (1024 ** 3)
        logger.info(f"File size for {url}: {size_gb:.2f} GB (limit: {max_size_gb} GB)")

        if size_gb > max_size_gb:
            error_msg = f"File size ({size_gb:.2f} GB) exceeds the maximum allowed size of {max_size_gb} GB"
            logger.warning(f"File size limit exceeded for {url}: {error_msg}")
            return False, error_msg, file_info

        return True, None, file_info
