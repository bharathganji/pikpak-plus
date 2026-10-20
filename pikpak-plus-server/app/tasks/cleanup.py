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
    logger.info(
        "Fetching task and file IDs from Supabase public_actions table...")

    task_ids: Set[str] = set()
    file_ids: Set[str] = set()

    try:
        # Get all "add" actions from public_actions table
        response = supabase.table("public_actions") \
            .select("id, data") \
            .eq("action", "add") \
            .execute()

        records = response.data or []
        logger.info(f"Found {len(records)} tasks in Supabase to process")

        if not records:
            return [], []

        # Track records with missing IDs for warning
        missing_task_ids = 0
        missing_file_ids = 0

        for record in records:
            data = record.get("data", {})
            task_wrapper = data.get("task", {})

            # Try nested structure first (data.task.task and data.task.file)
            if isinstance(task_wrapper, dict) and "task" in task_wrapper:
                task_info = task_wrapper.get("task", {})
                file_info = task_wrapper.get("file", {})
            else:
                # Direct structure (data.task is the task itself)
                task_info = task_wrapper
                file_info = task_wrapper

            task_id = task_info.get("id") if isinstance(
                task_info, dict) else None
            file_id = file_info.get("id") if isinstance(
                file_info, dict) else None

            # Also try file_id from task_info (some responses have it there)
            if not file_id and isinstance(task_info, dict):
                file_id = task_info.get("file_id")

            if task_id:
                task_ids.add(task_id)
            else:
                missing_task_ids += 1

            if file_id:
                file_ids.add(file_id)
            else:
                missing_file_ids += 1

        task_ids_list = list(task_ids)
        file_ids_list = list(file_ids)

        # Warn if some records couldn't be parsed
        if missing_task_ids > 0:
            logger.warning(f"{missing_task_ids} records missing task IDs")
        if missing_file_ids > 0:
            logger.warning(f"{missing_file_ids} records missing file IDs")

        logger.info(
            f"Extracted {len(task_ids_list)} task IDs and {len(file_ids_list)} file IDs")

        return task_ids_list, file_ids_list

    except Exception as e:
        logger.error(
            f"Failed to fetch task/file IDs from Supabase: {e}", exc_info=True)
        raise


