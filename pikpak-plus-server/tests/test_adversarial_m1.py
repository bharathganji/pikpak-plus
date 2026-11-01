"""
Adversarial Verification & Empirical Defect Suite for PikPakAPI M1.

Empirically challenges:
1. Sliding-Window Rate Limiting (rapid bursts, rolling window compliance, cancellation safety)
2. Circuit Breaker on 429 & Retry-After (immediate trip, subsequent rejection, recovery in HALF_OPEN, malformed headers)
3. 3-Tier Auth Concurrency Locking (preventing duplicate token refreshes and login storms)

Empirically confirms 3 critical/high bugs:
- DEFECT-M1-ADV-1: Infinite recursion in `_handle_response()` when `/v1/auth/token` returns 401.
- DEFECT-M1-ADV-2: Missing concurrency lock on `refresh_access_token()` causing token refresh storms and race conditions.
- DEFECT-M1-ADV-3: `CircuitState.HALF_OPEN` fails to enforce single probe request isolation under concurrency.
"""

from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import Any

import pytest
import respx
from httpx import Response

from PikPakAPI import (
    CircuitState,
    PikPakApi,
    PikpakAuthenticationError,
    PikPakCircuitBreakerOpenError,
    PikPakRateLimitExceededException,
    SessionStore,
    Throttler,
)
from tests.conftest import MOCK_JWT

# ===========================================================================
# 1. SLIDING-WINDOW RATE LIMITING ADVERSARIAL STRESS TESTS
# ===========================================================================


@pytest.mark.asyncio
async def test_throttler_burst_strict_sliding_window_compliance() -> None:
    """
    Stress-test: Send a burst of 15 requests through a rate limiter configured
    for max 3 requests per 0.3s window.
    Assert that across ALL rolling 0.3s sub-intervals, no more than 3 requests pass,
    and all 15 requests complete without error or crash.
    """
    max_rate = 3
    window = 0.3
    throttler = Throttler(max_rate=max_rate, time_window=window)

    acquired_timestamps: list[float] = []

    async def worker(worker_id: int) -> None:
        await throttler.acquire()
        acquired_timestamps.append(time.time())

    # Burst 15 concurrent workers
    tasks = [asyncio.create_task(worker(i)) for i in range(15)]
    await asyncio.gather(*tasks)

    assert len(acquired_timestamps) == 15

    # Verify sliding window invariant:
    # In any window [t, t + window - epsilon], count <= max_rate
    for i, t in enumerate(acquired_timestamps):
        window_end = t + window - 0.01
        in_window = sum(1 for ts in acquired_timestamps if t <= ts <= window_end)
        assert in_window <= max_rate, (
            f"Rate limit exceeded: {in_window} requests in window starting at {t:.4f} (max {max_rate})"
        )


@pytest.mark.asyncio
async def test_throttler_cancellation_resilience() -> None:
    """
    Stress-test: If a coroutine is cancelled while waiting inside acquire() during sleep,
    the throttler lock must NOT be permanently held (deadlock), and subsequent calls
    must proceed normally.
    """
    throttler = Throttler(max_rate=1, time_window=0.5)

    # 1. Acquire slot 1
    await throttler.acquire()

    # 2. Start slot 2 which will sleep inside acquire()
    task2 = asyncio.create_task(throttler.acquire())
    await asyncio.sleep(0.05)

    # Cancel task2 while sleeping
    task2.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task2

    # 3. Subsequent acquire must NOT deadlock!
    task3 = asyncio.create_task(throttler.acquire())
    done, _ = await asyncio.wait([task3], timeout=2.0)
    assert task3 in done, "Throttler deadlocked after coroutine cancellation!"


@pytest.mark.asyncio
async def test_throttler_login_cooldown_concurrency() -> None:
    """
    Stress-test: Login cooldown enforcement.
    Two consecutive login requests must be spaced by login_cooldown.
    """
    cooldown = 0.3
    throttler = Throttler(max_rate=10, time_window=1.0, login_cooldown=cooldown)

    await throttler.acquire(is_login=True)
    t1 = time.time()
    await throttler.acquire(is_login=True)
    t2 = time.time()

    assert (t2 - t1) >= (cooldown - 0.05), (
        f"Login cooldown not enforced: elapsed {t2 - t1:.3f}s < cooldown {cooldown}s"
    )


