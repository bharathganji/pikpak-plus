import json
from typing import Dict, Any, List, Optional
from .PikpakException import PikpakException
from .enums import DownloadStatus
from .settings import PIKPAK_API_HOST

class OfflineDownloadMixin:
    async def offline_download(
        self, file_url: str, parent_id: Optional[str] = None, name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        file_url: str - File URL
        parent_id: str - Parent folder id, default My Pack
        name: str - File name, default from URL
        Offline download
        """
        download_url = f"https://{PIKPAK_API_HOST}/drive/v1/files"
        download_data = {
            "kind": "drive#file",
            "name": name,
            "upload_type": "UPLOAD_TYPE_URL",
            "url": {"url": file_url},
            "folder_type": "DOWNLOAD" if not parent_id else "",
            "parent_id": parent_id,
        }
        result = await self._request_post(download_url, download_data)
        return result

    async def offline_list(
        self,
        size: int = 10000,
        next_page_token: Optional[str] = None,
        phase: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        size: int - Number of items per request
        next_page_token: str - Next page token
        phase: List[str] - Offline download task status
        Get offline download list
        """
        if phase is None:
            phase = ["PHASE_TYPE_RUNNING", "PHASE_TYPE_ERROR"]
        list_url = f"https://{PIKPAK_API_HOST}/drive/v1/tasks"
        list_data = {
            "type": "offline",
            "thumbnail_size": "SIZE_SMALL",
            "limit": size,
            "page_token": next_page_token,
            "filters": json.dumps({"phase": {"in": ",".join(phase)}}),
            "with": "reference_resource",
        }
        result = await self._request_get(list_url, list_data)
        return result

    async def offline_file_info(self, file_id: str) -> Dict[str, Any]:
        """
        file_id: str - File ID
        Get offline file info
        """
        url = f"https://{PIKPAK_API_HOST}/drive/v1/files/{file_id}"
        result = await self._request_get(url, {"thumbnail_size": "SIZE_LARGE"})
        return result

    async def offline_task_retry(self, task_id: str) -> Dict[str, Any]:
        """
        task_id: str - Task ID
        Retry offline task
        """
        list_url = f"https://{PIKPAK_API_HOST}/drive/v1/task"
        list_data = {
            "type": "offline",
            "create_type": "RETRY",
            "id": task_id,
        }
        try:
            result = await self._request_post(list_url, list_data)
            return result
        except Exception as e:
            raise PikpakException(f"Retry offline task failed: {task_id}. {e}")

    async def delete_tasks(
        self, task_ids: List[str], delete_files: bool = False
    ) -> None:
        """
        task_ids: List[str] - Task IDs to delete
        Delete tasks
        """
        delete_url = f"https://{PIKPAK_API_HOST}/drive/v1/tasks"
        params = {
            "task_ids": task_ids,
            "delete_files": delete_files,
        }
        try:
            await self._request_delete(delete_url, params=params)
        except Exception as e:
            raise PikpakException(f"Failing to delete tasks: {task_ids}. {e}")

    async def get_task_status(self, task_id: str, file_id: str) -> DownloadStatus:
        """
        task_id: str - Task ID
        file_id: str - File ID
        Get task status
        """
        try:
            infos = await self.offline_list()
            if infos and infos.get("tasks", []):
                for task in infos.get("tasks", []):
                    if task_id == task.get("id"):
                        return DownloadStatus.downloading
            file_info = await self.offline_file_info(file_id=file_id)
            if file_info:
                return DownloadStatus.done
            else:
                return DownloadStatus.not_found
        except PikpakException:
            return DownloadStatus.error
