"""
Comprehensive tests for WebDavMixin: application listing, toggle, creation, deletion, modification, headers, and error handling.
"""
from __future__ import annotations

import json

import pytest

from PikPakAPI import (
    PikPakApi,
    PikpakAuthenticationError,
    PikpakNotFoundError,
    PikPakRateLimitExceededException,
)
from PikPakAPI.throttler import CircuitState
from tests.conftest import MOCK_JWT


@pytest.mark.asyncio
async def test_get_webdav_applications(mock_api, client, webdav_sample_data):
    route = mock_api.get("https://api-dav.mypikpak.com/webdav/v1/applications").respond(
        status_code=200, json=webdav_sample_data["applications"]
    )
    res = await client.get_webdav_applications()
    assert res["status"] == "ok"
    assert len(res["applications"]) == 2
    assert route.calls.last.request.headers["authorization"] == f"Bearer {client.access_token}"
    assert route.calls.last.request.headers["origin"] == "https://mypikpak.com"
    assert route.calls.last.request.headers["referer"] == "https://mypikpak.com/"

    # Test namespaced alias .webdav
    res_ns = await client.webdav.get_webdav_applications()
    assert res_ns["status"] == "ok"


@pytest.mark.asyncio
async def test_toggle_webdav(mock_api, client, webdav_sample_data):
    route = mock_api.post("https://api-dav.mypikpak.com/webdav/v1/toggle-enable").respond(
        status_code=200, json=webdav_sample_data["toggle_on"]
    )
    res = await client.toggle_webdav(enable=True)
    assert res["enabled"] is True
    assert json.loads(route.calls.last.request.content) == {"enable": True}

    # Test toggling off
    mock_api.post("https://api-dav.mypikpak.com/webdav/v1/toggle-enable").respond(
        status_code=200, json=webdav_sample_data["toggle_off"]
    )
    res_off = await client.toggle_webdav(enable=False)
    assert res_off["enabled"] is False


@pytest.mark.asyncio
async def test_create_webdav_application(mock_api, client, webdav_sample_data):
    route = mock_api.post("https://api-dav.mypikpak.com/webdav/v1/application").respond(
        status_code=200, json=webdav_sample_data["created_app"]
    )
    res = await client.create_webdav_application("Mars Streamer")
    assert res["application"]["username"] == "dav_user_mars"
    assert json.loads(route.calls.last.request.content) == {"application_name": "Mars Streamer"}


@pytest.mark.asyncio
async def test_delete_webdav_application(mock_api, client, webdav_sample_data):
    route = mock_api.request("DELETE", "https://api-dav.mypikpak.com/webdav/v1/application").respond(
        status_code=200, json=webdav_sample_data["delete_ok"]
    )
    res = await client.delete_webdav_application("dav_user_mercury", "mypassword")
    assert res["deleted"] is True
    assert json.loads(route.calls.last.request.content) == {
        "username": "dav_user_mercury",
        "password": "mypassword",
    }


@pytest.mark.asyncio
async def test_modify_webdav_application(mock_api, client, webdav_sample_data):
    route = mock_api.patch("https://api-dav.mypikpak.com/webdav/v1/application").respond(
        status_code=200, json=webdav_sample_data["modify_ok"]
    )
    res = await client.modify_webdav_application(
        "dav_user_mercury", "mypassword", {"read_only": True}
    )
    assert res["application"]["read_only"] is True
    assert json.loads(route.calls.last.request.content) == {
        "username": "dav_user_mercury",
        "password": "mypassword",
        "modify_props": {"read_only": True},
    }


@pytest.mark.asyncio
async def test_webdav_headers_and_auth(mock_api):
    route = mock_api.get("https://api-dav.mypikpak.com/webdav/v1/applications").respond(
        status_code=200, json={"applications": []}
    )

    client = PikPakApi(
        access_token=MOCK_JWT,
        device_id="dav_device_999",
        request_initial_backoff=0.001,
    )
    client.captcha_token = "dav_captcha_token_123"

    await client.get_webdav_applications()
    headers = route.calls.last.request.headers
    assert headers["authorization"] == f"Bearer {MOCK_JWT}"
    assert headers["x-device-id"] == "dav_device_999"
    assert headers["x-captcha-token"] == "dav_captcha_token_123"
    assert headers["origin"] == "https://mypikpak.com"
    assert headers["referer"] == "https://mypikpak.com/"


@pytest.mark.asyncio
async def test_webdav_error_handling(mock_api, client):
    # 1. HTTP 404
    mock_api.get("https://api-dav.mypikpak.com/webdav/v1/applications").respond(
        status_code=404,
        json={"error": "not_found", "error_description": "WebDAV service not available"},
    )
    with pytest.raises(PikpakNotFoundError):
        await client.get_webdav_applications()

    # 2. HTTP 401
    mock_api.post("https://api-dav.mypikpak.com/webdav/v1/toggle-enable").respond(
        status_code=401,
        json={"error": "unauthorized", "error_description": "Invalid access token"},
    )
    client_expired = PikPakApi(access_token="expired_token", request_max_retries=1)
    with pytest.raises(PikpakAuthenticationError):
        await client_expired.toggle_webdav(enable=True)

    # 3. HTTP 429 triggers circuit breaker
    mock_api.post("https://api-dav.mypikpak.com/webdav/v1/application").respond(
        status_code=429,
        headers={"Retry-After": "30"},
        text="Rate limited",
    )
    with pytest.raises(PikPakRateLimitExceededException) as exc:
        await client.create_webdav_application("BurstClient")

    assert exc.value.retry_after == 30.0
    assert client.throttler.state == CircuitState.OPEN
