"""
File and folder management operations for PikPak API.
"""

from __future__ import annotations

import json
from typing import Any

from .client import BaseClient
from .exceptions import PikpakException
from .models import FileInfo, FolderStats, format_bytes


class FilesMixin(BaseClient):
    """Mixin providing file/directory operations, searching, and path manipulation."""

    def _normalize_ids(self, ids: str | list[str]) -> list[str]:
        if isinstance(ids, str):
            return [ids]
        return list(ids)

    async def create_folder(
        self, name: str = "New Folder", parent_id: str | None = None
    ) -> dict[str, Any]:
        """Creates a new folder in the specified parent directory (or root)."""
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files"
        data: dict[str, str] = {
            "kind": "drive#folder",
            "name": name,
            "parent_id": parent_id or "",
        }
        return await self._request_post(url, data=data)

    mkdir = create_folder

    async def delete_to_trash(self, ids: str | list[str]) -> dict[str, Any]:
        """Moves files or folders to the trash."""
        id_list = self._normalize_ids(ids)
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files:batchTrash"
        return await self._request_post(url, data={"ids": id_list})

    rm = delete_to_trash
    trash = delete_to_trash

    async def untrash(self, ids: str | list[str]) -> dict[str, Any]:
        """Restores files or folders from the trash."""
        id_list = self._normalize_ids(ids)
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files:batchUntrash"
        return await self._request_post(url, data={"ids": id_list})

    async def delete_forever(self, ids: str | list[str]) -> dict[str, Any]:
        """Permanently deletes files or folders."""
        id_list = self._normalize_ids(ids)
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files:batchDelete"
        return await self._request_post(url, data={"ids": id_list})

    async def file_list(
        self,
        size: int = 100,
        parent_id: str | None = None,
        next_page_token: str | None = None,
        additional_filters: dict[str, Any] | None = None,
        kind: str | None = None,
        include_incomplete: bool = False,
        usage: str | None = None,
        raw: bool = False,
    ) -> dict[str, Any]:
        """
        Lists files and folders in a directory.

        :param size: Number of items per request.
        :param parent_id: Target folder ID (empty string or None for root).
        :param next_page_token: Pagination token.
        :param additional_filters: Custom dictionary of filters.
        :param kind: Filter by type ("file" or "folder").
        :param include_incomplete: If True, includes pending/incomplete files.
        :param usage: Usage mode (e.g. "ALL" to fetch video resolution and playback info).
        :param raw: If True, requests usage="ALL" for complete metadata.
        """
        default_filters: dict[str, Any] = {"trashed": {"eq": False}}
        if not include_incomplete:
            default_filters["phase"] = {"eq": "PHASE_TYPE_COMPLETE"}

        if kind:
            if kind == "folder":
                default_filters["kind"] = {"eq": "drive#folder"}
            elif kind == "file":
                default_filters["kind"] = {"eq": "drive#file"}

        if additional_filters:
            default_filters.update(additional_filters)

        list_url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files"
        params: dict[str, Any] = {
            "parent_id": parent_id or "",
            "thumbnail_size": "SIZE_MEDIUM",
            "limit": size,
            "with_audit": "true",
            "page_token": next_page_token,
            "filters": json.dumps(default_filters),
        }
        if raw or usage == "ALL":
            params["usage"] = "ALL"

        return await self._request_get(list_url, params=params)

    ls = file_list

    async def get_file(
        self, file_id: str, url_type: str = "all", raw: bool = False
    ) -> dict[str, Any]:
        """
        Retrieves detailed file or folder information. Matches MCP 'get' tool.

        :param file_id: ID of the file or folder.
        :param url_type: "download", "play", or "all".
        :param raw: If True, returns the raw API response unmodified.
        """
        # Captcha init for streaming/media access
        captcha_res = await self.captcha_init(action=f"GET:/drive/v1/files/{file_id}")
        cap_tok = captcha_res.get("captcha_token")
        self.captcha_token = str(cap_tok) if cap_tok else None

        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files/{file_id}"
        params: dict[str, str] = {"usage": "ALL", "thumbnail_size": "SIZE_LARGE"}

        try:
            res = await self._request_get(url, params=params)
        finally:
            self.captcha_token = None

        if raw:
            return res

        file_info = FileInfo.from_dict(res)
        formatted = file_info.to_mcp_format()

        # Filter URLs based on url_type
        if url_type == "download":
            formatted.pop("play_url", None)
        elif url_type == "play":
            formatted.pop("download_url", None)

        return formatted

    async def offline_file_info(self, file_id: str) -> dict[str, Any]:
        """Gets detailed information about a file (backward compatibility)."""
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files/{file_id}"
        return await self._request_get(url, params={"thumbnail_size": "SIZE_LARGE"})

    async def get_download_url(self, file_id: str) -> dict[str, Any]:
        """Gets file details including direct download link (backward compatibility)."""
        result = await self.captcha_init(action=f"GET:/drive/v1/files/{file_id}")
        cap_tok = result.get("captcha_token")
        self.captcha_token = str(cap_tok) if cap_tok else None
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files/{file_id}"
        try:
            return await self._request_get(url)
        finally:
            self.captcha_token = None

    async def get_playback_url(self, file_id: str) -> dict[str, Any]:
        """Gets playback details optimized for video streaming (backward compatibility)."""
        result = await self.captcha_init(action=f"GET:/drive/v1/files/{file_id}")
        cap_tok = result.get("captcha_token")
        self.captcha_token = str(cap_tok) if cap_tok else None
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files/{file_id}"
        try:
            return await self._request_get(url, params={"usage": "ALL"})
        finally:
            self.captcha_token = None

    async def file_rename(self, id: str, new_file_name: str) -> dict[str, Any]:
        """Renames a file or folder."""
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files/{id}"
        return await self._request_patch(url, data={"name": new_file_name})

    rename = file_rename

    async def file_batch_move(
        self, ids: list[str], to_parent_id: str | None = None
    ) -> dict[str, Any]:
        """Moves files or folders to a target parent folder."""
        to: dict[str, str] = {"parent_id": to_parent_id} if to_parent_id else {}
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files:batchMove"
        return await self._request_post(url, data={"ids": ids, "to": to})

    async def file_move(
        self, id: str, to_parent_id: str | None = None, target: str | None = None
    ) -> dict[str, Any]:
        """Moves a single file or folder."""
        dest = target if target is not None else to_parent_id
        return await self.file_batch_move(ids=[id], to_parent_id=dest)

    mv = file_move

    async def file_batch_copy(
        self, ids: list[str], to_parent_id: str | None = None
    ) -> dict[str, Any]:
        """Copies files or folders to a target parent folder."""
        to: dict[str, str] = {"parent_id": to_parent_id} if to_parent_id else {}
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files:batchCopy"
        return await self._request_post(url, data={"ids": ids, "to": to})

    async def file_copy(
        self, id: str, to_parent_id: str | None = None, target: str | None = None
    ) -> dict[str, Any]:
        """Copies a single file or folder."""
        dest = target if target is not None else to_parent_id
        return await self.file_batch_copy(ids=[id], to_parent_id=dest)

    cp = file_copy

    async def file_batch_star(self, ids: list[str]) -> dict[str, Any]:
        """Favorites (stars) multiple files or folders."""
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files:star"
        return await self._request_post(url, data={"ids": ids})

    async def file_star(self, id: str) -> dict[str, Any]:
        """Favorites (stars) a single file or folder."""
        return await self.file_batch_star(ids=[id])

    star = file_star

    async def file_batch_unstar(self, ids: list[str]) -> dict[str, Any]:
        """Removes favorite (star) from multiple files or folders."""
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/files:unstar"
        return await self._request_post(url, data={"ids": ids})

    async def file_unstar(self, id: str) -> dict[str, Any]:
        """Removes favorite (star) from a single file or folder."""
        return await self.file_batch_unstar(ids=[id])

    unstar = file_unstar

    async def file_star_list(
        self, size: int = 100, next_page_token: str | None = None
    ) -> dict[str, Any]:
        """Lists all starred files."""
        return await self.file_list(
            size=size,
            parent_id="*",
            next_page_token=next_page_token,
            additional_filters={"system_tag": {"in": "STAR"}},
        )

    async def file_search(
        self,
        keyword: str,
        kind: str | None = None,
        limit: int = 100,
        parent_id: str = "*",
    ) -> dict[str, Any]:
        """Searches for files across the drive or within a specific folder."""
        filters: dict[str, Any] = {
            "name": {"contains": keyword},
            "trashed": {"eq": False},
        }
        if kind:
            if kind == "folder":
                filters["kind"] = {"eq": "drive#folder"}
            elif kind == "file":
                filters["kind"] = {"eq": "drive#file"}

        return await self.file_list(
            size=limit, parent_id=parent_id, additional_filters=filters
        )

    async def get_folder_stats(self, folder_id: str) -> FolderStats:
        """Recursively calculates total size and file/folder counts for a folder."""
        total_size = 0
        file_count = 0
        folder_count = 0

        async def _walk(fid: str) -> None:
            nonlocal total_size, file_count, folder_count
            token: str | None = None
            while True:
                data = await self.file_list(parent_id=fid, next_page_token=token)
                files_list: list[dict[str, Any]] = data.get("files", [])
                for f in files_list:
                    if f.get("kind") == "drive#folder":
                        folder_count += 1
                        await _walk(str(f["id"]))
                    else:
                        file_count += 1
                        raw_sz = f.get("size", 0)
                        total_size += int(raw_sz) if str(raw_sz).isdigit() else 0

                next_tok = data.get("next_page_token")
                token = str(next_tok) if next_tok else None
                if not token:
                    break

        await _walk(folder_id)
        return FolderStats(
            total_size=total_size,
            total_size_formatted=format_bytes(total_size),
            file_count=file_count,
            folder_count=folder_count,
        )

    async def events(
        self, size: int = 100, next_page_token: str | None = None
    ) -> dict[str, Any]:
        """Lists recent user activity/events."""
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/events"
        params: dict[str, Any] = {
            "thumbnail_size": "SIZE_MEDIUM",
            "limit": size,
            "next_page_token": next_page_token,
        }
        return await self._request_get(url, params=params)

    async def path_to_id(self, path: str, create: bool = False) -> list[dict[str, str]]:
        """Converts a POSIX string path (e.g., /Movies/Action) into a list of file/folder IDs."""
        if not path or not path.strip():
            return []
        parts = [p.strip() for p in path.split("/") if p.strip()]

        multi_level_paths = ["/" + "/".join(parts[: i + 1]) for i in range(len(parts))]
        path_ids = [
            self._path_id_cache[p]
            for p in multi_level_paths
            if p in self._path_id_cache
        ]

        if len(path_ids) == len(parts):
            return path_ids

        count = len(path_ids)
        parent_id = str(path_ids[-1]["id"]) if path_ids else None
        next_page_token: str | None = None

        while count < len(parts):
            data = await self.file_list(
                parent_id=parent_id, next_page_token=next_page_token
            )
            target_record: dict[str, str] | None = None
            files_list: list[dict[str, Any]] = data.get("files", [])
            for f in files_list:
                curr_path = "/" + "/".join(parts[:count] + [str(f.get("name", ""))])
                file_type = "folder" if "folder" in str(f.get("kind", "")) else "file"
                rec: dict[str, str] = {
                    "id": str(f.get("id", "")),
                    "name": str(f.get("name", "")),
                    "file_type": file_type,
                }
                self._path_id_cache[curr_path] = rec
                if f.get("name") == parts[count]:
                    target_record = rec

            if target_record is not None:
                path_ids.append(target_record)
                count += 1
                parent_id = target_record["id"]
                next_page_token = None  # Fix Defect 1: Reset cursor on child descent
            elif (
                data.get("next_page_token")
                and data.get("next_page_token") != next_page_token
            ):
                next_tok = data.get("next_page_token")
                next_page_token = str(next_tok) if next_tok else None
            elif create:
                created = await self.create_folder(
                    name=parts[count], parent_id=parent_id
                )
                created_file = created.get("file")
                new_id = (
                    str(created_file.get("id"))
                    if isinstance(created_file, dict) and "id" in created_file
                    else str(created.get("id", ""))
                )
                rec = {"id": new_id, "name": parts[count], "file_type": "folder"}
                path_ids.append(rec)
                self._path_id_cache["/" + "/".join(parts[: count + 1])] = rec
                count += 1
                parent_id = new_id
                next_page_token = None  # Fix Defect 1: Reset cursor on child folder creation
            else:
                break

        return path_ids

    async def file_move_or_copy_by_path(
        self,
        from_path: list[str],
        to_path: str,
        move: bool = False,
        create: bool = False,
    ) -> dict[str, Any]:
        """Moves or copies files based on their string paths."""
        from_ids: list[str] = []
        for p in from_path:
            p_ids = await self.path_to_id(p)
            if p_ids and p_ids[-1].get("id"):
                from_ids.append(p_ids[-1]["id"])

        if not from_ids:
            raise PikpakException("Source files not found.")

        to_p_ids = await self.path_to_id(to_path, create=create)
        to_parent_id = to_p_ids[-1]["id"] if to_p_ids else None

        if move:
            return await self.file_batch_move(ids=from_ids, to_parent_id=to_parent_id)
        return await self.file_batch_copy(ids=from_ids, to_parent_id=to_parent_id)
