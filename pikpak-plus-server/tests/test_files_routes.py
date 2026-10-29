"""
Integration tests for Files API routes (direct file metadata and download endpoints).
Covers: GET /file/<id>, POST /file/download-url, and verifies removed explorer endpoints return 404.
"""
from __future__ import annotations


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


def test_removed_file_explorer_endpoints_return_404(test_client, auth_headers):
    """Verify dedicated File Explorer endpoints are completely removed and return 404."""
    # GET /files
    res_list = test_client.get("/files", headers=auth_headers)
    assert res_list.status_code == 404

    # POST /files/folder
    res_folder = test_client.post(
        "/files/folder",
        headers=auth_headers,
        json={"name": "New Folder"},
    )
    assert res_folder.status_code == 404

    # DELETE /files/<id>
    res_delete = test_client.delete("/files/file_123", headers=auth_headers)
    assert res_delete.status_code == 404