# ===========================================================================
# 2. CIRCUIT BREAKER ON 429 & RETRY-AFTER ADVERSARIAL STRESS TESTS
# ===========================================================================


@pytest.mark.asyncio
async def test_circuit_breaker_rapid_burst_and_subsequent_block() -> None:
    """
    Stress-test: 10 concurrent requests fired simultaneously.
    Server returns 429 with Retry-After: 1.5.
    Assert:
    - First 429 trips the circuit breaker to OPEN.
    - All pending / subsequent calls fail with PikPakRateLimitExceededException.
    - No subsequent calls hit the network.
    """
    with respx.mock(assert_all_called=False) as respx_mock:
        call_count = 0

        def respond_429(request: Any) -> Response:
            nonlocal call_count
            call_count += 1
            return Response(429, headers={"Retry-After": "1.5"}, text="Rate limit hit")

        respx_mock.get("https://api-drive.mypikpak.com/drive/v1/about").mock(side_effect=respond_429)

        client = PikPakApi(access_token=MOCK_JWT, request_max_retries=1)

        with pytest.raises(PikPakRateLimitExceededException) as exc_info:
            await client.get_quota_info()

        assert exc_info.value.retry_after == 1.5
        assert client.throttler.state == CircuitState.OPEN

        results = await asyncio.gather(
            *[client.get_quota_info() for _ in range(10)],
            return_exceptions=True,
        )

        for r in results:
            assert isinstance(r, PikPakRateLimitExceededException)
            assert "Anti-429 Circuit Breaker is active" in str(r.message)

        assert call_count == 1


@pytest.mark.asyncio
async def test_circuit_breaker_various_retry_after_headers() -> None:
    """
    Stress-test: Parsing of various Retry-After headers:
    - Integer: "120" -> 120.0
    - Float: "2.5" -> 2.5
    - Malformed text: "invalid-header" -> fallback 60.0
    - None / missing -> fallback 60.0
    - Negative: "-10" -> fallback 60.0
    - Zero: "0" -> fallback 60.0
    """
    throttler = Throttler()

    # Case 1: Integer
    throttler.record_429(120.0)
    assert throttler.state == CircuitState.OPEN
    assert throttler._last_retry_after == 120.0
    throttler.reset()

    # Case 2: Float
    throttler.record_429(2.5)
    assert throttler.state == CircuitState.OPEN
    assert throttler._last_retry_after == 2.5
    throttler.reset()

    # Case 3: None
    throttler.record_429(None)
    assert throttler.state == CircuitState.OPEN
    assert throttler._last_retry_after == 60.0
    throttler.reset()

    # Case 4: Negative
    throttler.record_429(-5.0)
    assert throttler.state == CircuitState.OPEN
    assert throttler._last_retry_after == 60.0
    throttler.reset()

    # Case 5: 0.0
    throttler.record_429(0.0)
    assert throttler.state == CircuitState.OPEN
    assert throttler._last_retry_after == 60.0
    throttler.reset()


@pytest.mark.asyncio
async def test_circuit_breaker_half_open_recovery_and_re_trip() -> None:
    """
    Stress-test: Circuit Breaker lifecycle:
    CLOSED -> OPEN on 429 -> HALF_OPEN after cooldown ->
    Test A: Success resets to CLOSED
    Test B: 429 in HALF_OPEN immediately trips back to OPEN
    """
    short_cooldown = 0.15
    throttler = Throttler(max_rate=10, time_window=1.0)

    # 1. Trip to OPEN
    throttler.record_429(short_cooldown)
    assert throttler.state == CircuitState.OPEN

    # 2. Before cooldown: should raise PikPakRateLimitExceededException
    with pytest.raises(PikPakRateLimitExceededException):
        await throttler.acquire()

    # 3. Wait for cooldown to expire
    await asyncio.sleep(short_cooldown + 0.05)

    # 4. Next acquire transitions to HALF_OPEN and succeeds
    await throttler.acquire()
    assert throttler.state == CircuitState.HALF_OPEN

    # 5. Record success restores CLOSED
    throttler.record_success()
    assert throttler.state == CircuitState.CLOSED
    assert throttler.circuit_open_until == 0.0

    # 6. Re-trip from CLOSED
    throttler.record_429(short_cooldown)
    assert throttler.state == CircuitState.OPEN
    await asyncio.sleep(short_cooldown + 0.05)
    await throttler.acquire()
    assert throttler.state == CircuitState.HALF_OPEN

    # 7. Record 429 in HALF_OPEN re-trips to OPEN
    throttler.record_429(short_cooldown)
    assert throttler.state == CircuitState.OPEN


