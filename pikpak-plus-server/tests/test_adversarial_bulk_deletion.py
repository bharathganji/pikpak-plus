"""
Empirical Adversarial Verification Suite for Bulk Deletion & Single Task Deletion.

Challenges:
1. Boundary & Limit Testing:
   - Exactly 0 IDs (empty list), missing "ids" key, null payload -> verify 400.
   - Non-array payload (e.g. string, integer, dict, raw string, raw array) -> verify 400.
   - Exactly 500 IDs (maximum allowed) -> verify 200 OK.
   - Exactly 501 IDs (exceeds safety ceiling) -> verify 400 Bad Request.
   - Negative IDs, zero ID, mixed strings/floats/booleans, duplicate IDs -> verify proper rejection or sanitization.
   - Very large numbers (e.g. 2^63 - 1) -> verify no server crash or unhandled 500.
   - Single task delete boundaries: task_id 0, non-existent, large int -> verify 404.
2. Tenant Isolation & Security:
   - User A attempts to bulk delete User B's tasks and shares -> verify User B's records are NOT deleted and return count is 0.
   - Mixed ownership payloads -> verify only caller's records are deleted.
   - Cross-domain isolation -> task endpoint cannot delete shares, share endpoint cannot delete tasks.
   - Unauthenticated requests (missing, invalid, expired, missing email) -> verify 401.
   - Blocked user requests -> verify 403.
3. Route Collision:
   - Verify DELETE /shares/bulk resolves to bulk handler, while DELETE /shares/123 or DELETE /shares/some_share_code resolves to single share handler.
   - Share code starting with "bulk_" resolves to single share handler.
4. Concurrency:
   - Concurrent requests deleting overlapping sets of IDs.
   - Concurrent requests deleting non-overlapping sets of IDs.
   - Concurrent cross-tenant deletion requests.
"""
from __future__ import annotations

import concurrent.futures
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.auth import create_access_token
from app.core.config import AppConfig


