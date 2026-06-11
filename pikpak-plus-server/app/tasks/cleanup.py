import asyncio
import logging
from typing import List, Tuple, Set
from supabase import Client

logger = logging.getLogger(__name__)

# Maximum number of tasks that can be deleted in one PikPak API call
PIKPAK_MAX_BATCH_SIZE = 100
# Supabase page size for pagination (matches default limit)
SUPABASE_PAGE_SIZE = 1000


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

            missing_task_ids = 0
            missing_file_ids = 0

            for record in records:
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
                else:
                    missing_task_ids += 1

                if file_id:
                    file_ids.add(file_id)
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
            return [], []

        task_ids_list = list(task_ids)
        file_ids_list = list(file_ids)

        if total_fetched > 0:
            logger.info(
                f"Extracted {len(task_ids_list)} task IDs and {len(file_ids_list)} file IDs")

        return task_ids_list, file_ids_list

    except Exception as e:
        logger.error(
            f"Failed to fetch task/file IDs from Supabase: {e}", exc_info=True)
        raise


async def delete_pikpak_tasks_in_batches(service, task_ids: List[str]) -> Tuple[Set[str], Set[str]]:
    """
    Delete PikPak tasks in batches of PIKPAK_MAX_BATCH_SIZE.
    Adds 5-second delay between batches to avoid rate limiting.

    Returns:
        Tuple of (successfully_deleted: Set[str], failed_to_delete: Set[str])
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

            if i + PIKPAK_MAX_BATCH_SIZE < len(task_ids):
                await asyncio.sleep(5)

        if not failed_to_delete:
            logger.info(
                f"Successfully deleted {len(successfully_deleted)} tasks from PikPak")
        else:
            logger.warning(
                f"Deleted {len(successfully_deleted)}/{len(task_ids)} tasks "
                f"({len(failed_to_delete)} batch(es) failed)")

        return successfully_deleted, failed_to_delete

    except Exception as e:
        logger.error(f"Critical error during task deletion: {e}")
        return successfully_deleted, failed_to_delete


async def delete_pikpak_files_permanently(service, file_ids: List[str]) -> Tuple[Set[str], Set[str]]:
    """
    Delete PikPak files permanently (not to trash).
    Uses batchDelete endpoint. Adds 5-second delay between batches.

    Returns:
        Tuple of (successfully_deleted: Set[str], failed_to_delete: Set[str])
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

            if i + PIKPAK_MAX_BATCH_SIZE < len(file_ids):
                await asyncio.sleep(5)

        if not failed_to_delete:
            logger.info(
                f"Successfully deleted {len(successfully_deleted)} files from PikPak")
        else:
            logger.warning(
                f"Deleted {len(successfully_deleted)}/{len(file_ids)} files "
                f"({len(failed_to_delete)} batch(es) failed)")

        return successfully_deleted, failed_to_delete

    except Exception as e:
        logger.error(f"Critical error during file deletion: {e}")
        return successfully_deleted, failed_to_delete


async def delete_single_id_with_retry(service, record_id: str, item_type: str) -> bool:
    """
    Retry deleting a single task or file with exponential backoff.
    Used in the final retry pass.

    Returns:
        True if deletion succeeded, False otherwise
    """
    backoffs = [3, 5, 10]

    for attempt, delay in enumerate(backoffs, 1):
        try:
            if item_type == "task":
                async def _delete_task():
                    await service.client.delete_tasks([record_id], delete_files=False)
                await service._execute_with_retry(_delete_task)
            else:
                async def _delete_file():
                    await service.client.delete_forever([record_id])
                await service._execute_with_retry(_delete_file)

            logger.info(f"  Retry: {item_type} '{record_id}' deleted on attempt {attempt}")
            return True
        except Exception as e:
            logger.warning(
                f"  Retry: {item_type} '{record_id}' attempt {attempt}/{len(backoffs)} failed: {e}"
            )
            if attempt < len(backoffs):
                await asyncio.sleep(delay)

    return False


