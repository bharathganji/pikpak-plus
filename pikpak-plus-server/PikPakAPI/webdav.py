import httpx
from typing import Dict, Any
from .settings import WEBDAV_BASE_URL, DEFAULT_TIMEOUT

class WebDavMixin:
    def _get_webdav_headers(self) -> Dict[str, str]:
        """Get headers for WebDAV API requests"""
        return {
            "accept": "*/*",
            "authorization": f"Bearer {self.access_token}",
            "content-type": "application/json",
            "origin": "https://mypikpak.com",
            "referer": "https://mypikpak.com/",
        }
    
    async def get_webdav_applications(self) -> Dict[str, Any]:
        """
        Get WebDAV configuration and application list
        """
        url = f"{WEBDAV_BASE_URL}/webdav/v1/applications"
        headers = self._get_webdav_headers()
        
        # Use self.httpx_client if available, but extended used a new client with specific timeout
        # We can use self.httpx_client but need to ensure headers are correct.
        # The extended implementation created a new client for each request. 
        # To be consistent with the rest of the API, we should probably use _make_request if possible,
        # but _make_request uses self.httpx_client which might have different config.
        # Also _make_request handles retries and error parsing.
        # The extended implementation used direct httpx calls.
        # Let's try to use _make_request but with custom headers and URL.
        # However, _make_request assumes standard PikPak error handling. WebDAV might be different.
        # Let's stick to the extended implementation's logic but use a shared client or create one.
        
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
    
    async def toggle_webdav(self, enable: bool) -> Dict[str, Any]:
        """
        Toggle WebDAV status on or off
        """
        url = f"{WEBDAV_BASE_URL}/webdav/v1/toggle-enable"
        headers = self._get_webdav_headers()
        data = {"enable": enable}
        
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            response = await client.post(url, headers=headers, json=data)
            response.raise_for_status()
            return response.json()
    
    async def create_webdav_application(self, application_name: str) -> Dict[str, Any]:
        """
        Create a new WebDAV application
        """
        url = f"{WEBDAV_BASE_URL}/webdav/v1/application"
        headers = self._get_webdav_headers()
        data = {"application_name": application_name}
        
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            response = await client.post(url, headers=headers, json=data)
            response.raise_for_status()
            return response.json()
    
    async def delete_webdav_application(self, username: str, password: str) -> Dict[str, Any]:
        """
        Delete a WebDAV application
        """
        url = f"{WEBDAV_BASE_URL}/webdav/v1/application"
        headers = self._get_webdav_headers()
        data = {"username": username, "password": password}
        
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            response = await client.request("DELETE", url, headers=headers, json=data)
            response.raise_for_status()
            return response.json()
