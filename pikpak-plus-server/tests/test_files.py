"""
Tests for file and directory operations, filters, aliases, get_file, and path_to_id cursor isolation.
"""
from __future__ import annotations

import json

import httpx
import pytest

from PikPakAPI import FolderStats


@pytest.mark.asyncio
async def test_file_list_default_and_custom_filters(mock_api, client):
    route = mock_api.get("https://api-drive.mypikpak.com/drive/v1/files").respond(
        status_code=200,
        json={"files": [{"id": "f1", "name": "Video.mp4", "kind": "drive#file"}]},
    )

    # 1. Default filters
    res = await client.file_list()
    assert len(res["files"]) == 1
    assert route.called
    req_filters = json.loads(route.calls.last.request.url.params["filters"])
    assert req_filters["phase"] == {"eq": "PHASE_TYPE_COMPLETE"}
    assert req_filters["trashed"] == {"eq": False}

    # 2. Include incomplete
    await client.file_list(include_incomplete=True)
    req_filters2 = json.loads(route.calls.last.request.url.params["filters"])
    assert "phase" not in req_filters2

    # 3. Usage ALL / raw
    await client.file_list(raw=True)
    assert route.calls.last.request.url.params["usage"] == "ALL"


@pytest.mark.asyncio
async def test_create_folder_and_mkdir_alias(mock_api, client):
    mock_api.post("https://api-drive.mypikpak.com/drive/v1/files").respond(
        status_code=200,
        json={
            "file": {"id": "folder_123", "name": "New Folder", "kind": "drive#folder"}
        },
    )

    res1 = await client.create_folder("Documents")
    assert res1["file"]["id"] == "folder_123"

    res2 = await client.mkdir("Documents")
    assert res2["file"]["id"] == "folder_123"


@pytest.mark.asyncio
async def test_file_rename_and_alias(mock_api, client):
    mock_api.patch("https://api-drive.mypikpak.com/drive/v1/files/f1").respond(
        status_code=200,
        json={"id": "f1", "name": "NewName.mp4"},
    )

    res = await client.file_rename("f1", "NewName.mp4")
    assert res["name"] == "NewName.mp4"

    res2 = await client.rename("f1", "NewName.mp4")
    assert res2["name"] == "NewName.mp4"


@pytest.mark.asyncio
async def test_trash_untrash_delete_forever(mock_api, client):
    trash_route = mock_api.post(
        "https://api-drive.mypikpak.com/drive/v1/files:batchTrash"
    ).respond(status_code=200, json={"status": "ok"})
    untrash_route = mock_api.post(
        "https://api-drive.mypikpak.com/drive/v1/files:batchUntrash"
    ).respond(status_code=200, json={"status": "ok"})
    delete_route = mock_api.post(
        "https://api-drive.mypikpak.com/drive/v1/files:batchDelete"
    ).respond(status_code=200, json={"status": "ok"})

    # Single string ID normalized to list
    await client.delete_to_trash("f1")
    assert json.loads(trash_route.calls.last.request.content) == {"ids": ["f1"]}

    await client.rm(["f1", "f2"])
    assert json.loads(trash_route.calls.last.request.content) == {"ids": ["f1", "f2"]}

    await client.untrash("f1")
    assert json.loads(untrash_route.calls.last.request.content) == {"ids": ["f1"]}

    await client.delete_forever(["f1"])
    assert json.loads(delete_route.calls.last.request.content) == {"ids": ["f1"]}


@pytest.mark.asyncio
async def test_copy_move_star_unstar_single_and_batch(mock_api, client):
    mock_api.post("https://api-drive.mypikpak.com/drive/v1/files:batchCopy").respond(
        status_code=200, json={}
    )
    mock_api.post("https://api-drive.mypikpak.com/drive/v1/files:batchMove").respond(
        status_code=200, json={}
    )
    mock_api.post("https://api-drive.mypikpak.com/drive/v1/files:star").respond(
        status_code=200, json={}
    )
    mock_api.post("https://api-drive.mypikpak.com/drive/v1/files:unstar").respond(
        status_code=200, json={}
    )

    await client.file_copy("f1", "target_folder")
    await client.cp("f1", "target_folder")

    await client.file_move("f1", "target_folder")
    await client.mv("f1", "target_folder")

    await client.file_star("f1")
    await client.star("f1")

    await client.file_unstar("f1")
    await client.unstar("f1")


@pytest.mark.asyncio
async def test_get_file_unified_mcp_format(mock_api, client):
    mock_api.post("https://user.mypikpak.com/v1/shield/captcha/init").respond(
        status_code=200, json={"captcha_token": "cap123"}
    )
    mock_api.get("https://api-drive.mypikpak.com/drive/v1/files/f1").respond(
        status_code=200,
        json={
            "id": "f1",
            "name": "Movie.mkv",
            "kind": "drive#file",
            "size": "10574299140",
            "mime_type": "video/x-matroska",
            "modified_time": "2026-10-22T19:21:00Z",
            "hash": "HASH123",
            "web_content_link": "https://dl.pikpak.com/download/Movie.mkv",
            "medias": [{"link": {"url": "https://stream.pikpak.com/play/Movie.mkv"}}],
            "params": {"duration": "7200", "width": "1920", "height": "1080"},
        },
    )

    # 1. url_type="all"
    res_all = await client.get_file("f1", url_type="all")
    assert res_all["id"] == "f1"
    assert res_all["download_url"] == "https://dl.pikpak.com/download/Movie.mkv"
    assert res_all["play_url"] == "https://stream.pikpak.com/play/Movie.mkv"
    assert res_all["resolution"] == "1920x1080"
    assert res_all["size"] == "9.85 GB"

    # 2. url_type="download"
    res_dl = await client.get_file("f1", url_type="download")
    assert "download_url" in res_dl
    assert "play_url" not in res_dl

    # 3. url_type="play"
    res_play = await client.get_file("f1", url_type="play")
    assert "play_url" in res_play
    assert "download_url" not in res_play

    # 4. raw=True
    res_raw = await client.get_file("f1", raw=True)
    assert res_raw["kind"] == "drive#file"


