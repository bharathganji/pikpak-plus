"""
Integration tests for Task Management routes.
Covers: POST /add, GET /tasks, GET /task/<id>, DELETE /admin/tasks/<id>.
"""
from __future__ import annotations

VALID_MAGNET = "magnet:?xt=urn:btih:d08842472665427b6f649f08fb0ce3a8c7843d69&dn=test.mkv"


def test_add_task_success(test_client, auth_headers):
    """Test adding a download task with valid magnet URL."""
    res = test_client.post("/add", headers=auth_headers, json={"url": VALID_MAGNET})
    assert res.status_code == 200
    data = res.get_json()
    assert data["message"] == "Task added successfully"
    assert "task" in data
    assert data["task"]["task"]["id"] == "mock_task_001"


def test_add_task_unauthenticated(test_client):
    """Test adding a task without authentication is rejected."""
    res = test_client.post("/add", json={"url": VALID_MAGNET})
    assert res.status_code == 401


def test_add_task_blocked_user(test_client, memory_supabase):
    """Test blocked user cannot add tasks."""
    from app.core.auth import create_access_token
    from app.core.config import AppConfig

    blocked_token = create_access_token(
        {"email": "blocked@example.com", "is_admin": False},
        AppConfig.JWT_SECRET_KEY,
    )
    headers = {"Authorization": f"Bearer {blocked_token}", "Content-Type": "application/json"}
    res = test_client.post("/add", headers=headers, json={"url": VALID_MAGNET})
    assert res.status_code == 403
    assert res.get_json()["error"] == "Account blocked"


def test_add_task_invalid_payload(test_client, auth_headers):
    """Test adding a task with missing or invalid URL."""
    # Missing URL
    res = test_client.post("/add", headers=auth_headers, json={})
    assert res.status_code == 400

    # Invalid URL scheme
    res = test_client.post("/add", headers=auth_headers, json={"url": "ftp://not-supported-link"})
    assert res.status_code == 400


def test_get_tasks_paginated(test_client, auth_headers, memory_supabase):
    """Test fetching paginated user tasks."""
    # Seed tasks for user@example.com
    for i in range(15):
        memory_supabase.log_action(
            url=f"magnet:?xt=urn:btih:hash_{i}",
            task_result={"id": f"task_{i}", "name": f"file_{i}.mp4"},
            user_email="user@example.com",
        )

    # First page
    res = test_client.get("/tasks?page=1&limit=10", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["page"] == 1
    assert data["limit"] == 10
    assert len(data["data"]) == 10
    assert data["count"] >= 15

    # Second page
    res2 = test_client.get("/tasks?page=2&limit=10", headers=auth_headers)
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2["page"] == 2
    assert len(data2["data"]) >= 5


def test_get_tasks_invalid_pagination(test_client, auth_headers):
    """Test pagination bounds and invalid types."""
    res = test_client.get("/tasks?page=-1&limit=10", headers=auth_headers)
    assert res.status_code == 400

    res = test_client.get("/tasks?page=abc&limit=10", headers=auth_headers)
    assert res.status_code == 400


def test_get_task_by_id(test_client, memory_supabase):
    """Test retrieving single task by ID."""
    action = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:single_test",
        task_result={"id": "single_task_1", "name": "single.mp4"},
        user_email="user@example.com",
    )
    task_id = action["id"]

    res = test_client.get(f"/task/{task_id}")
    assert res.status_code == 200
    data = res.get_json()
    assert data["id"] == task_id

    # Nonexistent task
    res404 = test_client.get("/task/999999")
    assert res404.status_code == 404


def test_delete_task_admin_only(test_client, admin_headers, auth_headers, memory_supabase):
    """Test task deletion requires admin privileges and cleans up content."""
    action = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:delete_me",
        task_result={"id": "task_to_del", "file_id": "file_to_del"},
        user_email="user@example.com",
    )
    task_id = action["id"]

    # Non-admin attempt should be forbidden
    res_forbidden = test_client.delete(f"/admin/tasks/{task_id}", headers=auth_headers)
    assert res_forbidden.status_code == 403

    # Admin delete should succeed
    res_ok = test_client.delete(f"/admin/tasks/{task_id}", headers=admin_headers)
    assert res_ok.status_code == 200
    data = res_ok.get_json()
    assert "deleted successfully" in data["message"].lower()

    # Verify task was removed
    assert memory_supabase.get_action_by_id(task_id) is None

