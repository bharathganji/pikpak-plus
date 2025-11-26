import json
from typing import Dict, Any, List, Optional
from .PikpakException import PikpakException
from .settings import PIKPAK_API_HOST

class FileManagerMixin:
    def __init__(self):
        self._path_id_cache: Dict[str, Any] = {}

    async def create_folder(
        self, name: str = "新建文件夹", parent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        name: str - Folder name
        parent_id: str - Parent folder id, default create in root directory
        """
        url = f"https://{PIKPAK_API_HOST}/drive/v1/files"
        data = {
            "kind": "drive#folder",
            "name": name,
            "parent_id": parent_id,
        }
        result = await self._request_post(url, data)
        return result

    async def delete_to_trash(self, ids: List[str]) -> Dict[str, Any]:
        """
        ids: List[str] - List of folder/file ids
        Move folders/files to trash
        """
        url = f"https://{PIKPAK_API_HOST}/drive/v1/files:batchTrash"
        data = {
            "ids": ids,
        }
        result = await self._request_post(url, data)
        return result

    async def untrash(self, ids: List[str]) -> Dict[str, Any]:
        """
        ids: List[str] - List of folder/file ids
        Restore folders/files from trash
        """
        url = f"https://{PIKPAK_API_HOST}/drive/v1/files:batchUntrash"
        data = {
            "ids": ids,
        }
        result = await self._request_post(url, data)
        return result

    async def delete_forever(self, ids: List[str]) -> Dict[str, Any]:
        """
        ids: List[str] - List of folder/file ids
        Delete folders/files forever, use with caution
        """
        url = f"https://{PIKPAK_API_HOST}/drive/v1/files:batchDelete"
        data = {
            "ids": ids,
        }
        result = await self._request_post(url, data)
        return result

    async def file_list(
        self,
        size: int = 100,
        parent_id: Optional[str] = None,
        next_page_token: Optional[str] = None,
        additional_filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        size: int - Number of items per request
        parent_id: str - Parent folder id, default list root directory
        next_page_token: str - Next page token
        additional_filters: Dict[str, Any] - Additional filters
        """
        default_filters = {
            "trashed": {"eq": False},
            "phase": {"eq": "PHASE_TYPE_COMPLETE"},
        }
        if additional_filters:
            default_filters.update(additional_filters)
        list_url = f"https://{PIKPAK_API_HOST}/drive/v1/files"
        list_data = {
            "parent_id": parent_id,
            "thumbnail_size": "SIZE_MEDIUM",
            "limit": size,
            "with_audit": "true",
            "page_token": next_page_token,
            "filters": json.dumps(default_filters),
        }
        result = await self._request_get(list_url, list_data)
        return result

    async def events(
        self, size: int = 100, next_page_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        size: int - Number of items per request
        next_page_token: str - Next page token
        Get recent events list
        """
        list_url = f"https://{PIKPAK_API_HOST}/drive/v1/events"
        list_data = {
            "thumbnail_size": "SIZE_MEDIUM",
            "limit": size,
            "next_page_token": next_page_token,
        }
        result = await self._request_get(list_url, list_data)
        return result

    async def path_to_id(self, path: str, create: bool = False) -> List[Dict[str, str]]:
        """
        path: str - Path
        create: bool - Whether to create non-existent folders
        Convert path like /path/a/b to folder ids
        """
        if not path or len(path) <= 0:
            return []
        paths = path.split("/")
        paths = [p.strip() for p in paths if len(p) > 0]
        multi_level_paths = ["/" + "/".join(paths[: i + 1]) for i in range(len(paths))]
        path_ids = [
            self._path_id_cache[p]
            for p in multi_level_paths
            if p in self._path_id_cache
        ]
        hit_cnt = len(path_ids)
        if hit_cnt == len(paths):
            return path_ids
        elif hit_cnt == 0:
            count = 0
            parent_id = None
        else:
            count = hit_cnt
            parent_id = path_ids[-1]["id"]

        next_page_token = None
        while count < len(paths):
            data = await self.file_list(
                parent_id=parent_id, next_page_token=next_page_token
            )
            record_of_target_path = None
            for f in data.get("files", []):
                current_path = "/" + "/".join(paths[:count] + [f.get("name")])
                file_type = (
                    "folder" if f.get("kind", "").find("folder") != -1 else "file"
                )
                record = {
                    "id": f.get("id"),
                    "name": f.get("name"),
                    "file_type": file_type,
                }
                self._path_id_cache[current_path] = record
                if f.get("name") == paths[count]:
                    record_of_target_path = record
            if record_of_target_path is not None:
                path_ids.append(record_of_target_path)
                count += 1
                parent_id = record_of_target_path["id"]
            elif data.get("next_page_token") and (
                not next_page_token or next_page_token != data.get("next_page_token")
            ):
                next_page_token = data.get("next_page_token")
            elif create:
                data = await self.create_folder(name=paths[count], parent_id=parent_id)
                file_id = data.get("file").get("id")
                record = {
                    "id": file_id,
                    "name": paths[count],
                    "file_type": "folder",
                }
                path_ids.append(record)
                current_path = "/" + "/".join(paths[: count + 1])
                self._path_id_cache[current_path] = record
                count += 1
                parent_id = file_id
            else:
                break
        return path_ids

    async def file_batch_move(
        self,
        ids: List[str],
        to_parent_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        ids: List[str] - List of file ids
        to_parent_id: str - Target folder id, default root directory
        Batch move files
        """
        to = (
            {
                "parent_id": to_parent_id,
            }
            if to_parent_id
            else {}
        )
        result = await self._request_post(
            url=f"https://{PIKPAK_API_HOST}/drive/v1/files:batchMove",
            data={
                "ids": ids,
                "to": to,
            },
        )
        return result

    async def file_batch_copy(
        self,
        ids: List[str],
        to_parent_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        ids: List[str] - List of file ids
        to_parent_id: str - Target folder id, default root directory
        Batch copy files
        """
        to = (
            {
                "parent_id": to_parent_id,
            }
            if to_parent_id
            else {}
        )
        result = await self._request_post(
            url=f"https://{PIKPAK_API_HOST}/drive/v1/files:batchCopy",
            data={
                "ids": ids,
                "to": to,
            },
        )
        return result

    async def file_move_or_copy_by_path(
        self,
        from_path: List[str],
        to_path: str,
        move: bool = False,
        create: bool = False,
    ) -> Dict[str, Any]:
        """
        from_path: List[str] - List of source file paths
        to_path: str - Target path
        move: bool - Whether to move, default copy
        create: bool - Whether to create non-existent folders
        Move or copy files by path
        """
        from_ids: List[str] = []
        for path in from_path:
            if path_ids := await self.path_to_id(path):
                if file_id := path_ids[-1].get("id"):
                    from_ids.append(file_id)
        if not from_ids:
            raise PikpakException("Source files not found")
        to_path_ids = await self.path_to_id(to_path, create=create)
        if to_path_ids:
            to_parent_id = to_path_ids[-1].get("id")
        else:
            to_parent_id = None
        if move:
            result = await self.file_batch_move(ids=from_ids, to_parent_id=to_parent_id)
        else:
            result = await self.file_batch_copy(ids=from_ids, to_parent_id=to_parent_id)
        return result

    async def get_download_url(self, file_id: str) -> Dict[str, Any]:
        """
        file_id: str - File ID
        Returns the file details data.
        """
        result = await self.captcha_init(
            action=f"GET:/drive/v1/files/{file_id}",
        )
        self.captcha_token = result.get("captcha_token")
        result = await self._request_get(
            url=f"https://{PIKPAK_API_HOST}/drive/v1/files/{file_id}?",
        )
        self.captcha_token = None
        return result

    async def file_rename(self, id: str, new_file_name: str) -> Dict[str, Any]:
        """
        id: str - File ID
        new_file_name: str - New file name
        Rename file
        """
        data = {
            "name": new_file_name,
        }
        result = await self._request_patch(
            url=f"https://{PIKPAK_API_HOST}/drive/v1/files/{id}",
            data=data,
        )
        return result

    async def file_batch_star(
        self,
        ids: List[str],
    ) -> Dict[str, Any]:
        """
        ids: List[str] - List of file ids
        Batch star files
        """
        data = {
            "ids": ids,
        }
        result = await self._request_post(
            url=f"https://{PIKPAK_API_HOST}/drive/v1/files:star",
            data=data,
        )
        return result

    async def file_batch_unstar(
        self,
        ids: List[str],
    ) -> Dict[str, Any]:
        """
        ids: List[str] - List of file ids
        Batch unstar files
        """
        data = {
            "ids": ids,
        }
        result = await self._request_post(
            url=f"https://{PIKPAK_API_HOST}/drive/v1/files:unstar",
            data=data,
        )
        return result

    async def file_star_list(
        self,
        size: int = 100,
        next_page_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        size: int - Number of items per request
        next_page_token: str - Next page token
        Get starred file list
        """
        additional_filters = {"system_tag": {"in": "STAR"}}
        result = await self.file_list(
            size=size,
            parent_id="*",
            next_page_token=next_page_token,
            additional_filters=additional_filters,
        )
        return result

    async def file_batch_share(
        self,
        ids: List[str],
        need_password: Optional[bool] = False,
        expiration_days: Optional[int] = -1,
    ) -> Dict[str, Any]:
        """
        ids: List[str] - List of file ids
        need_password: Optional[bool] - Whether password is required
        expiration_days: Optional[int] - Expiration days
        Batch share files
        """
        data = {
            "file_ids": ids,
            "share_to": "encryptedlink" if need_password else "publiclink",
            "expiration_days": expiration_days,
            "pass_code_option": "REQUIRED" if need_password else "NOT_REQUIRED",
        }
        result = await self._request_post(
            url=f"https://{PIKPAK_API_HOST}/drive/v1/share",
            data=data,
        )
        return result

    async def get_quota_info(self) -> Dict[str, Any]:
        """
        Get quota info
        """
        result = await self._request_get(
            url=f"https://{PIKPAK_API_HOST}/drive/v1/about",
        )
        return result

    async def get_invite_code(self):
        result = await self._request_get(
            url=f"https://{PIKPAK_API_HOST}/vip/v1/activity/inviteCode",
        )
        return result["code"]

    async def vip_info(self):
        result = await self._request_get(
            url=f"https://{PIKPAK_API_HOST}/drive/v1/privilege/vip",
        )
        return result

    async def get_transfer_quota(self) -> Dict[str, Any]:
        """
        Get transfer quota
        """
        url = f"https://{PIKPAK_API_HOST}/vip/v1/quantity/list?type=transfer"
        result = await self._request_get(url)
        return result

    async def get_share_folder(
        self, share_id: str, pass_code_token: str, parent_id: str = None
    ) -> Dict[str, Any]:
        """
        Get content of shared folder
        """
        data = {
            "limit": "100",
            "thumbnail_size": "SIZE_LARGE",
            "order": "6",
            "share_id": share_id,
            "parent_id": parent_id,
            "pass_code_token": pass_code_token,
        }
        url = f"https://{PIKPAK_API_HOST}/drive/v1/share/detail"
        return await self._request_get(url, params=data)

    async def get_share_info(
        self, share_link: str, pass_code: str = None
    ) -> Dict[str, Any]:
        """
        Get share info
        """
        import re
        match = re.search(r"/s/([^/]+)(?:.*/([^/]+))?$", share_link)
        if match:
            share_id = match.group(1)
            parent_id = match.group(2) if match.group(2) else None
        else:
            raise ValueError("Share Link Is Not Right")

        data = {
            "limit": "100",
            "thumbnail_size": "SIZE_LARGE",
            "order": "3",
            "share_id": share_id,
            "parent_id": parent_id,
            "pass_code": pass_code,
        }
        url = f"https://{PIKPAK_API_HOST}/drive/v1/share"
        return await self._request_get(url, params=data)

    async def restore(
        self, share_id: str, pass_code_token: str, file_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Restore shared files
        """
        data = {
            "share_id": share_id,
            "pass_code_token": pass_code_token,
            "file_ids": file_ids,
        }
        result = await self._request_post(
            url=f"https://{PIKPAK_API_HOST}/drive/v1/share/restore", data=data
        )
        return result