def delete_supabase_records_for_ids(supabase: Client, ids: List[str]) -> int:
    """
    Delete rows from the Supabase public_actions table where the PikPak task_id
    or file_id matches one of the given IDs.

    Args:
        supabase: Supabase client
        ids: List of PikPak task or file IDs that were successfully deleted

    Returns:
        Number of deleted rows
    """
    if not ids:
        return 0

    try:
        offset = 0
        total_deleted = 0

        while True:
            page = supabase.table("public_actions") \
                .select("id, data") \
                .eq("action", "add") \
                .range(offset, offset + SUPABASE_PAGE_SIZE - 1) \
                .execute()

            records = page.data or []
            if not records:
                break

            ids_to_delete = []
            for record in records:
                data = record.get("data", {})
                task_wrapper = data.get("task", {})

                if isinstance(task_wrapper, dict) and "task" in task_wrapper:
                    task_info = task_wrapper.get("task", {})
                    file_info = task_wrapper.get("file", {})
                else:
                    task_info = task_wrapper
                    file_info = task_wrapper

                record_task_id = task_info.get("id") if isinstance(
                    task_info, dict) else None
                record_file_id = file_info.get("id") if isinstance(
                    file_info, dict) else None

                if not record_file_id and isinstance(task_info, dict):
                    record_file_id = task_info.get("file_id")

                if record_task_id in ids or record_file_id in ids:
                    ids_to_delete.append(record.get("id"))

            for record_id in ids_to_delete:
                result = (
                    supabase.table("public_actions")
                    .delete()
                    .eq("id", record_id)
                    .execute()
                )
                if result.data:
                    total_deleted += len(result.data)

            offset += len(records)
            if len(records) < SUPABASE_PAGE_SIZE:
                break

        logger.info(f"Deleted {total_deleted} rows from Supabase")
        return total_deleted

    except Exception as e:
        logger.error(
            f"Failed to delete records from public_actions table: {e}", exc_info=True)
        raise


