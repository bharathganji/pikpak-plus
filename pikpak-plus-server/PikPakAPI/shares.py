"""
Share link generation, extraction, and restoration for PikPak API.
"""

from __future__ import annotations

import re
from typing import Any

from .client import BaseClient
from .exceptions import PikpakException


class SharesMixin(BaseClient):
    """Mixin providing share link creation, folder browsing, restoration, and history."""

    async def file_batch_share(
        self,
        ids: str | list[str],
        need_password: bool = False,
        expiration_days: int = -1,
        password: str | None = None,
        title: str | None = None,
    ) -> dict[str, Any]:
        """
        Creates a public or password-protected share link for files/folders. Matches MCP 'share_create'.

        :param ids: List of file/folder IDs to share.
        :param need_password: If True, generates a password-protected link.
        :param expiration_days: Expiration in days (-1 for never).
        :param password: Custom password string (overrides random password).
        :param title: Optional custom title for the share.
        """
        file_ids = [ids] if isinstance(ids, str) else list(ids)
        is_encrypted = need_password or bool(password)

        payload: dict[str, Any] = {
            "file_ids": file_ids,
            "share_to": "encryptedlink" if is_encrypted else "publiclink",
            "expiration_days": expiration_days,
            "pass_code_option": "REQUIRED" if is_encrypted else "NOT_REQUIRED",
        }
        if password:
            payload["pass_code"] = password
        if title:
            payload["title"] = title

        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/share"
        return await self._request_post(url, data=payload)

    share_create = file_batch_share

    async def share_list(
        self,
        limit: int = 20,
        next_page_token: str | None = None,
    ) -> dict[str, Any]:
        """Lists active shares created by the authenticated user. Matches MCP 'share_ls'."""
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/share/list"
        params: dict[str, Any] = {
            "limit": limit,
            "page_token": next_page_token,
        }
        return await self._request_get(url, params=params)

    share_ls = share_list

    async def share_batch_delete(
        self,
        share_ids: str | list[str],
    ) -> None:
        """Deletes one or more created share links. Matches MCP 'share_rm'."""
        ids = [share_ids] if isinstance(share_ids, str) else list(share_ids)
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/share"
        await self._request_delete(url, params={"share_ids": ids})

    share_rm = share_batch_delete
    share_delete = share_batch_delete

    async def get_share_info(
        self,
        share_link_or_id: str,
        pass_code: str | None = None,
        limit: int = 100,
        page_token: str | None = None,
    ) -> dict[str, Any]:
        """
        Gets details and root contents of a shared link or ID. Matches MCP 'share_get'.

        :param share_link_or_id: Full share URL (https://mypikpak.com/s/...) or raw share ID.
        :param pass_code: Access password if protected.
        :param limit: Maximum files to list per request.
        :param page_token: Pagination token.
        :raises PikpakException: If the share link or ID is malformed.
        """
        link = share_link_or_id.strip()
        share_id: str | None = None
        parent_id: str | None = None

        if "/s/" in link:
            match = re.search(r"/s/([^/?#]+)(?:/([^/?#]+))?", link)
            if match:
                share_id = match.group(1)
                parent_id = match.group(2) if match.group(2) else None
        elif re.match(r"^[A-Za-z0-9_-]+$", link):
            share_id = link
        else:
            raise PikpakException("Invalid Share Link or ID format.")

        if not share_id:
            raise PikpakException("Could not extract a valid share ID.")

        params: dict[str, Any] = {
            "limit": str(limit),
            "thumbnail_size": "SIZE_LARGE",
            "order": "3",
            "share_id": share_id,
            "parent_id": parent_id,
            "page_token": page_token,
        }
        if pass_code:
            params["pass_code"] = pass_code

        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/share"
        return await self._request_get(url, params=params)

    share_get = get_share_info

    async def get_share_folder(
        self,
        share_id: str,
        pass_code_token: str,
        parent_id: str | None = None,
        limit: int = 100,
        page_token: str | None = None,
    ) -> dict[str, Any]:
        """Lists contents within a subfolder of a shared link."""
        params: dict[str, Any] = {
            "limit": str(limit),
            "thumbnail_size": "SIZE_LARGE",
            "order": "6",
            "share_id": share_id,
            "parent_id": parent_id,
            "pass_code_token": pass_code_token,
            "page_token": page_token,
        }
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/share/detail"
        return await self._request_get(url, params=params)

    async def restore(
        self,
        share_id: str,
        pass_code_token: str | None = None,
        file_ids: list[str] | None = None,
        to_parent_id: str | None = None,
        password: str | None = None,
    ) -> dict[str, Any]:
        """
        Saves (restores) shared files into the user's drive. Matches MCP 'share_restore'.

        :param share_id: The ID or link of the share.
        :param pass_code_token: Passcode token (automatically resolved if omitted).
        :param file_ids: List of specific file IDs to save. If None, saves all files in the share.
        :param to_parent_id: Target folder ID in the user's drive (defaults to root).
        :param password: Share password to automatically resolve pass_code_token if needed.
        """
        clean_share_id = share_id
        if "/s/" in share_id:
            info = await self.get_share_info(share_id, pass_code=password)
            clean_share_id = str(info.get("share_id", clean_share_id))
            if not pass_code_token:
                tok = info.get("pass_code_token")
                pass_code_token = str(tok) if tok else None
            if file_ids is None:
                files_val = info.get("files", [])
                file_ids = [
                    str(f["id"]) for f in files_val if isinstance(f, dict) and "id" in f
                ]
        elif not pass_code_token and password:
            info = await self.get_share_info(share_id, pass_code=password)
            tok = info.get("pass_code_token")
            pass_code_token = str(tok) if tok else None
            if file_ids is None:
                files_val = info.get("files", [])
                file_ids = [
                    str(f["id"]) for f in files_val if isinstance(f, dict) and "id" in f
                ]
        elif file_ids is None:
            # Fetch share info to restore all files
            info = await self.get_share_info(share_id, pass_code=password)
            if not pass_code_token:
                tok = info.get("pass_code_token")
                pass_code_token = str(tok) if tok else None
            files_val = info.get("files", [])
            file_ids = [
                str(f["id"]) for f in files_val if isinstance(f, dict) and "id" in f
            ]

        payload: dict[str, Any] = {
            "share_id": clean_share_id,
            "pass_code_token": pass_code_token or "",
            "file_ids": file_ids or [],
        }
        if to_parent_id:
            payload["to"] = {"parent_id": to_parent_id}

        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/share/restore"
        return await self._request_post(url, data=payload)

    share_restore = restore

    async def share_restore_history(
        self,
        limit: int = 20,
        next_page_token: str | None = None,
    ) -> dict[str, Any]:
        """
        Lists restore history records of shared files saved to the drive.
        Matches MCP 'share_history' tool.
        """
        url = f"https://{self.PIKPAK_API_HOST}/drive/v1/share/restore/list"
        params: dict[str, Any] = {
            "limit": limit,
            "page_token": next_page_token,
        }
        return await self._request_get(url, params=params)

    share_history = share_restore_history