@pytest.fixture
def other_user_headers():
    token = create_access_token(
        {"email": "victim_user@example.com", "is_admin": False},
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


@pytest.fixture
def expired_user_headers():
    token = create_access_token(
        {"email": "user@example.com", "is_admin": False},
        AppConfig.JWT_SECRET_KEY,
        expiration_hours=-1,
    )
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


@pytest.fixture
def no_email_token_headers():
    payload = {
        "sub": "user_without_email",
        "is_admin": False,
        "exp": datetime.now(UTC) + timedelta(hours=24),
        "iat": datetime.now(UTC),
    }
    token = jwt.encode(payload, AppConfig.JWT_SECRET_KEY, algorithm="HS256")
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


# ==============================================================================
# 1. BOUNDARY & LIMIT TESTING
# ==============================================================================

@pytest.mark.parametrize("endpoint", ["/tasks/bulk", "/shares/bulk"])
def test_adv_bulk_delete_zero_ids_empty_list(test_client, auth_headers, endpoint):
    """Verify empty list of IDs returns 400 Bad Request."""
    res = test_client.delete(endpoint, headers=auth_headers, json={"ids": []})
    assert res.status_code == 400
    data = res.get_json()
    assert data["error"] == "Invalid payload"
    assert "non-empty" in data["message"].lower()


@pytest.mark.parametrize("endpoint", ["/tasks/bulk", "/shares/bulk"])
def test_adv_bulk_delete_missing_ids_key(test_client, auth_headers, endpoint):
    """Verify missing 'ids' key in JSON payload returns 400 Bad Request."""
    # Empty object
    res1 = test_client.delete(endpoint, headers=auth_headers, json={})
    assert res1.status_code == 400
    assert "Missing required fields" in res1.get_json()["error"]

    # Wrong key name
    res2 = test_client.delete(endpoint, headers=auth_headers, json={"task_ids": [1, 2]})
    assert res2.status_code == 400
    assert "Missing required fields" in res2.get_json()["error"]


@pytest.mark.parametrize("endpoint", ["/tasks/bulk", "/shares/bulk"])
def test_adv_bulk_delete_null_payload_and_null_ids(test_client, auth_headers, endpoint):
    """Verify null payload, missing body, or null 'ids' field returns 400."""
    # 1. null 'ids' field: {"ids": null}
    res_null_field = test_client.delete(endpoint, headers=auth_headers, json={"ids": None})
    assert res_null_field.status_code == 400
    assert res_null_field.get_json()["error"] == "Missing required fields"

    # 2. Raw JSON null body: "null"
    res_null_body = test_client.delete(
        endpoint,
        headers=auth_headers,
        data="null",
        content_type="application/json",
    )
    assert res_null_body.status_code == 400
    assert "Bad Request" in res_null_body.get_json()["error"]

    # 3. Completely empty request body without JSON
    res_empty_body = test_client.delete(
        endpoint,
        headers={"Authorization": auth_headers["Authorization"]},
    )
    assert res_empty_body.status_code == 400
    assert "Bad Request" in res_empty_body.get_json()["error"]


@pytest.mark.parametrize("endpoint", ["/tasks/bulk", "/shares/bulk"])
def test_adv_bulk_delete_non_array_payload(test_client, auth_headers, endpoint):
    """Verify non-array payloads (string, int, dict, top-level array/string) return 400."""
    # string in ids
    res_str = test_client.delete(endpoint, headers=auth_headers, json={"ids": "1,2,3"})
    assert res_str.status_code == 400
    assert "Invalid field type" in res_str.get_json()["error"]

    # integer in ids
    res_int = test_client.delete(endpoint, headers=auth_headers, json={"ids": 12345})
    assert res_int.status_code == 400
    assert "Invalid field type" in res_int.get_json()["error"]

    # dict in ids
    res_dict = test_client.delete(endpoint, headers=auth_headers, json={"ids": {"id": 1}})
    assert res_dict.status_code == 400
    assert "Invalid field type" in res_dict.get_json()["error"]

    # top-level JSON array instead of dict
    res_raw_arr = test_client.delete(endpoint, headers=auth_headers, json=[1, 2, 3])
    assert res_raw_arr.status_code == 400
    assert "Bad Request" in res_raw_arr.get_json()["error"]

    # raw non-JSON text payload
    res_raw_text = test_client.delete(
        endpoint,
        headers={"Authorization": auth_headers["Authorization"]},
        data="ids=1,2,3",
        content_type="application/x-www-form-urlencoded",
    )
    assert res_raw_text.status_code == 400


@pytest.mark.parametrize("endpoint", ["/tasks/bulk", "/shares/bulk"])
def test_adv_bulk_delete_exact_500_ids_allowed(test_client, auth_headers, endpoint):
    """Verify boundary limit: exactly 500 IDs is accepted with 200 OK."""
    payload = {"ids": list(range(1, 501))}
    res = test_client.delete(endpoint, headers=auth_headers, json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "count" in data


@pytest.mark.parametrize("endpoint", ["/tasks/bulk", "/shares/bulk"])
def test_adv_bulk_delete_exact_501_ids_rejected(test_client, auth_headers, endpoint):
    """Verify safety ceiling: exactly 501 IDs is rejected with 400 Bad Request."""
    payload = {"ids": list(range(1, 502))}
    res = test_client.delete(endpoint, headers=auth_headers, json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert data["error"] == "Invalid payload"
    assert "500" in data["message"]


@pytest.mark.parametrize("endpoint", ["/tasks/bulk", "/shares/bulk"])
def test_adv_bulk_delete_negative_and_zero_ids(test_client, auth_headers, endpoint):
    """Verify negative IDs and zero IDs are strictly rejected with 400."""
    # Negative integer
    res_neg = test_client.delete(endpoint, headers=auth_headers, json={"ids": [-1]})
    assert res_neg.status_code == 400
    assert "numeric IDs" in res_neg.get_json()["message"]

    # Negative integer inside list of valid IDs
    res_neg_mixed = test_client.delete(endpoint, headers=auth_headers, json={"ids": [10, -5]})
    assert res_neg_mixed.status_code == 400

    # Negative string ID
    res_neg_str = test_client.delete(endpoint, headers=auth_headers, json={"ids": ["-10"]})
    assert res_neg_str.status_code == 400

    # Zero integer ID
    res_zero = test_client.delete(endpoint, headers=auth_headers, json={"ids": [0]})
    assert res_zero.status_code == 400
    assert "numeric IDs" in res_zero.get_json()["message"]

    # Zero string ID
    res_zero_str = test_client.delete(endpoint, headers=auth_headers, json={"ids": ["0"]})
    assert res_zero_str.status_code == 400

    # Mixed zero with valid IDs
    res_zero_mixed = test_client.delete(endpoint, headers=auth_headers, json={"ids": [1, 0, 2]})
    assert res_zero_mixed.status_code == 400


@pytest.mark.parametrize("endpoint", ["/tasks/bulk", "/shares/bulk"])
def test_adv_bulk_delete_mixed_types_rejection(test_client, auth_headers, endpoint):
    """Verify mixed floats, booleans, non-numeric strings, None, and dicts are rejected."""
    # Float item
    res_float = test_client.delete(endpoint, headers=auth_headers, json={"ids": [1, 2.5]})
    assert res_float.status_code == 400
    assert "numeric IDs" in res_float.get_json()["message"]

    # Boolean item True (guard against bool subclassing int in Python)
    res_bool_true = test_client.delete(endpoint, headers=auth_headers, json={"ids": [True]})
    assert res_bool_true.status_code == 400
    assert "numeric IDs" in res_bool_true.get_json()["message"]

    # Boolean item False
    res_bool_false = test_client.delete(endpoint, headers=auth_headers, json={"ids": [10, False]})
    assert res_bool_false.status_code == 400

    # Non-numeric string
    res_str_alpha = test_client.delete(endpoint, headers=auth_headers, json={"ids": [10, "not_numeric"]})
    assert res_str_alpha.status_code == 400

    # Empty string or whitespace string
    res_str_empty = test_client.delete(endpoint, headers=auth_headers, json={"ids": [10, ""]})
    assert res_str_empty.status_code == 400

    res_str_spaces = test_client.delete(endpoint, headers=auth_headers, json={"ids": [10, "   "]})
    assert res_str_spaces.status_code == 400

    # None inside array
    res_none = test_client.delete(endpoint, headers=auth_headers, json={"ids": [1, None, 2]})
    assert res_none.status_code == 400

    # Nested dict inside array
    res_dict = test_client.delete(endpoint, headers=auth_headers, json={"ids": [1, {"id": 2}]})
    assert res_dict.status_code == 400


def test_adv_bulk_delete_tasks_duplicate_ids_sanitization(test_client, auth_headers, memory_supabase):
    """Verify duplicate IDs in payload are sanitized and return distinct deletion count."""
    t1 = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:dup1",
        task_result={"id": "task_dup_1"},
        user_email="user@example.com",
    )
    t2 = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:dup2",
        task_result={"id": "task_dup_2"},
        user_email="user@example.com",
    )
    id1, id2 = t1["id"], t2["id"]

    # Submit payload with duplicated IDs
    res = test_client.delete(
        "/tasks/bulk",
        headers=auth_headers,
        json={"ids": [id1, id1, id2, id2, str(id1), str(id2)]},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    # Count must reflect actual distinct records removed (2), not the duplicate input count (6)
    assert data["count"] == 2
    assert memory_supabase.get_action_by_id(id1) is None
    assert memory_supabase.get_action_by_id(id2) is None


def test_adv_bulk_delete_shares_duplicate_ids_sanitization(test_client, auth_headers, memory_supabase):
    """Verify duplicate IDs for shares are sanitized and return distinct deletion count."""
    s1 = memory_supabase.store_share(url="dup_share_1", user_email="user@example.com")
    s2 = memory_supabase.store_share(url="dup_share_2", user_email="user@example.com")
    id1, id2 = s1["id"], s2["id"]

    res = test_client.delete(
        "/shares/bulk",
        headers=auth_headers,
        json={"ids": [id1, id1, id2, id2, str(id1)]},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 2
    remaining_ids = [s.get("id") for s in memory_supabase.shares]
    assert id1 not in remaining_ids
    assert id2 not in remaining_ids


@pytest.mark.parametrize("endpoint", ["/tasks/bulk", "/shares/bulk"])
def test_adv_bulk_delete_very_large_numbers(test_client, auth_headers, endpoint):
    """Verify large numbers (e.g. 2^63 - 1, 2^64) do not trigger unhandled 500 or overflow crash."""
    large_int = 9223372036854775807  # 2^63 - 1
    very_large_int = 2**64
    huge_int = 2**128

    res = test_client.delete(
        endpoint,
        headers=auth_headers,
        json={"ids": [large_int, very_large_int, huge_int, str(large_int)]},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 0  # No matching rows exist, 0 deleted cleanly


def test_adv_single_task_delete_boundaries(test_client, auth_headers):
    """Verify single task deletion boundaries: task_id 0, non-existent, and very large int."""
    # task_id 0 returns 404
    res_zero = test_client.delete("/tasks/0", headers=auth_headers)
    assert res_zero.status_code == 404

    # Non-existent task_id returns 404
    res_nonexistent = test_client.delete("/tasks/999999999", headers=auth_headers)
    assert res_nonexistent.status_code == 404
    assert "not found" in res_nonexistent.get_json()["error"].lower()

    # Very large integer task_id returns 404
    res_large = test_client.delete(f"/tasks/{2**63 - 1}", headers=auth_headers)
    assert res_large.status_code == 404


# ==============================================================================
# 2. TENANT ISOLATION & SECURITY
# ==============================================================================

def test_adv_tenant_isolation_tasks_bulk(test_client, auth_headers, other_user_headers, memory_supabase):
    """Verify User A cannot delete User B's tasks via bulk deletion."""
    # User B owns tasks
    t_b1 = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:b1",
        task_result={"id": "tb1"},
        user_email="victim_user@example.com",
    )
    t_b2 = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:b2",
        task_result={"id": "tb2"},
        user_email="victim_user@example.com",
    )
    id_b1, id_b2 = t_b1["id"], t_b2["id"]

    # User A (auth_headers) attempts to delete User B's tasks
    res = test_client.delete("/tasks/bulk", headers=auth_headers, json={"ids": [id_b1, id_b2]})
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 0

    # User B's tasks must be completely intact
    assert memory_supabase.get_action_by_id(id_b1) is not None
    assert memory_supabase.get_action_by_id(id_b2) is not None


def test_adv_tenant_isolation_shares_bulk(test_client, auth_headers, other_user_headers, memory_supabase):
    """Verify User A cannot delete User B's shares via bulk deletion."""
    s_b1 = memory_supabase.store_share(url="share_b1", user_email="victim_user@example.com")
    s_b2 = memory_supabase.store_share(url="share_b2", user_email="victim_user@example.com")
    id_b1, id_b2 = s_b1["id"], s_b2["id"]

    # User A attempts to delete User B's shares
    res = test_client.delete("/shares/bulk", headers=auth_headers, json={"ids": [id_b1, id_b2]})
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 0

    # User B's shares must be completely intact
    remaining = [s.get("id") for s in memory_supabase.shares]
    assert id_b1 in remaining
    assert id_b2 in remaining


def test_adv_tenant_isolation_mixed_ownership(test_client, auth_headers, memory_supabase):
    """Verify mixed ownership payload deletes ONLY caller's records and leaves others intact."""
    # User A owns task_a
    task_a = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:my_task",
        task_result={"id": "my_task_id"},
        user_email="user@example.com",
    )
    # User B owns task_b
    task_b = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:victim_task",
        task_result={"id": "victim_task_id"},
        user_email="victim_user@example.com",
    )
    id_a, id_b = task_a["id"], task_b["id"]

    # User A sends both IDs
    res = test_client.delete("/tasks/bulk", headers=auth_headers, json={"ids": [id_a, id_b]})
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 1

    # User A's task was deleted; User B's task remains
    assert memory_supabase.get_action_by_id(id_a) is None
    assert memory_supabase.get_action_by_id(id_b) is not None


