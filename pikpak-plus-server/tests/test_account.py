"""
Tests for account profile, quota, VIP info, and aggregated account_info.
"""
from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_get_profile(mock_api, client):
    mock_api.get("https://user.mypikpak.com/v1/user/me").respond(
        status_code=200,
        json={"sub": "user_id_999", "name": "Alice"},
    )

    res = await client.get_profile()
    assert res["sub"] == "user_id_999"
    assert res["name"] == "Alice"


@pytest.mark.asyncio
async def test_aggregated_account_info(mock_api, client):
    mock_api.get("https://user.mypikpak.com/v1/user/me").respond(
        status_code=200,
        json={"sub": "user_id_999", "name": "Alice", "email": "alice@example.com"},
    )
    mock_api.get("https://api-drive.mypikpak.com/drive/v1/about").respond(
        status_code=200,
        json={
            "quota": {
                "limit": "10995116277760",
                "usage": "2351764115424",
                "usage_in_trash": "0",
                "is_unlimited": False,
            },
            "quotas": {"cloud_download": {"limit": "-1"}},
        },
    )
    mock_api.get("https://api-drive.mypikpak.com/drive/v1/privilege/vip").respond(
        status_code=200,
        json={
            "data": {
                "type": "platinum",
                "status": "ok",
                "expire": "2026-11-29T21:18:36+08:00",
                "items": [{"type": "regional", "status": "ok"}],
            }
        },
    )

    info = await client.account_info()
    assert info["user_id"] == "user_id_999"
    assert info["name"] == "Alice"
    assert info["email"] == "alice@example.com"

    # Verify formatted storage matching MCP account_info
    assert info["storage"]["total"] == "10.00 TB"
    assert info["storage"]["used"] == "2.14 TB"
    assert info["storage"]["in_trash"] == "0 B"

    # Verify VIP status
    assert info["vip"]["type"] == "platinum"
    assert info["vip"]["status"] == "ok"
    assert info["vip"]["expire_time"] == "2026-11-29T21:18:36+08:00"
