"""
Pytest configuration and hermetic mock fixtures for pikpak-plus-server tests.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
import respx

from PikPakAPI import PikPakApi, Throttler

MOCK_JWT = (
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJzdWIiOiJ1c2VyMTIzNDUiLCJuYW1lIjoidGVzdHVzZXIiLCJleHAiOjE5MDAwMDAwMDB9."
    "c2lnbmF0dXJl"
)

MOCK_REFRESH_TOKEN = "mock_refresh_token_abcdef123456"
MOCK_DEVICE_ID = "test_device_e2e_001"


@pytest.fixture
def mock_api():
    """Provides a hermetic respx mock router capturing all outgoing HTTP requests."""
    with respx.mock(assert_all_called=False) as respx_mock:
        yield respx_mock


@pytest.fixture
def client(tmp_path: Path) -> PikPakApi:
    """
    Standard test client pre-initialized with valid JWT and zero-latency backoff.
    """
    return PikPakApi(
        access_token=MOCK_JWT,
        refresh_token=MOCK_REFRESH_TOKEN,
        device_id=MOCK_DEVICE_ID,
        session_dir=tmp_path,
        request_initial_backoff=0.001,
        request_max_retries=2,
    )


@pytest.fixture
def isolated_throttler() -> Throttler:
    """Isolated throttler instance for rate limit timing and circuit breaker testing."""
    return Throttler(max_rate=5.0, time_window=0.1)


@pytest.fixture
def webdav_sample_data() -> dict[str, Any]:
    """Sample WebDAV application payloads matching PikPak WebDAV API schemas."""
    return {
        "applications": {
            "status": "ok",
            "enabled": True,
            "applications": [
                {
                    "username": "dav_user_mercury",
                    "password": "masked_password_xyz",
                    "name": "Mercury Client",
                    "read_only": False,
                    "status": "active",
                },
                {
                    "username": "dav_user_venus",
                    "password": "masked_password_abc",
                    "name": "Venus TV Client",
                    "read_only": True,
                    "status": "active",
                },
            ],
        },
        "toggle_on": {"status": "ok", "enabled": True},
        "toggle_off": {"status": "ok", "enabled": False},
        "created_app": {
            "status": "ok",
            "application": {
                "username": "dav_user_mars",
                "password": "plaintext_gen_pass_789",
                "name": "Mars Streamer",
                "read_only": False,
            },
        },
        "delete_ok": {"status": "ok", "deleted": True},
        "modify_ok": {
            "status": "ok",
            "application": {
                "username": "dav_user_mercury",
                "read_only": True,
            },
        },
    }


# ==============================================================================
# Route Integration Test Fixtures
# ==============================================================================

@pytest.fixture
def memory_supabase():
    """Provides an isolated, in-memory SupabaseService with default test users."""
    from app.core.auth import hash_password
    from tests.mock_services import MemorySupabaseService

    service = MemorySupabaseService()
    # Seed default test users
    service.create_user("user@example.com", hash_password("userPassword123"), is_admin=False)
    service.create_user("admin@example.com", hash_password("adminPassword123"), is_admin=True)
    service.create_user("blocked@example.com", hash_password("userPassword123"), is_admin=False)
    service.update_user_blocked_status("blocked@example.com", True)
    return service


@pytest.fixture
def memory_redis():
    """Provides an isolated in-memory Redis client."""
    from tests.mock_services import MemoryRedisClient
    return MemoryRedisClient()


@pytest.fixture
def memory_cache(memory_redis):
    """Provides an isolated CacheManager using in-memory Redis."""
    from tests.mock_services import MemoryCacheManager
    mgr = MemoryCacheManager(ttl=3600)
    mgr.redis_client = memory_redis
    return mgr


@pytest.fixture
def mock_pikpak():
    """Provides an isolated MockPikPakService."""
    from tests.mock_services import MockPikPakService
    return MockPikPakService()


@pytest.fixture
def mock_webdav(mock_pikpak):
    """Provides an isolated MockWebDAVManager."""
    from tests.mock_services import MockWebDAVManager
    return MockWebDAVManager(pikpak_service=mock_pikpak)


@pytest.fixture
def flask_app(memory_supabase, memory_redis, memory_cache, mock_pikpak, mock_webdav):
    """Provides a fully configured Flask application wired with in-memory services."""
    from flask import Flask

    from app.api.routes import api_bp, init_routes
    from app.core.config import AppConfig

    AppConfig.INTERNAL_API_KEY = "test-internal-token-secret"
    AppConfig.TRUSTED_PROXIES = "10.0.0.1,192.168.1.1"
    AppConfig.JWT_SECRET_KEY = "test_jwt_secret_key_fixed_length_32_bytes_min"
    AppConfig.SUPABASE_URL = "https://mock.supabase.co"
    AppConfig.SUPABASE_KEY = "mock-anon-key"
    AppConfig.PIKPAK_USER = "test_pikpak_user"
    AppConfig.PIKPAK_PASS = "test_pikpak_pass"

    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["DEBUG"] = False

    # Initialize dependencies
    init_routes(
        pikpak_service=mock_pikpak,
        supabase_service=memory_supabase,
        cache_manager=memory_cache,
        scheduler=None,
        webdav_manager=mock_webdav,
        redis_client=memory_redis,
    )

    # Register blueprints if not registered
    if "api" not in app.blueprints:
        app.register_blueprint(api_bp, url_prefix="/")
        app.register_blueprint(api_bp, url_prefix="/api", name="api_prefix")

    return app


@pytest.fixture
def test_client(flask_app):
    """Provides a Flask test client."""
    return flask_app.test_client()


@pytest.fixture
def user_token(flask_app):
    """Generates a valid JWT for regular user."""
    from app.core.auth import create_access_token
    from app.core.config import AppConfig
    return create_access_token(
        {"email": "user@example.com", "is_admin": False},
        AppConfig.JWT_SECRET_KEY,
    )


@pytest.fixture
def admin_token(flask_app):
    """Generates a valid JWT for admin user."""
    from app.core.auth import create_access_token
    from app.core.config import AppConfig
    return create_access_token(
        {"email": "admin@example.com", "is_admin": True},
        AppConfig.JWT_SECRET_KEY,
    )


@pytest.fixture
def auth_headers(user_token):
    """Headers for regular authenticated user."""
    return {
        "Authorization": f"Bearer {user_token}",
        "Content-Type": "application/json",
    }


@pytest.fixture
def admin_headers(admin_token):
    """Headers for admin authenticated user."""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }


@pytest.fixture
def internal_headers():
    """Headers with valid internal API key."""
    return {
        "X-Internal-Token": "test-internal-token-secret",
        "Content-Type": "application/json",
    }

