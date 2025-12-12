import asyncio
import logging
from typing import List, Tuple, Set
from supabase import Client

logger = logging.getLogger(__name__)

# Maximum number of tasks that can be deleted in one PikPak API call
PIKPAK_MAX_BATCH_SIZE = 100


def get_task_and_file_ids_from_supabase(supabase: Client) -> Tuple[List[str], List[str]]:
    """
    Retrieve all task IDs and file IDs from the public_actions table.

    Returns:
        Tuple of (task_ids, file_ids) extracted from "add" actions
    """
    logger.info("Fetching task and file IDs from Supabase public_actions table...")

    task_ids: Set[str] = set()
    file_ids: Set[str] = set()

    try:
        # Get all "add" actions from public_actions table
        response = supabase.table("public_actions") \
            .select("id, data") \
            .eq("action", "add") \
            .execute()

        records = response.data or []
        logger.info(f"Found {len(records)} 'add' action records in Supabase")

        for record in records:
            data = record.get("data", {})

            # Structure: data.task.task.id and data.task.task.file_id
            # OR: data.task.id and data.task.file_id (depending on response structure)
            task_wrapper = data.get("task", {})

            # Handle nested structure: task.task
            if "task" in task_wrapper:
                task_info = task_wrapper.get("task", {})
            else:
                # Direct structure
                task_info = task_wrapper

            task_id = task_info.get("id")
            file_id = task_info.get("file_id")

            if task_id:
                task_ids.add(task_id)
                logger.debug(f"Found task ID: {task_id}")

            if file_id:
                file_ids.add(file_id)
                logger.debug(f"Found file ID: {file_id}")

        task_ids_list = list(task_ids)
        file_ids_list = list(file_ids)

        logger.info(f"Extracted {len(task_ids_list)} unique task IDs and {len(file_ids_list)} unique file IDs")

        return task_ids_list, file_ids_list

    except Exception as e:
        logger.error(f"Failed to fetch task/file IDs from Supabase: {e}")
        raise


async def delete_pikpak_tasks_in_batches(service, task_ids: List[str]) -> bool:
    """
    Delete PikPak tasks in batches of PIKPAK_MAX_BATCH_SIZE.

    Args:
        service: PikPakService instance
        task_ids: List of task IDs to delete

    Returns:
        True if all deletions succeeded, False otherwise
    """
    if not task_ids:
        logger.info("No task IDs to delete from PikPak")
        return True

    logger.info(f"Starting PikPak tasks deletion: {len(task_ids)} tasks in batches of {PIKPAK_MAX_BATCH_SIZE}")

    total_deleted = 0
    batch_num = 0

    try:
        for i in range(0, len(task_ids), PIKPAK_MAX_BATCH_SIZE):
            batch = task_ids[i:i + PIKPAK_MAX_BATCH_SIZE]
            batch_num += 1

            logger.info(f"Deleting task batch {batch_num}: {len(batch)} tasks (IDs: {batch[:3]}{'...' if len(batch) > 3 else ''})")

            async def _delete_batch(ids=batch):
                # delete_files=False because we delete files separately
                await service.client.delete_tasks(ids, delete_files=False)

            await service._execute_with_retry(_delete_batch)

            total_deleted += len(batch)
            logger.info(f"Batch {batch_num} deleted successfully. Progress: {total_deleted}/{len(task_ids)}")

        logger.info(f"PikPak tasks deletion complete: {total_deleted} tasks deleted")
        return True

    except Exception as e:
        logger.error(f"Error deleting PikPak tasks at batch {batch_num}: {e}")
        return False