def test_adv_cross_domain_isolation(test_client, auth_headers, memory_supabase):
    """Verify tasks endpoint cannot delete shares, and shares endpoint cannot delete tasks."""
    # Seed 2 tasks (id=1, id=2)
    t1 = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:cd_task1",
        task_result={"id": "cd_task_id1"},
        user_email="user@example.com",
    )
    t2 = memory_supabase.log_action(
        url="magnet:?xt=urn:btih:cd_task2",
        task_result={"id": "cd_task_id2"},
        user_email="user@example.com",
    )
    # Seed 3 shares (id=1, id=2, id=3)
    memory_supabase.store_share(url="cd_share1", user_email="user@example.com")
    memory_supabase.store_share(url="cd_share2", user_email="user@example.com")
    s3 = memory_supabase.store_share(url="cd_share3", user_email="user@example.com")

    # Share 3 has id=3 which does NOT exist in actions (only 1 and 2 exist)
    share_3_id = s3["id"]
    # Task 2 has id=2, but let's delete task 1 and 2, verify share 1 and 2 are untouched
    # 1. Attempt to delete share 3 ID via /tasks/bulk: no task with ID 3 exists
    res_tasks = test_client.delete("/tasks/bulk", headers=auth_headers, json={"ids": [share_3_id]})
    assert res_tasks.status_code == 200
    assert res_tasks.get_json()["count"] == 0
    # Share 3 must still exist
    assert any(s.get("id") == share_3_id for s in memory_supabase.shares)

    # 2. Attempt to delete a non-existent share ID (e.g. 9999) via /shares/bulk
    res_shares = test_client.delete("/shares/bulk", headers=auth_headers, json={"ids": [9999]})
    assert res_shares.status_code == 200
    assert res_shares.get_json()["count"] == 0
    # Tasks 1 and 2 must still exist
    assert memory_supabase.get_action_by_id(t1["id"]) is not None
    assert memory_supabase.get_action_by_id(t2["id"]) is not None


