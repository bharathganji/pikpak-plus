"""
Unit and integration tests for PikPak Login Cooldown Recovery and Supabase Token Refresh.
Validates:
1. _try_use_existing_token() refreshes via refresh_token when access_token is None or expired.
2. ensure_logged_in() recovers via refresh_token even during active rate-limit cooldown.
3. Redis DistributedLoginLock accurately calculates cooldown using Redis TTL (handling both 120s and 300s).
4. _clear_persistence() is non-destructive to Supabase tokens.
5. _is_auth_error() correctly matches auth errors and excludes generic 'invalid' messages.
6. RateLimitError backoff in _execute_with_retry respects cooldown duration.
7. Quota route returns 429 during active RateLimitError and serves stale cached quota when available.
8. _perform_login() safely guards against missing credentials in production.
"""
from __future__ import annotations

import time
from unittest.mock import AsyncMock, MagicMock

import pytest
from app.services.pikpak_service import PikPakService, RateLimitError
from app.utils.redis_lock import DistributedLoginLock


@pytest.fixture
def mock_service(monkeypatch):
    """Fixture providing PikPakService with mocked client and Supabase."""
    monkeypatch.setenv("PIKPAK_USER", "test_user@example.com")
    monkeypatch.setenv("PIKPAK_PASS", "test_password_123")
    service = PikPakService("test_user@example.com", "test_password_123")
    service.client = MagicMock()
    service.client.access_token = None
    service.client.refresh_token = "valid_refresh_token_abc"
    service.client.user_id = "test_user_id"
    service.client.captcha_token = "valid_captcha_token"
    service.client.captcha_tokens = {"GET:/drive/v1/about": {"token": "captcha", "expires_at": time.time() + 300}}
    return service


@pytest.mark.asyncio
async def test_try_use_existing_token_with_refresh_token(mock_service, monkeypatch):
    """Test that missing access_token triggers proactive refresh via refresh_token."""
    mock_service.client.access_token = None
    mock_service.client.refresh_token = "valid_refresh_token_123"

    refresh_called = False

    async def mock_refresh():
        nonlocal refresh_called
        refresh_called = True
        mock_service.client.access_token = "new_access_token"

    mock_service.refresh_token_if_needed = mock_refresh

    result = await mock_service._try_use_existing_token()
    assert result is True
    assert refresh_called is True


@pytest.mark.asyncio
async def test_try_use_existing_token_hydrates_refresh_token_from_token_manager(mock_service, monkeypatch):
    """Test that missing client.refresh_token is hydrated from TokenManager before giving up."""
    mock_service.client.access_token = None
    mock_service.client.refresh_token = None

    mock_tm = MagicMock()
    mock_tm.get_all_tokens.return_value = {
        "access_token": None,
        "refresh_token": "hydrated_refresh_token_from_tm",
        "user_id": "test_uid",
    }
    monkeypatch.setattr("app.core.token_manager.get_token_manager", lambda: mock_tm)

    refresh_called = False

    async def mock_refresh():
        nonlocal refresh_called
        refresh_called = True
        mock_service.client.access_token = "fresh_token_after_hydration"

    mock_service.refresh_token_if_needed = mock_refresh

    result = await mock_service._try_use_existing_token()
    assert result is True
    assert refresh_called is True
    assert mock_service.client.refresh_token == "hydrated_refresh_token_from_tm"