async def run_cleanup(pikpak_service, supabase_client: Client):
    """
    Orchestrates the cleanup process:
    1. Get all task IDs and file IDs from Supabase public_actions table
    2. Delete tasks from PikPak (in batches)
    3. Delete files permanently from PikPak
    4. Retry failed IDs individually with exponential backoff
    5. Delete ONLY Supabase rows for successfully deleted IDs.
       Failed IDs remain for next run.

    Args:
        pikpak_service: PikPakService instance
        supabase_client: Supabase client
    """
    logger.info("=" * 60)
    logger.info("CLEANUP JOB STARTED")
    logger.info("=" * 60)

    cleanup_results = {
        "supabase_records": 0,
        "task_ids_found": 0,
        "file_ids_found": 0,
        "tasks_succeeded": 0,
        "tasks_failed": 0,
        "files_succeeded": 0,
        "files_failed": 0,
        "supabase_rows_deleted": 0,
        "errors": []
    }

    try:
        logger.info("Step 0: Ensuring PikPak client is logged in...")
        await pikpak_service.ensure_logged_in()
        logger.info("PikPak login verified")
    except Exception as e:
        logger.error(f"Login failed during cleanup: {e}")
        cleanup_results["errors"].append(f"Login failed: {e}")
        _print_cleanup_summary(cleanup_results, success=False)
        return

    logger.info("-" * 40)
    logger.info("Step 1: Retrieving task and file IDs from Supabase...")
    try:
        task_ids, file_ids = get_task_and_file_ids_from_supabase(
            supabase_client)
        cleanup_results["task_ids_found"] = len(task_ids)
        cleanup_results["file_ids_found"] = len(file_ids)
    except Exception as e:
        logger.error(f"Failed to retrieve IDs from Supabase: {e}")
        cleanup_results["errors"].append(f"Supabase fetch failed: {e}")
        _print_cleanup_summary(cleanup_results, success=False)
        return

    if not task_ids and not file_ids:
        logger.info(
            "No tasks or files found in Supabase. Nothing to clean up.")
        _print_cleanup_summary(cleanup_results, success=True)
        return

    logger.info("-" * 40)
    logger.info("Step 2: Deleting tasks from PikPak...")
    tasks_succeeded, tasks_failed = await delete_pikpak_tasks_in_batches(
        pikpak_service, task_ids
    )
    cleanup_results["tasks_succeeded"] = len(tasks_succeeded)
    cleanup_results["tasks_failed"] = len(tasks_failed)

    logger.info("-" * 40)
    logger.info("Step 3: Deleting files permanently from PikPak...")
    files_succeeded, files_failed = await delete_pikpak_files_permanently(
        pikpak_service, file_ids
    )
    cleanup_results["files_succeeded"] = len(files_succeeded)
    cleanup_results["files_failed"] = len(files_failed)

    if tasks_failed or files_failed:
        logger.info("-" * 40)
        logger.info("Step 3.5: Retrying failed IDs individually...")

        retried_tasks: Set[str] = set()
        retried_files: Set[str] = set()

        if tasks_failed:
            retried_tasks = set(tasks_failed)
            for task_id in list(tasks_failed):
                if await delete_single_id_with_retry(pikpak_service, task_id, "task"):
                    tasks_succeeded.add(task_id)
                    retried_tasks.discard(task_id)

        if files_failed:
            retried_files = set(files_failed)
            for file_id in list(files_failed):
                if await delete_single_id_with_retry(pikpak_service, file_id, "file"):
                    files_succeeded.add(file_id)
                    retried_files.discard(file_id)

        cleanup_results["tasks_succeeded"] = len(tasks_succeeded)
        cleanup_results["tasks_failed"] = len(tasks_failed - tasks_succeeded)
        cleanup_results["files_succeeded"] = len(files_succeeded)
        cleanup_results["files_failed"] = len(files_failed - files_succeeded)

        if retried_tasks or retried_files:
            failed_items = []
            if retried_tasks:
                failed_items.append(f"{len(retried_tasks)} task(s)")
            if retried_files:
                failed_items.append(f"{len(retried_files)} file(s)")
            cleanup_results["errors"].append(
                f"Final retry pass failed for: {', '.join(failed_items)} "
                f"(will be retried next run)"
            )

    if not tasks_succeeded and not files_succeeded:
        logger.error("No tasks or files were successfully deleted. Aborting cleanup.")
        _print_cleanup_summary(cleanup_results, success=False)
        return

    all_succeeded_ids = tasks_succeeded | files_succeeded
    all_failed_ids = (tasks_failed - tasks_succeeded) | (files_failed - files_succeeded)

    if not all_succeeded_ids:
        logger.error("No successfully deleted IDs to clear from Supabase. Aborting.")
        _print_cleanup_summary(cleanup_results, success=False)
        return

    logger.info("-" * 40)
    logger.info(f"Step 4: Cleaning up {len(all_succeeded_ids)} successfully deleted records from Supabase...")
    try:
        deleted_count = delete_supabase_records_for_ids(supabase_client, list(all_succeeded_ids))
        cleanup_results["supabase_rows_deleted"] = deleted_count
        logger.info(
            f"Supabase cleanup complete: {deleted_count} rows removed. "
            f"{len(all_failed_ids)} failed ID(s) remain for next run.")
    except Exception as e:
        logger.error(f"Failed to clean up Supabase table: {e}")
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
        f"Tasks processed: {results['task_ids_found']} ({results.get('tasks_succeeded', 0)} succeeded, "
        f"{results.get('tasks_failed', 0)} failed) | "
        f"Files processed: {results['file_ids_found']} ({results.get('files_succeeded', 0)} succeeded, "
        f"{results.get('files_failed', 0)} failed)")
    logger.info(f"Supabase rows deleted: {results['supabase_rows_deleted']}")

    if results['errors']:
        logger.error(f"Errors: {', '.join(results['errors'])}")

    logger.info("=" * 60)
