"""
Integration tests for Share Link Bulk Deletion endpoint.
Covers:
- DELETE /shares/bulk (valid payload, empty/missing/invalid/oversized ids, cross-tenant isolation)
- Route ordering verification (/shares/bulk vs /shares/<share_id>)
- Auth and blocked user enforcement.
"""
from __future__ import annotations

import pytest

from app.core.auth import create_access_token
from app.core.config import AppConfig


@pytest.fixture
def other_user_headers():
    token = create_access_token(
        {"email": "other_user@example.com", "is_admin": False},
        AppConfig.JWT_SECRET_KEY,
    )
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


@pytest.fixture
def blocked_user_headers():
    token = create_access_token(
        {"email": "blocked@example.com", "is_admin": False},
        AppConfig.JWT_SECRET_KEY,
    )
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def test_bulk_delete_shares_success(test_client, auth_headers, memory_supabase):
    """Test bulk deleting multiple shares for authenticated user."""
    s1 = memory_supabase.store_share(
        url="file_s1",
        share_result={"share_id": "sh_1", "share_url": "https://mypikpak.com/s/sh_1"},
        user_email="user@example.com",
    )
    s2 = memory_supabase.store_share(
        url="file_s2",
        share_result={"share_id": "sh_2", "share_url": "https://mypikpak.com/s/sh_2"},
        user_email="user@example.com",
    )
    s3 = memory_supabase.store_share(
        url="file_s3",
        share_result={"share_id": "sh_3", "share_url": "https://mypikpak.com/s/sh_3"},
        user_email="user@example.com",
    )

    id1, id2, id3 = s1["id"], s2["id"], s3["id"]

    res = test_client.delete(
        "/shares/bulk",
        headers=auth_headers,
        json={"ids": [id1, id2]},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 2
    assert "2 share links deleted successfully" in data["message"]

    # Verify id1 and id2 are deleted from shares, id3 is kept
    remaining_ids = [s.get("id") for s in memory_supabase.shares]
    assert id1 not in remaining_ids
    assert id2 not in remaining_ids
    assert id3 in remaining_ids


def test_bulk_delete_shares_string_ids(test_client, auth_headers, memory_supabase):
    """Test bulk deleting accepting numeric string IDs."""
    s = memory_supabase.store_share(
        url="file_str_id",
        share_result={"share_id": "sh_str", "share_url": "https://mypikpak.com/s/sh_str"},
        user_email="user@example.com",
    )
    s_id = s["id"]

    res = test_client.delete(
        "/shares/bulk",
        headers=auth_headers,
        json={"ids": [str(s_id)]},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 1
    remaining_ids = [item.get("id") for item in memory_supabase.shares]
    assert s_id not in remaining_ids


def test_bulk_delete_shares_missing_or_empty_ids(test_client, auth_headers):
    """Test empty or missing ids array returns 400 Bad Request."""
    # Missing ids
    res1 = test_client.delete("/shares/bulk", headers=auth_headers, json={})
    assert res1.status_code == 400

    # Empty ids array
    res2 = test_client.delete("/shares/bulk", headers=auth_headers, json={"ids": []})
    assert res2.status_code == 400
    assert "non-empty" in res2.get_json()["message"]

    # Missing JSON body entirely
    res3 = test_client.delete(
        "/shares/bulk",
        headers={"Authorization": auth_headers["Authorization"]},
    )
    assert res3.status_code == 400


def test_bulk_delete_shares_invalid_types_and_bounds(test_client, auth_headers):
    """Test non-list, oversized, or non-numeric ids return 400."""
    # Non-list
    res_str = test_client.delete("/shares/bulk", headers=auth_headers, json={"ids": "123"})
    assert res_str.status_code == 400

    res_int = test_client.delete("/shares/bulk", headers=auth_headers, json={"ids": 123})
    assert res_int.status_code == 400

    # Oversized (> 500 items)
    res_oversized = test_client.delete(
        "/shares/bulk",
        headers=auth_headers,
        json={"ids": list(range(1, 502))},
    )
    assert res_oversized.status_code == 400
    assert "500" in res_oversized.get_json()["message"]

    # Non-numeric string
    res_alpha = test_client.delete(
        "/shares/bulk",
        headers=auth_headers,
        json={"ids": ["invalid_alpha"]},
    )
    assert res_alpha.status_code == 400

    # Boolean item
    res_bool = test_client.delete(
        "/shares/bulk",
        headers=auth_headers,
        json={"ids": [False, 123]},
    )
    assert res_bool.status_code == 400


def test_bulk_delete_shares_unauthenticated(test_client):
    """Test unauthenticated request returns 401."""
    res = test_client.delete("/shares/bulk", json={"ids": [1, 2]})
    assert res.status_code == 401


def test_bulk_delete_shares_blocked_user(test_client, blocked_user_headers):
    """Test blocked user cannot perform bulk delete."""
    res = test_client.delete(
        "/shares/bulk",
        headers=blocked_user_headers,
        json={"ids": [1, 2]},
    )
    assert res.status_code == 403
    assert res.get_json()["error"] == "Account blocked"


def test_bulk_delete_shares_cross_tenant_isolation(
    test_client, auth_headers, other_user_headers, memory_supabase
):
    """Test User B cannot delete User A's shares."""
    s_a = memory_supabase.store_share(
        url="file_user_a",
        share_result={"share_id": "sh_a", "share_url": "https://mypikpak.com/s/sh_a"},
        user_email="user@example.com",
    )
    s_a_id = s_a["id"]

    # Other user attempts to bulk delete User A's share
    res = test_client.delete(
        "/shares/bulk",
        headers=other_user_headers,
        json={"ids": [s_a_id]},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 0

    # User A's share must still exist
    remaining_ids = [s.get("id") for s in memory_supabase.shares]
    assert s_a_id in remaining_ids


def test_route_ordering_bulk_vs_single_share(test_client, auth_headers, memory_supabase):
    """Verify DELETE /shares/bulk routes to bulk handler and NOT /shares/<share_id>."""
    s = memory_supabase.store_share(
        url="file_route_order",
        share_result={"share_id": "sh_route", "share_url": "https://mypikpak.com/s/sh_route"},
        user_email="user@example.com",
    )
    s_id = s["id"]

    # Send DELETE /shares/bulk with JSON body: should execute delete_shares_bulk, not delete_share
    res_bulk = test_client.delete(
        "/shares/bulk",
        headers=auth_headers,
        json={"ids": [s_id]},
    )
    assert res_bulk.status_code == 200
    data = res_bulk.get_json()
    assert data["success"] is True
    assert "count" in data
    assert data["count"] == 1

    # Now verify single share delete still functions for regular IDs
    s_single = memory_supabase.store_share(
        url="file_single_order",
        share_result={"share_id": "sh_single_123", "share_url": "https://mypikpak.com/s/sh_single_123"},
        user_email="user@example.com",
    )
    res_single = test_client.delete(
        f"/shares/{s_single['id']}",
        headers=auth_headers,
    )
    assert res_single.status_code == 200
    assert res_single.get_json()["success"] is True
    assert "count" not in res_single.get_json()
