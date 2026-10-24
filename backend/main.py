"""
WindLens Energy Forecast API
------------------------------
FastAPI backend that pulls Elexon BMRS FUELHH (actuals) and WINDFOR (forecasts)
data, applies the day-ahead decision-gate logic (publishTime ≤ 16:00 UTC on the
day before delivery), computes accuracy metrics and returns them for the React
dashboard.

Accuracy metrics returned:
  - MAE  – Mean Absolute Error (MW)
  - RMSE – Root Mean Square Error (MW)
  - MAPE – Mean Absolute Percentage Error (%)   ← added v1.1
  - Bias – Systematic over/under-prediction (MW; positive = over-forecast)
  - Accuracy score – simplified readability index (100 − normalised MAE × 100)

Built with AI assistance (Google Gemini / Antigravity). See README for details.
"""

import asyncio
import logging
import math
import os
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("windlens")

APP_NAME = os.getenv("APP_NAME", "WindLens Energy Forecast API")
APP_DESCRIPTION = os.getenv(
    "APP_DESCRIPTION",
    "Wind generation forecasting and accuracy analytics for UK day-ahead electricity procurement.",
)
BMRS_BASE_URL = os.getenv(
    "BMRS_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1/datasets"
).rstrip("/")
DEFAULT_DELIVERY_DATE = date.fromisoformat(
    os.getenv("DEFAULT_DELIVERY_DATE", "2026-01-15")
)
ENABLE_DEMO_FALLBACK = os.getenv("ENABLE_DEMO_FALLBACK", "true").lower() == "true"

# UK day-ahead gate closure – forecasts published after this hour (UTC) on the
# day before delivery are NOT used for the procurement decision.
DECISION_HOUR_UTC = int(os.getenv("DECISION_HOUR_UTC", "16"))

PILOT_YEAR = 2026
PILOT_MONTH = 1

ACTUAL_DATASET = "FUELHH"
FORECAST_DATASET = "WINDFOR"

HTTPX_TIMEOUT = float(os.getenv("HTTPX_TIMEOUT", "20"))


def get_cors_origins() -> list[str]:
    configured = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:4173"
    )
    return [o.strip() for o in configured.split(",") if o.strip()]


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title=APP_NAME,
    description=APP_DESCRIPTION,
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Helpers – parsing
# ---------------------------------------------------------------------------


def parse_datetime(value: Any) -> datetime | None:
    """Parse an ISO-8601 string (with or without trailing Z) to an aware datetime."""
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def first_value(row: dict[str, Any], *keys: str) -> Any:
    """Return the first non-None value found among *keys* in *row*."""
    for key in keys:
        if key in row and row[key] is not None:
            return row[key]
    return None


def normalise_rows(payload: Any) -> list[dict[str, Any]]:
    """Accept either a bare list or a dict with a recognised list key."""
    if isinstance(payload, list):
        return [r for r in payload if isinstance(r, dict)]
    if isinstance(payload, dict):
        for key in ("data", "results", "items"):
            if isinstance(payload.get(key), list):
                return [r for r in payload[key] if isinstance(r, dict)]
    return []


# ---------------------------------------------------------------------------
# Helpers – data selection
# ---------------------------------------------------------------------------


def filter_actuals(rows: list[dict[str, Any]], target: date) -> dict[str, float]:
    """Extract WIND half-hourly actuals for *target* date, keyed by ISO startTime."""
    actuals: dict[str, float] = {}
    for row in rows:
        fuel_type = str(first_value(row, "fuelType", "fueltype") or "").upper()
        start = parse_datetime(first_value(row, "startTime", "start_time"))
        generation = first_value(row, "generation")
        if fuel_type != "WIND" or not start or generation is None:
            continue
        if start.date() == target:
            actuals[start.isoformat()] = float(generation)
    return actuals


def select_forecasts(
    rows: list[dict[str, Any]], target: date
) -> dict[str, dict[str, Any]]:
    """
    For each delivery interval on *target*, pick the most recently published
    WINDFOR entry whose publishTime is at or before the decision cutoff
    (DECISION_HOUR_UTC on the day before delivery).
    """
    cutoff = datetime.combine(
        target - timedelta(days=1),
        time(DECISION_HOUR_UTC, 0),
        tzinfo=timezone.utc,
    )
    # selected: startTime -> (publishTime, generation)
    selected: dict[str, tuple[datetime, float]] = {}
    for row in rows:
        start = parse_datetime(first_value(row, "startTime", "start_time"))
        published = parse_datetime(first_value(row, "publishTime", "publish_time"))
        generation = first_value(row, "generation")
        if not start or not published or generation is None:
            continue
        if start.date() != target:
            continue
        if published > cutoff:
            continue
        current = selected.get(start.isoformat())
        if current is None or published > current[0]:
            selected[start.isoformat()] = (published, float(generation))

    return {
        key: {"generation": gen, "publishTime": pub.isoformat()}
        for key, (pub, gen) in selected.items()
    }


