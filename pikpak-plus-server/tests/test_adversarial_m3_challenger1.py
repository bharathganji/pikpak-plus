"""
Adversarial Stress Test Suite for Milestone 3: Backend Route Cleanup & Preservation.

Empirically challenges:
1. Complete unroutability (HTTP 404) of removed File Explorer endpoints:
   - GET /files, POST /files/folder, DELETE /files/<file_id>
   - Under both unauthenticated and authenticated requests (user, admin, invalid token, malformed auth headers)
   - Across both '/' and '/api/' root prefixes
   - Across non-existent HTTP methods (PUT, PATCH, HEAD) and query string variations
2. URL Map introspection verifying zero routing rules exist for File Explorer while download rules are preserved.
3. Eliminated direct download endpoint (POST /file/download-url) and preserved metadata (GET /file/<file_id>):
   - Valid authentication and payload responses (normalized url/download_url)
   - Graceful bad input handling (missing body, non-dict JSON, missing id, invalid types, whitespace)
   - Path traversal and boundary length injection vectors (exceeding 128 chars, traversal slashes, null bytes)
   - Backend service exception containment (graceful 500 JSON without process crash)
4. Non-file endpoints regression safety (/tasks, /add, /share, /shares, /health/live, /health/ready, /quota, /statistics).
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

# ==============================================================================
# 1. Removed File Explorer Endpoints Complete Unroutability (HTTP 404)
# ==============================================================================


@pytest.mark.parametrize(
    "path",
    [
        "/files",
        "/files/",
        "/api/files",
        "/api/files/",
        "/files/folder",
        "/files/folder/",
        "/api/files/folder",
        "/api/files/folder/",
        "/files/file_123",
        "/api/files/file_123",
        "/files/folder_abc",
        "/api/files/folder_abc",
        "/files/nested/subfolder/file_123",
    ],
)
@pytest.mark.parametrize("method", ["get", "post", "delete", "put", "patch", "head"])
def test_adversarial_removed_endpoints_strictly_404_unauthenticated(
    test_client, path, method
):
    """
    Verify that ALL removed File Explorer endpoints return HTTP 404 for unauthenticated requests.
    Flask URL routing must fail before auth middleware is even invoked.
    """
    call_fn = getattr(test_client, method)
    res = call_fn(path)
    assert res.status_code == 404, (
        f"Expected 404 on unauthenticated {method.upper()} {path}, got {res.status_code}"
    )


@pytest.mark.parametrize(
    "path",
    [
        "/files",
        "/files/",
        "/api/files",
        "/api/files/",
        "/files/folder",
        "/files/folder/",
        "/api/files/folder",
        "/api/files/folder/",
        "/files/file_123",
        "/api/files/file_123",
        "/files/folder_abc",
        "/api/files/folder_abc",
    ],
)
@pytest.mark.parametrize("method", ["get", "post", "delete"])
def test_adversarial_removed_endpoints_strictly_404_authenticated_user(
    test_client, auth_headers, path, method
):
    """
    Verify that ALL removed File Explorer endpoints return HTTP 404 for valid authenticated user.
    """
    call_fn = getattr(test_client, method)
    res = call_fn(
        path,
        headers=auth_headers,
        json={"name": "Test Folder", "id": "file_123", "parent_id": "root"},
    )
    assert res.status_code == 404, (
        f"Expected 404 on authenticated {method.upper()} {path}, got {res.status_code}"
    )


@pytest.mark.parametrize(
    "path",
    [
        "/files",
        "/api/files",
        "/files/folder",
        "/api/files/folder",
        "/files/file_123",
        "/api/files/file_123",
    ],
)
def test_adversarial_removed_endpoints_strictly_404_admin_and_malformed_auth(
    test_client, admin_headers, path
):
    """
    Verify that removed endpoints return 404 regardless of auth tokens (admin, garbage, or malformed).
    """
    # 1. Admin Token
    res_admin_get = test_client.get(path, headers=admin_headers)
    assert res_admin_get.status_code == 404
    res_admin_post = test_client.post(
        path, headers=admin_headers, json={"name": "Admin Folder"}
    )
    assert res_admin_post.status_code == 404
    res_admin_del = test_client.delete(path, headers=admin_headers)
    assert res_admin_del.status_code == 404

    # 2. Garbage JWT
    garbage_headers = {
        "Authorization": "Bearer invalid_garbage_token_123",
        "Content-Type": "application/json",
    }
    res_garbage = test_client.get(path, headers=garbage_headers)
    assert res_garbage.status_code == 404

    # 3. Malformed Auth Header
    malformed_headers = {
        "Authorization": "Basic whatever_credentials",
        "Content-Type": "application/json",
    }
    res_malformed = test_client.get(path, headers=malformed_headers)
    assert res_malformed.status_code == 404


@pytest.mark.parametrize(
    "query_param",
    [
        "?parent_id=root",
        "?parent_id=folder_123&page_token=abc",
        "?parent_id=../../traversal",
        "?limit=100&offset=0",
        "?filters=name%3Dtest",
    ],
)
def test_adversarial_removed_endpoints_with_query_params_return_404(
    test_client, auth_headers, query_param
):
    """
    Verify query string variations on /files and /api/files return 404.
    """
    res1 = test_client.get(f"/files{query_param}", headers=auth_headers)
    assert res1.status_code == 404
    res2 = test_client.get(f"/api/files{query_param}", headers=auth_headers)
    assert res2.status_code == 404


# ==============================================================================
# 2. Direct Flask URL Map Introspection
# ==============================================================================


def test_adversarial_flask_url_map_contains_zero_explorer_routes(flask_app):
    """
    Empirically inspect Flask app url_map:
    - Assert ZERO rules matching '/files' or starting with '/files/' exist.
    - Assert ZERO rules matching '/api/files' or starting with '/api/files/' exist.
    - Assert ZERO endpoints named 'files.list_files', 'files.create_folder', 'files.delete_file' exist.
    - Assert preserved rules '/file/<file_id>' and '/file/download-url' DO exist.
    """
    all_rules = list(flask_app.url_map.iter_rules())

    explorer_rules = [
        rule
        for rule in all_rules
        if rule.rule
        in {
            "/files",
            "/files/",
            "/api/files",
            "/api/files/",
            "/files/folder",
            "/api/files/folder",
        }
        or rule.rule.startswith("/files/")
        or rule.rule.startswith("/api/files/")
    ]
    assert len(explorer_rules) == 0, (
        f"Found unexpected File Explorer rules in url_map: {explorer_rules}"
    )

    explorer_endpoints = [
        rule.endpoint
        for rule in all_rules
        if any(
            bad in rule.endpoint
            for bad in ["list_files", "create_folder", "delete_file"]
        )
    ]
    assert len(explorer_endpoints) == 0, (
        f"Found unexpected explorer endpoints in url_map: {explorer_endpoints}"
    )

    # Assert eliminated download endpoints do NOT exist
    rule_strings = {rule.rule for rule in all_rules}
    assert "/file/download-url" not in rule_strings
    assert "/api/file/download-url" not in rule_strings

    # Assert preserved file metadata endpoints exist
    assert "/file/<file_id>" in rule_strings
    assert "/api/file/<file_id>" in rule_strings


# ==============================================================================
# 3. Eliminated Download Endpoint Elimination Verification: POST /file/download-url
# ==============================================================================


def test_adversarial_download_url_endpoint_returns_404(test_client, auth_headers):
    """Verify POST /file/download-url and /api/file/download-url are unroutable / not allowed (404/405)."""
    # Unauthenticated -> 404 or 405
    assert test_client.post(
        "/file/download-url", json={"id": "file_123"}
    ).status_code in (404, 405)
    assert test_client.post(
        "/api/file/download-url", json={"id": "file_123"}
    ).status_code in (404, 405)

    # Authenticated -> 404 or 405
    assert test_client.post(
        "/file/download-url", headers=auth_headers, json={"id": "file_123"}
    ).status_code in (404, 405)
    assert test_client.post(
        "/api/file/download-url", headers=auth_headers, json={"id": "file_123"}
    ).status_code in (404, 405)


@pytest.mark.parametrize(
    "payload",
    [
        "",
        "   ",
        "{malformed_json",
        {"file_id": "file_123"},
        {"id": "../../etc/passwd"},
        {"id": "valid_file_123"},
    ],
)
def test_adversarial_download_url_all_payloads_return_404(
    test_client, auth_headers, payload
):
    """Verify eliminated /file/download-url is unroutable / not allowed (404/405) regardless of payload content."""
    res = test_client.post(
        "/file/download-url",
        headers=auth_headers,
        json=payload if isinstance(payload, dict) else None,
        data=payload if isinstance(payload, str) else None,
    )
    assert res.status_code in (404, 405)

    res_api = test_client.post(
        "/api/file/download-url",
        headers=auth_headers,
        json=payload if isinstance(payload, dict) else None,
        data=payload if isinstance(payload, str) else None,
    )
    assert res_api.status_code in (404, 405)


# ==============================================================================
# 4. Preserved Download Endpoint Stress Testing: GET /file/<file_id>
# ==============================================================================


def test_adversarial_get_file_auth_and_routing(test_client, auth_headers):
    """Verify GET /file/<file_id> auth checks and response format."""
    # Unauthenticated -> 401
    res_unauth = test_client.get("/file/file_123")
    assert res_unauth.status_code == 401

    res_unauth_api = test_client.get("/api/file/file_123")
    assert res_unauth_api.status_code == 401

    # Valid authenticated -> 200
    res_auth = test_client.get("/file/file_123", headers=auth_headers)
    assert res_auth.status_code == 200
    data = res_auth.get_json()
    assert data["id"] == "file_123"
    assert "name" in data

    # Valid via /api/ prefix
    res_auth_api = test_client.get("/api/file/file_123", headers=auth_headers)
    assert res_auth_api.status_code == 200


@pytest.mark.parametrize(
    "bad_id",
    [
        "..%2F..%2Fetc%2Fpasswd",
        "folder%2Fchild",
        "file%00test",
        "%20%20%20",
        "a" * 129,
    ],
)
def test_adversarial_get_file_identifier_validation(test_client, auth_headers, bad_id):
    """
    Verify GET /file/<file_id> sanitizes path parameter against traversal and length violations.
    Paths containing encoded slashes (%2F) fail at Werkzeug route matching (404),
    while non-slash illegal characters/lengths are rejected by sanitize_identifier (400).
    """
    res = test_client.get(f"/file/{bad_id}", headers=auth_headers)
    assert res.status_code in {400, 404}


def test_adversarial_get_file_service_exception_handling(
    test_client, auth_headers, mock_pikpak
):
    """Verify GET /file/<file_id> catches service errors gracefully into 500 JSON response."""
    with patch.object(
        mock_pikpak,
        "get_file",
        new=AsyncMock(side_effect=RuntimeError("File storage unavailable")),
    ):
        res = test_client.get("/file/file_crash", headers=auth_headers)
        assert res.status_code == 500
        data = res.get_json()
        assert "File storage unavailable" in data.get("error", "")


# ==============================================================================
# 5. Non-File Endpoints Regression Testing
# ==============================================================================


def test_adversarial_non_file_endpoints_zero_regressions(test_client, auth_headers):
    """
    Stress-test non-file endpoints across system, health, tasks, shares, quota, and stats
    to confirm zero regressions or cross-contamination from File Explorer deletion.
    """
    # 1. Health Endpoints
    res_live = test_client.get("/health/live")
    assert res_live.status_code == 200
    assert res_live.get_json().get("status") == "ok"

    res_ready = test_client.get("/health/ready")
    assert res_ready.status_code == 200
    assert res_ready.get_json().get("status") == "ready"

    # 2. Tasks Endpoints
    res_tasks_unauth = test_client.get("/tasks")
    assert res_tasks_unauth.status_code == 401

    res_tasks_auth = test_client.get("/tasks", headers=auth_headers)
    assert res_tasks_auth.status_code == 200

    # 3. Add Download Task
    res_add_unauth = test_client.post(
        "/add", json={"url": "magnet:?xt=urn:btih:sample"}
    )
    assert res_add_unauth.status_code == 401

    res_add_bad = test_client.post("/add", headers=auth_headers, json={})
    assert res_add_bad.status_code == 400

    res_add_ok = test_client.post(
        "/add", headers=auth_headers, json={"url": "magnet:?xt=urn:btih:sample"}
    )
    assert res_add_ok.status_code == 200

    # 4. Shares Endpoints
    res_shares_unauth = test_client.get("/shares")
    assert res_shares_unauth.status_code == 401

    res_shares_auth = test_client.get("/shares", headers=auth_headers)
    assert res_shares_auth.status_code == 200

    res_share_post_unauth = test_client.post("/share", json={"id": "file_123"})
    assert res_share_post_unauth.status_code == 401

    res_share_post_auth = test_client.post(
        "/share", headers=auth_headers, json={"id": "file_123"}
    )
    assert res_share_post_auth.status_code == 200

    # 5. Quota Endpoint (Public / Unauthenticated)
    res_quota = test_client.get("/quota")
    assert res_quota.status_code == 200
    data_quota = res_quota.get_json()
    assert "storage" in data_quota
    assert "transfer" in data_quota

    # 6. Statistics Endpoint
    res_stats = test_client.get("/statistics")
    assert res_stats.status_code == 200