@pytest.mark.asyncio
async def test_ensure_logged_in_recovers_during_cooldown_using_refresh(mock_service, monkeypatch):
    """Test that an active signin cooldown does not block token refresh."""
    mock_lock = MagicMock()
    mock_lock.is_token_still_valid.return_value = False
    mock_lock.is_in_cooldown.return_value = True
    mock_lock.is_locked.return_value = False
    mock_lock.get_cooldown_remaining.return_value = 240.0
    monkeypatch.setattr("app.services.pikpak_service.get_login_lock", lambda: mock_lock)

    # In cooldown, initially no tokens in memory (so Step 1 fails)
    mock_service.client.access_token = None
    mock_service.client.refresh_token = None

    mock_tm = MagicMock()
    # First call in Step 1 returns empty, subsequent call in Step 3 returns refresh token
    mock_tm.get_all_tokens.side_effect = [
        {"access_token": None, "refresh_token": None, "user_id": None},
        {"access_token": None, "refresh_token": "supabase_cooldown_refresh_token", "user_id": "test_user_id"},
        {"access_token": None, "refresh_token": "supabase_cooldown_refresh_token", "user_id": "test_user_id"},
    ]
    monkeypatch.setattr("app.core.token_manager.get_token_manager", lambda: mock_tm)

    async def mock_refresh_needed():
        mock_service.client.access_token = "fresh_access_token_during_cooldown"

    mock_service.refresh_token_if_needed = mock_refresh_needed

    client = await mock_service.ensure_logged_in(force_refresh=False)
    assert client == mock_service.client
    assert mock_service.client.access_token == "fresh_access_token_during_cooldown"
    mock_lock.clear_cooldown.assert_called_once()


@pytest.mark.asyncio
async def test_ensure_logged_in_raises_rate_limit_error_when_no_refresh_token_in_cooldown(mock_service, monkeypatch):
    """Test that when truly no tokens exist in cooldown, RateLimitError is raised with remaining seconds."""
    mock_lock = MagicMock()
    mock_lock.is_token_still_valid.return_value = False
    mock_lock.is_in_cooldown.return_value = True
    mock_lock.is_locked.return_value = False
    mock_lock.get_cooldown_remaining.return_value = 185.0
    monkeypatch.setattr("app.services.pikpak_service.get_login_lock", lambda: mock_lock)

    mock_service.client.access_token = None
    mock_service.client.refresh_token = None

    mock_tm = MagicMock()
    mock_tm.get_all_tokens.return_value = {
        "access_token": None,
        "refresh_token": None,
        "user_id": None,
    }
    monkeypatch.setattr("app.core.token_manager.get_token_manager", lambda: mock_tm)

    with pytest.raises(RateLimitError, match="185s remaining"):
        await mock_service.ensure_logged_in(force_refresh=False)


def test_redis_lock_ttl_cooldown():
    """Test DistributedLoginLock is_in_cooldown and get_cooldown_remaining against TTL."""
    lock = DistributedLoginLock()
    mock_redis = MagicMock()
    lock._redis = mock_redis

    # Key exists with 280 seconds TTL (rate limit cooldown)
    mock_redis.ttl.return_value = 280
    assert lock.is_in_cooldown() is True
    assert lock.get_cooldown_remaining() == 280.0

    # Key expired / does not exist
    mock_redis.ttl.return_value = -2
    assert lock.is_in_cooldown() is False
    assert lock.get_cooldown_remaining() == 0.0


def test_clear_persistence_is_non_destructive_to_supabase(mock_service, monkeypatch):
    """Test that _clear_persistence only clears in-memory state and does NOT delete Supabase rows."""
    mock_tm = MagicMock()
    monkeypatch.setattr("app.core.token_manager.get_token_manager", lambda: mock_tm)

    mock_service.client.access_token = "some_token"
    mock_service.client.refresh_token = "keep_refresh_fallback"

    mock_service._clear_persistence()

    assert mock_service.client.access_token is None
    # TokenManager.clear_tokens must NOT have been called
    mock_tm.clear_tokens.assert_not_called()


def test_is_auth_error_filtering(mock_service):
    """Test that _is_auth_error matches true auth errors and ignores generic 'invalid' messages."""
    assert mock_service._is_auth_error("Unauthorized: 401") is True
    assert mock_service._is_auth_error("Token is invalid or expired") is True
    assert mock_service._is_auth_error("Verification code is invalid") is True
    assert mock_service._is_auth_error("invalid_grant: bad token") is True

    # Generic non-auth errors with 'invalid' should NOT trigger auth recovery
    assert mock_service._is_auth_error("Invalid file ID") is False
    assert mock_service._is_auth_error("Invalid URL format") is False
    assert mock_service._is_auth_error("Invalid parameter: limit must be an integer") is False
    assert mock_service._is_auth_error("Invalid torrent hash") is False