@pytest.mark.asyncio
async def test_get_download_url_no_dangling_question_mark(mock_api, client):
    mock_api.post("https://user.mypikpak.com/v1/shield/captcha/init").respond(
        status_code=200, json={"captcha_token": "cap123"}
    )
    route = mock_api.get("https://api-drive.mypikpak.com/drive/v1/files/f1").respond(
        status_code=200, json={"id": "f1"}
    )

    await client.get_download_url("f1")
    # Verify the requested URL does not end with '?'
    assert (
        str(route.calls.last.request.url)
        == "https://api-drive.mypikpak.com/drive/v1/files/f1"
    )


@pytest.mark.asyncio
async def test_get_folder_stats(mock_api, client):
    mock_api.get("https://api-drive.mypikpak.com/drive/v1/files").respond(
        status_code=200,
        json={
            "files": [
                {"id": "file1", "kind": "drive#file", "size": "1000"},
                {"id": "file2", "kind": "drive#file", "size": "2000"},
            ],
            "next_page_token": "",
        },
    )

    stats = await client.get_folder_stats("folder_id")
    assert isinstance(stats, FolderStats)
    assert stats.total_size == 3000
    assert stats.file_count == 2
    assert stats.folder_count == 0


@pytest.mark.asyncio
async def test_path_to_id_resets_cursor_on_child_descent(mock_api, client):
    """
    Defect 1 Regression Test:
    Verify that pagination tokens from parent folder do not leak into child folder traversal.
    """
    def file_list_side_effect(request):
        parent_id = request.url.params.get("parent_id", "")
        page_token = request.url.params.get("page_token")

        if parent_id == "":
            if not page_token:
                # Page 1 of root
                return httpx.Response(
                    200,
                    json={
                        "files": [{"id": "f_root_1", "name": "FolderA", "kind": "drive#folder"}],
                        "next_page_token": "root_page_2_cursor",
                    },
                )
            elif page_token == "root_page_2_cursor":
                # Page 2 of root
                return httpx.Response(
                    200,
                    json={
                        "files": [{"id": "movies_dir_id", "name": "Movies", "kind": "drive#folder"}],
                        "next_page_token": "root_page_3_cursor",
                    },
                )
        elif parent_id == "movies_dir_id":
            # Child listing: page_token MUST NOT be set to root cursor
            assert page_token is None or page_token == ""
            return httpx.Response(
                200,
                json={
                    "files": [{"id": "action_dir_id", "name": "Action", "kind": "drive#folder"}],
                    "next_page_token": None,
                },
            )
        return httpx.Response(404, json={"error": "Not found"})

    route = mock_api.get("https://api-drive.mypikpak.com/drive/v1/files").mock(
        side_effect=file_list_side_effect
    )

    client._path_id_cache.clear()
    path_result = await client.path_to_id("/Movies/Action")
    assert len(path_result) == 2
    assert path_result[0]["id"] == "movies_dir_id"
    assert path_result[1]["id"] == "action_dir_id"

    # Verify calls made
    assert route.call_count == 3
    # Check that the 3rd call had parent_id == "movies_dir_id" and NO page_token
    third_call_params = route.calls[2].request.url.params
    assert third_call_params.get("parent_id") == "movies_dir_id"
    assert third_call_params.get("page_token") is None


@pytest.mark.asyncio
async def test_path_to_id_resets_cursor_on_folder_creation(mock_api, client):
    """
    Defect 1 Regression Test (Creation Flow):
    Verify that pagination tokens from parent folder do not leak into child folder when create=True.
    """
    def file_list_side_effect(request):
        parent_id = request.url.params.get("parent_id", "")
        page_token = request.url.params.get("page_token")

        if parent_id == "":
            if not page_token:
                return httpx.Response(
                    200,
                    json={
                        "files": [],
                        "next_page_token": "root_token_abc",
                    },
                )
            elif page_token == "root_token_abc":
                return httpx.Response(
                    200,
                    json={
                        "files": [],
                        "next_page_token": "",
                    },
                )
        elif parent_id == "new_created_parent_id":
            # Defect 1 verification: cursor MUST be reset to None/empty
            assert page_token is None or page_token == ""
            return httpx.Response(
                200,
                json={"files": [{"id": "child_sub_id", "name": "SubChild", "kind": "drive#folder"}]},
            )
        return httpx.Response(404, json={"error": "Not found"})

    list_route = mock_api.get("https://api-drive.mypikpak.com/drive/v1/files").mock(
        side_effect=file_list_side_effect
    )

    mock_api.post("https://api-drive.mypikpak.com/drive/v1/files").respond(
        status_code=200,
        json={"file": {"id": "new_created_parent_id", "name": "NewParent", "kind": "drive#folder"}},
    )

    client._path_id_cache.clear()
    res = await client.path_to_id("/NewParent/SubChild", create=True)
    assert len(res) == 2
    assert res[0]["id"] == "new_created_parent_id"
    assert res[1]["id"] == "child_sub_id"

    # Verify that the last list call was inside new_created_parent_id without root_token_abc
    last_call_params = list_route.calls.last.request.url.params
    assert last_call_params.get("parent_id") == "new_created_parent_id"
    assert last_call_params.get("page_token") is None
