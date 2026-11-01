"""
Hermetic mock-first integration test suite for PikPak API.

Validates the full Anti-429 defense architecture, local session store,
concurrency locks, rate throttlers, circuit breakers, and all 20 MCP feature-parity
endpoints without making any live network calls or risking API lockouts.
"""

from __future__ import annotations

import asyncio
import time
from pathlib import Path

import pytest
import respx

from PikPakAPI import (
    PikPakApi,
    PikPakCaptchaRequiredException,
    PikPakRateLimitExceededException,
    SessionStore,
    Throttler,
)
from PikPakAPI.throttler import CircuitState
from tests.conftest import MOCK_JWT

# ---------------------------------------------------------------------------
# Test 1: Session Cache Hit (Zero Network Calls)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_session_cache_hit_zero_network_calls(tmp_path: Path) -> None:
    """
    A fresh cached access token (>5 min before expiry) must be reused immediately
    with ZERO HTTP requests fired.
    """
    store = SessionStore(session_dir=tmp_path)
    username = "community_user@example.com"
    # Expires in 2 hours
    future_exp = time.time() + 7200.0
    store.save(
        username,
        {
            "access_token": MOCK_JWT,
            "refresh_token": "valid_refresh_token_123",
            "expires_at": future_exp,
            "device_id": "test_device_1",
            "user_id": "user12345",
        },
    )

    with respx.mock(assert_all_called=False) as respx_mock:
        client = PikPakApi(
            username=username,
            password="dummy_password",
            session_dir=tmp_path,
        )

        # Call ensure_authenticated
        await client.ensure_authenticated()

        assert client.access_token == MOCK_JWT
        assert client.user_id == "user12345"
        # Zero HTTP calls made!
        assert len(respx_mock.calls) == 0


# ---------------------------------------------------------------------------
# Test 2: Token Renewal via Refresh Token (Never Re-execute Password Signin)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_token_refresh_on_expiry_avoids_password_login(tmp_path: Path) -> None:
    """
    When access token is expired, the client MUST use refresh_token via /v1/auth/token
    and NEVER fire a full username/password signin.
    """
    store = SessionStore(session_dir=tmp_path)
    username = "user_expired@example.com"
    past_exp = time.time() - 3600.0  # Expired 1 hour ago
    store.save(
        username,
        {
            "access_token": "stale_jwt_token",
            "refresh_token": "valid_refresh_token_xyz",
            "expires_at": past_exp,
            "device_id": "test_device_2",
            "user_id": "user12345",
        },
    )

    with respx.mock(assert_all_called=False) as respx_mock:
        refresh_route = respx_mock.post("https://user.mypikpak.com/v1/auth/token").respond(
            status_code=200,
            json={
                "access_token": "newly_minted_jwt_token",
                "refresh_token": "renewed_refresh_token",
                "sub": "user12345",
                "expires_in": 7200,
            },
        )
        signin_route = respx_mock.post("https://user.mypikpak.com/v1/auth/signin").respond(
            status_code=200,
            json={"access_token": "bad_should_not_call"},
        )

        client = PikPakApi(
            username=username,
            password="my_secret_password",
            session_dir=tmp_path,
        )

        await client.ensure_authenticated()

        assert client.access_token == "newly_minted_jwt_token"
        assert client.refresh_token == "renewed_refresh_token"

        # Verify /v1/auth/token was called
        assert refresh_route.called
        # Verify /v1/auth/signin was NEVER called!
        assert not signin_route.called

        # Verify session file was updated on disk
        updated = store.load(username)
        assert updated is not None
        assert updated["access_token"] == "newly_minted_jwt_token"
        assert updated["refresh_token"] == "renewed_refresh_token"


# ---------------------------------------------------------------------------
# Test 3: Concurrency Lock Prevents Duplicate Login Storms
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_concurrency_lock_prevents_duplicate_logins(tmp_path: Path) -> None:
    """
    Multiple concurrent requests on an unauthenticated client must NOT fire
    duplicate login calls. Exactly one login call should occur.
    """
    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.post("https://user.mypikpak.com/v1/shield/captcha/init").respond(
            status_code=200,
            json={"captcha_token": "dummy_cap_token"},
        )
        login_route = respx_mock.post("https://user.mypikpak.com/v1/auth/signin").respond(
            status_code=200,
            json={
                "access_token": MOCK_JWT,
                "refresh_token": "ref_123",
                "sub": "u_concurrent",
                "expires_in": 7200,
            },
        )

        client = PikPakApi(
            username="concurrent_user@example.com",
            password="password123",
            session_dir=tmp_path,
        )

        # Fire 5 concurrent authentication demands
        await asyncio.gather(
            client.ensure_authenticated(),
            client.ensure_authenticated(),
            client.ensure_authenticated(),
            client.ensure_authenticated(),
            client.ensure_authenticated(),
        )

        # Login must be called exactly once
        assert login_route.call_count == 1
        assert client.access_token == MOCK_JWT