@pytest.mark.asyncio
async def test_circuit_breaker_half_open_enforces_single_probe() -> None:
    """
    Verified Fix for DEFECT-M1-ADV-3:
    In HALF_OPEN state, throttler restricts traffic to exactly ONE canary probe request.
    All concurrent requests arriving while the probe is in-flight are rejected with
    PikPakCircuitBreakerOpenError.
    """
    throttler = Throttler(max_rate=100, time_window=1.0)
    throttler.record_429(0.05)
    await asyncio.sleep(0.06)

    passed_count = 0
    rejected_errors: list[PikPakCircuitBreakerOpenError] = []

    async def worker() -> None:
        nonlocal passed_count
        try:
            await throttler.acquire()
            passed_count += 1
        except PikPakCircuitBreakerOpenError as exc:
            rejected_errors.append(exc)

    # Fire 5 concurrent requests into HALF_OPEN
    await asyncio.gather(*[worker() for _ in range(5)])

    # Exactly 1 probe allowed, 4 rejected
    assert passed_count == 1, f"Expected exactly 1 probe request, got {passed_count}"
    assert len(rejected_errors) == 4, f"Expected 4 rejected requests, got {len(rejected_errors)}"
    for err in rejected_errors:
        assert "Circuit is half-open; probe in progress" in str(err.message)
    assert throttler.state == CircuitState.HALF_OPEN
    assert throttler.probe_in_flight is True

    # Probe completes successfully -> circuit closes and resets probe_in_flight
    throttler.record_success()
    assert throttler.state == CircuitState.CLOSED
    assert throttler.probe_in_flight is False


# ===========================================================================
# 3. 3-TIER AUTH LOCKING UNDER HIGH CONCURRENCY (PREVENT LOGIN STORMS)
# ===========================================================================


@pytest.mark.asyncio
async def test_auth_lock_concurrent_login_storm_single_request(tmp_path: Path) -> None:
    """
    Adversarial test: 20 coroutines simultaneously calling ensure_authenticated()
    on a completely unauthenticated client.
    Must execute EXACTLY 1 captcha_init and EXACTLY 1 signin request.
    Zero duplicate signins allowed.
    """
    with respx.mock(assert_all_called=False) as respx_mock:
        captcha_route = respx_mock.post("https://user.mypikpak.com/v1/shield/captcha/init").respond(
            status_code=200,
            json={"captcha_token": "token_abc"},
        )
        login_route = respx_mock.post("https://user.mypikpak.com/v1/auth/signin").respond(
            status_code=200,
            json={
                "access_token": MOCK_JWT,
                "refresh_token": "ref_valid_123",
                "sub": "u_storm",
                "expires_in": 7200,
            },
        )

        client = PikPakApi(
            username="storm_user@example.com",
            password="storm_password",
            session_dir=tmp_path,
        )

        # Launch 20 concurrent demands
        tasks = [asyncio.create_task(client.ensure_authenticated()) for _ in range(20)]
        await asyncio.gather(*tasks)

        assert captcha_route.call_count == 1, (
            f"Expected 1 captcha_init, got {captcha_route.call_count}"
        )
        assert login_route.call_count == 1, (
            f"Expected 1 signin call, got {login_route.call_count}"
        )
        assert client.access_token == MOCK_JWT
        assert client.user_id == "u_storm"


