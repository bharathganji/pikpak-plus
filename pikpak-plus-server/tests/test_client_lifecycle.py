"""
Tests for client session lifecycle, async context managers, error mapping, and serialization.
"""
from __future__ import annotations

import pytest

from PikPakAPI import (
    PikPakApi,
    PikpakAuthenticationError,
    PikpakNotFoundError,
    PikpakRateLimitError,
)
from PikPakAPI.utils import (
    PACKAG_ENAME,
    PACKAGE_NAME,
    SDK_VERSION,
    build_custom_user_agent,
)
from tests.conftest import MOCK_JWT


@pytest.mark.asyncio
async def test_async_context_manager(mock_api):
    mock_api.get("https://user.mypikpak.com/v1/user/me").respond(
        status_code=200, json={"sub": "u1"}
    )

    async with PikPakApi(access_token=MOCK_JWT) as client:
        res = await client.get_profile()
        assert res["sub"] == "u1"
        assert not client._is_closed

    assert client._is_closed


@pytest.mark.asyncio
async def test_error_mapping_404(mock_api, client):
    mock_api.get("https://api-drive.mypikpak.com/drive/v1/files/non_existent").respond(
        status_code=404,
        json={"error": "not_found", "error_code": 5, "error_description": "Not Found"},
    )

    with pytest.raises(PikpakNotFoundError, match="(?i)not found"):
        await client.offline_file_info("non_existent")


@pytest.mark.asyncio
async def test_error_mapping_401(mock_api):
    mock_api.get("https://user.mypikpak.com/v1/user/me").respond(
        status_code=401,
        json={"error": "unauthorized", "error_description": "Token expired"},
    )

    client = PikPakApi(access_token="expired_token", request_max_retries=1)
    with pytest.raises(PikpakAuthenticationError):
        await client.get_profile()


@pytest.mark.asyncio
async def test_error_mapping_429(mock_api, client):
    mock_api.get("https://api-drive.mypikpak.com/drive/v1/about").respond(
        status_code=429,
        json={
            "error": "rate_limit",
            "error_code": 8,
            "error_description": "Too many requests",
        },
    )

    with pytest.raises(PikpakRateLimitError):
        await client.get_quota_info()


@pytest.mark.asyncio
async def test_serialization_to_and_from_dict():
    client = PikPakApi(
        access_token=MOCK_JWT,
        refresh_token="ref_token_test",
        username="my_username",
        device_id="dev_123",
    )

    state = client.to_dict()
    assert state["username"] == "my_username"
    assert state["device_id"] == "dev_123"
    assert "_httpx_client" not in state

    restored = PikPakApi.from_dict(state)
    assert restored.username == "my_username"
    assert restored.device_id == "dev_123"
    assert restored.access_token == MOCK_JWT


def test_package_name_typo_resolution():
    """Defect 2 Regression Test: PACKAGE_NAME identifier typo resolved."""
    assert PACKAGE_NAME == "com.pikcloud.pikpak"
    assert PACKAG_ENAME == PACKAGE_NAME


def test_sdk_version_no_trailing_whitespace():
    """Defect 3 Regression Test: SDK_VERSION trailing space removed."""
    assert not SDK_VERSION.endswith(" ")
    assert SDK_VERSION == "2.0.4.204000"

    ua = build_custom_user_agent("test_device", "test_user")
    assert "sdkversion/2.0.4.204000  " not in ua
    assert "sdkversion/2.0.4.204000 datetime" in ua
    assert "  " not in ua


def test_none_type_serialization_compatibility():
    """Defect 4 Regression Test: Python 3.8/3.9 NoneType compatibility."""
    import PikPakAPI
    assert hasattr(PikPakAPI, "NoneType")
    client = PikPakAPI.PikPakApi(access_token=MOCK_JWT)
    serialized = client.to_dict()
    assert isinstance(serialized, dict)
    assert serialized["access_token"] == MOCK_JWT
