"""
Comprehensive Security and Hardening Integration Test Suite.
Validates:
1. Multi-worker JWT secret persistence and host-derived fallback.
2. POSIX $USER vs PIKPAK_USER / PIKPAK_USERNAME environment precedence.
3. @internal_only reverse proxy and anti-IP spoofing protections.
4. RBAC security enforcement on all /admin/* endpoints.
5. JWT cryptographic integrity (tampered signature, expired tokens, none alg).
6. Input sanitization (XSS in URL, SQL injection strings in email, path traversal in IDs).
"""
from __future__ import annotations

import datetime

import jwt

from app.core.auth import hash_password
from app.core.config import AppConfig, _resolve_jwt_secret

# ==============================================================================
# 1. Multi-Worker Secret & Config Precedence Tests
# ==============================================================================

def test_jwt_secret_persistence_and_deterministic_sharing(tmp_path, monkeypatch):
    """Test that multiple worker invocations without env var load the identical persisted secret."""
    secret_dir = tmp_path / "secret_proj"
    secret_dir.mkdir()
    secret_file = secret_dir / ".jwt_secret"

    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)

    monkeypatch.setenv("PIKPAK_PROJECT_ROOT", str(secret_dir))

    # First worker resolves secret -> generates and creates .jwt_secret
    k1 = _resolve_jwt_secret(secret_dir)
    assert len(k1) >= 64
    assert secret_file.exists()

    # Second worker resolves secret -> reads identical key from .jwt_secret
    k2 = _resolve_jwt_secret(secret_dir)
    assert k1 == k2

    # Verify a token created with k1 is verifiable with k2
    payload = {"sub": "user_123", "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1)}
    token = jwt.encode(payload, k1, algorithm="HS256")
    decoded = jwt.decode(token, k2, algorithms=["HS256"])
    assert decoded["sub"] == "user_123"


def test_pikpak_user_environment_precedence(monkeypatch):
    """Verify that domain-explicit PIKPAK_USER / PIKPAK_USERNAME override POSIX $USER."""
    # Simulate Linux host where USER=ubuntu or root
    monkeypatch.setenv("USER", "ubuntu")
    monkeypatch.setenv("PIKPAK_USER", "pikpak_operator@domain.com")
    monkeypatch.setenv("PIKPAK_PASS", "secret_pass_123")

    from app.core.client import create_client_from_env

    client = create_client_from_env()
    assert client.username == "pikpak_operator@domain.com"


# ==============================================================================
# 2. Anti-IP Spoofing & Trusted Proxy Tests
# ==============================================================================

def test_internal_only_untrusted_peer_spoofed_forwarded_for_blocked(test_client):
    """Untrusted peer (e.g. 203.0.113.50) claiming X-Forwarded-For: 127.0.0.1 must be rejected."""
    res = test_client.get(
        "/webdav/applications",
        headers={"X-Forwarded-For": "127.0.0.1"},
        environ_overrides={"REMOTE_ADDR": "203.0.113.50"},
    )
    assert res.status_code == 403
    assert res.get_json()["error"] == "Access denied"


def test_internal_only_trusted_proxy_external_client_blocked(test_client):
    """Trusted proxy (10.0.0.1) forwarding real external client IP must be rejected."""
    res = test_client.get(
        "/webdav/applications",
        headers={"X-Forwarded-For": "203.0.113.88, 10.0.0.1"},
        environ_overrides={"REMOTE_ADDR": "10.0.0.1"},
    )
    assert res.status_code == 403


def test_internal_only_external_client_with_forged_loopback_header_blocked(test_client):
    """External client sending forged loopback header behind trusted proxy must be rejected (403)."""
    res = test_client.get(
        "/webdav/applications",
        headers={"X-Forwarded-For": "127.0.0.1, 203.0.113.50"},
        environ_overrides={"REMOTE_ADDR": "10.0.0.1"},
    )
    assert res.status_code == 403
    assert res.get_json()["error"] == "Access denied"


def test_internal_only_trusted_proxy_private_docker_subnet_allowed(test_client):
    """Trusted proxy forwarding internal container IP (RFC 1918 172.18.0.5) must be authorized."""
    res = test_client.get(
        "/webdav/applications",
        headers={"X-Forwarded-For": "172.18.0.5"},
        environ_overrides={"REMOTE_ADDR": "10.0.0.1"},
    )
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"


def test_internal_only_internal_api_key_bypass(test_client, internal_headers):
    """Requests originating from any IP with valid X-Internal-Token header must be authorized."""
    res = test_client.get(
        "/webdav/applications",
        headers=internal_headers,
        environ_overrides={"REMOTE_ADDR": "198.51.100.99"},
    )
    assert res.status_code == 200


# ==============================================================================
# 3. RBAC Admin Security Enforcement Tests
# ==============================================================================

def test_admin_routes_reject_unauthenticated(test_client):
    """All /admin endpoints must reject requests without tokens (401)."""
    assert test_client.get("/admin/users").status_code == 401
    assert test_client.get("/admin/stats/overview").status_code == 401
    assert test_client.post("/admin/users/test@example.com/block").status_code == 401
    assert test_client.post("/admin/users/test@example.com/unblock").status_code == 401
    assert test_client.delete("/admin/tasks/1").status_code == 401


def test_admin_routes_reject_non_admin_users(test_client, auth_headers):
    """Normal users with valid tokens attempting to access /admin routes must be forbidden (403)."""
    assert test_client.get("/admin/users", headers=auth_headers).status_code == 403
    assert test_client.get("/admin/stats/overview", headers=auth_headers).status_code == 403
    assert test_client.post("/admin/users/other@example.com/block", headers=auth_headers).status_code == 403
    assert test_client.post("/admin/users/other@example.com/unblock", headers=auth_headers).status_code == 403
    assert test_client.delete("/admin/tasks/1", headers=auth_headers).status_code == 403


def test_admin_users_list_and_stats_success(test_client, admin_headers):
    """Admin users with admin tokens can access admin endpoints."""
    # List users
    res_users = test_client.get("/admin/users", headers=admin_headers)
    assert res_users.status_code == 200
    assert "users" in res_users.get_json()

    # Overview stats
    res_stats = test_client.get("/admin/stats/overview", headers=admin_headers)
    assert res_stats.status_code == 200
    stats = res_stats.get_json()
    assert "total_users" in stats
    assert "total_tasks" in stats


def test_admin_block_and_unblock_user(test_client, admin_headers, memory_supabase):
    """Admin can block and unblock user accounts."""
    memory_supabase.create_user("target@example.com", hash_password("pass12345"), is_admin=False)

    # Block user
    res_block = test_client.post("/admin/users/target@example.com/block", headers=admin_headers)
    assert res_block.status_code == 200
    assert memory_supabase.get_user_by_email("target@example.com")["blocked"] is True

    # Unblock user
    res_unblock = test_client.post("/admin/users/target@example.com/unblock", headers=admin_headers)
    assert res_unblock.status_code == 200
    assert memory_supabase.get_user_by_email("target@example.com")["blocked"] is False


# ==============================================================================
# 4. JWT Cryptographic Integrity Tests
# ==============================================================================

def test_jwt_tampered_signature_rejected(test_client, user_token):
    """Tampering with signature characters in JWT must be rejected with 401."""
    tampered = user_token[:-4] + "abcd"
    res = test_client.get("/me", headers={"Authorization": f"Bearer {tampered}"})
    assert res.status_code == 401


def test_jwt_expired_token_rejected(test_client):
    """Token with expiration in the past must be rejected with 401."""
    expired_payload = {
        "email": "user@example.com",
        "is_admin": False,
        "exp": datetime.datetime.now(datetime.UTC) - datetime.timedelta(seconds=10),
    }
    expired_token = jwt.encode(expired_payload, AppConfig.JWT_SECRET_KEY, algorithm="HS256")
    res = test_client.get("/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401


def test_jwt_none_algorithm_attack_rejected(test_client):
    """Token crafted with alg: none must be rejected."""
    none_token = (
        "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0."
        "eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwiaXNfYWRtaW4iOnRydWUsImV4cCI6OTk5OTk5OTk5OX0."
    )
    res = test_client.get("/admin/users", headers={"Authorization": f"Bearer {none_token}"})
    assert res.status_code == 401


# ==============================================================================
# 5. Input Sanitization & Boundary Negative Tests
# ==============================================================================

def test_input_sanitization_sqli_in_email(test_client):
    """SQL injection / control characters in email must be rejected by validate_email with 400."""
    sqli_email = "' OR 1=1; DROP TABLE users;--"
    res = test_client.post("/register", json={"email": sqli_email, "password": "securePassword123"})
    assert res.status_code == 400
    assert "email" in res.get_json()["error"].lower()


def test_input_sanitization_xss_in_url(test_client, auth_headers):
    """XSS injection payloads in /add URL must be rejected with 400."""
    xss_url = "<script>alert('pwned')</script>"
    res = test_client.post("/add", headers=auth_headers, json={"url": xss_url})
    assert res.status_code == 400


def test_input_sanitization_path_traversal_in_share_id(test_client, auth_headers):
    """Path traversal sequences in /share ID must be rejected with 400."""
    traversal_id = "../../etc/shadow"
    res = test_client.post("/share", headers=auth_headers, json={"id": traversal_id})
    assert res.status_code == 400
    assert "traversal" in res.get_json()["message"].lower() or "identifier" in res.get_json()["message"].lower()
