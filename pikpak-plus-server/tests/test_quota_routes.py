"""
Integration tests for Quota and Cleanup Status API routes.
Covers: GET /quota, GET /cleanup/status.
"""
from __future__ import annotations


def test_get_quota_success_and_caching(test_client, memory_cache):
    """Test retrieving quota information and verifying cache population."""
    res = test_client.get("/quota")
    assert res.status_code == 200
    data = res.get_json()
    assert "storage" in data
    assert "transfer" in data
    assert "refresh_info" in data
    assert data["storage"]["quota"]["limit"] == "1099511627776"

    # Verify that cache now holds quota data
    cached_val = memory_cache.get("quota_info")
    assert cached_val is not None
    assert cached_val["storage"]["quota"]["limit"] == "1099511627776"

    # Subsequent request should succeed from cache
    res2 = test_client.get("/quota")
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2["storage"]["quota"]["limit"] == "1099511627776"


def test_cleanup_status(test_client, memory_redis):
    """Test retrieving cleanup scheduler status."""
    res = test_client.get("/cleanup/status")
    assert res.status_code == 200
    data = res.get_json()
    assert "scheduler_running" in data
    assert "cleanup_interval_hours" in data
    assert isinstance(data["cleanup_interval_hours"], int)