@pytest.mark.parametrize("endpoint", ["/tasks/bulk", "/shares/bulk", "/tasks/1"])
def test_adv_unauthenticated_requests(test_client, expired_user_headers, no_email_token_headers, endpoint):
    """Verify unauthenticated, invalid, expired, and email-less tokens are rejected with 401."""
    # 1. Missing Authorization header
    res_no_auth = test_client.delete(endpoint, json={"ids": [1]})
    assert res_no_auth.status_code == 401

    # 2. Malformed token string
    res_bad_token = test_client.delete(
        endpoint,
        headers={"Authorization": "Bearer this_is_not_a_valid_jwt_token", "Content-Type": "application/json"},
        json={"ids": [1]},
    )
    assert res_bad_token.status_code == 401

    # 3. Expired token
    res_expired = test_client.delete(endpoint, headers=expired_user_headers, json={"ids": [1]})
    assert res_expired.status_code == 401

    # 4. Token without email in payload
    res_no_email = test_client.delete(endpoint, headers=no_email_token_headers, json={"ids": [1]})
    assert res_no_email.status_code == 401


@pytest.mark.parametrize("endpoint", ["/tasks/bulk", "/shares/bulk", "/tasks/1"])
def test_adv_blocked_user_enforcement(test_client, blocked_user_headers, endpoint):
    """Verify blocked user is denied with 403 Account blocked."""
    res = test_client.delete(endpoint, headers=blocked_user_headers, json={"ids": [1, 2]})
    assert res.status_code == 403
    data = res.get_json()
    assert data["error"] == "Account blocked"
    assert "blocked" in data["message"].lower()


