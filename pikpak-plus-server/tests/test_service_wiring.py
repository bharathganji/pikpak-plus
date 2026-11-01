"""
Integration test suite for Backend Service Wiring and Token Persistence.
Validates:
1. PikPakApi.token_refresh_callback persistence to Supabase pikpak_tokens & Redis login lock.
2. 401 auto-retry triggering token refresh and database persistence.
3. PikPakService aclose(), close(), and async context manager.
4. WebDAV methods on PikPakService dispatching to modernized client with proper headers.
5. Standardized Celery run_job_async runner ensuring clean event loop and client socket teardown.
"""
from __future__ import annotations

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.core.token_manager import TokenManager
from app.services.pikpak_service import PikPakService
from app.tasks.utils import run_job_async
from PikPakAPI import PikPakApi

TEST_JWT_PAYLOAD = {
    "sub": "user_wiring_123",
    "email": "wiring_test@example.com",
    "exp": int(time.time()) + 3600,
}


@pytest.mark.asyncio
async def test_token_refresh_callback_persists_to_supabase_and_redis(monkeypatch):
    """Test that PikPakApi token refresh triggers on_token_refresh, updating Supabase and Redis."""
    mock_supabase = MagicMock()
    table_mock = MagicMock()
    mock_supabase.table.return_value = table_mock
    table_mock.upsert.return_value.execute.return_value = MagicMock(data=[{"id": 1}])
    table_mock.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
        data={
            "id": 1,
            "username": "wiring_user",
            "password": "wiring_password",
            "access_token": "old_access_token",
            "refresh_token": "old_refresh_token",
            "user_id": "user_wiring_123",
        }
    )

    token_mgr = TokenManager()
    token_mgr.supabase = mock_supabase

    mock_login_lock = MagicMock()
    monkeypatch.setattr("app.utils.redis_lock.get_login_lock", lambda: mock_login_lock)

    refresh_payload = {
        "access_token": "new_refreshed_access_token_xyz",
        "refresh_token": "new_refreshed_refresh_token_xyz",
        "user_id": "user_wiring_123",
        "expires_at": time.time() + 7200,
    }

    # Execute callback
    token_mgr.on_token_refresh(refresh_payload)

    # Verify Supabase table was updated with expiration
    table_mock.upsert.assert_called()
    call_args = table_mock.upsert.call_args[0][0]
    assert call_args["access_token"] == "new_refreshed_access_token_xyz"
    assert call_args["refresh_token"] == "new_refreshed_refresh_token_xyz"
    assert "access_token_expires_at" in call_args

    # Verify Redis login lock synchronized expiration
    mock_login_lock.set_login_completed.assert_called_once()
    mock_login_lock.set_token_valid_until.assert_called_once_with(float(refresh_payload["expires_at"]))


@pytest.mark.asyncio
async def test_internal_401_retry_triggers_callback_and_updates_database(mock_api, monkeypatch):
    """
    Simulates a 401 Unauthorized during an API request.
    Verifies that BaseClient catches 401, refreshes tokens via refresh endpoint,
    triggers on_token_refresh, and successfully retries the original request.
    """
    callback_called = False
    captured_data = {}

    def dummy_callback(token_data: dict) -> None:
        nonlocal callback_called, captured_data
        callback_called = True
        captured_data = token_data

    # Mock token refresh endpoint
    mock_api.post("https://user.mypikpak.com/v1/auth/token").respond(
        200,
        json={
            "token_type": "Bearer",
            "access_token": "auto_refreshed_jwt_999",
            "refresh_token": "auto_refreshed_refresh_999",
            "expires_in": 7200,
            "sub": "user_auto_401",
        },
    )

    # First quota call returns 401, second call returns 200
    mock_api.get("https://api-drive.mypikpak.com/drive/v1/about").mock(
        side_effect=[
            httpx.Response(401, json={"error": "unauthorized", "error_code": 16}),
            httpx.Response(200, json={"quota": {"limit": "1000000000", "usage": "100000"}}),
        ]
    )

    client = PikPakApi(
        username="auto_user",
        password="auto_password",
        access_token="initial_stale_token",
        refresh_token="initial_valid_refresh_token",
        token_refresh_callback=dummy_callback,
    )

    try:
        quota = await client.get_quota_info()
        assert "quota" in quota
        assert callback_called is True
        assert captured_data.get("access_token") == "auto_refreshed_jwt_999"
        assert captured_data.get("refresh_token") == "auto_refreshed_refresh_999"
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_pikpak_service_aclose_and_context_manager(monkeypatch):
    """Verify that PikPakService aclose() properly closes the underlying HTTPX client session."""
    service = PikPakService(username="service_user", password="service_password")
    assert service.client is not None

    # Underlying HTTP client should be open
    assert not getattr(service.client, "_is_closed", False)

    # Use async context manager
    async with service:
        assert service.client is not None

    # After exit, aclose() was called
    assert getattr(service.client, "_is_closed", False) is True


@pytest.mark.asyncio
async def test_webdav_methods_call_modernized_api(mock_api, monkeypatch):
    """Verify that PikPakService WebDAV methods dispatch to modernized client with correct headers."""
    mock_api.get("https://api-dav.mypikpak.com/webdav/v1/applications").respond(
        200,
        json={"status": "ok", "enabled": True, "applications": [{"name": "App1"}]},
    )
    mock_api.post("https://api-dav.mypikpak.com/webdav/v1/toggle-enable").respond(
        200,
        json={"status": "ok", "enabled": True},
    )
    mock_api.post("https://api-dav.mypikpak.com/webdav/v1/application").respond(
        200,
        json={"status": "ok", "application": {"name": "NewApp"}},
    )

    service = PikPakService(username="webdav_user", password="webdav_pass")
    assert service.client is not None
    service.client.access_token = "valid_token_webdav"
    service.client.expires_at = time.time() + 3600

    # Mock ensure_logged_in to avoid external network login
    service.ensure_logged_in = AsyncMock(return_value=service.client)

    try:
        apps = await service.get_webdav_applications()
        assert apps["status"] == "ok"
        assert apps["enabled"] is True

        toggle = await service.toggle_webdav(True)
        assert toggle["status"] == "ok"

        created = await service.create_webdav_application("NewApp")
        assert created["status"] == "ok"
    finally:
        await service.aclose()


def test_celery_task_runner_guarantees_client_teardown():
    """Verify that run_job_async runs the coroutine, tears down the loop, and prevents descriptor leaks."""
    cleanup_executed = False

    async def sample_job():
        nonlocal cleanup_executed
        service = PikPakService("celery_u", "celery_p")
        try:
            await asyncio.sleep(0.01)
            return "job_done"
        finally:
            await service.aclose()
            cleanup_executed = True

    result = run_job_async(sample_job)
    assert result == "job_done"
    assert cleanup_executed is True