async def delete_pikpak_tasks_in_batches(service, task_ids: List[str]) -> bool:
    """
    Delete PikPak tasks in batches of PIKPAK_MAX_BATCH_SIZE.
    Adds 5-second delay between batches to avoid rate limiting.

    Args:
        service: PikPakService instance
        task_ids: List of task IDs to delete

    Returns:
        True if all deletions succeeded, False otherwise
    """
    if not task_ids:
        logger.info("No tasks to delete from PikPak")
        return True

    num_batches = (len(task_ids) + PIKPAK_MAX_BATCH_SIZE -
                   1) // PIKPAK_MAX_BATCH_SIZE
    logger.info(
        f"Deleting {len(task_ids)} tasks from PikPak in {num_batches} batch(es)")

    total_deleted = 0
    failed_batches = 0

    try:
        for i in range(0, len(task_ids), PIKPAK_MAX_BATCH_SIZE):
            batch = task_ids[i:i + PIKPAK_MAX_BATCH_SIZE]
            batch_num = (i // PIKPAK_MAX_BATCH_SIZE) + 1

            try:
                async def _delete_batch(ids=batch):
                    await service.client.delete_tasks(ids, delete_files=False)

                await service._execute_with_retry(_delete_batch)
                total_deleted += len(batch)

                if num_batches > 1:
                    logger.info(
                        f"  Batch {batch_num}/{num_batches}: {len(batch)} tasks deleted")
            except Exception as batch_error:
                logger.error(f"  Batch {batch_num} failed: {batch_error}")
                failed_batches += 1

            # Add 5-second delay between batches to avoid rate limiting
            if i + PIKPAK_MAX_BATCH_SIZE < len(task_ids):
                await asyncio.sleep(5)

        if failed_batches == 0:
            logger.info(
                f"✓ Successfully deleted {total_deleted} tasks from PikPak")
        else:
            logger.warning(
                f"Deleted {total_deleted}/{len(task_ids)} tasks ({failed_batches} batch(es) failed)")

        return failed_batches == 0

    except Exception as e:
        logger.error(f"Critical error during task deletion: {e}")
        return False


async def delete_pikpak_files_permanently(service, file_ids: List[str]) -> bool:
    """
    Delete PikPak files permanently (not to trash).
    Uses batchDelete endpoint. Adds 5-second delay between batches.

    Args:
        service: PikPakService instance
        file_ids: List of file IDs to delete permanently

    Returns:
        True if deletion succeeded, False otherwise
    """
    if not file_ids:
        logger.info("No files to delete from PikPak")
        return True

    num_batches = (len(file_ids) + PIKPAK_MAX_BATCH_SIZE -
                   1) // PIKPAK_MAX_BATCH_SIZE
    logger.info(
        f"Deleting {len(file_ids)} files permanently from PikPak in {num_batches} batch(es)")

    total_deleted = 0
    failed_batches = 0

    try:
        for i in range(0, len(file_ids), PIKPAK_MAX_BATCH_SIZE):
            batch = file_ids[i:i + PIKPAK_MAX_BATCH_SIZE]
            batch_num = (i // PIKPAK_MAX_BATCH_SIZE) + 1

            try:
                async def _delete_files(ids=batch):
                    await service.client.delete_forever(ids)

                await service._execute_with_retry(_delete_files)
                total_deleted += len(batch)

                if num_batches > 1:
                    logger.info(
                        f"  Batch {batch_num}/{num_batches}: {len(batch)} files deleted")
            except Exception as batch_error:
                logger.error(f"  Batch {batch_num} failed: {batch_error}")
                failed_batches += 1

            # Add 5-second delay between batches to avoid rate limiting
            if i + PIKPAK_MAX_BATCH_SIZE < len(file_ids):
                await asyncio.sleep(5)

        if failed_batches == 0:
            logger.info(
                f"✓ Successfully deleted {total_deleted} files from PikPak")
        else:
            logger.warning(
                f"Deleted {total_deleted}/{len(file_ids)} files ({failed_batches} batch(es) failed)")

        return failed_batches == 0

    except Exception as e:
        logger.error(f"Critical error during file deletion: {e}")
        return False


def empty_supabase_public_actions(supabase: Client) -> int:
    """
    Empty the entire public_actions table (delete all rows).

    Args:
        supabase: Supabase client

    Returns:
        Number of deleted rows
    """
    logger.info("Cleaning up Supabase public_actions table...")

    try:
        # Delete all rows from public_actions table
        # Using gte with id >= 0 to match all rows
        response = supabase.table("public_actions") \
            .delete() \
            .gte("id", 0) \
            .execute()

        deleted_count = len(response.data) if response.data else 0
        logger.info(f"✓ Deleted {deleted_count} rows from Supabase")

        return deleted_count

    except Exception as e:
        logger.error(
            f"Failed to empty public_actions table: {e}", exc_info=True)
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

    # Track results for final summary
    cleanup_results = {
        "supabase_records": 0,
        "task_ids_found": 0,
        "file_ids_found": 0,
        "tasks_deleted": False,
        "files_deleted": False,
        "supabase_rows_deleted": 0,
        "errors": []
    }

    # Ensure client is logged in
    try:
        logger.info("Step 0: Ensuring PikPak client is logged in...")
        await pikpak_service.ensure_logged_in()
        logger.info("✓ PikPak login verified")
    except Exception as e:
        logger.error(f"✗ Login failed during cleanup: {e}")
        cleanup_results["errors"].append(f"Login failed: {e}")
        _print_cleanup_summary(cleanup_results, success=False)
        return

    # Step 1: Get task and file IDs from Supabase
    logger.info("-" * 40)
    logger.info("Step 1: Retrieving task and file IDs from Supabase...")
    try:
        task_ids, file_ids = get_task_and_file_ids_from_supabase(
            supabase_client)
        cleanup_results["task_ids_found"] = len(task_ids)
        cleanup_results["file_ids_found"] = len(file_ids)
    except Exception as e:
        logger.error(f"✗ Failed to retrieve IDs from Supabase: {e}")
        cleanup_results["errors"].append(f"Supabase fetch failed: {e}")
        _print_cleanup_summary(cleanup_results, success=False)
        return

    if not task_ids and not file_ids:
        logger.info(
            "✓ No tasks or files found in Supabase. Nothing to clean up.")
        _print_cleanup_summary(cleanup_results, success=True)
        return

    # Step 2: Delete tasks from PikPak
    logger.info("-" * 40)
    logger.info("Step 2: Deleting tasks from PikPak...")
    tasks_deleted = await delete_pikpak_tasks_in_batches(pikpak_service, task_ids)
    cleanup_results["tasks_deleted"] = tasks_deleted

    if not tasks_deleted:
        logger.error("✗ PikPak tasks deletion failed. Aborting cleanup.")
        cleanup_results["errors"].append("PikPak task deletion failed")
        _print_cleanup_summary(cleanup_results, success=False)
        return

    # Step 3: Delete files permanently from PikPak
    logger.info("-" * 40)
    logger.info("Step 3: Deleting files permanently from PikPak...")
    files_deleted = await delete_pikpak_files_permanently(pikpak_service, file_ids)
    cleanup_results["files_deleted"] = files_deleted

    if not files_deleted:
        logger.error("✗ PikPak files deletion failed. Aborting cleanup.")
        cleanup_results["errors"].append("PikPak file deletion failed")
        _print_cleanup_summary(cleanup_results, success=False)
        return

    # Step 4: Empty Supabase public_actions table
    logger.info("-" * 40)
    logger.info("Step 4: Emptying Supabase public_actions table...")
    try:
        deleted_count = empty_supabase_public_actions(supabase_client)
        cleanup_results["supabase_rows_deleted"] = deleted_count
        logger.info(
            f"✓ Supabase cleanup complete: {deleted_count} rows removed")
    except Exception as e:
        logger.error(f"✗ Failed to empty Supabase table: {e}")
        cleanup_results["errors"].append(f"Supabase cleanup failed: {e}")
        _print_cleanup_summary(cleanup_results, success=False)
        return

    _print_cleanup_summary(cleanup_results, success=True)


def _print_cleanup_summary(results: dict, success: bool):
    """Print a concise summary of the cleanup job"""
    logger.info("")
    logger.info("=" * 60)
    logger.info(f"CLEANUP JOB {'COMPLETED' if success else 'FAILED'}")
    logger.info("=" * 60)
    logger.info(
        f"Tasks processed: {results['task_ids_found']} | Files processed: {results['file_ids_found']}")
    logger.info(f"Supabase rows deleted: {results['supabase_rows_deleted']}")

    if results['errors']:
        logger.error(f"Errors: {', '.join(results['errors'])}")

    logger.info("=" * 60)
