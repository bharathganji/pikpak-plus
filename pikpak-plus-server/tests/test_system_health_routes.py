"""
Integration tests for System, Health, and Statistics routes.
Covers 6 endpoints:
- GET /health/live
- GET /health/ready
- GET /health
- GET /config
- GET /statistics
- GET /statistics/status
"""
from __future__ import annotations


def test_health_live(test_client):
    """Test liveness probe returns 200 ok."""
    res = test_client.get("/health/live")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"


def test_health_ready_healthy(test_client):
    """Test readiness check with all services operational."""
    res = test_client.get("/health/ready")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ready"
    assert data["checks"]["redis"] is True
    assert data["checks"]["supabase"] is True
    assert data["checks"]["pikpak"] is True


def test_health_ready_service_down(test_client, monkeypatch):
    """Test readiness check returns 503 when a service check fails."""
    from app.api.routes import health

    monkeypatch.setattr(health, "_check_redis_health", lambda: False)
    res = test_client.get("/health/ready")
    assert res.status_code == 503
    data = res.get_json()
    assert data["status"] == "not_ready"
    assert data["checks"]["redis"] is False


def test_system_health_ok(test_client):
    """Test system health check when all components configured."""
    res = test_client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"
    assert data["issues"] == []


def test_system_health_degraded(test_client, monkeypatch):
    """Test system health reports degraded when Supabase check reports failure."""
    from app.api.utils.dependencies import get_supabase_service

    supabase = get_supabase_service()
    monkeypatch.setattr(supabase, "health_check", lambda: (False, "Database unreachable"))

    res = test_client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "degraded"
    assert "Database unreachable" in data["issues"]


def test_system_config(test_client):
    """Test public config endpoint returns system settings and scheduler state."""
    res = test_client.get("/config")
    assert res.status_code == 200
    data = res.get_json()
    assert "max_file_size_gb" in data
    assert "task_status_update_interval_minutes" in data
    assert "next_task_status_update" in data
    assert data["max_file_size_gb"] == 25.0


def test_statistics_default_limit(test_client):
    """Test getting statistics with default limit."""
    res = test_client.get("/statistics")
    assert res.status_code == 200
    data = res.get_json()
    assert "data" in data
    assert "schedule" in data
    assert isinstance(data["data"], list)
    assert len(data["data"]) >= 1


def test_statistics_custom_limit(test_client):
    """Test getting statistics with valid custom limit."""
    res = test_client.get("/statistics?limit=5")
    assert res.status_code == 200
    data = res.get_json()
    assert "data" in data


def test_statistics_invalid_limit(test_client):
    """Test statistics limit validation: negative, zero, excessive, non-integer."""
    res_zero = test_client.get("/statistics?limit=0")
    assert res_zero.status_code == 400

    res_huge = test_client.get("/statistics?limit=1000")
    assert res_huge.status_code == 400

    res_alpha = test_client.get("/statistics?limit=invalid")
    assert res_alpha.status_code == 400


def test_statistics_status(test_client):
    """Test statistics schedule status endpoint."""
    res = test_client.get("/statistics/status")
    assert res.status_code == 200
    data = res.get_json()
    assert "scheduler_running" in data
    assert "next_update" in data