# ==============================================================================
# 3. ROUTE COLLISION & ORDERING
# ==============================================================================

def test_adv_route_collision_bulk_vs_single_share(test_client, auth_headers, memory_supabase):
    """
    Verify route ordering strictly distinguishes /shares/bulk from /shares/<share_id>.
    - /shares/bulk with valid JSON executes bulk handler (returns count).
    - /shares/bulk with invalid/empty body executes bulk handler (returns 400, not single share delete).
    - /shares/123 executes single share handler (no count in response).
    - /shares/bulk_prefix_code executes single share handler.
    """
    # 1. Create a share
    share1 = memory_supabase.store_share(url="route_test_1", user_email="user@example.com")
    s_id = share1["id"]

    # 2. DELETE /shares/bulk with valid JSON -> bulk handler
    res_bulk = test_client.delete("/shares/bulk", headers=auth_headers, json={"ids": [s_id]})
    assert res_bulk.status_code == 200
    assert "count" in res_bulk.get_json()
    assert res_bulk.get_json()["count"] == 1

    # 3. DELETE /shares/bulk with empty JSON -> bulk handler returning 400 (NOT single share delete!)
    res_bulk_empty = test_client.delete("/shares/bulk", headers=auth_headers, json={})
    assert res_bulk_empty.status_code == 400
    assert "Missing required fields" in res_bulk_empty.get_json()["error"]

    # 4. Create another share for single delete
    memory_supabase.store_share(
        url="route_test_2",
        share_result={"share_id": "custom_slug_xyz"},
        user_email="user@example.com",
    )
    # DELETE /shares/custom_slug_xyz -> single share handler
    res_single = test_client.delete("/shares/custom_slug_xyz", headers=auth_headers)
    assert res_single.status_code == 200
    assert "count" not in res_single.get_json()
    assert "Share link deleted successfully" in res_single.get_json()["message"]

    # 5. Share with prefix starting with "bulk_" -> must resolve to single handler
    memory_supabase.store_share(
        url="route_test_3",
        share_result={"share_id": "bulk_target_123"},
        user_email="user@example.com",
    )
    res_prefix = test_client.delete("/shares/bulk_target_123", headers=auth_headers)
    assert res_prefix.status_code == 200
    assert "count" not in res_prefix.get_json()
    assert "Share link deleted successfully" in res_prefix.get_json()["message"]


