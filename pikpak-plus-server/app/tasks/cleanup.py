import asyncio
import logging
from typing import List, Tuple, Set, Dict
from supabase import Client

logger = logging.getLogger(__name__)

# Maximum number of tasks that can be deleted in one PikPak API call
PIKPAK_MAX_BATCH_SIZE = 100
# Supabase page size for pagination (matches default limit)
SUPABASE_PAGE_SIZE = 1000


def get_task_and_file_ids_from_supabase(supabase: Client) -> Tuple[List[str], List[str], dict, dict]:
    """
    Retrieve all task IDs and file IDs from the public_actions table.

    Returns:
        Tuple of (task_ids, file_ids, task_id_to_record_id, file_id_to_record_id)
        The mapping dicts allow clearing only the supabase records for successfully deleted items.
    """
    logger.info(
        "Fetching task and file IDs from Supabase public_actions table...")

    task_ids: Set[str] = set()
    file_ids: Set[str] = set()
    task_id_to_record_id: dict = {}
    file_id_to_record_id: dict = {}

    try:
        # Paginate through all "add" actions from public_actions table
        offset = 0
        total_fetched = 0

        while True:
            response = supabase.table("public_actions") \
                .select("id, data") \
                .eq("action", "add") \
                .range(offset, offset + SUPABASE_PAGE_SIZE - 1) \
                .execute()

            records = response.data or []
            if not records:
                break

            total_fetched += len(records)

            # Track records with missing IDs for warning
            missing_task_ids = 0
            missing_file_ids = 0

            for record in records:
                record_id = record.get("id")
                data = record.get("data", {})
                task_wrapper = data.get("task", {})

                if isinstance(task_wrapper, dict) and "task" in task_wrapper:
                    task_info = task_wrapper.get("task", {})
                    file_info = task_wrapper.get("file", {})
                else:
                    task_info = task_wrapper
                    file_info = task_wrapper

                task_id = task_info.get("id") if isinstance(
                    task_info, dict) else None
                file_id = file_info.get("id") if isinstance(
                    file_info, dict) else None

                if not file_id and isinstance(task_info, dict):
                    file_id = task_info.get("file_id")

                if task_id:
                    task_ids.add(task_id)
                    task_id_to_record_id[task_id] = record_id
                else:
                    missing_task_ids += 1

                if file_id:
                    file_ids.add(file_id)
                    file_id_to_record_id[file_id] = record_id
                else:
                    missing_file_ids += 1

            if missing_task_ids > 0:
                logger.warning(
                    f"{missing_task_ids} records missing task IDs in current page")
            if missing_file_ids > 0:
                logger.warning(
                    f"{missing_file_ids} records missing file IDs in current page")

            logger.info(f"Fetched page: {len(records)} records (total so far: {total_fetched})")

            offset += len(records)
            if len(records) < SUPABASE_PAGE_SIZE:
                break

        logger.info(f"Found {total_fetched} tasks in Supabase to process")

        if not task_ids and not file_ids:
            return [], [], {}, {}

        task_ids_list = list(task_ids)
        file_ids_list = list(file_ids)

        if total_fetched > 0:
            logger.info(
                f"Extracted {len(task_ids_list)} task IDs and {len(file_ids_list)} file IDs")

        return task_ids_list, file_ids_list, task_id_to_record_id, file_id_to_record_id

    except Exception as e:
        logger.error(
            f"Failed to fetch task/file IDs from Supabase: {e}", exc_info=True)
        raise