@pytest.mark.asyncio
async def test_auth_lock_concurrent_expired_token_refresh(tmp_path: Path) -> None:
    """
    Adversarial test: 20 coroutines simultaneously calling ensure_authenticated()
    when access token is expired but refresh token is valid.
    Must execute EXACTLY 1 /v1/auth/token call, and ZERO /v1/auth/signin calls.
    """
    username = "refresh_storm@example.com"
    store = SessionStore(session_dir=tmp_path)
    store.save(
        username,
        {
            "access_token": "expired_jwt",
            "refresh_token": "refresh_tok_xyz",
            "expires_at": time.time() - 1000.0,
            "device_id": "dev_test",
            "user_id": "u_refresh",
        },
    )

    with respx.mock(assert_all_called=False) as respx_mock:
        token_route = respx_mock.post("https://user.mypikpak.com/v1/auth/token").respond(
            status_code=200,
            json={
                "access_token": "renewed_access_jwt",
                "refresh_token": "renewed_refresh_jwt",
                "sub": "u_refresh",
                "expires_in": 7200,
            },
        )
        signin_route = respx_mock.post("https://user.mypikpak.com/v1/auth/signin").respond(
            status_code=200,
            json={"access_token": "should_not_call"},
        )

        client = PikPakApi(
            username=username,
            password="secret_password",
            session_dir=tmp_path,
        )

        # Fire 20 concurrent calls
        tasks = [asyncio.create_task(client.ensure_authenticated()) for _ in range(20)]
        await asyncio.gather(*tasks)

        assert token_route.call_count == 1, (
            f"Expected exactly 1 refresh call, got {token_route.call_count}"
        )
        assert not signin_route.called, "Full signin must not be called when refresh succeeds!"
        assert client.access_token == "renewed_access_jwt"


@pytest.mark.asyncio
async def test_no_infinite_recursion_on_refresh_token_401() -> None:
    """
    DEFECT-M1-ADV-1 Resolution Verification:
    When /v1/auth/token returns 401 (e.g. invalid or expired refresh token),
    _handle_response() in client.py:321 detects that the request was to an auth
    endpoint and immediately raises PikpakAuthenticationError without recursively
    calling refresh_access_token().
    """
    with respx.mock(assert_all_called=False) as respx_mock:
        token_route = respx_mock.post("https://user.mypikpak.com/v1/auth/token").respond(
            status_code=401,
            json={"error": "unauthorized", "error_code": 16},
        )

        client = PikPakApi(
            username="test@example.com",
            password="pwd",
            refresh_token="expired_refresh_token",
        )
        client.throttler.max_rate = 1000  # Avoid throttling delay in test
        client.max_retries = 1

        with pytest.raises(PikpakAuthenticationError) as exc_info:
            await client.refresh_access_token()

        assert "authentication failed" in str(exc_info.value).lower()
        # Confirms zero recursion: exactly 1 HTTP request made!
        assert token_route.call_count == 1


@pytest.mark.asyncio
async def test_three_tier_auth_fallback_on_refresh_token_401(tmp_path: Path) -> None:
    """
    Verify 3-tier auth fallback:
    When access token is expired, ensure_authenticated() attempts refresh via /v1/auth/token.
    If /v1/auth/token returns 401, it catches PikpakAuthenticationError and falls back to
    username/password signin via /v1/auth/signin.
    """
    with respx.mock(assert_all_called=False) as respx_mock:
        token_route = respx_mock.post("https://user.mypikpak.com/v1/auth/token").respond(
            status_code=401,
            json={"error": "unauthorized", "error_code": 16},
        )
        captcha_route = respx_mock.post("https://user.mypikpak.com/v1/shield/captcha/init").respond(
            status_code=200,
            json={"captcha_token": "token_fall_back"},
        )
        signin_route = respx_mock.post("https://user.mypikpak.com/v1/auth/signin").respond(
            status_code=200,
            json={
                "access_token": MOCK_JWT,
                "refresh_token": "new_ref_tok",
                "sub": "u_fallback",
                "expires_in": 7200,
            },
        )

        client = PikPakApi(
            username="fallback@example.com",
            password="pwd",
            refresh_token="expired_ref",
            session_dir=tmp_path,
        )
        client.throttler.max_rate = 1000
        client.max_retries = 1

        await client.ensure_authenticated()

        assert token_route.call_count == 1
        assert captcha_route.call_count == 1
        assert signin_route.call_count == 1
        assert client.access_token == MOCK_JWT
        assert client.refresh_token == "new_ref_tok"
        assert client.user_id == "u_fallback"


