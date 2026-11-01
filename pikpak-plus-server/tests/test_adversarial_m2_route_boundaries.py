"""
Adversarial Stress Test Suite for Milestone 2: Route Boundary & Input Validation.

Empirically challenges:
1. Pagination Boundary Fuzzing (page/limit boundaries, negative, zero, overflow, type mismatches).
2. Oversized Payloads & Length Boundaries (bcrypt DoS prevention, email max/min, URL max).
3. SQL Injection Patterns in Email & Identifier parameters.
4. XSS & Control Character Injection in URLs and Text fields.
5. Path Traversal & Identifier Boundary Vectors (sanitize_identifier and route path parameters).
6. Malformed JSON & Non-Dict Request Payloads across all POST/PATCH/DELETE endpoints.
"""
from __future__ import annotations

import pytest

from app.utils.validators import (
    get_json_body,
    sanitize_identifier,
    validate_email,
    validate_pagination,
    validate_password,
)

# ==============================================================================
# 1. Direct Unit Boundary Testing: Validators Module
# ==============================================================================

class DummyRequest:
    def __init__(self, json_data):
        self._json_data = json_data

    def get_json(self, silent=True):
        return self._json_data


def test_validator_get_json_body_boundaries(flask_app):
    """Verify get_json_body handles non-dicts, missing fields, and type violations."""
    with flask_app.app_context():
        # None / silent parse failure
        data, err = get_json_body(DummyRequest(None))
        assert data is None
        assert err is not None
        assert err[1] == 400

        # Non-dict JSON (list, int, string, bool)
        for bad in [[1, 2, 3], "string", 12345, True]:
            data, err = get_json_body(DummyRequest(bad))
            assert data is None
            assert err[1] == 400

        # Missing required fields
        data, err = get_json_body(DummyRequest({"a": 1}), required_fields=["a", "b"])
        assert data is None
        assert err[1] == 400
        assert "b" in err[0].get_json()["message"]

        # Field type mismatch
        data, err = get_json_body(
            DummyRequest({"email": 12345}),
            field_types={"email": str}
        )
        assert data is None
        assert err[1] == 400
        assert "must be of type str" in err[0].get_json()["message"]

        # Valid dictionary matching types
        data, err = get_json_body(
            DummyRequest({"email": "test@example.com", "count": 5}),
            required_fields=["email"],
            field_types={"email": str, "count": int}
        )
        assert data == {"email": "test@example.com", "count": 5}
        assert err is None


def test_validator_pagination_boundaries(flask_app):
    """Exhaustive boundary testing of validate_pagination."""
    with flask_app.app_context():
        # Valid default
        p, lim, err = validate_pagination({}, default_page=1, default_limit=25, max_limit=100)
        assert (p, lim, err) == (1, 25, None)

        # Valid minimums
        p, lim, err = validate_pagination({"page": "1", "limit": "1"}, max_limit=100)
        assert (p, lim, err) == (1, 1, None)

        # Valid maximums
        p, lim, err = validate_pagination({"page": "10000", "limit": "100"}, max_limit=100)
        assert (p, lim, err) == (10000, 100, None)

        # Page lower violation (0 and negative)
        for bad_page in [0, -1, -9999]:
            p, lim, err = validate_pagination({"page": bad_page, "limit": 25})
            assert err is not None
            assert err[1] == 400

        # Page upper violation (> 10,000)
        for bad_page in [10001, 999999]:
            p, lim, err = validate_pagination({"page": bad_page, "limit": 25})
            assert err is not None
            assert err[1] == 400

        # Limit lower violation (0 and negative)
        for bad_limit in [0, -1, -50]:
            p, lim, err = validate_pagination({"page": 1, "limit": bad_limit})
            assert err is not None
            assert err[1] == 400

        # Limit upper violation (> max_limit)
        for bad_limit in [101, 1000, 999999]:
            p, lim, err = validate_pagination({"page": 1, "limit": bad_limit}, max_limit=100)
            assert err is not None
            assert err[1] == 400

        # Type / syntax errors
        for non_int in ["abc", "1.5", "", None, [], {}]:
            p, lim, err = validate_pagination({"page": non_int, "limit": 25})
            assert err is not None
            assert err[1] == 400


def test_validator_email_boundaries_and_illegal_chars():
    """Verify email boundaries, null bytes, CRLF, and length limits."""
    # Valid boundaries
    assert validate_email("a@b.c")[0] is True  # 5 chars min
    assert validate_email("a" * 242 + "@example.com")[0] is True  # 254 chars max

    # Length violations
    assert validate_email("")[0] is False
    assert validate_email("a@b")[0] is False  # 3 chars < 5
    assert validate_email("a" * 243 + "@example.com")[0] is False  # 255 chars > 254
    assert validate_email("a" * 5000 + "@example.com")[0] is False  # Oversized

    # Non-string
    for non_str in [12345, None, ["test@example.com"], {"email": "test@example.com"}]:
        assert validate_email(non_str)[0] is False

    # Illegal control characters & CRLF injection
    assert validate_email("user@example.com\r\nBcc: victim@example.com")[0] is False
    assert validate_email("user@example.com\0admin")[0] is False
    assert validate_email("user @example.com")[0] is False
    assert validate_email("user\n@example.com")[0] is False


