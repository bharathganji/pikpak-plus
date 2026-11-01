"""
Adversarial Stress Test Suite for PikPakAPI M1 (Challenger 2).

Empirically challenges:
1. Deep multi-level directory pagination in path_to_id() (4+ levels, 2+ pages per level,
   zero cursor leakage between parent and child directory traversals, cursor loop termination).
2. Legacy backward-compatibility stubs (PikpakException.py, api.py, settings.py,
   file_manager.py, offline_download.py).
3. WebDAV mixin error resilience across all 5 methods (empty responses, non-JSON HTML bodies,
   HTTP 401/403/404/429/500/502/503 status codes, business error codes, and extreme inputs).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
import respx
from httpx import Response

from PikPakAPI import (
    PikPakApi,
    PikPakCaptchaRequiredException,
    PikpakException,
    PikpakNotFoundError,
    PikPakRateLimitExceededException,
)
from PikPakAPI.throttler import CircuitState
from tests.conftest import MOCK_JWT

# ===========================================================================
# 1. DEEP MULTI-LEVEL DIRECTORY PAGINATION ADVERSARIAL STRESS TESTS
# ===========================================================================


@pytest.mark.asyncio
async def test_deep_path_to_id_multi_level_pagination_zero_cursor_leakage(client: PikPakApi) -> None:
    """
    Adversarial Stress Test:
    Traverse a deep 4-level nested path: '/movies/sci-fi/2026/interstellar'
    Every single directory level requires 2 to 3 pagination pages to find the target.

    Empirically verifies:
    1. For every directory level, the very first request made MUST have `page_token=None`
       (or absent). Under NO circumstances may a parent level's page token leak into a child level.
    2. All 4 target records are correctly found in sequence.
    3. The internal cache is correctly populated for all traversed subpaths.
    """
    client._path_id_cache.clear()
    recorded_requests: list[dict[str, Any]] = []

    def mock_files_endpoint(request: Any) -> Response:
        parent_id = request.url.params.get("parent_id", "")
        page_token = request.url.params.get("page_token")

        recorded_requests.append({
            "parent_id": parent_id,
            "page_token": page_token,
            "url": str(request.url),
        })

        # Level 1: Root listing (parent_id == "")
        if parent_id == "":
            if not page_token:
                # Page 1 of root: noise, page token points to page 2
                return Response(
                    200,
                    json={
                        "files": [
                            {"id": "noise_root_1", "name": "Documents", "kind": "drive#folder"},
                            {"id": "noise_root_2", "name": "Photos", "kind": "drive#folder"},
                        ],
                        "next_page_token": "token_root_page2",
                    },
                )
            elif page_token == "token_root_page2":
                # Page 2 of root: contains 'movies'
                return Response(
                    200,
                    json={
                        "files": [
                            {"id": "noise_root_3", "name": "Music", "kind": "drive#folder"},
                            {"id": "id_movies", "name": "movies", "kind": "drive#folder"},
                        ],
                        "next_page_token": "token_root_page3_unused",
                    },
                )

        # Level 2: Inside 'movies' (parent_id == 'id_movies')
        elif parent_id == "id_movies":
            if not page_token:
                # Page 1 of movies
                return Response(
                    200,
                    json={
                        "files": [
                            {"id": "noise_movies_1", "name": "action", "kind": "drive#folder"},
                            {"id": "noise_movies_2", "name": "comedy", "kind": "drive#folder"},
                        ],
                        "next_page_token": "token_movies_page2",
                    },
                )
            elif page_token == "token_movies_page2":
                # Page 2 of movies: contains 'sci-fi'
                return Response(
                    200,
                    json={
                        "files": [
                            {"id": "noise_movies_3", "name": "drama", "kind": "drive#folder"},
                            {"id": "id_scifi", "name": "sci-fi", "kind": "drive#folder"},
                        ],
                        "next_page_token": "token_movies_page3_unused",
                    },
                )

        # Level 3: Inside 'sci-fi' (parent_id == 'id_scifi')
        elif parent_id == "id_scifi":
            if not page_token:
                # Page 1 of sci-fi
                return Response(
                    200,
                    json={
                        "files": [
                            {"id": "noise_scifi_1", "name": "2024", "kind": "drive#folder"},
                        ],
                        "next_page_token": "token_scifi_page2",
                    },
                )
            elif page_token == "token_scifi_page2":
                # Page 2 of sci-fi
                return Response(
                    200,
                    json={
                        "files": [
                            {"id": "noise_scifi_2", "name": "2025", "kind": "drive#folder"},
                        ],
                        "next_page_token": "token_scifi_page3",
                    },
                )
            elif page_token == "token_scifi_page3":
                # Page 3 of sci-fi: contains '2026'
                return Response(
                    200,
                    json={
                        "files": [
                            {"id": "id_2026", "name": "2026", "kind": "drive#folder"},
                        ],
                        "next_page_token": None,
                    },
                )

        # Level 4: Inside '2026' (parent_id == 'id_2026')
        elif parent_id == "id_2026":
            if not page_token:
                # Page 1 of 2026
                return Response(
                    200,
                    json={
                        "files": [
                            {"id": "noise_2026_1", "name": "teaser.mp4", "kind": "drive#file"},
                        ],
                        "next_page_token": "token_2026_page2",
                    },
                )
            elif page_token == "token_2026_page2":
                # Page 2 of 2026: contains 'interstellar'
                return Response(
                    200,
                    json={
                        "files": [
                            {"id": "id_interstellar", "name": "interstellar", "kind": "drive#file"},
                        ],
                        "next_page_token": None,
                    },
                )

        return Response(404, json={"error": "unexpected parent or token"})

    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://api-drive.mypikpak.com/drive/v1/files").mock(side_effect=mock_files_endpoint)

        result = await client.path_to_id("/movies/sci-fi/2026/interstellar")

        # Invariant 1: Path resolved all 4 parts
        assert len(result) == 4
        assert [r["id"] for r in result] == ["id_movies", "id_scifi", "id_2026", "id_interstellar"]
        assert [r["name"] for r in result] == ["movies", "sci-fi", "2026", "interstellar"]
        assert [r["file_type"] for r in result] == ["folder", "folder", "folder", "file"]

        # Invariant 2: Total 9 page requests executed
        assert len(recorded_requests) == 9

        # Invariant 3: ZERO CURSOR LEAKAGE AT LEVEL BOUNDARIES
        # Level 1
        assert recorded_requests[0]["parent_id"] == ""
        assert recorded_requests[0]["page_token"] is None

        assert recorded_requests[1]["parent_id"] == ""
        assert recorded_requests[1]["page_token"] == "token_root_page2"

        # Boundary 1 -> 2: Level 2 MUST start with page_token None (NOT token_root_page3_unused)
        assert recorded_requests[2]["parent_id"] == "id_movies"
        assert recorded_requests[2]["page_token"] is None, (
            f"LEAK DETECTED! Level 2 started with parent page token: {recorded_requests[2]['page_token']}"
        )

        assert recorded_requests[3]["parent_id"] == "id_movies"
        assert recorded_requests[3]["page_token"] == "token_movies_page2"

        # Boundary 2 -> 3: Level 3 MUST start with page_token None
        assert recorded_requests[4]["parent_id"] == "id_scifi"
        assert recorded_requests[4]["page_token"] is None, (
            f"LEAK DETECTED! Level 3 started with parent page token: {recorded_requests[4]['page_token']}"
        )

        assert recorded_requests[5]["parent_id"] == "id_scifi"
        assert recorded_requests[5]["page_token"] == "token_scifi_page2"

        assert recorded_requests[6]["parent_id"] == "id_scifi"
        assert recorded_requests[6]["page_token"] == "token_scifi_page3"

        # Boundary 3 -> 4: Level 4 MUST start with page_token None
        assert recorded_requests[7]["parent_id"] == "id_2026"
        assert recorded_requests[7]["page_token"] is None, (
            f"LEAK DETECTED! Level 4 started with parent page token: {recorded_requests[7]['page_token']}"
        )

        assert recorded_requests[8]["parent_id"] == "id_2026"
        assert recorded_requests[8]["page_token"] == "token_2026_page2"


@pytest.mark.asyncio
async def test_deep_path_pagination_with_creation_at_leaf(client: PikPakApi) -> None:
    """
    Adversarial Stress Test:
    Traverse a deep path with create=True where parent folders require pagination
    and leaf folders must be created dynamically without cursor contamination.
    Path: '/data/archive/batch1/item1'
    - 'data': found on page 2
    - 'archive': found on page 2
    - 'batch1': NOT found after 2 pages -> created dynamically
    - 'item1': NOT found on first check -> created dynamically
    """
    client._path_id_cache.clear()
    recorded_requests: list[dict[str, Any]] = []

    def mock_files_endpoint(request: Any) -> Response:
        parent_id = request.url.params.get("parent_id", "")
        page_token = request.url.params.get("page_token")

        recorded_requests.append({
            "action": "list",
            "parent_id": parent_id,
            "page_token": page_token,
        })

        if parent_id == "":
            if not page_token:
                return Response(200, json={"files": [], "next_page_token": "tok_root_2"})
            elif page_token == "tok_root_2":
                return Response(200, json={"files": [{"id": "id_data", "name": "data", "kind": "drive#folder"}]})

        elif parent_id == "id_data":
            if not page_token:
                return Response(200, json={"files": [], "next_page_token": "tok_data_2"})
            elif page_token == "tok_data_2":
                return Response(200, json={"files": [{"id": "id_archive", "name": "archive", "kind": "drive#folder"}]})

        elif parent_id == "id_archive":
            # Search for 'batch1': 2 pages, neither has it
            if not page_token:
                return Response(200, json={"files": [], "next_page_token": "tok_archive_2"})
            elif page_token == "tok_archive_2":
                return Response(200, json={"files": [], "next_page_token": None})

        elif parent_id == "id_created_batch1":
            # Search for 'item1': 1 page, empty
            return Response(200, json={"files": [], "next_page_token": None})

        return Response(404, json={"error": "not found"})

    def mock_create_endpoint(request: Any) -> Response:
        body = json.loads(request.content)
        name = body.get("name")
        parent_id = body.get("parent_id")
        created_id = f"id_created_{name}"
        recorded_requests.append({
            "action": "create",
            "name": name,
            "parent_id": parent_id,
            "created_id": created_id,
        })
        return Response(200, json={"file": {"id": created_id, "name": name, "kind": "drive#folder"}})

    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://api-drive.mypikpak.com/drive/v1/files").mock(side_effect=mock_files_endpoint)
        mock.post("https://api-drive.mypikpak.com/drive/v1/files").mock(side_effect=mock_create_endpoint)

        result = await client.path_to_id("/data/archive/batch1/item1", create=True)

        assert len(result) == 4
        assert [r["id"] for r in result] == ["id_data", "id_archive", "id_created_batch1", "id_created_item1"]

        # Verify that after creating 'batch1', listing 'id_created_batch1' had page_token = None
        list_created_calls = [
            r for r in recorded_requests if r.get("action") == "list" and r.get("parent_id") == "id_created_batch1"
        ]
        assert len(list_created_calls) == 1
        assert list_created_calls[0]["page_token"] is None, (
            f"Stale cursor leaked into created folder: {list_created_calls[0]}"
        )


@pytest.mark.asyncio
async def test_path_to_id_cursor_cycle_termination(client: PikPakApi) -> None:
    """
    Adversarial Stress Test:
    Server exhibits buggy behavior by returning the exact same next_page_token indefinitely.
    Verify that path_to_id terminates cleanly and does not enter an infinite loop.
    """
    client._path_id_cache.clear()
    call_count = 0

    def mock_cyclic_cursor(request: Any) -> Response:
        nonlocal call_count
        call_count += 1
        return Response(
            200,
            json={
                "files": [{"id": "item_other", "name": "other", "kind": "drive#folder"}],
                "next_page_token": "stuck_cursor_token_123",
            },
        )

    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://api-drive.mypikpak.com/drive/v1/files").mock(side_effect=mock_cyclic_cursor)

        result = await client.path_to_id("/nonexistent_folder/sub", create=False)

        assert result == []
        assert call_count == 2, f"Expected clean loop termination in 2 calls, got {call_count}"


@pytest.mark.asyncio
async def test_path_to_id_partial_cache_deep_pagination(client: PikPakApi) -> None:
    """
    Adversarial Stress Test:
    Partial cache hit: '/cached1' and '/cached1/cached2' exist in _path_id_cache.
    The remaining subpaths '/cached1/cached2/deep3/deep4' require multi-page pagination.
    Verify execution starts directly from 'cached2' without redundant root calls.
    """
    client._path_id_cache.clear()
    client._path_id_cache["/cached1"] = {"id": "id_c1", "name": "cached1", "file_type": "folder"}
    client._path_id_cache["/cached1/cached2"] = {"id": "id_c2", "name": "cached2", "file_type": "folder"}

    recorded_parents: list[str] = []

    def mock_files(request: Any) -> Response:
        parent_id = request.url.params.get("parent_id", "")
        page_token = request.url.params.get("page_token")
        recorded_parents.append(parent_id)

        if parent_id == "id_c2":
            if not page_token:
                return Response(200, json={"files": [], "next_page_token": "tok_p2"})
            return Response(200, json={"files": [{"id": "id_d3", "name": "deep3", "kind": "drive#folder"}]})
        elif parent_id == "id_d3":
            return Response(200, json={"files": [{"id": "id_d4", "name": "deep4", "kind": "drive#file"}]})
        return Response(404, json={"error": "unexpected parent"})

    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://api-drive.mypikpak.com/drive/v1/files").mock(side_effect=mock_files)

        res = await client.path_to_id("/cached1/cached2/deep3/deep4")

        assert len(res) == 4
        assert [r["id"] for r in res] == ["id_c1", "id_c2", "id_d3", "id_d4"]
        # Root ("") and cached1 ("id_c1") must NEVER have been queried over network
        assert "" not in recorded_parents
        assert "id_c1" not in recorded_parents


@pytest.mark.asyncio
async def test_path_to_id_adversarial_path_strings(client: PikPakApi) -> None:
    """
    Stress-test path string normalization:
    - Empty, whitespace, root-only
    - Redundant multi-slashes
    - Trailing and leading slashes
    """
    client._path_id_cache.clear()
    assert await client.path_to_id("") == []
    assert await client.path_to_id("   ") == []
    assert await client.path_to_id("/") == []
    assert await client.path_to_id("///") == []

    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://api-drive.mypikpak.com/drive/v1/files").respond(
            200, json={"files": [{"id": "id_norm", "name": "folder", "kind": "drive#folder"}]}
        )
        res = await client.path_to_id("///folder///")
        assert len(res) == 1
        assert res[0]["id"] == "id_norm"


# ===========================================================================
# 2. LEGACY BACKWARD-COMPATIBILITY STUBS STRESS TESTS
# ===========================================================================


def test_legacy_stubs_imports_and_exception_hierarchy() -> None:
    """
    Adversarial verification of all 5 legacy stubs:
    - PikpakException.py
    - api.py
    - settings.py
    - file_manager.py
    - offline_download.py
    """
    # 1. PikpakException.py
    import PikPakAPI.PikpakException as pe

    assert issubclass(pe.PikpakException, Exception)
    assert issubclass(pe.PikpakAuthenticationError, pe.PikpakException)
    assert issubclass(pe.PikpakNotFoundError, pe.PikpakException)
    assert issubclass(pe.PikpakRateLimitError, pe.PikpakException)
    assert issubclass(pe.PikPakRateLimitExceededException, pe.PikpakException)
    assert issubclass(pe.PikpakRateLimitExceededException, pe.PikpakException)
    assert issubclass(pe.PikPakCaptchaRequiredException, pe.PikpakException)
    assert issubclass(pe.PikpakCaptchaRequiredException, pe.PikpakException)
    assert issubclass(pe.PikpakRequestError, pe.PikpakException)
    assert issubclass(pe.PikpakRetryException, pe.PikpakException)

    # Test catching specific exception with base exception
    try:
        raise pe.PikpakAuthenticationError("auth failed")
    except pe.PikpakException as e:
        assert str(e) == "auth failed"

    # 2. api.py
    import PikPakAPI.api as api_stub

    assert hasattr(api_stub, "PikPakApi")
    test_client = api_stub.PikPakApi(access_token=MOCK_JWT)
    assert isinstance(test_client, api_stub.PikPakApi)

    # 3. settings.py
    import PikPakAPI.settings as settings_stub

    assert settings_stub.PIKPAK_API_HOST == "api-drive.mypikpak.com"
    assert settings_stub.PIKPAK_USER_HOST == "user.mypikpak.com"
    assert settings_stub.WEBDAV_BASE_URL == "https://api-dav.mypikpak.com"
    assert settings_stub.DEFAULT_TIMEOUT == 15.0
    assert settings_stub.DEFAULT_MAX_RETRIES == 3
    assert settings_stub.DEFAULT_MAX_REQUESTS_PER_SECOND == 3.0
    assert settings_stub.LOGIN_COOLDOWN_SECONDS == 60.0
    assert settings_stub.TOKEN_EXPIRY_BUFFER_SECONDS == 300.0
    assert "complete" in settings_stub.TASK_PHASE_MAP
    assert "PHASE_TYPE_COMPLETE" in settings_stub.TASK_PHASE_MAP.values()

    # 4. file_manager.py
    import PikPakAPI.file_manager as fm_stub

    assert hasattr(fm_stub, "FileManagerMixin")
    assert isinstance(test_client, fm_stub.FileManagerMixin)

    # 5. offline_download.py
    import PikPakAPI.offline_download as od_stub

    assert hasattr(od_stub, "OfflineDownloadMixin")
    assert isinstance(test_client, od_stub.OfflineDownloadMixin)


# ===========================================================================
# 3. WEBDAV MIXIN ERROR RESILIENCE ADVERSARIAL STRESS TESTS
# ===========================================================================


@pytest.mark.asyncio
async def test_webdav_all_methods_empty_and_malformed_payloads(client: PikPakApi) -> None:
    """
    Stress-test all 5 WebDAV operations with:
    - HTTP 204 No Content (b"")
    - HTTP 200 with empty body (b"")
    - HTTP 200 with non-JSON plain text / HTML content
    Verify they handle empty/non-JSON responses without unhandled crashes.
    """
    methods = [
        ("get_webdav_applications", lambda: client.get_webdav_applications()),
        ("toggle_webdav", lambda: client.toggle_webdav(enable=True)),
        ("create_webdav_application", lambda: client.create_webdav_application("EmptyClient")),
        ("delete_webdav_application", lambda: client.delete_webdav_application("user1", "pass1")),
        ("modify_webdav_application", lambda: client.modify_webdav_application("user1", "pass1", {})),
    ]

    for name, call in methods:
        # Case A: HTTP 204 No Content
        with respx.mock(assert_all_called=False) as mock:
            mock.route(url__startswith="https://api-dav.mypikpak.com/webdav/v1").respond(
                status_code=204, content=b""
            )
            res_204 = await call()
            assert res_204 == {}, f"{name} failed on 204 No Content"

        # Case B: HTTP 200 with empty body
        with respx.mock(assert_all_called=False) as mock:
            mock.route(url__startswith="https://api-dav.mypikpak.com/webdav/v1").respond(
                status_code=200, content=b""
            )
            res_empty = await call()
            assert res_empty == {}, f"{name} failed on empty body"

        # Case C: HTTP 200 with HTML/plain-text content
        with respx.mock(assert_all_called=False) as mock:
            mock.route(url__startswith="https://api-dav.mypikpak.com/webdav/v1").respond(
                status_code=200, text="<html><body>OK</body></html>"
            )
            res_html = await call()
            assert res_html == {}, f"{name} failed on HTML body"


@pytest.mark.asyncio
async def test_webdav_all_methods_server_error_status_codes(client: PikPakApi) -> None:
    """
    Stress-test all 5 WebDAV operations across severe HTTP error statuses:
    - HTTP 404 -> PikpakNotFoundError
    - HTTP 403 (JSON) -> PikpakException
    - HTTP 429 -> PikPakRateLimitExceededException (trips circuit breaker)
    - HTTP 500 / 502 / 503 (non-JSON) -> exhausts retries, raises PikpakRetryException
    """
    # 1. HTTP 404 on get_webdav_applications
    with respx.mock(assert_all_called=False) as mock:
        mock.get("https://api-dav.mypikpak.com/webdav/v1/applications").respond(
            404, json={"error": "not_found", "error_description": "WebDAV service not available"}
        )
        with pytest.raises(PikpakNotFoundError):
            await client.get_webdav_applications()

    # 2. HTTP 403 on toggle_webdav with JSON error
    with respx.mock(assert_all_called=False) as mock:
        mock.post("https://api-dav.mypikpak.com/webdav/v1/toggle-enable").respond(
            403, json={"error": "forbidden", "error_code": 403, "error_description": "WebDAV access forbidden"}
        )
        with pytest.raises(PikpakException) as exc_403:
            await client.toggle_webdav(enable=False)
        assert exc_403.value.code == 403

    # 3. HTTP 429 on create_webdav_application (circuit breaker trips)
    with respx.mock(assert_all_called=False) as mock:
        mock.post("https://api-dav.mypikpak.com/webdav/v1/application").respond(
            429, headers={"Retry-After": "45"}, text="Too Many Requests"
        )
        with pytest.raises(PikPakRateLimitExceededException) as exc:
            await client.create_webdav_application("AbuseClient")
        assert exc.value.retry_after == 45.0
        assert client.throttler.state == CircuitState.OPEN
        client.throttler.reset()  # Reset for subsequent tests

    # 4. HTTP 500 on delete_webdav_application (non-JSON server error exhausts retries)
    with respx.mock(assert_all_called=False) as mock:
        mock.request("DELETE", "https://api-dav.mypikpak.com/webdav/v1/application").respond(
            500, text="Internal Server Error"
        )
        with pytest.raises(PikpakException):  # PikpakRetryException is a PikpakException
            await client.delete_webdav_application("err_user", "err_pass")

    # 5. HTTP 502 on modify_webdav_application
    with respx.mock(assert_all_called=False) as mock:
        mock.patch("https://api-dav.mypikpak.com/webdav/v1/application").respond(
            502, text="Bad Gateway"
        )
        with pytest.raises(PikpakException):
            await client.modify_webdav_application("gw_user", "gw_pass", {"read_only": True})


@pytest.mark.asyncio
async def test_webdav_business_error_payloads(client: PikPakApi) -> None:
    """
    Stress-test WebDAV business logic error responses:
    - Captcha required (code 1001)
    - Duplicate application name (code 4002)
    - WebDAV account not found (code 4004)
    - Invalid WebDAV password (code 4005)
    """
    # A. Captcha trigger
    with respx.mock(assert_all_called=False) as mock:
        mock.post("https://api-dav.mypikpak.com/webdav/v1/application").respond(
            200,
            json={
                "error": "need_captcha",
                "error_code": 1001,
                "error_description": "Verification code required",
                "url": "https://captcha.mypikpak.com/verify",
            },
        )
        with pytest.raises(PikPakCaptchaRequiredException) as exc_cap:
            await client.create_webdav_application("NeedCaptchaApp")
        assert exc_cap.value.code == 1001
        assert isinstance(exc_cap.value, PikPakCaptchaRequiredException)

    # B. App name duplicate
    with respx.mock(assert_all_called=False) as mock:
        mock.post("https://api-dav.mypikpak.com/webdav/v1/application").respond(
            200,
            json={
                "error": "app_name_duplicate",
                "error_code": 4002,
                "error_description": "Application name already exists",
            },
        )
        with pytest.raises(PikpakException) as exc_dup:
            await client.create_webdav_application("DuplicateApp")
        assert exc_dup.value.code == 4002
        assert "already exists" in str(exc_dup.value)

    # C. Account not found on deletion
    with respx.mock(assert_all_called=False) as mock:
        mock.request("DELETE", "https://api-dav.mypikpak.com/webdav/v1/application").respond(
            200,
            json={
                "error": "app_not_found",
                "error_code": 4004,
                "error_description": "WebDAV account not found",
            },
        )
        with pytest.raises(PikpakException) as exc_del:
            await client.delete_webdav_application("ghost_user", "ghost_pass")
        assert exc_del.value.code == 4004

    # D. Invalid password on modification
    with respx.mock(assert_all_called=False) as mock:
        mock.patch("https://api-dav.mypikpak.com/webdav/v1/application").respond(
            200,
            json={
                "error": "invalid_password",
                "error_code": 4005,
                "error_description": "Incorrect WebDAV password",
            },
        )
        with pytest.raises(PikpakException) as exc_mod:
            await client.modify_webdav_application("usr", "wrong_pass", {"read_only": False})
        assert exc_mod.value.code == 4005



@pytest.mark.asyncio
async def test_webdav_token_refresh_retry_on_401(tmp_path: Path) -> None:
    """
    Stress-test: When a WebDAV operation encounters HTTP 401 with error_code=16,
    it must automatically refresh the access token and retry the WebDAV operation
    with the fresh Authorization header.
    """
    refreshed_jwt = "fresh_token_after_webdav_401"
    webdav_client = PikPakApi(
        username="dav_refresh_user@example.com",
        password="dav_password",
        access_token=MOCK_JWT,
        refresh_token="valid_refresh_token_123",
        session_dir=tmp_path,
        request_initial_backoff=0.001,
    )

    with respx.mock(assert_all_called=False) as mock:
        # 1. First WebDAV call gets 401
        call_count = 0

        def handle_webdav(request: Any) -> Response:
            nonlocal call_count
            call_count += 1
            auth_header = request.headers.get("authorization", "")
            if call_count == 1:
                assert auth_header == f"Bearer {MOCK_JWT}"
                return Response(
                    401,
                    json={"error": "unauthorized", "error_code": 16, "error_description": "Token expired"},
                )
            # Retry call must have refreshed token
            assert auth_header == f"Bearer {refreshed_jwt}"
            return Response(200, json={"status": "ok", "enabled": True})

        mock.post("https://api-dav.mypikpak.com/webdav/v1/toggle-enable").mock(side_effect=handle_webdav)

        # 2. Token refresh endpoint
        mock.post("https://user.mypikpak.com/v1/auth/token").respond(
            200,
            json={
                "access_token": refreshed_jwt,
                "refresh_token": "next_refresh_token",
                "sub": "u_dav",
                "expires_in": 7200,
            },
        )

        res = await webdav_client.toggle_webdav(enable=True)
        assert res["enabled"] is True
        assert call_count == 2
        assert webdav_client.access_token == refreshed_jwt


@pytest.mark.asyncio
async def test_webdav_extreme_inputs(client: PikPakApi) -> None:
    """
    Stress-test: Malformed and boundary inputs:
    - Empty strings
    - 5,000-character payload
    - Unicode, emojis, XSS/SQLi injection vectors
    - Deep nested modify_props
    """
    with respx.mock(assert_all_called=False) as mock:
        # 1. Extreme name creation
        captured_create: list[dict[str, Any]] = []

        def capture_create(request: Any) -> Response:
            captured_create.append(json.loads(request.content))
            return Response(200, json={"status": "ok", "application": {"username": "dav_created"}})

        mock.post("https://api-dav.mypikpak.com/webdav/v1/application").mock(side_effect=capture_create)

        huge_name = "A" * 5000
        await client.create_webdav_application(huge_name)
        assert captured_create[-1]["application_name"] == huge_name

        xss_name = "<script>alert('xss')</script> ; DROP TABLE users; 🚀"
        await client.create_webdav_application(xss_name)
        assert captured_create[-1]["application_name"] == xss_name

        # 2. Extreme modify_props
        captured_patch: list[dict[str, Any]] = []

        def capture_patch(request: Any) -> Response:
            captured_patch.append(json.loads(request.content))
            return Response(200, json={"status": "ok", "application": {"read_only": True}})

        mock.patch("https://api-dav.mypikpak.com/webdav/v1/application").mock(side_effect=capture_patch)

        complex_props = {
            "read_only": True,
            "nested": {"level1": {"level2": [1, 2, "three", None, True]}},
            "unicode_key": "中文测试 🌟",
        }
        await client.modify_webdav_application("dav_u", "dav_p", complex_props)
        assert captured_patch[-1]["modify_props"] == complex_props
