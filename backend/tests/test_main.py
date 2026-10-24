"""
Backend unit tests for WindLens accuracy metrics and data-selection logic.
Run with:  python -m pytest tests/ -v
"""
import math
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

# Import the module under test
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import main as m


# ---------------------------------------------------------------------------
# filter_actuals
# ---------------------------------------------------------------------------

def _make_actual_row(fuel: str, start: str, gen: float) -> dict:
    return {"fuelType": fuel, "startTime": start, "generation": gen}


def test_filter_actuals_returns_only_wind():
    rows = [
        _make_actual_row("WIND", "2026-01-15T00:00:00+00:00", 500.0),
        _make_actual_row("CCGT", "2026-01-15T00:00:00+00:00", 1200.0),
        _make_actual_row("WIND", "2026-01-15T00:30:00+00:00", 510.0),
    ]
    result = m.filter_actuals(rows, date(2026, 1, 15))
    assert len(result) == 2
    assert "2026-01-15T00:00:00+00:00" in result
    assert "2026-01-15T00:30:00+00:00" in result


def test_filter_actuals_ignores_wrong_date():
    rows = [
        _make_actual_row("WIND", "2026-01-14T23:30:00+00:00", 400.0),
        _make_actual_row("WIND", "2026-01-15T00:00:00+00:00", 500.0),
    ]
    result = m.filter_actuals(rows, date(2026, 1, 15))
    assert len(result) == 1


# ---------------------------------------------------------------------------
# select_forecasts – decision-cutoff gate
# ---------------------------------------------------------------------------

def _make_forecast_row(start: str, published: str, gen: float) -> dict:
    return {"startTime": start, "publishTime": published, "generation": gen}


def test_select_forecasts_picks_latest_before_cutoff():
    rows = [
        # Published at 10:00 the day before – allowed
        _make_forecast_row("2026-01-15T00:00:00+00:00", "2026-01-14T10:00:00+00:00", 480.0),
        # Published at 15:59 the day before – allowed, more recent → wins
        _make_forecast_row("2026-01-15T00:00:00+00:00", "2026-01-14T15:59:00+00:00", 510.0),
        # Published at 16:01 the day before – AFTER cutoff → excluded
        _make_forecast_row("2026-01-15T00:00:00+00:00", "2026-01-14T16:01:00+00:00", 600.0),
    ]
    result = m.select_forecasts(rows, date(2026, 1, 15))
    assert "2026-01-15T00:00:00+00:00" in result
    assert result["2026-01-15T00:00:00+00:00"]["generation"] == 510.0


def test_select_forecasts_excludes_post_cutoff():
    rows = [
        _make_forecast_row("2026-01-15T00:00:00+00:00", "2026-01-14T17:00:00+00:00", 600.0),
    ]
    result = m.select_forecasts(rows, date(2026, 1, 15))
    assert result == {}


# ---------------------------------------------------------------------------
# compute_metrics
# ---------------------------------------------------------------------------

def _make_point(forecast: float, actual: float) -> dict:
    return {"forecast": forecast, "actual": actual, "error": forecast - actual}


def test_compute_metrics_perfect_forecast():
    points = [_make_point(500.0, 500.0) for _ in range(10)]
    metrics = m.compute_metrics(points)
    assert metrics["mae"] == 0.0
    assert metrics["rmse"] == 0.0
    assert metrics["bias"] == 0.0
    assert metrics["accuracy"] == 100.0


def test_compute_metrics_mae_rmse():
    # Errors: +100 for half, -100 for half
    points = [_make_point(600.0, 500.0)] * 24 + [_make_point(400.0, 500.0)] * 24
    metrics = m.compute_metrics(points)
    assert metrics["mae"] == 100.0
    assert metrics["rmse"] == 100.0
    assert metrics["bias"] == 0.0  # symmetric errors → zero bias


def test_compute_metrics_positive_bias():
    points = [_make_point(600.0, 500.0)] * 10
    metrics = m.compute_metrics(points)
    assert metrics["bias"] > 0  # over-forecast


def test_compute_metrics_mape_nonzero():
    points = [_make_point(550.0, 500.0)] * 5  # 10% error
    metrics = m.compute_metrics(points)
    assert abs(metrics["mape"] - 10.0) < 0.01


def test_compute_metrics_empty():
    metrics = m.compute_metrics([])
    assert metrics["mae"] == 0
    assert metrics["accuracy"] == 0


# ---------------------------------------------------------------------------
# combine_data – intersection behaviour
# ---------------------------------------------------------------------------

def test_combine_data_only_matched():
    actuals = {
        "2026-01-15T00:00:00+00:00": 500.0,
        "2026-01-15T00:30:00+00:00": 520.0,
    }
    forecasts = {
        "2026-01-15T00:00:00+00:00": {"generation": 480.0, "publishTime": "2026-01-14T15:00:00+00:00"},
        # 01:00 slot has no actual – should be excluded
    }
    result = m.combine_data(actuals, forecasts)
    assert len(result) == 1
    assert result[0]["time"] == "00:00"
    assert result[0]["forecast"] == 480.0
    assert result[0]["actual"] == 500.0
    assert result[0]["error"] == -20.0


# ---------------------------------------------------------------------------
# Demo fallback shape
# ---------------------------------------------------------------------------

def test_build_demo_forecast_returns_48_slots():
    points = m.build_demo_forecast(date(2026, 1, 15))
    assert len(points) == 48
    for p in points:
        assert p["forecast"] >= 80
        assert p["actual"] >= 60


# ---------------------------------------------------------------------------
# HTTP endpoint – validation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_forecast_endpoint_rejects_wrong_month():
    from fastapi.testclient import TestClient
    client = TestClient(m.app)
    resp = client.get("/api/forecast?delivery_date=2026-03-01")
    assert resp.status_code == 400
    assert "January" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_health_endpoint():
    from fastapi.testclient import TestClient
    client = TestClient(m.app)
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