def test_validator_password_boundaries_and_dos_defense():
    """Verify password boundaries and bcrypt CPU exhaustion protection."""
    # Valid boundaries
    assert validate_password("123456", min_len=6, max_len=128)[0] is True  # 6 chars min
    assert validate_password("a" * 128, min_len=6, max_len=128)[0] is True  # 128 chars max

    # Too short
    assert validate_password("", min_len=6, max_len=128)[0] is False
    assert validate_password("12345", min_len=6, max_len=128)[0] is False

    # Exceeds max length (guards bcrypt 72-byte truncation and CPU DoS)
    assert validate_password("a" * 129, min_len=6, max_len=128)[0] is False
    assert validate_password("a" * 100000, min_len=6, max_len=128)[0] is False

    # Non-string
    assert validate_password(123456)[0] is False
    assert validate_password(None)[0] is False


def test_validator_sanitize_identifier_boundaries():
    """Verify sanitize_identifier against path traversal, null bytes, and length limits."""
    # Valid identifiers
    assert sanitize_identifier("valid-id-123")[0] is True
    assert sanitize_identifier("a" * 128)[0] is True

    # Path traversal sequences
    assert sanitize_identifier("../../etc/shadow")[0] is False
    assert sanitize_identifier("..\\windows\\system32")[0] is False
    assert sanitize_identifier("dir/file")[0] is False
    assert sanitize_identifier("dir\\file")[0] is False
    assert sanitize_identifier("file\0ext")[0] is False

    # Length & empty violations
    assert sanitize_identifier("")[0] is False
    assert sanitize_identifier("   ")[0] is False
    assert sanitize_identifier("a" * 129)[0] is False
    assert sanitize_identifier(12345)[0] is False
    assert sanitize_identifier(None)[0] is False


# ==============================================================================
# 2. Route Integration Boundary Tests: Pagination
# ==============================================================================