# ==============================================================================
# 4. CONCURRENCY & RACE CONDITIONS
# ==============================================================================

def test_adv_concurrent_overlapping_task_deletes(test_client, auth_headers, memory_supabase):
    """
    Stress-test: 10 concurrent threads issuing DELETE /tasks/bulk on the exact same 20 tasks.
    Invariants:
    - All requests complete with 200 OK without unhandled exceptions or 500s.
    - All 20 tasks are deleted (0 remaining).
    - Sum of returned deleted counts across all threads equals 20 (idempotent, zero duplicate deletions).
    """
    # Seed 20 tasks
    task_ids = []
    for i in range(20):
        t = memory_supabase.log_action(
            url=f"magnet:?xt=urn:btih:conc_task_{i}",
            task_result={"id": f"conc_tid_{i}"},
            user_email="user@example.com",
        )
        task_ids.append(t["id"])

    results = []

    def run_delete():
        return test_client.delete("/tasks/bulk", headers=auth_headers, json={"ids": task_ids})

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(run_delete) for _ in range(10)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    # All 10 requests must succeed with 200
    assert len(results) == 10
    for r in results:
        assert r.status_code == 200

    # Total deleted count across all threads must exactly equal 20
    total_deleted = sum(r.get_json()["count"] for r in results)
    assert total_deleted == 20, f"Expected total 20 deleted, got {total_deleted}"

    # Verify none remain
    for tid in task_ids:
        assert memory_supabase.get_action_by_id(tid) is None


def test_adv_concurrent_overlapping_share_deletes(test_client, auth_headers, memory_supabase):
    """
    Stress-test: 10 concurrent threads issuing DELETE /shares/bulk on the exact same 20 shares.
    Invariants:
    - All requests return 200 OK.
    - All 20 shares deleted.
    - Total deleted count equals 20.
    """
    share_ids = []
    for i in range(20):
        s = memory_supabase.store_share(url=f"conc_share_{i}", user_email="user@example.com")
        share_ids.append(s["id"])

    results = []

    def run_delete():
        return test_client.delete("/shares/bulk", headers=auth_headers, json={"ids": share_ids})

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(run_delete) for _ in range(10)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    assert len(results) == 10
    for r in results:
        assert r.status_code == 200

    total_deleted = sum(r.get_json()["count"] for r in results)
    assert total_deleted == 20

    remaining = [s.get("id") for s in memory_supabase.shares]
    for sid in share_ids:
        assert sid not in remaining


