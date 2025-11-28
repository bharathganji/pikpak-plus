"""Supabase Service Module"""
import logging
from typing import Optional, Dict, Any
from supabase import Client

logger = logging.getLogger(__name__)

SUPABASE_CLIENT_NOT_INITIALIZED = "Supabase client not initialized"


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
            logger.warning(
                "Supabase client not available, skipping user action storage")
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

    def get_existing_share_by_file_id(self, file_id: str):
        """
        Check if a share already exists for the given file_id (global check)

        Args:
            file_id: The PikPak file ID

        Returns:
            Existing share data if found, None otherwise
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            # Use PostgreSQL JSONB operator to filter by file_id in data field
            # This is more efficient than fetching all shares and filtering in Python
            response = self.client.table("public_actions") \
                .select("data") \
                .eq("action", "share") \
                .contains("data", {"file_id": file_id}) \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()

            if response.data and len(response.data) > 0:
                data = response.data[0].get("data", {})
                logger.info(f"Found existing share for file_id: {file_id}")
                return data

            logger.info(f"No existing share found for file_id: {file_id}")
            return None
        except Exception as e:
            logger.error(f"Failed to check for existing share: {e}")
            return None

    def check_existing_task_by_hash(self, magnet_hash: str):
        """
        Check if a task with the same magnet hash already exists

        Args:
            magnet_hash: The magnet info hash

        Returns:
            Existing task data if found, None otherwise
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            # Search for tasks where the URL contains the hash
            # We use ilike on the extracted URL string from the JSONB data
            response = self.client.table("public_actions") \
                .select("data") \
                .eq("action", "add") \
                .filter("data->>url", "ilike", f"%{magnet_hash}%") \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()

            if response.data and len(response.data) > 0:
                data = response.data[0].get("data", {})
                logger.info(f"Found existing task for hash: {magnet_hash}")
                return data.get("task")

            return None
        except Exception as e:
            logger.error(f"Failed to check for existing task: {e}")
            return None

    def store_share(self, file_id: str, share_data: dict):
        """
        Store a share in public_actions table

        Args:
            file_id: The PikPak file ID
            share_data: Share data from PikPak API (share_url, share_id, pass_code, etc.)
        """
        if not self.client:
            logger.warning(
                "Supabase client not available, skipping share storage")
            return

        try:
            # Add file_id to share_data for easy lookup
            data_with_file_id = {
                **share_data,
                "file_id": file_id
            }

            self.client.table("public_actions").insert({
                "action": "share",
                "data": data_with_file_id
            }).execute()
            logger.info(f"Stored share for file_id: {file_id}")
        except Exception as e:
            logger.error(f"Failed to store share: {e}")
            # Don't fail the request just because storage failed

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
