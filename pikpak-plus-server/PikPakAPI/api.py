import asyncio
import logging
import json
import os
from hashlib import md5
from typing import Any, Dict, Optional, Callable

import httpx

from .PikpakException import PikpakException, PikpakRetryException
from .auth import AuthMixin
from .file_manager import FileManagerMixin
from .offline_download import OfflineDownloadMixin
from .webdav import WebDavMixin
from .settings import IS_DEVELOPMENT, PIKPAK_API_HOST, PIKPAK_USER_HOST

class PikPakApi(AuthMixin, FileManagerMixin, OfflineDownloadMixin, WebDavMixin):
    """
    PikPakApi class
    """
    PIKPAK_API_HOST = PIKPAK_API_HOST
    PIKPAK_USER_HOST = PIKPAK_USER_HOST

    def __init__(
        self,
        username: Optional[str] = None,
        password: Optional[str] = None,
        encoded_token: Optional[str] = None,
        httpx_client_args: Optional[Dict[str, Any]] = None,
        device_id: Optional[str] = None,
        request_max_retries: int = 3,
        request_initial_backoff: float = 3.0,
        token_refresh_callback: Optional[Callable] = None,
        token_refresh_callback_kwargs: Optional[Dict[str, Any]] = None,
    ):
        AuthMixin.__init__(self)
        FileManagerMixin.__init__(self)
        # WebDavMixin and OfflineDownloadMixin don't have __init__

        self.username = username
        self.password = password
        self.encoded_token = encoded_token
        self.max_retries = request_max_retries
        self.initial_backoff = request_initial_backoff
        self.token_refresh_callback = token_refresh_callback
        self.token_refresh_callback_kwargs = token_refresh_callback_kwargs or {}

        # device_id is used to identify the device, if not provided, a random device_id will be generated
        self.device_id = (
            device_id
            if device_id
            else md5(f"{self.username}{self.password}".encode()).hexdigest()
        )
        
        httpx_client_args = httpx_client_args or {"timeout": 10}
        self.httpx_client = httpx.AsyncClient(**httpx_client_args)
        self.user_agent: Optional[str] = None

        if self.encoded_token:
            self.decode_token()
        elif self.username and self.password:
            pass
        else:
            # Allow init without creds if we are going to load from persistence later
            pass

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PikPakApi":
        """
        Create PikPakApi object from a dictionary
        """
        import inspect
        params = inspect.signature(cls).parameters
        filtered_data = {key: data[key] for key in params if key in data}
        client = cls(
            **filtered_data,
        )
        client.__dict__.update(data)
        return client

    def to_dict(self) -> Dict[str, Any]:
        """
        Returns the PikPakApi object as a dictionary
        """
        from types import NoneType
        data = self.__dict__.copy()
        # remove can't be serialized attributes
        keys_to_delete = [
            k
            for k, v in data.items()
            if not type(v) in [str, int, float, bool, list, dict, NoneType]
        ]
        for k in keys_to_delete:
            del data[k]
        return data

    def build_custom_user_agent(self) -> str:
        from .utils import build_custom_user_agent
        self.user_agent = build_custom_user_agent(
            device_id=self.device_id,
            user_id=self.user_id if self.user_id else "",
        )
        return self.user_agent

    def get_headers(self, access_token: Optional[str] = None) -> Dict[str, str]:
        """
        Returns the headers to use for the requests.
        """
        headers = {
            "User-Agent": (
                self.build_custom_user_agent()
                if self.captcha_token
                else "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            ),
            "Content-Type": "application/json; charset=utf-8",
        }

        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        if self.captcha_token:
            headers["X-Captcha-Token"] = self.captcha_token
        if self.device_id:
            headers["X-Device-Id"] = self.device_id
        return headers

    async def _make_request(
        self,
        method: str,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        
        if IS_DEVELOPMENT:
            return await self._mock_request(method, url, data, params)

        last_error = None

        for attempt in range(self.max_retries):
            try:
                response = await self._send_request(method, url, data, params, headers)
                return await self._handle_response(response)
            except PikpakRetryException as error:
                logging.info(f"Retry attempt {attempt + 1}/{self.max_retries}")
                last_error = error
            except PikpakException:
                raise
            except httpx.HTTPError as error:
                logging.error(
                    f"HTTP Error on attempt {attempt + 1}/{self.max_retries}: {str(error)}"
                )
                last_error = error
            except Exception as error:
                logging.error(
                    f"Unexpected error on attempt {attempt + 1}/{self.max_retries}: {str(error)}"
                )
                last_error = error

            await asyncio.sleep(self.initial_backoff * (2**attempt))

        # If we've exhausted all retries, raise an exception with the last error
        raise PikpakException(f"Max retries reached. Last error: {str(last_error)}")

    async def _send_request(self, method, url, data, params, headers):
        req_headers = headers or self.get_headers()
        return await self.httpx_client.request(
            method,
            url,
            json=data,
            params=params,
            headers=req_headers,
        )

    async def _handle_response(self, response) -> Dict[str, Any]:
        try:
            json_data = response.json()
        except ValueError:
            if response.status_code == 200:
                return {}
            raise PikpakRetryException("Empty JSON data")

        if not json_data:
            if response.status_code == 200:
                return {}
            raise PikpakRetryException("Empty JSON data")

        if "error" not in json_data:
            return json_data

        if json_data["error"] == "invalid_account_or_password":
            raise PikpakException("Invalid username or password")

        if json_data.get("error_code") == 16:
            await self.refresh_access_token()
            raise PikpakRetryException("Token refreshed, please retry")

        raise PikpakException(json_data.get("error_description", "Unknown Error"))

    async def _request_get(
        self,
        url: str,
        params: dict = None,
    ):
        return await self._make_request("get", url, params=params)

    async def _request_post(
        self,
        url: str,
        data: dict = None,
        headers: dict = None,
    ):
        return await self._make_request("post", url, data=data, headers=headers)

    async def _request_patch(
        self,
        url: str,
        data: dict = None,
    ):
        return await self._make_request("patch", url, data=data)

    async def _request_delete(
        self,
        url: str,
        params: dict = None,
        data: dict = None,
    ):
        return await self._make_request("delete", url, params=params, data=data)

    async def _mock_request(self, method: str, url: str, data: Any, params: Any) -> Dict[str, Any]:
        """
        Intercept requests and return mock data based on URL and method.
        """
        logging.info(f"MOCK REQUEST: {method} {url}")
        
        # Simple mock routing based on URL keywords
        # In a real scenario, we might want a more sophisticated router or file-based mapping
        mock_dir = os.path.join(os.path.dirname(__file__), "mocks")
        os.makedirs(mock_dir, exist_ok=True)
        
        filename = "default.json"
        
        if "auth/signin" in url:
            filename = "login.json"
        elif "drive/v1/files" in url and method.lower() == "get":
            filename = "file_list.json"
        elif "drive/v1/about" in url:
            filename = "quota.json"
        elif "drive/v1/tasks" in url:
            filename = "tasks.json"
            
        filepath = os.path.join(mock_dir, filename)
        
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                return json.load(f)
        
        # Return generic success if no mock file found
        return {"success": True, "mock": True}