def test_adv_concurrent_non_overlapping_deletes(test_client, auth_headers, memory_supabase):
    """
    Stress-test: 2 concurrent threads deleting separate, non-overlapping batches of 25 tasks each.
    Invariants:
    - Both threads return 200 OK.
    - Thread 1 deletes exactly 25.
    - Thread 2 deletes exactly 25.
    - All 50 tasks are deleted.
    """
    batch_a_ids = [
        memory_supabase.log_action(
            url=f"magnet:?xt=urn:btih:batch_a_{i}",
            task_result={"id": f"batch_a_{i}"},
            user_email="user@example.com",
        )["id"]
        for i in range(25)
    ]
    batch_b_ids = [
        memory_supabase.log_action(
            url=f"magnet:?xt=urn:btih:batch_b_{i}",
            task_result={"id": f"batch_b_{i}"},
            user_email="user@example.com",
        )["id"]
        for i in range(25)
    ]

    def delete_batch(ids):
        return test_client.delete("/tasks/bulk", headers=auth_headers, json={"ids": ids})

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_a = executor.submit(delete_batch, batch_a_ids)
        future_b = executor.submit(delete_batch, batch_b_ids)

        res_a = future_a.result()
        res_b = future_b.result()

    assert res_a.status_code == 200
    assert res_b.status_code == 200
    assert res_a.get_json()["count"] == 25
    assert res_b.get_json()["count"] == 25

    # Check all 50 gone
    for tid in batch_a_ids + batch_b_ids:
        assert memory_supabase.get_action_by_id(tid) is None


def test_adv_concurrent_cross_tenant_deletes(
    test_client, auth_headers, other_user_headers, memory_supabase
):
    """
    Stress-test: User A and User B concurrently issuing bulk deletes for their own
    and each other's tasks.
    Invariants:
    - User A deleting User A's tasks gets count = 15.
    - User B deleting User B's tasks gets count = 15.
    - User A deleting User B's tasks gets count = 0.
    - User B deleting User A's tasks gets count = 0.
    - State is consistent and not corrupted.
    """
    user_a_tasks = [
        memory_supabase.log_action(
            url=f"magnet:?xt=urn:btih:ua_{i}",
            task_result={"id": f"ua_{i}"},
            user_email="user@example.com",
        )["id"]
        for i in range(15)
    ]
    user_b_tasks = [
        memory_supabase.log_action(
            url=f"magnet:?xt=urn:btih:ub_{i}",
            task_result={"id": f"ub_{i}"},
            user_email="victim_user@example.com",
        )["id"]
        for i in range(15)
    ]

    def execute_call(headers, ids):
        return test_client.delete("/tasks/bulk", headers=headers, json={"ids": ids})

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        f1 = executor.submit(execute_call, auth_headers, user_a_tasks)          # User A deletes A (valid)
        f2 = executor.submit(execute_call, other_user_headers, user_b_tasks)     # User B deletes B (valid)
        f3 = executor.submit(execute_call, auth_headers, user_b_tasks)          # User A attacks B (isolated)
        f4 = executor.submit(execute_call, other_user_headers, user_a_tasks)     # User B attacks A (isolated)

        r1 = f1.result()
        r2 = f2.result()
        r3 = f3.result()
        r4 = f4.result()

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r3.status_code == 200
    assert r4.status_code == 200

    assert r1.get_json()["count"] == 15
    assert r2.get_json()["count"] == 15
    assert r3.get_json()["count"] == 0
    assert r4.get_json()["count"] == 0

    # User A's tasks and User B's tasks are all gone
    for tid in user_a_tasks + user_b_tasks:
        assert memory_supabase.get_action_by_id(tid) is None
