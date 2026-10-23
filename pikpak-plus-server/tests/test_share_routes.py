"""
Integration tests for Share API routes.
Covers: POST /share, input validation, global deduplication, and auth enforcement.
"""
from __future__ import annotations


def test_create_share_success(test_client, auth_headers):
    """Test creating a new share link with valid parameters."""
    res = test_client.post(
        "/share",
        headers=auth_headers,
        json={"id": "file_test_share_001", "need_password": False},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert "share_url" in data or "share_id" in data


def test_create_share_unauthenticated(test_client):
    """Test creating a share without authentication is rejected."""
    res = test_client.post("/share", json={"id": "file_001"})
    assert res.status_code == 401


def test_create_share_blocked_user(test_client):
    """Test blocked user cannot create shares."""
    from app.core.auth import create_access_token
    from app.core.config import AppConfig

    blocked_token = create_access_token(
        {"email": "blocked@example.com", "is_admin": False},
        AppConfig.JWT_SECRET_KEY,
    )
    headers = {"Authorization": f"Bearer {blocked_token}", "Content-Type": "application/json"}
    res = test_client.post("/share", headers=headers, json={"id": "file_001"})
    assert res.status_code == 403
    assert res.get_json()["error"] == "Account blocked"


def test_create_share_missing_id(test_client, auth_headers):
    """Test creating a share with missing id parameter."""
    res = test_client.post("/share", headers=auth_headers, json={})
    assert res.status_code == 400
    assert "id" in res.get_json()["error"].lower()


def test_create_share_global_deduplication(test_client, auth_headers, memory_supabase):
    """Test that existing share for a file is returned without duplicate creation."""
    # Pre-seed a share in memory_supabase
    existing = {
        "file_id": "file_dedup_001",
        "share_id": "share_existing_111",
        "share_url": "https://mypikpak.com/s/share_existing_111",
    }
    memory_supabase.store_share(
        url="file_dedup_001",
        share_result=existing,
        user_email="other_user@example.com",
    )

    # Calling /share for same file should return existing share
    res = test_client.post(
        "/share",
        headers=auth_headers,
        json={"id": "file_dedup_001"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data.get("share_id") == "share_existing_111"