def combine_data(
    actuals: dict[str, float],
    forecasts: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Merge actuals and forecasts on startTime, keeping only matched intervals."""
    keys = sorted(set(actuals) & set(forecasts))
    return [
        {
            "startTime": key,
            "time": datetime.fromisoformat(key).strftime("%H:%M"),
            "forecast": round(float(forecasts[key]["generation"]), 1),
            "actual": round(actuals[key], 1),
            "publishTime": forecasts[key]["publishTime"],
            "error": round(float(forecasts[key]["generation"]) - actuals[key], 1),
        }
        for key in keys
    ]


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------


def compute_metrics(points: list[dict[str, Any]]) -> dict[str, float]:
    """
    Compute forecast-accuracy metrics from matched half-hourly observations.

    Returns
    -------
    mae     – Mean Absolute Error (MW)
    rmse    – Root Mean Square Error (MW)
    mape    – Mean Absolute Percentage Error (%)
    bias    – Mean signed error; positive = over-forecast (MW)
    accuracy – Simplified score in [0, 100]; 100 = perfect
    """
    n = len(points)
    if n == 0:
        return {"mae": 0, "rmse": 0, "mape": 0, "bias": 0, "accuracy": 0}

    errors = [p["forecast"] - p["actual"] for p in points]
    abs_errors = [abs(e) for e in errors]

    mae = sum(abs_errors) / n
    rmse = math.sqrt(sum(e * e for e in errors) / n)
    bias = sum(errors) / n

    # MAPE: skip intervals where actual ≈ 0 to avoid division by zero
    mape_terms = [
        abs(e) / abs(p["actual"]) * 100
        for e, p in zip(errors, points)
        if abs(p["actual"]) > 1
    ]
    mape = sum(mape_terms) / len(mape_terms) if mape_terms else 0.0

    # Accuracy score: heuristic – treat 1200 MW MAE as 0%, 0 MW as 100%
    # (UK wind total capacity ~25 GW, typical daily range ~500–3000 MW)
    accuracy = max(0.0, min(100.0, 100 - (mae / 1200) * 100))

    return {
        "mae": round(mae, 1),
        "rmse": round(rmse, 1),
        "mape": round(mape, 2),
        "bias": round(bias, 1),
        "accuracy": round(accuracy, 1),
    }


# ---------------------------------------------------------------------------
# Demo fallback (shape-only, never shown as real data in production)
# ---------------------------------------------------------------------------


def build_demo_forecast(target: date) -> list[dict[str, Any]]:
    """
    Deterministic fallback used ONLY when BMRS is unreachable.
    Shapes mimic realistic UK wind patterns; values are not real.
    Production deployments set ENABLE_DEMO_FALLBACK=false.
    """
    points = []
    day_start = datetime.combine(target, time.min, tzinfo=timezone.utc)
    for slot in range(48):
        ts = day_start + timedelta(minutes=30 * slot)
        baseline = 760 + 460 * math.sin((slot - 9) / 48 * math.pi * 2)
        baseline += 170 * math.sin(slot / 48 * math.pi * 4)
        forecast = max(80.0, baseline + 55 * math.sin(slot * 1.7) + 25)
        actual = max(60.0, baseline + 85 * math.sin(slot * 1.35 + 0.8))
        error = round(forecast - actual, 1)
        points.append(
            {
                "startTime": ts.isoformat(),
                "time": ts.strftime("%H:%M"),
                "forecast": round(forecast, 1),
                "actual": round(actual, 1),
                "error": error,
                "publishTime": (day_start - timedelta(days=1, hours=8)).isoformat(),
            }
        )
    return points


# ---------------------------------------------------------------------------
# BMRS fetch
# ---------------------------------------------------------------------------


async def _fetch_bmrs_pair(
    target: date,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Fetch FUELHH and WINDFOR in parallel for *target* date."""
    params = {"settlementDate": target.isoformat()}
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        actual_resp, forecast_resp = await asyncio.gather(
            client.get(f"{BMRS_BASE_URL}/{ACTUAL_DATASET}/stream", params=params),
            client.get(f"{BMRS_BASE_URL}/{FORECAST_DATASET}/stream", params=params),
        )
    actual_resp.raise_for_status()
    forecast_resp.raise_for_status()
    logger.info(
        "BMRS fetch OK for %s: %d actual rows, %d forecast rows",
        target,
        len(normalise_rows(actual_resp.json())),
        len(normalise_rows(forecast_resp.json())),
    )
    return normalise_rows(actual_resp.json()), normalise_rows(forecast_resp.json())


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/", tags=["meta"])
def root() -> dict[str, str]:
    return {"message": f"{APP_NAME} is running", "docs": "/docs"}


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "windlens-api", "version": "1.1.0"}