# ---------------------------------------------------------------------------
# Test 4: Anti-429 Circuit Breaker Trigger & Halting
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_circuit_breaker_trips_on_http_429() -> None:
    """
    When HTTP 429 is encountered:
    1. Inspects Retry-After header.
    2. Trips the circuit breaker.
    3. Raises PikPakRateLimitExceededException.
    4. Subsequent calls fail immediately without touching the network.
    """
    with respx.mock(assert_all_called=False) as respx_mock:
        route = respx_mock.get("https://api-drive.mypikpak.com/drive/v1/about").respond(
            status_code=429,
            headers={"Retry-After": "45"},
            text="Too Many Requests",
        )

        client = PikPakApi(
            access_token=MOCK_JWT,
            request_max_retries=1,
        )

        # First call triggers 429
        with pytest.raises(PikPakRateLimitExceededException) as exc_info:
            await client.get_quota_info()

        assert exc_info.value.retry_after == 45.0
        assert client.throttler.state == CircuitState.OPEN
        assert route.call_count == 1

        # Second call immediately blocked by the circuit breaker (0 network requests!)
        with pytest.raises(PikPakRateLimitExceededException) as exc_info2:
            await client.get_quota_info()

        assert "Anti-429 Circuit Breaker is active" in str(exc_info2.value.message)
        # Network was NOT hit a second time
        assert route.call_count == 1


# ---------------------------------------------------------------------------
# Test 5: Rate Limiter Throttling Behavior
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_throttler_sliding_window_delays_bursts() -> None:
    """
    Verifies that the Throttler enforces request spacing and prevents bursts
    exceeding the configured rate.
    """
    # Configure tight throttler: max 2 requests per 0.2 seconds
    throttler = Throttler(max_rate=2.0, time_window=0.2)

    start_time = time.time()
    await throttler.acquire()
    await throttler.acquire()
    # 3rd acquire exceeds window, must pause
    await throttler.acquire()
    elapsed = time.time() - start_time

    assert elapsed >= 0.18, f"Expected throttling delay, got {elapsed:.3f}s"


# ---------------------------------------------------------------------------
# Test 6: CAPTCHA Defense (1001 / Verification Exception)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_captcha_defense_raises_typed_exception() -> None:
    """
    Detects error_code 1001 or captcha_verification_required and raises
    PikPakCaptchaRequiredException with URL metadata.
    """
    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.post("https://user.mypikpak.com/v1/shield/captcha/init").respond(
            status_code=200,
            json={"captcha_token": "test_token"},
        )
        respx_mock.post("https://user.mypikpak.com/v1/auth/signin").respond(
            status_code=400,
            json={
                "error_code": 1001,
                "error": "captcha_verification_required",
                "error_description": "Verification required: visit https://mypikpak.com/verify to solve puzzle",
            },
        )

        client = PikPakApi(
            username="captcha_user@example.com",
            password="mypassword",
        )

        with pytest.raises(PikPakCaptchaRequiredException) as exc_info:
            await client.login()

        assert exc_info.value.code == 1001
        assert exc_info.value.error_url == "https://mypikpak.com/verify"


