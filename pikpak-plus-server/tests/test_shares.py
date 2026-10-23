"""
Tests for share link generation, password protection, ID resolution, and restore operations.
"""
from __future__ import annotations

import json

import pytest

from PikPakAPI import PikpakException


@pytest.mark.asyncio
async def test_get_share_info_url_and_raw_id(mock_api, client):
    route = mock_api.get("https://api-drive.mypikpak.com/drive/v1/share").respond(
        status_code=200,
        json={
            "share_id": "VO8BcRb-xyz",
            "title": "Shared Files",
            "files": [{"id": "f1"}],
        },
    )

    # 1. Full URL
    res1 = await client.get_share_info("https://mypikpak.com/s/VO8BcRb-xyz")
    assert res1["share_id"] == "VO8BcRb-xyz"
    assert route.calls.last.request.url.params["share_id"] == "VO8BcRb-xyz"

    # 2. Raw ID
    res2 = await client.get_share_info("VO8BcRb-xyz")
    assert res2["share_id"] == "VO8BcRb-xyz"

    # 3. Pagination support
    await client.get_share_info("VO8BcRb-xyz", limit=50, page_token="page_tok_1")
    assert route.calls.last.request.url.params["limit"] == "50"
    assert route.calls.last.request.url.params["page_token"] == "page_tok_1"


@pytest.mark.asyncio
async def test_get_share_info_invalid_format_raises_exception(client):
    # CRITICAL: Ensures PikpakException is raised, NEVER returning ValueError object
    with pytest.raises(PikpakException, match="Invalid Share Link or ID format"):
        await client.get_share_info("http://bad-url.com/some/random/stuff")


@pytest.mark.asyncio
async def test_file_batch_share_with_title_and_password(mock_api, client):
    route = mock_api.post("https://api-drive.mypikpak.com/drive/v1/share").respond(
        status_code=200,
        json={
            "share_id": "share_created_123",
            "share_url": "https://mypikpak.com/s/xyz",
        },
    )

    res = await client.file_batch_share(
        ids=["f1", "f2"],
        password="SecretPassword123",
        title="My Holiday Photos",
        expiration_days=7,
    )
    assert res["share_id"] == "share_created_123"

    payload = json.loads(route.calls.last.request.content)
    assert payload["file_ids"] == ["f1", "f2"]
    assert payload["share_to"] == "encryptedlink"
    assert payload["pass_code"] == "SecretPassword123"
    assert payload["title"] == "My Holiday Photos"
    assert payload["expiration_days"] == 7


@pytest.mark.asyncio
async def test_restore_with_destination_and_auto_resolution(mock_api, client):
    # Mock share info retrieval for auto-resolution
    mock_api.get("https://api-drive.mypikpak.com/drive/v1/share").respond(
        status_code=200,
        json={
            "share_id": "share_123",
            "pass_code_token": "resolved_token_abc",
            "files": [{"id": "f_shared_1"}, {"id": "f_shared_2"}],
        },
    )

    restore_route = mock_api.post(
        "https://api-drive.mypikpak.com/drive/v1/share/restore"
    ).respond(
        status_code=200,
        json={"restore_task_id": "task_restore_999"},
    )

    # Calling restore without explicit file_ids or pass_code_token, with to_parent_id
    res = await client.restore(
        share_id="share_123",
        password="mypassword",
        to_parent_id="dest_folder_id",
    )
    assert res["restore_task_id"] == "task_restore_999"

    payload = json.loads(restore_route.calls.last.request.content)
    assert payload["share_id"] == "share_123"
    assert payload["pass_code_token"] == "resolved_token_abc"
    assert payload["file_ids"] == ["f_shared_1", "f_shared_2"]
    assert payload["to"] == {"parent_id": "dest_folder_id"}


@pytest.mark.asyncio
async def test_share_restore_history(mock_api, client):
    route = mock_api.get(
        "https://api-drive.mypikpak.com/drive/v1/share/restore/list"
    ).respond(
        status_code=200,
        json={"data": [{"id": "rec_1", "share_id": "s1"}], "next_page_token": "tok2"},
    )

    res = await client.share_restore_history(limit=10, next_page_token="tok1")
    assert len(res["data"]) == 1
    assert route.calls.last.request.url.params["limit"] == "10"
    assert route.calls.last.request.url.params["page_token"] == "tok1"

    # Alias check
    res2 = await client.share_history()
    assert len(res2["data"]) == 1
