"""
Integration tests for Task Management routes.
Covers: POST /add, GET /tasks, GET /task/<id>, DELETE /admin/tasks/<id>.
"""

from __future__ import annotations

VALID_MAGNET = (
    "magnet:?xt=urn:btih:d08842472665427b6f649f08fb0ce3a8c7843d69&dn=test.mkv"
)


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
    headers = {
        "Authorization": f"Bearer {blocked_token}",
        "Content-Type": "application/json",
    }
    res = test_client.post("/add", headers=headers, json={"url": VALID_MAGNET})
    assert res.status_code == 403
    assert res.get_json()["error"] == "Account blocked"


def test_add_task_invalid_payload(test_client, auth_headers):
    """Test adding a task with missing or invalid URL."""
    # Missing URL
    res = test_client.post("/add", headers=auth_headers, json={})
    assert res.status_code == 400

    # Invalid URL scheme
    res = test_client.post(
        "/add", headers=auth_headers, json={"url": "ftp://not-supported-link"}
    )
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


def test_delete_task_admin_only(
    test_client, admin_headers, auth_headers, memory_supabase
):
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


def _make_user_headers(email: str) -> dict[str, str]:
    from app.core.auth import create_access_token
    from app.core.config import AppConfig

    token = create_access_token(
        {"email": email, "is_admin": False},
        AppConfig.JWT_SECRET_KEY,
    )
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def test_multi_user_mediator_deduplication(test_client, memory_supabase):
    """Test mediator behavior when User A adds a task and User B tries to add the same task."""
    user_a_headers = _make_user_headers("user_a@example.com")
    user_b_headers = _make_user_headers("user_b@example.com")

    # 1. User A adds the task
    res_a = test_client.post("/add", headers=user_a_headers, json={"url": VALID_MAGNET})
    assert res_a.status_code == 200
    data_a = res_a.get_json()
    assert data_a["message"] == "Task added successfully"
    assert "task" in data_a

    # 2. User B tries to add the exact same task
    res_b = test_client.post("/add", headers=user_b_headers, json={"url": VALID_MAGNET})
    assert res_b.status_code == 200
    data_b = res_b.get_json()
    # User B should receive success and the linked task metadata
    assert data_b["message"] == "Task added successfully"
    assert "task" in data_b
    assert data_b["task"]["task"]["id"] == data_a["task"]["task"]["id"]

    # 3. User B calls GET /tasks: must find the linked task
    res_tasks_b = test_client.get("/tasks?page=1&limit=25", headers=user_b_headers)
    assert res_tasks_b.status_code == 200
    tasks_b = res_tasks_b.get_json()
    assert tasks_b["count"] == 1
    assert len(tasks_b["data"]) == 1
    assert tasks_b["data"][0]["user_email"] == "user_b@example.com"
    assert (
        tasks_b["data"][0]["data"]["task"]["task"]["id"] == data_a["task"]["task"]["id"]
    )

    # 4. User A calls GET /tasks: must also find their task
    res_tasks_a = test_client.get("/tasks?page=1&limit=25", headers=user_a_headers)
    assert res_tasks_a.status_code == 200
    tasks_a = res_tasks_a.get_json()
    assert tasks_a["count"] == 1
    assert len(tasks_a["data"]) == 1
    assert tasks_a["data"][0]["user_email"] == "user_a@example.com"


def test_duplicate_task_same_user_prevents_duplicate_records(
    test_client, memory_supabase
):
    """Test that submitting the same task twice by the same user returns 'Task already exists' without duplicate records."""
    user_b_headers = _make_user_headers("user_b@example.com")

    # First add succeeds
    res_first = test_client.post(
        "/add", headers=user_b_headers, json={"url": VALID_MAGNET}
    )
    assert res_first.status_code == 200
    assert res_first.get_json()["message"] == "Task added successfully"

    # Second add by same user returns "Task already exists"
    res_second = test_client.post(
        "/add", headers=user_b_headers, json={"url": VALID_MAGNET}
    )
    assert res_second.status_code == 200
    assert res_second.get_json()["message"] == "Task already exists"

    # Verify task list still has exactly 1 task for user B
    res_tasks = test_client.get("/tasks?page=1&limit=25", headers=user_b_headers)
    assert res_tasks.status_code == 200
    tasks_data = res_tasks.get_json()
    assert tasks_data["count"] == 1
    assert len(tasks_data["data"]) == 1


def test_multi_user_independent_deletion(test_client, memory_supabase):
    """Test that when User B deletes their linked task, User A's task remains untouched."""
    user_a_headers = _make_user_headers("user_a@example.com")
    user_b_headers = _make_user_headers("user_b@example.com")

    # Both users have the task
    test_client.post("/add", headers=user_a_headers, json={"url": VALID_MAGNET})
    test_client.post("/add", headers=user_b_headers, json={"url": VALID_MAGNET})

    # Fetch User B task ID
    res_tasks_b = test_client.get("/tasks", headers=user_b_headers)
    tasks_b = res_tasks_b.get_json()["data"]
    assert len(tasks_b) == 1
    user_b_task_id = tasks_b[0]["id"]

    # User B deletes their task
    res_del = test_client.delete(f"/tasks/{user_b_task_id}", headers=user_b_headers)
    assert res_del.status_code == 200

    # User B now has 0 tasks
    res_tasks_b_after = test_client.get("/tasks", headers=user_b_headers)
    assert res_tasks_b_after.get_json()["count"] == 0
    assert len(res_tasks_b_after.get_json()["data"]) == 0

    # User A STILL has their 1 task
    res_tasks_a_after = test_client.get("/tasks", headers=user_a_headers)
    assert res_tasks_a_after.get_json()["count"] == 1
    assert len(res_tasks_a_after.get_json()["data"]) == 1


def test_e2dk_multi_user_mediator_deduplication(test_client, memory_supabase):
    """Test E2DK link deduplication across multiple users."""
    e2dk_link = (
        "ed2k://|file|sample_video.mkv|104857600|a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4|/"
    )
    user_a_headers = _make_user_headers("user_a@example.com")
    user_b_headers = _make_user_headers("user_b@example.com")

    # User A adds E2DK link
    res_a = test_client.post("/add", headers=user_a_headers, json={"url": e2dk_link})
    assert res_a.status_code == 200
    assert res_a.get_json()["message"] == "Task added successfully"

    # User B adds same E2DK link
    res_b = test_client.post("/add", headers=user_b_headers, json={"url": e2dk_link})
    assert res_b.status_code == 200
    assert res_b.get_json()["message"] == "Task added successfully"

    # Both users see their task
    res_tasks_a = test_client.get("/tasks", headers=user_a_headers)
    res_tasks_b = test_client.get("/tasks", headers=user_b_headers)
    assert res_tasks_a.get_json()["count"] == 1
    assert res_tasks_b.get_json()["count"] == 1


def test_add_task_insufficient_storage(test_client, auth_headers, monkeypatch):
    """Test adding a task when PikPak storage is full returns 507 with STORAGE_FULL code."""
    from app.api.routes import tasks as tasks_module
    from PikPakAPI.exceptions import PikpakInsufficientStorageError

    mock_service = tasks_module.get_pikpak_service()

    async def mock_add_download(url):
        raise PikpakInsufficientStorageError("Storage space is not enough.", code=8)

    monkeypatch.setattr(mock_service, "add_download", mock_add_download)

    res = test_client.post(
        "/add",
        headers=auth_headers,
        json={
            "url": "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=storage_test"
        },
    )
    assert res.status_code == 507
    data = res.get_json()
    assert data["code"] == "STORAGE_FULL"
    assert "storage is full" in data["error"].lower()