async def delete_pikpak_files_permanently(service, file_ids: List[str]) -> bool:
    """
    Delete PikPak files permanently (not to trash).
    Uses batchDelete endpoint.

    Args:
        service: PikPakService instance
        file_ids: List of file IDs to delete permanently

    Returns:
        True if deletion succeeded, False otherwise
    """
    if not file_ids:
        logger.info("No file IDs to delete from PikPak")
        return True

    logger.info(f"Starting PikPak files permanent deletion: {len(file_ids)} files")
    logger.info(f"File IDs to delete: {file_ids[:5]}{'...' if len(file_ids) > 5 else ''}")

    total_deleted = 0
    batch_num = 0

    try:
        # Process files in batches as well (using same batch size for safety)
        for i in range(0, len(file_ids), PIKPAK_MAX_BATCH_SIZE):
            batch = file_ids[i:i + PIKPAK_MAX_BATCH_SIZE]
            batch_num += 1

            logger.info(f"Deleting file batch {batch_num}: {len(batch)} files")

            async def _delete_files(ids=batch):
                # delete_forever uses batchDelete endpoint for permanent deletion
                await service.client.delete_forever(ids)

            await service._execute_with_retry(_delete_files)

            total_deleted += len(batch)
            logger.info(f"File batch {batch_num} deleted permanently. Progress: {total_deleted}/{len(file_ids)}")

        logger.info(f"PikPak files permanent deletion complete: {total_deleted} files deleted")
        return True

    except Exception as e:
        logger.error(f"Error deleting PikPak files permanently at batch {batch_num}: {e}")
        return False


def empty_supabase_public_actions(supabase: Client) -> int:
    """
    Empty the entire public_actions table (delete all rows).

    Args:
        supabase: Supabase client

    Returns:
        Number of deleted rows
    """
    logger.info("Emptying Supabase public_actions table...")

    try:
        # Delete all rows from public_actions table
        # Using gte with id > 0 to match all rows (id is always > 0)
        response = supabase.table("public_actions") \
            .delete() \
            .gte("id", 0) \
            .execute()

        deleted_count = len(response.data) if response.data else 0
        logger.info(f"Emptied public_actions table: {deleted_count} rows deleted")

        return deleted_count

    except Exception as e:
        logger.error(f"Failed to empty public_actions table: {e}")
        raise


async def run_cleanup(pikpak_service, supabase_client: Client):
    """
    Orchestrates the cleanup process:
    1. Get all task IDs and file IDs from Supabase public_actions table
    2. Delete tasks from PikPak (in batches of 100)
    3. Delete files permanently from PikPak (not trash)
    4. After both succeed, empty the public_actions table

    Args:
        pikpak_service: PikPakService instance
        supabase_client: Supabase client
    """
    logger.info("=" * 60)
    logger.info("CLEANUP JOB STARTED")
    logger.info("=" * 60)

    # Ensure client is logged in
    try:
        logger.info("Step 0: Ensuring PikPak client is logged in...")
        await pikpak_service.ensure_logged_in()
        logger.info("PikPak login verified")
    except Exception as e:
        logger.error(f"Login failed during cleanup: {e}")
        return

    # Step 1: Get task and file IDs from Supabase
    logger.info("-" * 40)
    logger.info("Step 1: Retrieving task and file IDs from Supabase...")
    try:
        task_ids, file_ids = get_task_and_file_ids_from_supabase(supabase_client)
    except Exception as e:
        logger.error(f"Failed to retrieve IDs from Supabase: {e}")
        return

    if not task_ids and not file_ids:
        logger.info("No tasks or files found in Supabase. Nothing to clean up.")
        logger.info("CLEANUP JOB FINISHED (no work needed)")
        return

    # Step 2: Delete tasks from PikPak
    logger.info("-" * 40)
    logger.info("Step 2: Deleting tasks from PikPak...")
    tasks_deleted = await delete_pikpak_tasks_in_batches(pikpak_service, task_ids)

    if not tasks_deleted:
        logger.error("PikPak tasks deletion failed. Aborting cleanup.")
        return

    # Step 3: Delete files permanently from PikPak
    logger.info("-" * 40)
    logger.info("Step 3: Deleting files permanently from PikPak...")
    files_deleted = await delete_pikpak_files_permanently(pikpak_service, file_ids)

    if not files_deleted:
        logger.error("PikPak files deletion failed. Aborting cleanup.")
        return

    # Step 4: Empty Supabase public_actions table
    logger.info("-" * 40)
    logger.info("Step 4: Emptying Supabase public_actions table...")
    try:
        deleted_count = empty_supabase_public_actions(supabase_client)
        logger.info(f"Supabase cleanup complete: {deleted_count} rows removed")
    except Exception as e:
        logger.error(f"Failed to empty Supabase table: {e}")
        return

    logger.info("=" * 60)
    logger.info("CLEANUP JOB FINISHED SUCCESSFULLY")
    logger.info(f"Summary: {len(task_ids)} tasks deleted, {len(file_ids)} files deleted, {deleted_count} Supabase rows removed")
    logger.info("=" * 60)
