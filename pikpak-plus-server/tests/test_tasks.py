"""
Tests for offline tasks, target folders, phase filtering, and wait_for_task polling.
"""
from __future__ import annotations

import json

import httpx
import pytest

from PikPakAPI import PikpakException


@pytest.mark.asyncio
async def test_offline_download_target_handling(mock_api, client):
    route = mock_api.post("https://api-drive.mypikpak.com/drive/v1/files").respond(
        status_code=200, json={"task": {"id": "task_123"}}
    )

    # 1. Default (parent_id=None) -> folder_type="DOWNLOAD" ("My Pack")
    await client.offline_download("magnet:?xt=urn:btih:xyz")
    payload1 = json.loads(route.calls.last.request.content)
    assert payload1["folder_type"] == "DOWNLOAD"
    assert payload1["parent_id"] is None

    # 2. Explicit root (parent_id="") -> folder_type="" and parent_id=""
    await client.offline_download("magnet:?xt=urn:btih:xyz", parent_id="")
    payload2 = json.loads(route.calls.last.request.content)
    assert payload2["folder_type"] == ""
    assert payload2["parent_id"] == ""

    # 3. Explicit root (parent_id="root")
    await client.add_link("magnet:?xt=urn:btih:xyz", parent_id="root")
    payload3 = json.loads(route.calls.last.request.content)
    assert payload3["folder_type"] == ""
    assert payload3["parent_id"] == ""

    # 4. Custom folder ID
    await client.offline_download("magnet:?xt=urn:btih:xyz", parent_id="folder_abc")
    payload4 = json.loads(route.calls.last.request.content)
    assert payload4["folder_type"] == ""
    assert payload4["parent_id"] == "folder_abc"


@pytest.mark.asyncio
async def test_offline_list_friendly_phases(mock_api, client):
    route = mock_api.get("https://api-drive.mypikpak.com/drive/v1/tasks").respond(
        status_code=200, json={"tasks": []}
    )

    # 1. Comma-separated friendly phases
    await client.offline_list(phase="running,complete")
    filters = json.loads(route.calls.last.request.url.params["filters"])
    assert filters["phase"]["in"] == "PHASE_TYPE_RUNNING,PHASE_TYPE_COMPLETE"

    # 2. "all" phase
    await client.task_ls(phase="all")
    filters_all = json.loads(route.calls.last.request.url.params["filters"])
    assert "PHASE_TYPE_COMPLETE" in filters_all["phase"]["in"]
    assert "PHASE_TYPE_RUNNING" in filters_all["phase"]["in"]


@pytest.mark.asyncio
async def test_wait_for_task_success(mock_api, client):
    # First call returns running, second call returns complete
    mock_api.get("https://api-drive.mypikpak.com/drive/v1/tasks/task_1").mock(
        side_effect=[
            httpx.Response(
                200, json={"task": {"id": "task_1", "phase": "PHASE_TYPE_RUNNING"}}
            ),
            httpx.Response(
                200,
                json={
                    "task": {
                        "id": "task_1",
                        "phase": "PHASE_TYPE_COMPLETE",
                        "file_name": "Done.mp4",
                    }
                },
            ),
        ]
    )

    res = await client.wait_for_task("task_1", timeout=5, poll_interval=0.001)
    assert res["task"]["phase"] == "PHASE_TYPE_COMPLETE"
    assert res["task"]["file_name"] == "Done.mp4"


@pytest.mark.asyncio
async def test_wait_for_task_error(mock_api, client):
    mock_api.get("https://api-drive.mypikpak.com/drive/v1/tasks/task_err").respond(
        status_code=200,
        json={
            "task": {
                "id": "task_err",
                "phase": "PHASE_TYPE_ERROR",
                "message": "Disk space exceeded",
            }
        },
    )

    with pytest.raises(PikpakException, match="Disk space exceeded"):
        await client.wait_for_task("task_err", timeout=5, poll_interval=0.001)
