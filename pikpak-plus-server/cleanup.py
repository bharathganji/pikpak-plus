import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from dateutil import parser
from PikPakAPI import PikPakApi
from supabase import Client

logger = logging.getLogger(__name__)

async def cleanup_pikpak_tasks(client: PikPakApi, age_hours: int = 24):
    """Deletes tasks older than age_hours."""
    logger.info("Starting PikPak tasks cleanup...")
    try:
        # Fetch tasks (adjust size as needed, maybe loop for pagination if many)
        # For now, fetching a reasonable batch size
        response = await client.offline_list(size=100)
        tasks = response.get('tasks', [])
        
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=age_hours)
        
        ids_to_delete = []
        
        for task in tasks:
            created_time_str = task.get('created_time')
            if not created_time_str:
                continue
            
            try:
                # Parse ISO format with timezone
                created_time = parser.isoparse(created_time_str)
                # Ensure UTC for comparison
                if created_time.tzinfo is None:
                    created_time = created_time.replace(tzinfo=timezone.utc)
                else:
                    created_time = created_time.astimezone(timezone.utc)
                
                if created_time < cutoff:
                    ids_to_delete.append(task['id'])
                    logger.info(f"Marking task for deletion: {task['id']} (created: {created_time})")
            except Exception as e:
                logger.warning(f"Failed to parse date for task {task.get('id')}: {e}")

        if ids_to_delete:
            logger.info(f"Deleting {len(ids_to_delete)} tasks...")
            await client.delete_tasks(ids_to_delete)
            logger.info("Tasks deletion complete.")
        else:
            logger.info("No tasks found to delete.")
            
    except Exception as e:
        logger.error(f"Error during tasks cleanup: {e}")

async def cleanup_pikpak_files(client: PikPakApi, age_hours: int = 24):
    """Deletes files older than age_hours."""
    logger.info("Starting PikPak files cleanup...")
    try:
        # Fetch files
        response = await client.file_list(size=100)
        files = response.get('files', [])
        
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=age_hours)
        
        ids_to_delete = []
        
        for file in files:
            created_time_str = file.get('created_time')
            if not created_time_str:
                continue
            
            try:
                created_time = parser.isoparse(created_time_str)
                if created_time.tzinfo is None:
                    created_time = created_time.replace(tzinfo=timezone.utc)
                else:
                    created_time = created_time.astimezone(timezone.utc)
                
                if created_time < cutoff:
                    ids_to_delete.append(file['id'])
                    logger.info(f"Marking file for deletion: {file['id']} (created: {created_time})")
            except Exception as e:
                logger.warning(f"Failed to parse date for file {file.get('id')}: {e}")

        if ids_to_delete:
            logger.info(f"Deleting {len(ids_to_delete)} files...")
            # Use batch delete
            await client.delete_forever(ids_to_delete)
            logger.info("Files deletion complete.")
        else:
            logger.info("No files found to delete.")

    except Exception as e:
        logger.error(f"Error during files cleanup: {e}")

def cleanup_supabase_logs(supabase: Client, age_hours: int = 24):
    """Deletes public_actions logs older than age_hours."""
    logger.info("Starting Supabase logs cleanup...")
    try:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=age_hours)
        cutoff_str = cutoff.isoformat()
        
        # Supabase 'created_at' is usually ISO string
        # Assuming 'created_at' column exists and is timestamp
        response = supabase.table("public_actions").delete().lt("created_at", cutoff_str).execute()
        
        # response.data might contain deleted rows
        deleted_count = len(response.data) if response.data else 0
        logger.info(f"Deleted {deleted_count} old log entries from Supabase.")
        
    except Exception as e:
        logger.error(f"Error during Supabase cleanup: {e}")

async def run_cleanup(pik_client: PikPakApi, supabase_client: Client, age_hours: int = 24):
    """Orchestrates the cleanup process."""
    logger.info(f"Running cleanup job (cutoff: {age_hours} hours)...")
    
    # Ensure client is logged in
    try:
        await pik_client.login()
    except Exception as e:
        logger.error(f"Login failed during cleanup: {e}")
        return

    await cleanup_pikpak_tasks(pik_client, age_hours)
    await cleanup_pikpak_files(pik_client, age_hours)
    
    if supabase_client:
        cleanup_supabase_logs(supabase_client, age_hours)
    
    logger.info("Cleanup job finished.")
