"""
Integration tests for Files API routes.
Covers: GET /files, GET /file/<id>, POST /file/download-url, POST /files/folder, DELETE /files/<id>.
"""
from __future__ import annotations


def test_list_files_success(test_client, auth_headers):
    """Test GET /files returns directory listing."""
    res = test_client.get("/files", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert "files" in data


def test_list_files_unauthenticated(test_client):
    """Test GET /files without auth returns 401."""
    res = test_client.get("/files")
    assert res.status_code == 401


def test_get_file_metadata(test_client, auth_headers):
    """Test GET /file/<id> returns file metadata."""
    res = test_client.get("/file/file_123", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data.get("id") == "file_123"


def test_get_file_download_url(test_client, auth_headers):
    """Test POST /file/download-url returns download url."""
    res = test_client.post(
        "/file/download-url",
        headers=auth_headers,
        json={"id": "file_123"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert "url" in data or "download_url" in data


def test_create_folder(test_client, auth_headers):
    """Test POST /files/folder creates a directory."""
    res = test_client.post(
        "/files/folder",
        headers=auth_headers,
        json={"name": "New Folder"},
    )
    assert res.status_code == 201


def test_delete_file(test_client, auth_headers):
    """Test DELETE /files/<id> moves file to trash."""
    res = test_client.delete("/files/file_123", headers=auth_headers)
    assert res.status_code == 200
    assert res.get_json()["success"] is True