@pytest.mark.asyncio
async def test_defect_missing_lock_on_refresh_access_token_causes_token_storm() -> None:
    """
    DEFECT-M1-ADV-2 (Critical):
    refresh_access_token() in auth.py:351 is guarded by AsyncRLock and double-checked
    token freshness. When multiple concurrent requests encounter 401, exactly 1 refresh
    request is fired to /v1/auth/token and the second request reuses the renewed token.
    """
    token_calls = 0
    with respx.mock(assert_all_called=False) as respx_mock:
        def fake_api(request: Any) -> Response:
            auth = request.headers.get("Authorization", "")
            if auth == "Bearer old_token":
                return Response(401, json={"error_code": 16, "error": "unauthorized"})
            return Response(200, json={"quota": {"limit": "100"}})

        respx_mock.get("https://api-drive.mypikpak.com/drive/v1/about").mock(side_effect=fake_api)

        async def fake_refresh(request: Any) -> Response:
            nonlocal token_calls
            token_calls += 1
            await asyncio.sleep(0.02)
            return Response(
                200,
                json={"access_token": MOCK_JWT, "refresh_token": f"ref_{token_calls}", "expires_in": 7200},
            )

        respx_mock.post("https://user.mypikpak.com/v1/auth/token").mock(side_effect=fake_refresh)

        client = PikPakApi(access_token="old_token", refresh_token="initial_ref")

        # Two concurrent requests get 401
        await asyncio.gather(client.get_quota_info(), client.get_quota_info())

        # Verifies concurrency lock + double-checked token freshness: exactly 1 refresh request was fired!
        assert token_calls == 1, f"Expected exactly 1 refresh call due to lock and double-check, got {token_calls}"


@pytest.mark.asyncio
async def test_auth_callback_exception_does_not_break_auth(tmp_path: Path) -> None:
    """
    Adversarial test: If external token_refresh_callback raises an exception
    (e.g., database network error), ensure_authenticated must NOT crash or fail to
    authenticate the client.
    """
    def failing_callback(data: Any) -> None:
        raise RuntimeError("Database connection died during token persistence!")

    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.post("https://user.mypikpak.com/v1/shield/captcha/init").respond(
            status_code=200,
            json={"captcha_token": "cap_cb"},
        )
        respx_mock.post("https://user.mypikpak.com/v1/auth/signin").respond(
            status_code=200,
            json={
                "access_token": MOCK_JWT,
                "refresh_token": "ref_cb",
                "sub": "u_cb",
                "expires_in": 7200,
            },
        )

        client = PikPakApi(
            username="cb_user@example.com",
            password="cb_password",
            session_dir=tmp_path,
            token_refresh_callback=failing_callback,
        )

        await client.ensure_authenticated()
        assert client.access_token == MOCK_JWT


@pytest.mark.asyncio
async def test_auth_lock_released_on_login_failure(tmp_path: Path) -> None:
    """
    Adversarial test: If credentials are wrong and signin fails with 401,
    the auth lock must be released so subsequent calls can retry and don't deadlock.
    """
    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.post("https://user.mypikpak.com/v1/shield/captcha/init").respond(
            status_code=200,
            json={"captcha_token": "cap_err"},
        )
        respx_mock.post("https://user.mypikpak.com/v1/auth/signin").respond(
            status_code=400,
            json={"error": "invalid_account_or_password", "error_description": "Bad credentials"},
        )

        client = PikPakApi(
            username="bad_user@example.com",
            password="wrong_password",
            session_dir=tmp_path,
        )

        with pytest.raises(PikpakAuthenticationError):
            await client.ensure_authenticated()

        assert not client._auth_lock.locked()