async def delete_pikpak_tasks_in_batches(service, task_ids: List[str]) -> Tuple[Set[str], Set[str]]:
    """
    Delete PikPak tasks in batches of PIKPAK_MAX_BATCH_SIZE.
    Adds 5-second delay between batches to avoid rate limiting.

    Args:
        service: PikPakService instance
        task_ids: List of task IDs to delete

    Returns:
        Tuple of (successfully_deleted_ids, failed_to_delete_ids)
    """
    if not task_ids:
        logger.info("No tasks to delete from PikPak")
        return set(), set()

    num_batches = (len(task_ids) + PIKPAK_MAX_BATCH_SIZE -
                   1) // PIKPAK_MAX_BATCH_SIZE
    logger.info(
        f"Deleting {len(task_ids)} tasks from PikPak in {num_batches} batch(es)")

    successfully_deleted: Set[str] = set()
    failed_to_delete: Set[str] = set()

    try:
        for i in range(0, len(task_ids), PIKPAK_MAX_BATCH_SIZE):
            batch = task_ids[i:i + PIKPAK_MAX_BATCH_SIZE]
            batch_num = (i // PIKPAK_MAX_BATCH_SIZE) + 1

            try:
                async def _delete_batch(ids=batch):
                    await service.client.delete_tasks(ids, delete_files=False)

                await service._execute_with_retry(_delete_batch)
                successfully_deleted.update(batch)

                if num_batches > 1:
                    logger.info(
                        f"  Batch {batch_num}/{num_batches}: {len(batch)} tasks deleted")
            except Exception as batch_error:
                logger.error(f"  Batch {batch_num} failed: {batch_error}")
                failed_to_delete.update(batch)

            # Add 5-second delay between batches to avoid rate limiting
            if i + PIKPAK_MAX_BATCH_SIZE < len(task_ids):
                await asyncio.sleep(5)

        if not failed_to_delete:
            logger.info(
                f"✓ Successfully deleted {len(successfully_deleted)} tasks from PikPak")
        else:
            logger.warning(
                f"Deleted {len(successfully_deleted)}/{len(task_ids)} tasks ({len(failed_to_delete)} failed)")

        return successfully_deleted, failed_to_delete

    except Exception as e:
        logger.error(f"Critical error during task deletion: {e}")
        # On critical error, all task IDs are marked as failed
        return set(), set(task_ids)


async def delete_pikpak_files_permanently(service, file_ids: List[str]) -> Tuple[Set[str], Set[str]]:
    """
    Delete PikPak files permanently (not to trash).
    Uses batchDelete endpoint. Adds 5-second delay between batches.

    Args:
        service: PikPakService instance
        file_ids: List of file IDs to delete permanently

    Returns:
        Tuple of (successfully_deleted_ids, failed_to_delete_ids)
    """
    if not file_ids:
        logger.info("No files to delete from PikPak")
        return set(), set()

    num_batches = (len(file_ids) + PIKPAK_MAX_BATCH_SIZE -
                   1) // PIKPAK_MAX_BATCH_SIZE
    logger.info(
        f"Deleting {len(file_ids)} files permanently from PikPak in {num_batches} batch(es)")

    successfully_deleted: Set[str] = set()
    failed_to_delete: Set[str] = set()

    try:
        for i in range(0, len(file_ids), PIKPAK_MAX_BATCH_SIZE):
            batch = file_ids[i:i + PIKPAK_MAX_BATCH_SIZE]
            batch_num = (i // PIKPAK_MAX_BATCH_SIZE) + 1

            try:
                async def _delete_files(ids=batch):
                    await service.client.delete_forever(ids)

                await service._execute_with_retry(_delete_files)
                successfully_deleted.update(batch)

                if num_batches > 1:
                    logger.info(
                        f"  Batch {batch_num}/{num_batches}: {len(batch)} files deleted")
            except Exception as batch_error:
                logger.error(f"  Batch {batch_num} failed: {batch_error}")
                failed_to_delete.update(batch)

            # Add 5-second delay between batches to avoid rate limiting
            if i + PIKPAK_MAX_BATCH_SIZE < len(file_ids):
                await asyncio.sleep(5)

        if not failed_to_delete:
            logger.info(
                f"✓ Successfully deleted {len(successfully_deleted)} files from PikPak")
        else:
            logger.warning(
                f"Deleted {len(successfully_deleted)}/{len(file_ids)} files ({len(failed_to_delete)} failed)")

        return successfully_deleted, failed_to_delete

    except Exception as e:
        logger.error(f"Critical error during file deletion: {e}")
        # On critical error, all file IDs are marked as failed
        return set(), set(file_ids)


def clear_supabase_records(supabase: Client, record_ids: Set[int]) -> int:
    """
    Clear specific records from the public_actions table by their IDs.

    Args:
        supabase: Supabase client
        record_ids: Set of record IDs to delete

    Returns:
        Number of deleted rows
    """
    if not record_ids:
        logger.info("No records to clear from Supabase")
        return 0

    logger.info(f"Clearing {len(record_ids)} records from Supabase...")

    try:
        # Delete specific records by their IDs
        response = supabase.table("public_actions") \
            .delete() \
            .in_("id", list(record_ids)) \
            .execute()

        deleted_count = len(response.data) if response.data else 0
        logger.info(f"✓ Cleared {deleted_count} records from Supabase")

        return deleted_count

    except Exception as e:
        logger.error(
            f"Failed to clear records from Supabase: {e}", exc_info=True)
        raise


async def run_cleanup(pikpak_service, supabase_client: Client):
    """
    Orchestrates the cleanup process:
    1. Get all task IDs and file IDs from Supabase public_actions table
    2. Delete tasks from PikPak (in batches of 100)
    3. Delete files permanently from PikPak (not trash)
    4. Clear Supabase records for successfully deleted items only

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
        "tasks_deleted_success": set(),
        "tasks_deleted_failed": set(),
        "files_deleted_success": set(),
        "files_deleted_failed": set(),
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
        _print_cleanup_summary(cleanup_results)
        return

    # Step 1: Get task and file IDs from Supabase
    logger.info("-" * 40)
    logger.info("Step 1: Retrieving task and file IDs from Supabase...")
    try:
        task_ids, file_ids, task_id_to_record_id, file_id_to_record_id = get_task_and_file_ids_from_supabase(
            supabase_client)
        cleanup_results["task_ids_found"] = len(task_ids)
        cleanup_results["file_ids_found"] = len(file_ids)
    except Exception as e:
        logger.error(f"✗ Failed to retrieve IDs from Supabase: {e}")
        cleanup_results["errors"].append(f"Supabase fetch failed: {e}")
        _print_cleanup_summary(cleanup_results)
        return

    if not task_ids and not file_ids:
        logger.info(
            "✓ No tasks or files found in Supabase. Nothing to clean up.")
        _print_cleanup_summary(cleanup_results)
        return

    # Step 2: Delete tasks from PikPak
    logger.info("-" * 40)
    logger.info("Step 2: Deleting tasks from PikPak...")
    tasks_success, tasks_failed = await delete_pikpak_tasks_in_batches(pikpak_service, task_ids)
    cleanup_results["tasks_deleted_success"] = tasks_success
    cleanup_results["tasks_deleted_failed"] = tasks_failed

    # Step 3: Delete files permanently from PikPak
    logger.info("-" * 40)
    logger.info("Step 3: Deleting files permanently from PikPak...")
    files_success, files_failed = await delete_pikpak_files_permanently(pikpak_service, file_ids)
    cleanup_results["files_deleted_success"] = files_success
    cleanup_results["files_deleted_failed"] = files_failed

    # Step 4: Clear Supabase records for successfully deleted items only
    logger.info("-" * 40)
    logger.info("Step 4: Clearing Supabase records for successfully deleted items...")

    # Get record IDs to clear based on successfully deleted task and file IDs
    record_ids_to_clear: Set[int] = set()
    for task_id in tasks_success:
        record_id = task_id_to_record_id.get(task_id)
        if record_id is not None:
            record_ids_to_clear.add(record_id)
    for file_id in files_success:
        record_id = file_id_to_record_id.get(file_id)
        if record_id is not None:
            record_ids_to_clear.add(record_id)

    try:
        deleted_count = clear_supabase_records(supabase_client, record_ids_to_clear)
        cleanup_results["supabase_rows_deleted"] = deleted_count
        logger.info(
            f"✓ Supabase cleanup complete: {deleted_count} rows removed")
    except Exception as e:
        logger.error(f"✗ Failed to clear Supabase records: {e}")
        cleanup_results["errors"].append(f"Supabase cleanup failed: {e}")
        _print_cleanup_summary(cleanup_results)
        return

    _print_cleanup_summary(cleanup_results)


def _print_cleanup_summary(results: dict):
    """Print a concise summary of the cleanup job"""
    logger.info("")
    logger.info("=" * 60)

    has_failures = bool(results.get("tasks_deleted_failed") or results.get("files_deleted_failed"))
    status = "COMPLETED WITH FAILURES" if has_failures else "COMPLETED"
    logger.info(f"CLEANUP JOB {status}")
    logger.info("=" * 60)

    logger.info(
        f"Tasks processed: {results['task_ids_found']} | Files processed: {results['file_ids_found']}")

    tasks_success = results.get("tasks_deleted_success", set())
    tasks_failed = results.get("tasks_deleted_failed", set())
    files_success = results.get("files_deleted_success", set())
    files_failed = results.get("files_deleted_failed", set())

    if tasks_success or tasks_failed or files_success or files_failed:
        logger.info(
            f"Tasks deleted: {len(tasks_success)} | Tasks failed: {len(tasks_failed)}")
        logger.info(
            f"Files deleted: {len(files_success)} | Files failed: {len(files_failed)}")

    logger.info(f"Supabase rows deleted: {results['supabase_rows_deleted']}")

    if tasks_failed:
        failed_id_list = ", ".join(sorted(tasks_failed)) if len(tasks_failed) <= 20 else ", ".join(sorted(tasks_failed)[:20]) + f" ... and {len(tasks_failed) - 20} more"
        logger.warning(f"Failed task IDs: {failed_id_list}")

    if files_failed:
        failed_id_list = ", ".join(sorted(files_failed)) if len(files_failed) <= 20 else ", ".join(sorted(files_failed)[:20]) + f" ... and {len(files_failed) - 20} more"
        logger.warning(f"Failed file IDs: {failed_id_list}")

    if results['errors']:
        logger.error(f"Errors: {', '.join(results['errors'])}")

    logger.info("=" * 60)
