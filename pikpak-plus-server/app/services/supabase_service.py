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

    def log_action(self, url: str, task_result: dict, file_info: dict = None, user_email: str = None):
        """Log an action to Supabase

        Args:
            url: The magnet/download URL
            task_result: PikPak task result
            file_info: Optional WhatsLink metadata containing:
                - name: Content name
                - file_type: video, audio, archive, image, document, folder, unknown
                - size: Size in bytes
                - count: Number of files
                - screenshots: List of preview image URLs
            user_email: Optional email of user who performed the action
        """
        if not self.client:
            logger.warning("Supabase client not available, skipping logging")
            return

        try:
            # Build data payload
            data = {
                "url": url,
                "task": task_result
            }

            # Add WhatsLink metadata if available (exclude error field)
            if file_info and not file_info.get("error"):
                whatslink_data = {}
                for key in ["name", "file_type", "size", "count"]:
                    if key in file_info and file_info[key] is not None:
                        whatslink_data[key] = file_info[key]

                # Extract screenshot URLs from objects (WhatsLink returns [{screenshot: url, time: 0}, ...])
                screenshots = file_info.get("screenshots")
                if screenshots and isinstance(screenshots, list):
                    screenshot_urls = []
                    for item in screenshots:
                        if isinstance(item, dict) and "screenshot" in item:
                            screenshot_urls.append(item["screenshot"])
                        elif isinstance(item, str):
                            screenshot_urls.append(item)
                    if screenshot_urls:
                        whatslink_data["screenshots"] = screenshot_urls

                if whatslink_data:
                    data["whatslink"] = whatslink_data

            # Insert with user_email
            self.client.table("public_actions").insert({
                "action": "add",
                "data": data,
                "user_email": user_email
            }).execute()
            logger.info(
                f"Logged action to Supabase for {url} (user: {user_email or 'anonymous'})")
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

    def get_tasks_by_urls(self, urls: list) -> list:
        """
        Get tasks matching specific URLs (for user's tasks from localStorage)

        Args:
            urls: List of magnet/torrent URLs to match

        Returns:
            List of matching task records
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        if not urls:
            return []

        try:
            # Use PostgreSQL's JSONB operators to filter by URL
            # The URL is stored in data->url field
            response = self.client.table("public_actions") \
                .select("*") \
                .eq("action", "add") \
                .in_("data->>url", urls) \
                .order("created_at", desc=True) \
                .execute()

            return response.data
        except Exception as e:
            logger.error(f"Failed to get tasks by URLs: {e}")
            raise

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

    def get_action_by_id(self, action_id: int):
        """Get a specific action (any type) by ID"""
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        response = self.client.table("public_actions") \
            .select("*") \
            .eq("id", action_id) \
            .single() \
            .execute()

        return response.data

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

    def store_share(self, file_id: str, share_data: dict, user_email: str = None):
        """
        Store a share in public_actions table

        Args:
            file_id: The PikPak file ID
            share_data: Share data from PikPak API
            user_email: Optional email of user who created the share
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
                "data": data_with_file_id,
                "user_email": user_email
            }).execute()
            logger.info(
                f"Stored share for file_id: {file_id} (user: {user_email})")
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
        Update task statuses in Supabase based on PikPak task data using bulk upsert

        Args:
            pikpak_tasks: List of task dictionaries from PikPak offline_list
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            # Get all tasks from Supabase
            response = self.client.table("public_actions") \
                .select("id, data") \
                .eq("action", "add") \
                .execute()

            supabase_tasks = response.data

            # Create a mapping of task_id to PikPak task data
            pikpak_task_map = {task['id']: task for task in pikpak_tasks}

            # Prepare bulk update data
            bulk_updates = []

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

                    # Add to bulk update list
                    bulk_updates.append({
                        'id': supabase_task['id'],
                        'action': 'add',
                        'data': task_data
                    })

            # Perform bulk upsert if there are updates
            updated_count = 0
            if bulk_updates:
                # Use upsert with 'id' as the conflict resolution column
                # This will update existing rows and insert new ones (though we only expect updates here)
                self.client.table("public_actions") \
                    .upsert(bulk_updates, on_conflict='id') \
                    .execute()

                updated_count = len(bulk_updates)
                logger.info(
                    f"Bulk updated {updated_count} task statuses in Supabase")
            else:
                logger.info("No tasks to update")

            return updated_count

        except Exception as e:
            import httpx
            if isinstance(e, httpx.ConnectError):
                logger.error(
                    f"Connection error updating task statuses: {e}. Check Supabase URL and network connection.")
            else:
                logger.error(f"Failed to update task statuses: {e}")
            raise

    def count_tasks_added_since(self, since_time: str) -> int:
        """
        Count tasks added since a specific time

        Args:
            since_time: ISO format timestamp string
        """
        if not self.client:
            return 0

        try:
            response = self.client.table("public_actions") \
                .select("id", count="exact") \
                .eq("action", "add") \
                .gte("created_at", since_time) \
                .execute()

            return response.count or 0
        except Exception as e:
            logger.error(f"Failed to count tasks: {e}")
            return 0

    def count_tasks_added_between(self, start_time: str, end_time: str) -> int:
        """
        Count tasks added between two timestamps

        Args:
            start_time: ISO format timestamp string (inclusive)
            end_time: ISO format timestamp string (exclusive)
        """
        if not self.client:
            return 0

        try:
            response = self.client.table("public_actions") \
                .select("id", count="exact") \
                .eq("action", "add") \
                .gte("created_at", start_time) \
                .lt("created_at", end_time) \
                .execute()

            return response.count or 0
        except Exception as e:
            logger.error(f"Failed to count tasks between dates: {e}")
            return 0

    def log_daily_stats(self, stats_data: dict):
        """
        Log daily statistics

        Args:
            stats_data: Dictionary containing statistics
        """
        if not self.client:
            return

        try:
            # Upsert based on date
            self.client.table("daily_statistics").upsert(
                stats_data,
                on_conflict="date"
            ).execute()
            logger.info(
                f"Logged daily statistics for {stats_data.get('date')}")
        except Exception as e:
            logger.error(f"Failed to log daily statistics: {e}")

    def get_daily_stats(self, limit: int = 30):
        """
        Get daily statistics history with 7-day prediction

        Args:
            limit: Number of days to retrieve
        """
        if not self.client:
            return []

        try:
            response = self.client.table("daily_statistics") \
                .select("*") \
                .order("date", desc=True) \
                .limit(limit) \
                .execute()

            data = response.data
            if not data:
                return []

            # Sort by date ascending for prediction calculation
            data.sort(key=lambda x: x['date'])

            # Extract series for each metric
            tasks_added_series = [float(d.get('tasks_added', 0)) for d in data]
            storage_used_series = [
                float(d.get('storage_used', 0)) for d in data]
            transfer_used_series = [
                float(d.get('transfer_used', 0)) for d in data]
            downstream_traffic_series = [
                float(d.get('downstream_traffic', 0)) for d in data]

            # Predict next 7 days
            from app.utils.prediction import predict_next_values
            from datetime import datetime, timedelta

            predicted_tasks = predict_next_values(tasks_added_series, 7)
            predicted_storage = predict_next_values(storage_used_series, 7)
            predicted_transfer = predict_next_values(transfer_used_series, 7)
            predicted_downstream = predict_next_values(
                downstream_traffic_series, 7)

            # Generate future dates
            last_date_str = data[-1]['date']
            last_date = datetime.strptime(last_date_str, '%Y-%m-%d')

            predicted_data = []
            for i in range(7):
                next_date = last_date + timedelta(days=i+1)
                predicted_data.append({
                    'date': next_date.strftime('%Y-%m-%d'),
                    'tasks_added': int(predicted_tasks[i]),
                    'storage_used': int(predicted_storage[i]),
                    'transfer_used': int(predicted_transfer[i]),
                    'downstream_traffic': int(predicted_downstream[i]),
                    'is_predicted': True
                })

            # append predicted data to the actual data
            # Note: The frontend expects a list.
            # We add is_predicted=False to original data for clarity
            for item in data:
                item['is_predicted'] = False

            return data + predicted_data

        except Exception as e:
            logger.error(f"Failed to get daily statistics: {e}")
            # Fallback to returning whatever raw data we have or empty list
            return []

    # ========================================
    # User Management Methods
    # ========================================

    def create_user(self, email: str, password_hash: str, is_admin: bool = False) -> Dict[str, Any]:
        """Insert new user into database

        Args:
            email: User's email address
            password_hash: Hashed password
            is_admin: Whether user has admin privileges

        Returns:
            Created user record
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            response = self.client.table("users").insert({
                "email": email,
                "password_hash": password_hash,
                "is_admin": is_admin,
                "blocked": False
            }).execute()

            if response.data and len(response.data) > 0:
                logger.info(f"Created user: {email}")
                return response.data[0]

            raise RuntimeError("Failed to create user")
        except Exception as e:
            logger.error(f"Error creating user {email}: {e}")
            raise

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Query user by email address

        Args:
            email: User's email address

        Returns:
            User record if found, None otherwise
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            response = self.client.table("users") \
                .select("*") \
                .eq("email", email) \
                .limit(1) \
                .execute()

            if response.data and len(response.data) > 0:
                return response.data[0]

            return None
        except Exception as e:
            logger.error(f"Error fetching user {email}: {e}")
            return None

    def update_user_password(self, email: str, password_hash: str) -> bool:
        """Update user's password

        Args:
            email: User's email address
            password_hash: New hashed password

        Returns:
            True if updated successfully
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            self.client.table("users") \
                .update({"password_hash": password_hash}) \
                .eq("email", email) \
                .execute()

            logger.info(f"Updated password for user: {email}")
            return True
        except Exception as e:
            logger.error(f"Error updating password for {email}: {e}")
            raise

    def store_password_reset_token(self, email: str, token: str, expires_at) -> bool:
        """Store password reset token for user

        Args:
            email: User's email address
            token: Reset token
            expires_at: Token expiration datetime

        Returns:
            True if stored successfully
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            self.client.table("users") \
                .update({
                    "reset_token": token,
                    "reset_token_expires_at": expires_at.isoformat()
                }) \
                .eq("email", email) \
                .execute()

            logger.info(f"Stored reset token for user: {email}")
            return True
        except Exception as e:
            logger.error(f"Error storing reset token for {email}: {e}")
            raise

    def get_user_by_reset_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Retrieve user by valid reset token

        Args:
            token: Password reset token

        Returns:
            User record if token is valid, None otherwise
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            response = self.client.table("users") \
                .select("*") \
                .eq("reset_token", token) \
                .limit(1) \
                .execute()

            if response.data and len(response.data) > 0:
                return response.data[0]

            return None
        except Exception as e:
            logger.error(f"Error fetching user by reset token: {e}")
            return None

    def clear_password_reset_token(self, email: str) -> bool:
        """Clear reset token after use

        Args:
            email: User's email address

        Returns:
            True if cleared successfully
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            self.client.table("users") \
                .update({
                    "reset_token": None,
                    "reset_token_expires_at": None
                }) \
                .eq("email", email) \
                .execute()

            logger.info(f"Cleared reset token for user: {email}")
            return True
        except Exception as e:
            logger.error(f"Error clearing reset token for {email}: {e}")
            raise

    def update_user_blocked_status(self, email: str, blocked: bool) -> bool:
        """Update user's blocked status

        Args:
            email: User's email address
            blocked: New blocked status

        Returns:
            True if updated successfully
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            self.client.table("users") \
                .update({"blocked": blocked}) \
                .eq("email", email) \
                .execute()

            logger.info(f"Updated blocked status for {email}: {blocked}")
            return True
        except Exception as e:
            logger.error(f"Error updating blocked status for {email}: {e}")
            raise

    def get_users_list(self, offset: int, limit: int, blocked_filter: Optional[bool] = None) -> Dict[str, Any]:
        """Get filtered and paginated user list

        Args:
            offset: Pagination offset
            limit: Number of users to return
            blocked_filter: Filter by blocked status (None = all)

        Returns:
            Dictionary with users data and total count
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            query = self.client.table("users") \
                .select("email, is_admin, blocked, created_at", count="exact")

            # Apply filter if specified
            if blocked_filter is not None:
                query = query.eq("blocked", blocked_filter)

            response = query \
                .order("created_at", desc=True) \
                .range(offset, offset + limit - 1) \
                .execute()

            return {
                "data": response.data,
                "count": response.count
            }
        except Exception as e:
            logger.error(f"Error fetching users list: {e}")
            raise

    def get_user_tasks(self, email: str, offset: int, limit: int) -> Dict[str, Any]:
        """Get user's tasks from public_actions (filtered by user_email)

        Args:
            email: User's email address
            offset: Pagination offset
            limit: Number of tasks to return

        Returns:
            Dictionary with tasks data and total count
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            response = self.client.table("public_actions") \
                .select("*", count="exact") \
                .eq("action", "add") \
                .eq("user_email", email) \
                .order("created_at", desc=True) \
                .range(offset, offset + limit - 1) \
                .execute()

            return {
                "data": response.data,
                "count": response.count
            }
        except Exception as e:
            logger.error(f"Error fetching tasks for user {email}: {e}")
            raise

    def delete_action_by_id(self, action_id: int) -> bool:
        """Delete specific action/task by ID

        Args:
            action_id: ID of the action to delete

        Returns:
            True if deleted successfully
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            self.client.table("public_actions") \
                .delete() \
                .eq("id", action_id) \
                .execute()

            logger.info(f"Deleted action with ID: {action_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting action {action_id}: {e}")
            raise

    def get_admin_statistics(self) -> Dict[str, Any]:
        """Aggregate counts for admin dashboard

        Returns:
            Dictionary containing various statistics
        """
        if not self.client:
            raise RuntimeError(SUPABASE_CLIENT_NOT_INITIALIZED)

        try:
            # Get total users count
            users_response = self.client.table("users") \
                .select("id", count="exact") \
                .execute()
            total_users = users_response.count or 0

            # Get blocked users count
            blocked_response = self.client.table("users") \
                .select("id", count="exact") \
                .eq("blocked", True) \
                .execute()
            blocked_users = blocked_response.count or 0

            # Get total tasks count
            tasks_response = self.client.table("public_actions") \
                .select("id", count="exact") \
                .eq("action", "add") \
                .execute()
            total_tasks = tasks_response.count or 0

            # Get total logs count
            logs_response = self.client.table("public_actions") \
                .select("id", count="exact") \
                .execute()
            total_logs = logs_response.count or 0

            return {
                "total_users": total_users,
                "active_users": total_users - blocked_users,
                "blocked_users": blocked_users,
                "total_tasks": total_tasks,
                "total_logs": total_logs
            }
        except Exception as e:
            logger.error(f"Error fetching admin statistics: {e}")
            raise