@app.get("/api/forecast", tags=["forecast"])
async def forecast(
    delivery_date: date | None = Query(
        default=None,
        description="Delivery date in YYYY-MM-DD format (January 2026 only).",
        examples=["2026-01-15"],
    ),
) -> dict[str, Any]:
    """
    Return day-ahead wind generation forecast vs actual for *delivery_date*.

    The backend selects the most-recently published WINDFOR entry whose
    publishTime is at or before 16:00 UTC on the eve of delivery, matching
    the UK day-ahead gate-closure convention.

    Accuracy metrics (MAE, RMSE, MAPE, bias, accuracy score) are computed
    from all matched 30-minute intervals.
    """
    target = delivery_date or DEFAULT_DELIVERY_DATE

    if target.year != PILOT_YEAR or target.month != PILOT_MONTH:
        raise HTTPException(
            status_code=400,
            detail=f"This pilot is scoped to January {PILOT_YEAR}. "
            f"Received: {target.isoformat()}",
        )

    source = "Elexon BMRS"
    try:
        actual_rows, forecast_rows = await _fetch_bmrs_pair(target)
        actuals = filter_actuals(actual_rows, target)
        forecasts_map = select_forecasts(forecast_rows, target)
        points = combine_data(actuals, forecasts_map)
        if not points:
            raise ValueError("No matched WIND intervals after filtering")
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
        logger.warning("BMRS unavailable (%s); using demo fallback=%s", exc, ENABLE_DEMO_FALLBACK)
        if not ENABLE_DEMO_FALLBACK:
            raise HTTPException(
                status_code=502,
                detail="Elexon BMRS data is unavailable for this date. "
                "The BMRS stream endpoint provides live data only; "
                "historical January 2026 records require the archived export.",
            ) from exc
        points = build_demo_forecast(target)
        source = "Elexon BMRS-shaped demo (fallback)"

    metrics = compute_metrics(points)
    decision_cutoff = datetime.combine(
        target - timedelta(days=1),
        time(DECISION_HOUR_UTC, 0),
        tzinfo=timezone.utc,
    ).isoformat()

    return {
        "deliveryDate": target.isoformat(),
        "source": source,
        "decisionCutoff": decision_cutoff,
        "decisionHourUTC": DECISION_HOUR_UTC,
        "datasets": {"actuals": ACTUAL_DATASET, "forecasts": FORECAST_DATASET},
        "intervalCount": len(points),
        "forecast": points,
        "metrics": metrics,
    }


@app.get("/api/summary", tags=["forecast"])
async def monthly_summary() -> dict[str, Any]:
    """
    Return per-day accuracy metrics for every day in January 2026.

    This endpoint powers the calendar heatmap and monthly trend chart in the
    dashboard. Each day entry is fetched independently; days where BMRS
    returns no data fall back to the demo shape when ENABLE_DEMO_FALLBACK is
    true.
    """
    days = [
        date(PILOT_YEAR, PILOT_MONTH, d)
        for d in range(1, 32)
        if date(PILOT_YEAR, PILOT_MONTH, d).month == PILOT_MONTH
    ]

    async def fetch_day(d: date) -> dict[str, Any] | None:
        source = "Elexon BMRS"
        try:
            actual_rows, forecast_rows = await _fetch_bmrs_pair(d)
            actuals = filter_actuals(actual_rows, d)
            forecasts_map = select_forecasts(forecast_rows, d)
            points = combine_data(actuals, forecasts_map)
            if not points:
                raise ValueError("empty")
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            if not ENABLE_DEMO_FALLBACK:
                return None
            points = build_demo_forecast(d)
            source = "demo"
        m = compute_metrics(points)
        return {
            "date": d.isoformat(),
            "source": source,
            "intervalCount": len(points),
            **m,
        }

    results = await asyncio.gather(*[fetch_day(d) for d in days])
    daily = [r for r in results if r is not None]

    if not daily:
        return {"month": f"{PILOT_YEAR}-{PILOT_MONTH:02d}", "days": []}

    avg_mae = sum(d["mae"] for d in daily) / len(daily)
    avg_mape = sum(d["mape"] for d in daily) / len(daily)
    avg_accuracy = sum(d["accuracy"] for d in daily) / len(daily)

    return {
        "month": f"{PILOT_YEAR}-{PILOT_MONTH:02d}",
        "daysReturned": len(daily),
        "averageMae": round(avg_mae, 1),
        "averageMape": round(avg_mape, 2),
        "averageAccuracy": round(avg_accuracy, 1),
        "days": daily,
    }
