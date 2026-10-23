import asyncio
from datetime import date, datetime, time, timedelta, timezone
import math
import os
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

APP_NAME = os.getenv("APP_NAME", "WindLens Energy Forecast API")
APP_DESCRIPTION = os.getenv(
    "APP_DESCRIPTION",
    "A wind generation forecasting and accuracy analytics platform using Elexon data to support UK day-ahead electricity procurement decisions.",
)
BMRS_BASE_URL = os.getenv(
    "BMRS_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1/datasets"
).rstrip("/")
DEFAULT_DELIVERY_DATE = date.fromisoformat(
    os.getenv("DEFAULT_DELIVERY_DATE", "2026-01-15")
)
ENABLE_DEMO_FALLBACK = os.getenv("ENABLE_DEMO_FALLBACK", "true").lower() == "true"


def get_cors_origins() -> list[str]:
    configured_origins = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:4173"
    )
    return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]


app = FastAPI(title=APP_NAME, description=APP_DESCRIPTION, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ACTUAL_DATASET = "FUELHH"
FORECAST_DATASET = "WINDFOR"
DECISION_HOUR_UTC = 16


@app.get("/")
def home() -> dict[str, str]:
    return {"message": "WindLens Energy Forecast API is running"}


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "windlens-api"}


def parse_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def first_value(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in row and row[key] is not None:
            return row[key]
    return None


def normalise_rows(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if isinstance(payload, dict):
        for key in ("data", "results", "items"):
            if isinstance(payload.get(key), list):
                return [row for row in payload[key] if isinstance(row, dict)]
    return []


async def fetch_dataset(dataset: str, target: date) -> list[dict[str, Any]]:
    url = f"{BMRS_BASE_URL}/{dataset}/stream"
    params = {"settlementDate": target.isoformat()}
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return normalise_rows(response.json())


def filter_actuals(rows: list[dict[str, Any]], target: date) -> dict[str, float]:
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


def select_forecasts(rows: list[dict[str, Any]], target: date) -> dict[str, float]:
    cutoff = datetime.combine(
        target - timedelta(days=1), time(DECISION_HOUR_UTC), tzinfo=timezone.utc
    )
    selected: dict[str, tuple[datetime, float]] = {}
    for row in rows:
        start = parse_datetime(first_value(row, "startTime", "start_time"))
        published = parse_datetime(first_value(row, "publishTime", "publish_time"))
        generation = first_value(row, "generation")
        if not start or not published or generation is None or start.date() != target:
            continue
        if published > cutoff:
            continue
        current = selected.get(start.isoformat())
        if current is None or published > current[0]:
            selected[start.isoformat()] = (published, float(generation))
    return {key: value for key, (_, value) in selected.items()}


def build_demo_forecast(target: date) -> list[dict[str, Any]]:
    """Deterministic fallback used only when BMRS is unreachable or has no rows."""
    points = []
    start = datetime.combine(target, time.min, tzinfo=timezone.utc)
    for slot in range(48):
        current = start + timedelta(minutes=30 * slot)
        baseline = 760 + 460 * math.sin((slot - 9) / 48 * math.pi * 2)
        baseline += 170 * math.sin(slot / 48 * math.pi * 4)
        forecast = max(80, baseline + 55 * math.sin(slot * 1.7) + 25)
        actual = max(60, baseline + 85 * math.sin(slot * 1.35 + 0.8))
        points.append({
            "startTime": current.isoformat(),
            "time": current.strftime("%H:%M"),
            "forecast": round(forecast, 1),
            "actual": round(actual, 1),
        })
    return points


def combine_data(target: date, actuals: dict[str, float], forecasts: dict[str, float]) -> list[dict[str, Any]]:
    keys = sorted(set(actuals) | set(forecasts))
    return [
        {
            "startTime": key,
            "time": datetime.fromisoformat(key).strftime("%H:%M"),
            "forecast": round(forecasts[key], 1),
            "actual": round(actuals[key], 1),
        }
        for key in keys
        if key in actuals and key in forecasts
    ]


@app.get("/api/forecast")
async def forecast(
    delivery_date: date | None = None,
) -> dict[str, Any]:
    target = delivery_date or DEFAULT_DELIVERY_DATE
    if target.year != 2026 or target.month != 1:
        raise HTTPException(status_code=400, detail="This pilot is limited to January 2026.")

    source = "Elexon BMRS"
    try:
        actual_rows, forecast_rows = await _fetch_bmrs_pair(target)
        points = combine_data(
            target, filter_actuals(actual_rows, target), select_forecasts(forecast_rows, target)
        )
        if not points:
            raise ValueError("BMRS returned no matching WIND rows")
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        if not ENABLE_DEMO_FALLBACK:
            raise HTTPException(status_code=502, detail="Elexon BMRS data is unavailable.")
        points = build_demo_forecast(target)
        source = "Elexon BMRS-shaped fallback"

    errors = [point["forecast"] - point["actual"] for point in points]
    mae = sum(abs(error) for error in errors) / len(errors)
    rmse = math.sqrt(sum(error * error for error in errors) / len(errors))
    bias = sum(errors) / len(errors)
    return {
        "deliveryDate": target.isoformat(),
        "source": source,
        "decisionCutoff": f"{target - timedelta(days=1)}T16:00:00Z",
        "datasets": {"actuals": ACTUAL_DATASET, "forecasts": FORECAST_DATASET},
        "forecast": points,
        "metrics": {
            "mae": round(mae),
            "rmse": round(rmse),
            "bias": round(bias),
            "accuracy": round(max(0, 100 - mae / 12), 1),
        },
    }


async def _fetch_bmrs_pair(target: date) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    async with httpx.AsyncClient(timeout=15) as client:
        actual_response, forecast_response = await asyncio.gather(
            client.get(f"{BMRS_BASE_URL}/{ACTUAL_DATASET}/stream", params={"settlementDate": target}),
            client.get(f"{BMRS_BASE_URL}/{FORECAST_DATASET}/stream", params={"settlementDate": target}),
        )
    actual_response.raise_for_status()
    forecast_response.raise_for_status()
    return normalise_rows(actual_response.json()), normalise_rows(forecast_response.json())