@pytest.mark.asyncio
async def test_quota_route_rate_limit_handling(monkeypatch):
    """Test that quota route returns HTTP 429 when RateLimitError occurs."""
    from app.api.routes.quota import bp
    from flask import Flask

    app = Flask(__name__)
    app.register_blueprint(bp)

    mock_service = MagicMock()
    mock_service.get_quota_info = AsyncMock(side_effect=RateLimitError("Login cooldown active (200s remaining)"))
    mock_service.get_transfer_quota = AsyncMock(side_effect=RateLimitError("Login cooldown active (200s remaining)"))

    mock_cache = MagicMock()
    mock_cache.get.return_value = None  # Cache miss

    monkeypatch.setattr("app.api.routes.quota.get_pikpak_service", lambda: mock_service)
    monkeypatch.setattr("app.api.routes.quota.get_cache_manager", lambda: mock_cache)

    with app.test_client() as test_client:
        resp = test_client.get("/quota")
        assert resp.status_code == 429
        data = resp.get_json()
        assert data["error"] == "Rate limit cooldown active"
        assert "200s remaining" in data["message"]


@pytest.mark.asyncio
async def test_quota_route_serves_stale_cache_on_rate_limit(monkeypatch):
    """Test that quota route falls back to stale cache when RateLimitError occurs."""
    from app.api.routes.quota import bp
    from flask import Flask

    app = Flask(__name__)
    app.register_blueprint(bp)

    mock_service = MagicMock()
    mock_service.get_quota_info = AsyncMock(side_effect=RateLimitError("Login cooldown active"))

    cached_data = {
        "storage": {"quota": {"total": 10000000000, "used": 5000000000}},
        "transfer": {"quota": {"total": 5000000000, "used": 1000000000}},
        "cached_at": "2026-11-02T03:00:00+00:00",
    }
    mock_cache = MagicMock()
    # Cache miss on initial check to simulate fresh fetch attempt, but returns stale cache in fallback
    mock_cache.get.side_effect = [None, cached_data]
    mock_cache.get_ttl.return_value = 0

    monkeypatch.setattr("app.api.routes.quota.get_pikpak_service", lambda: mock_service)
    monkeypatch.setattr("app.api.routes.quota.get_cache_manager", lambda: mock_cache)

    with app.test_client() as test_client:
        resp = test_client.get("/quota")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "storage" in data
        assert "refresh_info" in data


@pytest.mark.asyncio
async def test_perform_login_without_credentials_raises_rate_limit_error(mock_service):
    """Test that _perform_login raises RateLimitError when username/password are not set."""
    mock_service.client.username = None
    mock_service.client.password = None

    with pytest.raises(RateLimitError, match="credentials .* are not configured"):
        await mock_service._perform_login()


@pytest.mark.asyncio
async def test_execute_with_retry_cooldown_backoff(mock_service, monkeypatch):
    """Test that _execute_with_retry detects login cooldown and uses cooldown-aware delay."""
    # Ensure client has a valid token so ensure_logged_in succeeds
    mock_service.client.access_token = "valid_token_for_retry_test"
    mock_service.client.refresh_token = "valid_refresh"
    monkeypatch.setattr("app.services.pikpak_service.is_token_expired", lambda token, buffer_seconds=300: False)

    mock_lock = MagicMock()
    mock_lock.is_locked.return_value = False
    mock_lock.wait_for_lock_release = AsyncMock()
    mock_lock.get_cooldown_remaining.return_value = 25.0
    monkeypatch.setattr("app.services.pikpak_service.get_login_lock", lambda: mock_lock)

    sleep_delays = []

    async def mock_sleep(seconds):
        sleep_delays.append(seconds)

    monkeypatch.setattr("asyncio.sleep", mock_sleep)

    call_count = 0

    async def failing_operation(*_args, **_kwargs):
        nonlocal call_count
        call_count += 1
        if call_count < 2:
            raise RateLimitError("Login cooldown active (25s remaining)")
        return "success"

    result = await mock_service._execute_with_retry(failing_operation, max_retries=2)
    assert result == "success"
    assert len(sleep_delays) == 1
    # Base delay is 25.0 plus up to 10% jitter
    assert 25.0 <= sleep_delays[0] <= 28.0