# ---------------------------------------------------------------------------
# Test 7: All 20 MCP Feature-Parity Endpoints (Hermetic Mock Verification)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_all_20_mcp_endpoints_mocked() -> None:
    """
    Ensures complete coverage of all 20 MCP feature parity endpoints in hermetic mode.
    """
    with respx.mock(assert_all_called=False) as respx_mock:
        # Mock responses
        respx_mock.get("https://user.mypikpak.com/v1/user/me").respond(
            json={"sub": "u_test", "name": "Tester", "email": "tester@example.com", "status": "OK"}
        )
        respx_mock.get("https://api-drive.mypikpak.com/drive/v1/about").respond(
            json={"quota": {"limit": "1099511627776", "usage": "1048576", "usage_in_trash": "0"}}
        )
        respx_mock.get("https://api-drive.mypikpak.com/drive/v1/privilege/vip").respond(
            json={"data": {"status": "OK", "type": "platinum", "expire": "2030-01-01"}}
        )
        respx_mock.get("https://api-drive.mypikpak.com/drive/v1/files").respond(
            json={"files": [{"id": "f1", "name": "sample.mp4", "kind": "drive#file"}]}
        )
        respx_mock.post("https://user.mypikpak.com/v1/shield/captcha/init").respond(
            json={"captcha_token": "cap1"}
        )
        respx_mock.get("https://api-drive.mypikpak.com/drive/v1/files/f1").respond(
            json={"id": "f1", "name": "sample.mp4", "kind": "drive#file", "size": "1024"}
        )
        respx_mock.post("https://api-drive.mypikpak.com/drive/v1/files").respond(
            json={"file": {"id": "f_folder", "name": "NewDir", "kind": "drive#folder"}}
        )
        respx_mock.patch("https://api-drive.mypikpak.com/drive/v1/files/f1").respond(
            json={"id": "f1", "name": "renamed.mp4"}
        )
        respx_mock.post("https://api-drive.mypikpak.com/drive/v1/files:batchTrash").respond(
            json={"status": "ok"}
        )
        respx_mock.post("https://api-drive.mypikpak.com/drive/v1/files:batchUntrash").respond(
            json={"status": "ok"}
        )
        respx_mock.post("https://api-drive.mypikpak.com/drive/v1/files:batchDelete").respond(
            json={"status": "ok"}
        )
        respx_mock.post("https://api-drive.mypikpak.com/drive/v1/files:batchMove").respond(
            json={"status": "ok"}
        )
        respx_mock.post("https://api-drive.mypikpak.com/drive/v1/files:batchCopy").respond(
            json={"status": "ok"}
        )
        respx_mock.post("https://api-drive.mypikpak.com/drive/v1/files:star").respond(
            json={"status": "ok"}
        )
        respx_mock.post("https://api-drive.mypikpak.com/drive/v1/files:unstar").respond(
            json={"status": "ok"}
        )
        respx_mock.get("https://api-drive.mypikpak.com/drive/v1/tasks").respond(
            json={"tasks": [{"id": "t1", "phase": "PHASE_TYPE_COMPLETE", "name": "magnet_dl"}]}
        )
        respx_mock.get("https://api-drive.mypikpak.com/drive/v1/tasks/t1").respond(
            json={"task": {"id": "t1", "phase": "PHASE_TYPE_COMPLETE"}}
        )
        respx_mock.delete("https://api-drive.mypikpak.com/drive/v1/tasks").respond(
            status_code=204
        )
        respx_mock.post("https://api-drive.mypikpak.com/drive/v1/share").respond(
            json={"share_id": "s1", "share_url": "https://mypikpak.com/s/s1"}
        )
        respx_mock.get("https://api-drive.mypikpak.com/drive/v1/share").respond(
            json={"share_id": "s1", "files": [{"id": "f1"}]}
        )
        respx_mock.get("https://api-drive.mypikpak.com/drive/v1/share/list").respond(
            json={"shares": [{"share_id": "s1"}]}
        )
        respx_mock.delete("https://api-drive.mypikpak.com/drive/v1/share").respond(
            status_code=204
        )
        respx_mock.post("https://api-drive.mypikpak.com/drive/v1/share/restore").respond(
            json={"restore_status": "ok", "file_id": "f_restored"}
        )
        respx_mock.get("https://api-drive.mypikpak.com/drive/v1/share/restore/list").respond(
            json={"data": [{"id": "h1", "share_id": "s1"}]}
        )

        client = PikPakApi(access_token=MOCK_JWT)

        # 1. account_info
        account = await client.account_info()
        assert account["name"] == "Tester"

        # 2. ls (file_list)
        files = await client.file_list()
        assert len(files["files"]) == 1

        # 3. get (get_file)
        file_item = await client.get_file("f1")
        assert file_item["id"] == "f1"

        # 4. mkdir
        mkdir_res = await client.mkdir("NewDir")
        assert mkdir_res["file"]["name"] == "NewDir"

        # 5. rename
        renamed = await client.rename("f1", "renamed.mp4")
        assert renamed["name"] == "renamed.mp4"

        # 6. rm (trash)
        trash_res = await client.rm(["f1"])
        assert trash_res["status"] == "ok"

        # 7. untrash
        untrash_res = await client.untrash(["f1"])
        assert untrash_res["status"] == "ok"

        # 8. cp (copy)
        cp_res = await client.cp("f1", target="f_folder")
        assert cp_res["status"] == "ok"

        # 9. mv (move)
        mv_res = await client.mv("f1", target="f_folder")
        assert mv_res["status"] == "ok"

        # 10. star
        star_res = await client.star("f1")
        assert star_res["status"] == "ok"

        # 11. unstar
        unstar_res = await client.unstar("f1")
        assert unstar_res["status"] == "ok"

        # 12. add_link
        add_res = await client.add_link("magnet:?xt=urn:btih:fake")
        assert add_res["file"]["id"] == "f_folder"

        # 13. task_ls
        tasks = await client.task_ls()
        assert len(tasks["tasks"]) == 1

        # 14. task_get
        task = await client.task_get("t1")
        assert task["task"]["id"] == "t1"

        # 15. task_rm
        await client.task_rm("t1")

        # 16. share_create
        created_share = await client.share_create(ids=["f1"])
        assert created_share["share_id"] == "s1"

        # 17. share_get
        share_info = await client.share_get("s1")
        assert share_info["share_id"] == "s1"

        # 18. share_ls
        share_list = await client.share_ls()
        assert len(share_list["shares"]) == 1

        # 19. share_rm
        await client.share_rm("s1")

        # 20. share_restore & share_history
        restore_res = await client.share_restore("s1", pass_code_token="tok", file_ids=["f1"])
        assert restore_res["restore_status"] == "ok"

        history = await client.share_history()
        assert len(history["data"]) == 1
