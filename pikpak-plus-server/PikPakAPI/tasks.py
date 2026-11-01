"""
Offline download and background task management for PikPak API.
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any

from .client import BaseClient
from .constants import TASK_PHASE_MAP
from .enums import DownloadStatus
from .exceptions import PikpakException


class TasksMixin(BaseClient):
    """Mixin providing offline download task operations and polling."""

    async def offline_download(
        self,
        file_url: str,
        parent_id: str | None = None,
        name: str | None = None,
        folder_type: str | None = None,
    ) -> dict[str, Any]:
        """
        Starts an offline cloud download task (magnet, HTTP, HTTPS). Matches MCP 'add_link'.

        :param file_url: Link to download.
        :param parent_id: Target folder ID. Pass "" or "root" to download to root.
                          Defaults to "My Pack" when omitted.
        :param name: Optional custom file name.
        :param folder_type: Explicit folder type (e.g. "DOWNLOAD").
        """
        # Determine target folder and folder_type
        if folder_type is None:
            if parent_id in ("", "root"):
                # Explicitly targeting root
                resolved_folder_type = ""
                resolved_parent_id: str | None = ""
            elif parent_id:
                # Specific folder
                resolved_folder_type = ""
                resolved_parent_id = parent_id
            else:
                # Omitted: defaults to "DOWNLOAD" ("My Pack")
                resolved_folder_type = "DOWNLOAD"
                resolved_parent_id = None
        else:
            resolved_folder_type = folder_type
            resolved_parent_id = parent_id

        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files"
        data: dict[str, Any] = {
            "kind": "drive#file",
            "name": name,
            "upload_type": "UPLOAD_TYPE_URL",
            "url": {"url": file_url},
            "folder_type": resolved_folder_type,
            "parent_id": resolved_parent_id,
        }
        return await self._request_post(url, data=data)

    add_link = offline_download

    async def offline_list(
        self,
        size: int = 10000,
        next_page_token: str | None = None,
        phase: str | list[str] | None = None,
        task_type: str = "offline",
    ) -> dict[str, Any]:
        """
        Lists offline download tasks. Matches MCP 'task_ls'.

        :param size: Maximum number of tasks to return.
        :param next_page_token: Pagination token.
        :param phase: Task phases to filter by. Supports strings ("pending", "running",
                      "complete", "error", "all") or a list of phase strings.
        :param task_type: Task type filter (default "offline").
        """
        resolved_phases: list[str] = []
        if phase is None:
            resolved_phases = ["PHASE_TYPE_RUNNING", "PHASE_TYPE_ERROR"]
        elif isinstance(phase, str):
            if phase.lower() == "all":
                resolved_phases = list(TASK_PHASE_MAP.values())
            else:
                for p in phase.split(","):
                    p_clean = p.strip().lower()
                    resolved_phases.append(TASK_PHASE_MAP.get(p_clean, p.strip()))
        elif isinstance(phase, list):
            for p in phase:
                p_clean = p.strip().lower() if isinstance(p, str) else str(p)
                resolved_phases.append(TASK_PHASE_MAP.get(p_clean, p))

        list_url = f"https://{self.PIKPAK_API_HOST}/drive/v1/tasks"
        params: dict[str, Any] = {
            "type": task_type,
            "thumbnail_size": "SIZE_SMALL",
            "limit": size,
            "page_token": next_page_token,
            "with": "reference_resource",
        }
        if resolved_phases:
            # Deduplicate while preserving order
            unique_phases = list(dict.fromkeys(resolved_phases))
            params["filters"] = json.dumps({"phase": {"in": ",".join(unique_phases)}})

        return await self._request_get(list_url, params=params)

    task_ls = offline_list
    task_list = offline_list

    async def get_task_detail(self, task_id: str) -> dict[str, Any]:
        """Gets detailed status for a single task. Matches MCP 'task_get'."""
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/tasks/{task_id}"
        return await self._request_get(url)

    task_get = get_task_detail

    async def offline_task_retry(self, task_id: str) -> dict[str, Any]:
        """Retries a failed offline download task."""
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/task"
        payload: dict[str, str] = {
            "type": "offline",
            "create_type": "RETRY",
            "id": task_id,
        }
        return await self._request_post(url, data=payload)

    async def delete_tasks(
        self, task_ids: str | list[str], delete_files: bool = False
    ) -> None:
        """Deletes tasks by ID. Matches MCP 'task_rm'."""
        ids = [task_ids] if isinstance(task_ids, str) else list(task_ids)
        delete_url = f"https://{self.PIKPAK_API_HOST}/drive/v1/tasks"
        params: dict[str, Any] = {
            "task_ids": ids,
            "delete_files": delete_files,
        }
        await self._request_delete(delete_url, params=params)

    task_rm = delete_tasks

    async def get_task_status(self, task_id: str, file_id: str) -> DownloadStatus:
        """Checks whether an offline task is still running, complete, or failed."""
        try:
            infos = await self.offline_list()
            tasks_list: list[dict[str, Any]] = infos.get("tasks", [])
            for task in tasks_list:
                if task.get("id") == task_id:
                    phase = task.get("phase")
                    if phase == "PHASE_TYPE_COMPLETE":
                        return DownloadStatus.done
                    elif phase == "PHASE_TYPE_ERROR":
                        return DownloadStatus.error
                    return DownloadStatus.downloading

            file_info = await self._request_get(
                f"https://{self.PIKPAK_API_HOST}/drive/v1/files/{file_id}",
                params={"thumbnail_size": "SIZE_LARGE"},
            )
            if file_info and file_info.get("id"):
                return DownloadStatus.done
            return DownloadStatus.not_found
        except PikpakException:
            return DownloadStatus.error

    async def wait_for_task(
        self,
        task_id: str,
        timeout: int = 300,
        poll_interval: float = 2.0,
    ) -> dict[str, Any]:
        """
        Polls a task until it completes or errors out. Matches MCP 'task_watch' workflow.

        :param task_id: ID of the task to monitor.
        :param timeout: Maximum seconds to wait before raising TimeoutError.
        :param poll_interval: Sleep duration between status checks.
        :return: Completed task details dictionary.
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            detail = await self.get_task_detail(task_id)
            task_dict: dict[str, Any] = (
                detail.get("task", {})
                if isinstance(detail.get("task"), dict)
                else detail
            )
            phase = task_dict.get("phase") or detail.get("phase")

            if phase == "PHASE_TYPE_COMPLETE":
                return detail
            if phase == "PHASE_TYPE_ERROR":
                message = task_dict.get("message") or detail.get(
                    "message", "Task failed"
                )
                raise PikpakException(
                    f"Task {task_id} failed: {message}", details=detail
                )

            await asyncio.sleep(poll_interval)

        raise TimeoutError(f"Task {task_id} did not complete within {timeout} seconds.")
