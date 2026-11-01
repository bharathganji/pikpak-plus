"""
Integration tests for User Task Bulk & Single Deletion endpoints.
Covers:
- DELETE /tasks/bulk (valid payload, empty/missing/invalid/oversized ids, cross-tenant isolation)
- DELETE /tasks/<int:task_id> (owner deletion, cross-tenant isolation, 404 non-existent)
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


def test_bulk_delete_tasks_success(test_client, auth_headers, memory_supabase):
    """Test bulk deleting multiple tasks for the authenticated user."""
    t1 = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:bulk1",
        task_result={"id": "task_b1"},
        user_email="user@example.com",
    )
    t2 = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:bulk2",
        task_result={"id": "task_b2"},
        user_email="user@example.com",
    )
    t3 = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:bulk3",
        task_result={"id": "task_b3"},
        user_email="user@example.com",
    )

    id1, id2, id3 = t1["id"], t2["id"], t3["id"]

    res = test_client.delete(
        "/tasks/bulk",
        headers=auth_headers,
        json={"ids": [id1, id2]},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 2
    assert "2 tasks deleted successfully" in data["message"]

    # Verify id1 and id2 are gone, id3 remains
    assert memory_supabase.get_action_by_id(id1) is None
    assert memory_supabase.get_action_by_id(id2) is None
    assert memory_supabase.get_action_by_id(id3) is not None


def test_bulk_delete_tasks_string_ids(test_client, auth_headers, memory_supabase):
    """Test bulk deleting accepting numeric string IDs."""
    t = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:str_id_test",
        task_result={"id": "task_str_1"},
        user_email="user@example.com",
    )
    t_id = t["id"]

    res = test_client.delete(
        "/tasks/bulk",
        headers=auth_headers,
        json={"ids": [str(t_id)]},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 1
    assert memory_supabase.get_action_by_id(t_id) is None


def test_bulk_delete_tasks_missing_or_empty_ids(test_client, auth_headers):
    """Test empty or missing ids array returns 400 Bad Request."""
    # Missing ids
    res1 = test_client.delete("/tasks/bulk", headers=auth_headers, json={})
    assert res1.status_code == 400

    # Empty ids array
    res2 = test_client.delete("/tasks/bulk", headers=auth_headers, json={"ids": []})
    assert res2.status_code == 400
    assert "non-empty" in res2.get_json()["message"]

    # Missing JSON body entirely
    res3 = test_client.delete(
        "/tasks/bulk",
        headers={"Authorization": auth_headers["Authorization"]},
    )
    assert res3.status_code == 400


def test_bulk_delete_tasks_invalid_types_and_bounds(test_client, auth_headers):
    """Test non-list, oversized, or non-numeric ids return 400."""
    # Non-list
    res_str = test_client.delete("/tasks/bulk", headers=auth_headers, json={"ids": "123"})
    assert res_str.status_code == 400

    res_int = test_client.delete("/tasks/bulk", headers=auth_headers, json={"ids": 123})
    assert res_int.status_code == 400

    # Oversized (> 500 items)
    res_oversized = test_client.delete(
        "/tasks/bulk",
        headers=auth_headers,
        json={"ids": list(range(1, 502))},
    )
    assert res_oversized.status_code == 400
    assert "500" in res_oversized.get_json()["message"]

    # Non-numeric string
    res_alpha = test_client.delete(
        "/tasks/bulk",
        headers=auth_headers,
        json={"ids": ["not_a_number"]},
    )
    assert res_alpha.status_code == 400

    # Boolean item
    res_bool = test_client.delete(
        "/tasks/bulk",
        headers=auth_headers,
        json={"ids": [True, 123]},
    )
    assert res_bool.status_code == 400


def test_bulk_delete_tasks_unauthenticated(test_client):
    """Test unauthenticated request returns 401."""
    res = test_client.delete("/tasks/bulk", json={"ids": [1, 2, 3]})
    assert res.status_code == 401


def test_bulk_delete_tasks_blocked_user(test_client, blocked_user_headers):
    """Test blocked user cannot perform bulk delete."""
    res = test_client.delete(
        "/tasks/bulk",
        headers=blocked_user_headers,
        json={"ids": [1, 2]},
    )
    assert res.status_code == 403
    assert res.get_json()["error"] == "Account blocked"


def test_bulk_delete_tasks_cross_tenant_isolation(
    test_client, auth_headers, other_user_headers, memory_supabase
):
    """Test User B cannot delete User A's tasks."""
    task_a = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:user_a_task",
        task_result={"id": "task_a"},
        user_email="user@example.com",
    )
    task_a_id = task_a["id"]

    # Other user attempts to bulk delete User A's task
    res = test_client.delete(
        "/tasks/bulk",
        headers=other_user_headers,
        json={"ids": [task_a_id]},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 0

    # User A's task must still exist
    assert memory_supabase.get_action_by_id(task_a_id) is not None


def test_single_task_delete_success(test_client, auth_headers, memory_supabase):
    """Test DELETE /tasks/<int:task_id> deletes task for owner."""
    task = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:single_del_test",
        task_result={"id": "single_del"},
        user_email="user@example.com",
    )
    task_id = task["id"]

    res = test_client.delete(f"/tasks/{task_id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "deleted successfully" in data["message"].lower()

    # Verify task was removed
    assert memory_supabase.get_action_by_id(task_id) is None


def test_single_task_delete_cross_tenant_rejected(
    test_client, other_user_headers, memory_supabase
):
    """Test DELETE /tasks/<int:task_id> returns 404 for cross-tenant deletion."""
    task = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:tenant_task",
        task_result={"id": "tenant_1"},
        user_email="user@example.com",
    )
    task_id = task["id"]

    # Other user attempts to delete it
    res = test_client.delete(f"/tasks/{task_id}", headers=other_user_headers)
    assert res.status_code == 404
    assert "not found" in res.get_json()["error"].lower()

    # Verify task is still in DB
    assert memory_supabase.get_action_by_id(task_id) is not None


def test_single_task_delete_nonexistent(test_client, auth_headers):
    """Test DELETE /tasks/<int:task_id> returns 404 for non-existent ID."""
    res = test_client.delete("/tasks/999999", headers=auth_headers)
    assert res.status_code == 404


def test_single_task_delete_unauthenticated(test_client):
    """Test DELETE /tasks/<int:task_id> returns 401 without auth."""
    res = test_client.delete("/tasks/1")
    assert res.status_code == 401


def test_single_task_delete_blocked_user(test_client, blocked_user_headers):
    """Test DELETE /tasks/<int:task_id> returns 403 for blocked user."""
    res = test_client.delete("/tasks/1", headers=blocked_user_headers)
    assert res.status_code == 403
    assert res.get_json()["error"] == "Account blocked"