def test_route_tasks_pagination_boundaries(test_client, auth_headers):
    """Stress-test /tasks pagination with extreme, invalid, and boundary query parameters."""
    # Boundary valid: page=1, limit=1
    res = test_client.get("/tasks?page=1&limit=1", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["page"] == 1
    assert data["limit"] == 1

    # Boundary valid: page=10000, limit=100
    res = test_client.get("/tasks?page=10000&limit=100", headers=auth_headers)
    assert res.status_code == 200

    # Boundary invalid: page=0
    res = test_client.get("/tasks?page=0&limit=25", headers=auth_headers)
    assert res.status_code == 400
    assert "page" in res.get_json()["error"].lower()

    # Boundary invalid: page=-1
    res = test_client.get("/tasks?page=-1&limit=25", headers=auth_headers)
    assert res.status_code == 400

    # Boundary invalid: page=10001
    res = test_client.get("/tasks?page=10001&limit=25", headers=auth_headers)
    assert res.status_code == 400

    # Boundary invalid: limit=0
    res = test_client.get("/tasks?page=1&limit=0", headers=auth_headers)
    assert res.status_code == 400

    # Boundary invalid: limit=101
    res = test_client.get("/tasks?page=1&limit=101", headers=auth_headers)
    assert res.status_code == 400

    # Type violation: non-integers
    for bad_param in ["abc", "1.5", "NaN", "true", "null", ""]:
        res = test_client.get(f"/tasks?page={bad_param}&limit=25", headers=auth_headers)
        assert res.status_code == 400

        res = test_client.get(f"/tasks?page=1&limit={bad_param}", headers=auth_headers)
        assert res.status_code == 400


def test_route_admin_users_pagination_boundaries(test_client, admin_headers):
    """Stress-test /admin/users pagination with boundary values."""
    # Boundary valid: page=1, limit=100
    res = test_client.get("/admin/users?page=1&limit=100", headers=admin_headers)
    assert res.status_code == 200

    # Boundary invalid: limit=101
    res = test_client.get("/admin/users?page=1&limit=101", headers=admin_headers)
    assert res.status_code == 400

    # Boundary invalid: page=0
    res = test_client.get("/admin/users?page=0&limit=25", headers=admin_headers)
    assert res.status_code == 400


def test_route_statistics_limit_boundaries(test_client):
    """Stress-test /statistics limit parameter boundaries (1 to 365)."""
    # Boundary valid: limit=1
    res = test_client.get("/statistics?limit=1")
    assert res.status_code == 200

    # Boundary valid: limit=365
    res = test_client.get("/statistics?limit=365")
    assert res.status_code == 200

    # Boundary invalid: limit=0
    res = test_client.get("/statistics?limit=0")
    assert res.status_code == 400
    assert "limit" in res.get_json()["error"].lower()

    # Boundary invalid: limit=366
    res = test_client.get("/statistics?limit=366")
    assert res.status_code == 400

    # Boundary invalid: non-int
    res = test_client.get("/statistics?limit=invalid")
    assert res.status_code == 400


# ==============================================================================
# 3. Route Integration Boundary Tests: Oversized Payloads & Length Boundaries
# ==============================================================================

def test_route_auth_password_length_matrix(test_client):
    """Test /register password length boundaries (min 6, max 128) and DoS payloads."""
    # Short password (5 chars)
    res = test_client.post(
        "/register",
        json={"email": "pass_short@example.com", "password": "12345"}
    )
    assert res.status_code == 400
    assert "at least 6 characters" in res.get_json()["message"]

    # Oversized password (129 chars)
    res = test_client.post(
        "/register",
        json={"email": "pass_over@example.com", "password": "a" * 129}
    )
    assert res.status_code == 400
    assert "cannot exceed 128 characters" in res.get_json()["message"]

    # Massive 50,000-char password (bcrypt DoS attempt)
    res = test_client.post(
        "/register",
        json={"email": "pass_dos@example.com", "password": "a" * 50000}
    )
    assert res.status_code == 400
    assert "cannot exceed 128 characters" in res.get_json()["message"]


def test_route_auth_email_length_matrix(test_client):
    """Test email length boundaries and oversized payloads on /register and /forgot-password."""
    # Too short (< 5 chars)
    res = test_client.post("/register", json={"email": "a@b", "password": "password123"})
    assert res.status_code == 400

    # Exceeds max length (> 254 chars)
    oversized_email = "a" * 243 + "@example.com"
    res = test_client.post("/register", json={"email": oversized_email, "password": "password123"})
    assert res.status_code == 400

    # Massive 10,000-char email
    res = test_client.post(
        "/forgot-password",
        json={"email": "a" * 10000 + "@example.com"}
    )
    assert res.status_code == 400


def test_route_add_task_url_length_boundaries(test_client, auth_headers):
    """Test URL length boundaries on /add (max 4096 chars)."""
    # Empty URL
    res = test_client.post("/add", headers=auth_headers, json={"url": ""})
    assert res.status_code == 400

    # Whitespace only
    res = test_client.post("/add", headers=auth_headers, json={"url": "   "})
    assert res.status_code == 400

    # URL exceeding 4096 chars
    oversized_url = "magnet:?xt=urn:btih:" + "a" * 4100
    res = test_client.post("/add", headers=auth_headers, json={"url": oversized_url})
    assert res.status_code == 400
    assert "maximum limit" in res.get_json()["error"]


# ==============================================================================
# 4. Route Integration Boundary Tests: SQL Injection & XSS Patterns
# ==============================================================================

@pytest.mark.parametrize("sqli_payload", [
    "' OR '1'='1",
    "admin'--",
    "test@example.com'; DROP TABLE users; --",
    "admin@example.com\0",
    "admin@example.com\r\nBcc: evil@attacker.com",
    "admin' UNION SELECT password FROM users--@test.com",
    "' or ''='",
    "1; EXEC xp_cmdshell('dir')--",
])
def test_route_sqli_patterns_rejected(test_client, admin_headers, sqli_payload):
    """Verify various SQL injection / escape vectors in emails are rejected."""
    # 1. /register
    res_reg = test_client.post("/register", json={"email": sqli_payload, "password": "Password123!"})
    assert res_reg.status_code == 400

    # 2. /forgot-password
    res_forgot = test_client.post("/forgot-password", json={"email": sqli_payload})
    assert res_forgot.status_code == 400

    # 3. /admin/users/<email>
    res_admin = test_client.get(f"/admin/users/{sqli_payload}", headers=admin_headers)
    assert res_admin.status_code in {400, 404}


@pytest.mark.parametrize("xss_payload", [
    "<script>alert(1)</script>",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "\"><script src=//attacker.com/xss.js></script>",
])
def test_route_xss_urls_rejected(test_client, auth_headers, xss_payload):
    """Verify XSS strings in URL fields are rejected by /add."""
    res = test_client.post("/add", headers=auth_headers, json={"url": xss_payload})
    assert res.status_code == 400


# ==============================================================================
# 5. Route Integration Boundary Tests: Path Traversal & Identifier Safety
# ==============================================================================

@pytest.mark.parametrize("traversal_id", [
    "../../etc/passwd",
    "..\\windows\\win.ini",
    "....//....//etc/shadow",
    "foo/../../bar",
    "valid_id\0nullbyte",
])
def test_route_path_traversal_in_admin_user_email(test_client, admin_headers, traversal_id):
    """Verify path traversal in email route param is rejected or 404'd safely."""
    res = test_client.get(f"/admin/users/{traversal_id}", headers=admin_headers)
    # validate_email rejects with 400 or Flask router handles traversal with 404
    assert res.status_code in {400, 404}


def test_route_path_traversal_in_share_id(test_client, auth_headers):
    """Verify /share handles path traversal in 'id' parameter gracefully without crashing."""
    res = test_client.post("/share", headers=auth_headers, json={"id": "../../etc/shadow"})
    assert res.status_code in {200, 400}


def test_route_webdav_create_empty_or_whitespace_name(test_client):
    """Verify /webdav/application rejects empty or whitespace names."""
    res_empty = test_client.post("/webdav/application", json={"application_name": ""})
    assert res_empty.status_code == 400

    res_ws = test_client.post("/webdav/application", json={"application_name": "   \t\n  "})
    assert res_ws.status_code == 400


# ==============================================================================
# 6. Malformed JSON & Non-Dict Request Payloads
# ==============================================================================

@pytest.mark.parametrize("endpoint,method,headers_fixture", [
    ("/register", "post", None),
    ("/login", "post", None),
    ("/forgot-password", "post", None),
    ("/reset-password", "post", None),
    ("/add", "post", "auth_headers"),
    ("/share", "post", "auth_headers"),
    ("/webdav/toggle", "post", None),
    ("/webdav/application", "post", None),
    ("/webdav/application", "delete", None),
    ("/webdav/application", "patch", None),
    ("/admin/users", "post", "admin_headers"),
])
def test_all_mutating_routes_reject_malformed_or_non_dict_json(
    test_client, request, endpoint, method, headers_fixture
):
    """Verify every POST/PATCH/DELETE route rejects non-dict JSON and invalid JSON with 400."""
    headers = {"Content-Type": "application/json"}
    if headers_fixture:
        resolved_headers = request.getfixturevalue(headers_fixture)
        headers.update(resolved_headers)

    # 1. Non-dict JSON: list
    res_list = test_client.open(
        endpoint,
        method=method,
        data="[1, 2, 3]",
        headers=headers,
    )
    assert res_list.status_code == 400

    # 2. Non-dict JSON: raw string
    res_str = test_client.open(
        endpoint,
        method=method,
        data='"just_a_string"',
        headers=headers,
    )
    assert res_str.status_code == 400

    # 3. Non-dict JSON: integer
    res_int = test_client.open(
        endpoint,
        method=method,
        data="9999",
        headers=headers,
    )
    assert res_int.status_code == 400

    # 4. Syntactically invalid JSON
    res_bad_syntax = test_client.open(
        endpoint,
        method=method,
        data="{'invalid': json}",
        headers=headers,
    )
    assert res_bad_syntax.status_code == 400

    # 5. Empty body with application/json
    res_empty = test_client.open(
        endpoint,
        method=method,
        data="",
        headers=headers,
    )
    assert res_empty.status_code == 400


def test_admin_logs_pagination_validation_defects(test_client, admin_headers):
    """
    Adversarial finding:
    /admin/logs and /admin/users/<email>/logs use int(request.args.get(...)) directly
    instead of validate_pagination(), causing 500 Internal Server Error when non-integers are passed.
    """
    # 1. /admin/logs with invalid page
    res_logs = test_client.get("/admin/logs?page=abc", headers=admin_headers)
    assert res_logs.status_code == 400

    # 2. /admin/users/<email>/logs with invalid limit
    res_user_logs = test_client.get("/admin/users/user@example.com/logs?limit=xyz", headers=admin_headers)
    assert res_user_logs.status_code == 400


def test_admin_mutating_endpoints_non_dict_json_defects(test_client, admin_headers):
    """
    Adversarial finding:
    PATCH /admin/users/<email>/password, PATCH /admin/config, and POST /admin/users/bulk-action
    do not use get_json_body(), crashing into 500 on non-dict or non-string/int JSON payloads.
    """
    # 1. PATCH /admin/users/<email>/password with list payload
    res_pass = test_client.patch(
        "/admin/users/user@example.com/password",
        data="[1, 2, 3]",
        headers=admin_headers,
    )
    assert res_pass.status_code == 400

    # 2. PATCH /admin/config with list payload
    res_config = test_client.patch(
        "/admin/config",
        data="[1, 2, 3]",
        headers=admin_headers,
    )
    assert res_config.status_code == 400

    # 3. POST /admin/users/bulk-action with int payload
    res_bulk = test_client.post(
        "/admin/users/bulk-action",
        data="12345",
        headers=admin_headers,
    )
    assert res_bulk.status_code == 400

