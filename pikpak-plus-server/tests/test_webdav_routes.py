"""
Integration tests for WebDAV API routes.
Covers all 6 WebDAV endpoints:
- GET /webdav/applications (@internal_only)
- POST /webdav/toggle (@internal_only)
- POST /webdav/application (@internal_only)
- DELETE /webdav/application (@internal_only)
- PATCH /webdav/application (@internal_only)
- GET /webdav/active-clients (public)
"""
from __future__ import annotations


def test_get_webdav_applications_internal(test_client):
    """Test internal caller can list WebDAV applications."""
    res = test_client.get("/webdav/applications")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"
    assert "applications" in data
    assert len(data["applications"]) >= 1


def test_get_webdav_applications_external_blocked(test_client):
    """Test external caller is blocked by @internal_only with 403."""
    res = test_client.get(
        "/webdav/applications",
        environ_overrides={"REMOTE_ADDR": "203.0.113.50"},
    )
    assert res.status_code == 403
    data = res.get_json()
    assert data["error"] == "Access denied"


def test_get_webdav_applications_with_internal_token(test_client, internal_headers):
    """Test external caller with valid X-Internal-Token header is authorized."""
    res = test_client.get(
        "/webdav/applications",
        headers=internal_headers,
        environ_overrides={"REMOTE_ADDR": "203.0.113.50"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"


def test_toggle_webdav_success(test_client):
    """Test toggling WebDAV status on/off."""
    res_on = test_client.post("/webdav/toggle", json={"enable": True})
    assert res_on.status_code == 200
    data_on = res_on.get_json()
    assert data_on["status"] == "ok"
    assert data_on["enabled"] is True

    res_off = test_client.post("/webdav/toggle", json={"enable": False})
    assert res_off.status_code == 200
    data_off = res_off.get_json()
    assert data_off["status"] == "ok"
    assert data_off["enabled"] is False


def test_toggle_webdav_validation_errors(test_client):
    """Test validation failure for toggle endpoint."""
    # Missing enable
    res_missing = test_client.post("/webdav/toggle", json={})
    assert res_missing.status_code == 400

    # Non-boolean enable
    res_invalid = test_client.post("/webdav/toggle", json={"enable": "yes"})
    assert res_invalid.status_code == 400


def test_toggle_webdav_external_blocked(test_client):
    """Test external caller cannot toggle WebDAV."""
    res = test_client.post(
        "/webdav/toggle",
        json={"enable": True},
        environ_overrides={"REMOTE_ADDR": "198.51.100.22"},
    )
    assert res.status_code == 403


def test_create_webdav_application_success(test_client):
    """Test creating WebDAV application with valid name."""
    res = test_client.post(
        "/webdav/application",
        json={"application_name": "Earth Streamer"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"
    assert "application" in data
    assert data["application"]["name"] == "Earth Streamer"


def test_create_webdav_application_validation(test_client):
    """Test missing or invalid application name."""
    res_missing = test_client.post("/webdav/application", json={})
    assert res_missing.status_code == 400

    res_empty = test_client.post("/webdav/application", json={"application_name": "   "})
    assert res_empty.status_code == 400


def test_create_webdav_application_external_blocked(test_client):
    """Test external caller cannot create WebDAV applications."""
    res = test_client.post(
        "/webdav/application",
        json={"application_name": "Saturn"},
        environ_overrides={"REMOTE_ADDR": "198.51.100.22"},
    )
    assert res.status_code == 403


def test_delete_webdav_application_success(test_client):
    """Test deleting WebDAV application with valid credentials."""
    res = test_client.delete(
        "/webdav/application",
        json={"username": "dav_user_mercury", "password": "securePass123"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"
    assert data["deleted"] is True


def test_delete_webdav_application_validation(test_client):
    """Test missing username or password on delete."""
    res1 = test_client.delete("/webdav/application", json={"username": "dav_user"})
    assert res1.status_code == 400

    res2 = test_client.delete("/webdav/application", json={"password": "dav_password"})
    assert res2.status_code == 400


def test_delete_webdav_application_external_blocked(test_client):
    """Test external caller cannot delete WebDAV application."""
    res = test_client.delete(
        "/webdav/application",
        json={"username": "user", "password": "pass"},
        environ_overrides={"REMOTE_ADDR": "203.0.113.10"},
    )
    assert res.status_code == 403


def test_modify_webdav_application_success(test_client):
    """Test modifying WebDAV application properties."""
    res = test_client.patch(
        "/webdav/application",
        json={
            "username": "dav_user_mercury",
            "password": "securePass123",
            "modify_props": {"read_only": True},
        },
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"


def test_modify_webdav_application_validation(test_client):
    """Test modify with missing parameters or invalid modify_props."""
    res_missing_props = test_client.patch(
        "/webdav/application",
        json={"username": "dav_user", "password": "pass"},
    )
    assert res_missing_props.status_code == 400

    res_invalid_props = test_client.patch(
        "/webdav/application",
        json={"username": "dav_user", "password": "pass", "modify_props": "not_a_dict"},
    )
    assert res_invalid_props.status_code == 400


def test_modify_webdav_application_external_blocked(test_client):
    """Test external caller cannot modify WebDAV application."""
    res = test_client.patch(
        "/webdav/application",
        json={"username": "user", "password": "pass", "modify_props": {"read_only": True}},
        environ_overrides={"REMOTE_ADDR": "203.0.113.10"},
    )
    assert res.status_code == 403


def test_get_active_clients_public(test_client):
    """Test public active WebDAV clients endpoint is accessible from external IP."""
    res = test_client.get(
        "/webdav/active-clients",
        environ_overrides={"REMOTE_ADDR": "203.0.113.99"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert "available" in data
    assert "clients" in data
    assert "refresh_info" in data
    assert len(data["clients"]) >= 1
