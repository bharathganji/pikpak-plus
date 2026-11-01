"""
Tests for authentication, token encoding/decoding, login flows, and token rotation callbacks.
"""
from __future__ import annotations

import pytest

from PikPakAPI import PikPakApi, PikpakException
from tests.conftest import MOCK_JWT


@pytest.mark.asyncio
async def test_direct_access_token_init():
    client = PikPakApi(access_token=MOCK_JWT)
    assert client.access_token == MOCK_JWT
    assert client.user_id == "user12345"
    assert client.encoded_token is not None


@pytest.mark.asyncio
async def test_missing_credentials_raises():
    with pytest.raises(PikpakException, match="At least one authentication method"):
        PikPakApi()


@pytest.mark.asyncio
async def test_encode_and_decode_token():
    client = PikPakApi(
        access_token=MOCK_JWT,
        refresh_token="my_refresh_token",
    )
    encoded = client.encode_token()
    assert isinstance(encoded, str)

    client2 = PikPakApi(encoded_token=encoded)
    assert client2.access_token == MOCK_JWT
    assert client2.refresh_token == "my_refresh_token"
    assert client2.user_id == "user12345"


@pytest.mark.asyncio
async def test_login_flow(mock_api):
    # Mock captcha init
    mock_api.post("https://user.mypikpak.com/v1/shield/captcha/init").respond(
        status_code=200,
        json={"captcha_token": "mock_captcha_token"},
    )
    # Mock signin
    mock_api.post("https://user.mypikpak.com/v1/auth/signin").respond(
        status_code=200,
        json={
            "access_token": MOCK_JWT,
            "refresh_token": "ref_123",
            "sub": "user12345",
        },
    )

    client = PikPakApi(username="test@example.com", password="password123")
    res = await client.login()
    assert res["access_token"] == MOCK_JWT
    assert client.access_token == MOCK_JWT
    assert client.user_id == "user12345"
    assert client.refresh_token == "ref_123"


@pytest.mark.asyncio
async def test_refresh_token_callback(mock_api):
    mock_api.post("https://user.mypikpak.com/v1/auth/token").respond(
        status_code=200,
        json={
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "sub": "user12345",
        },
    )

    callback_called = False

    async def on_refresh(client_inst, extra=""):
        nonlocal callback_called
        assert extra == "test_val"
        callback_called = True

    client = PikPakApi(
        access_token="old_access_token",
        refresh_token="old_refresh_token",
        token_refresh_callback=on_refresh,
        token_refresh_callback_kwargs={"extra": "test_val"},
    )

    await client.refresh_access_token()
    assert client.access_token == "new_access_token"
    assert client.refresh_token == "new_refresh_token"
    assert callback_called is True


@pytest.mark.asyncio
async def test_401_retry_updates_explicit_authorization_header(mock_api):
    """
    Defect 5 Regression Test:
    Verify that retrying after 401 updates caller-provided explicit headers
    with the fresh access token.
    """
    mock_api.get(
        "https://user.mypikpak.com/v1/user/me",
        headers={"Authorization": "Bearer expired_jwt_123"},
    ).respond(
        status_code=401,
        json={"error": "unauthorized", "error_code": 16, "error_description": "Token expired"},
    )
    mock_api.post("https://user.mypikpak.com/v1/auth/token").respond(
        status_code=200,
        json={"access_token": "fresh_jwt_456", "refresh_token": "fresh_ref_789", "expires_in": 7200},
    )
    retry_route = mock_api.get(
        "https://user.mypikpak.com/v1/user/me",
        headers={"Authorization": "Bearer fresh_jwt_456"},
    ).respond(
        status_code=200,
        json={"sub": "user_id_100", "username": "testuser"},
    )

    client = PikPakApi(
        access_token="expired_jwt_123",
        refresh_token="valid_refresh_token",
        request_max_retries=3,
        request_initial_backoff=0.001,
    )

    explicit_headers = {"Authorization": "Bearer expired_jwt_123", "X-Custom": "test"}
    result = await client._request_get("https://user.mypikpak.com/v1/user/me", headers=explicit_headers)

    assert result["sub"] == "user_id_100"
    assert retry_route.called
    assert explicit_headers["Authorization"] == "Bearer fresh_jwt_456"
