"""
WebDAV application provisioning and configuration for PikPak API.
"""

from __future__ import annotations

from typing import Any

from .client import BaseClient
from .constants import WEBDAV_BASE_URL


class WebDavMixin(BaseClient):
    """Mixin providing WebDAV service toggle and application account provisioning."""

    def _get_webdav_headers(self) -> dict[str, str]:
        """Construct WebDAV API request headers."""
        headers: dict[str, str] = {
            "Accept": "*/*",
            "Content-Type": "application/json; charset=utf-8",
            "Origin": "https://mypikpak.com",
            "Referer": "https://mypikpak.com/",
        }
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        if self.captcha_token:
            headers["X-Captcha-Token"] = self.captcha_token
        if self.device_id:
            headers["X-Device-Id"] = self.device_id
        return headers

    async def get_webdav_applications(self) -> dict[str, Any]:
        """
        Get WebDAV configuration and application list.
        Endpoint: GET https://api-dav.mypikpak.com/webdav/v1/applications
        """
        url = f"{WEBDAV_BASE_URL}/webdav/v1/applications"
        return await self._make_request(
            method="get",
            url=url,
            headers=self._get_webdav_headers(),
        )

    async def toggle_webdav(self, enable: bool) -> dict[str, Any]:
        """
        Toggle WebDAV status on or off.
        Endpoint: POST https://api-dav.mypikpak.com/webdav/v1/toggle-enable
        """
        url = f"{WEBDAV_BASE_URL}/webdav/v1/toggle-enable"
        data = {"enable": enable}
        return await self._make_request(
            method="post",
            url=url,
            data=data,
            headers=self._get_webdav_headers(),
        )

    async def create_webdav_application(self, application_name: str) -> dict[str, Any]:
        """
        Create a new WebDAV application account.
        Endpoint: POST https://api-dav.mypikpak.com/webdav/v1/application
        """
        url = f"{WEBDAV_BASE_URL}/webdav/v1/application"
        data = {"application_name": application_name}
        return await self._make_request(
            method="post",
            url=url,
            data=data,
            headers=self._get_webdav_headers(),
        )

    async def delete_webdav_application(self, username: str, password: str) -> dict[str, Any]:
        """
        Delete a WebDAV application account.
        Endpoint: DELETE https://api-dav.mypikpak.com/webdav/v1/application
        """
        url = f"{WEBDAV_BASE_URL}/webdav/v1/application"
        data = {"username": username, "password": password}
        return await self._make_request(
            method="delete",
            url=url,
            data=data,
            headers=self._get_webdav_headers(),
        )

    async def modify_webdav_application(
        self, username: str, password: str, modify_props: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Modify WebDAV application properties (e.g., set read_only=True).
        Endpoint: PATCH https://api-dav.mypikpak.com/webdav/v1/application
        """
        url = f"{WEBDAV_BASE_URL}/webdav/v1/application"
        data = {
            "username": username,
            "password": password,
            "modify_props": modify_props,
        }
        return await self._make_request(
            method="patch",
            url=url,
            data=data,
            headers=self._get_webdav_headers(),
        )
