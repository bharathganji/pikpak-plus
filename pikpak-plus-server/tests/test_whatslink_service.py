"""Unit tests for WhatsLinkService."""

from unittest.mock import AsyncMock, patch

import pytest
from app.api.utils import run_async
from app.services.whatslink_service import WhatsLinkService


@pytest.mark.asyncio
async def test_whatslink_success():
    mock_data = {
        "type": "video",
        "file_type": "video",
        "name": "sample.mp4",
        "size": 1024000,
        "count": 1,
    }

    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value=mock_data)

    with patch("aiohttp.ClientSession.get") as mock_get:
        mock_get.return_value.__aenter__.return_value = mock_response

        res = await WhatsLinkService.check_file_info("magnet:?xt=urn:btih:abc")
        assert res == mock_data


@pytest.mark.asyncio
async def test_whatslink_non_200():
    mock_response = AsyncMock()
    mock_response.status = 502

    with patch("aiohttp.ClientSession.get") as mock_get:
        mock_get.return_value.__aenter__.return_value = mock_response

        res = await WhatsLinkService.check_file_info("magnet:?xt=urn:btih:abc")
        assert "WhatsLink API returned status 502" in res.get("error", "")


@pytest.mark.asyncio
async def test_whatslink_timeout():
    with patch("aiohttp.ClientSession.get", side_effect=TimeoutError()):
        res = await WhatsLinkService.check_file_info("magnet:?xt=urn:btih:abc")
        assert res.get("error") == "WhatsLink API request timed out"


def test_whatslink_across_run_async_threads():
    """Verify check_file_info executes without event loop binding errors inside run_async."""
    mock_data = {"name": "test.mkv", "size": 500}
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value=mock_data)

    with patch("aiohttp.ClientSession.get") as mock_get:
        mock_get.return_value.__aenter__.return_value = mock_response

        # Execute multiple times via run_async (simulating multiple thread requests)
        res1 = run_async(WhatsLinkService.check_file_info("magnet:?xt=urn:btih:1"))
        res2 = run_async(WhatsLinkService.check_file_info("magnet:?xt=urn:btih:2"))

        assert res1 == mock_data
        assert res2 == mock_data
