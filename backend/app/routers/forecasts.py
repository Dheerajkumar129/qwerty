"""Router: Wind forecasts (WINDFOR)."""

from datetime import date, datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.elexon import fetch_forecasts_wind

router = APIRouter(prefix="/forecasts", tags=["forecasts"])

# For January 2026 decisions:
# D-1 forecasts start from 2025-12-31 (for Jan 1 delivery)
WINDFOR_FETCH_FROM = datetime(2025, 12, 30, 0, 0, 0, tzinfo=timezone.utc)
WINDFOR_FETCH_TO = datetime(2026, 1, 31, 23, 59, 59, tzinfo=timezone.utc)


@router.get("/wind")
async def get_wind_forecasts(
    target_date: Optional[date] = Query(
        default=None,
        description="Filter forecasts to a specific target (delivery) date (YYYY-MM-DD)",
    ),
    publish_from: Optional[datetime] = Query(
        default=None,
        description="Filter by forecast publish time from (ISO 8601 UTC)",
    ),
    publish_to: Optional[datetime] = Query(
        default=None,
        description="Filter by forecast publish time to (ISO 8601 UTC)",
    ),
):
    """
    Return WINDFOR forecasts for January 2026.
    Optionally filter by target delivery date or publish time window.
    """
    # Default: fetch the entire relevant window
    fetch_from = publish_from or WINDFOR_FETCH_FROM
    fetch_to = publish_to or WINDFOR_FETCH_TO

    try:
        raw = await fetch_forecasts_wind(fetch_from, fetch_to)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Elexon API error: {str(e)}")

    # Filter to target date if specified
    results = []
    for r in raw:
        start_time = r.get("startTime", "")
        if target_date and not start_time.startswith(target_date.isoformat()):
            continue
        results.append({
            "startTime": r.get("startTime"),
            "publishTime": r.get("publishTime"),
            "generation": r.get("generation"),
        })

    # Sort by startTime, then publishTime
    results.sort(key=lambda x: (x.get("startTime") or "", x.get("publishTime") or ""))

    # Compute unique publish times (runs)
    publish_times = sorted(set(r["publishTime"] for r in results if r["publishTime"]))
    runs = [{"publishTime": pt, "count": sum(1 for r in results if r["publishTime"] == pt)}
            for pt in publish_times]

    # Find the latest publish time (most recent run)
    latest_publish_time = publish_times[-1] if publish_times else None

    return {
        "targetDate": target_date.isoformat() if target_date else None,
        "publishFrom": fetch_from.isoformat(),
        "publishTo": fetch_to.isoformat(),
        "count": len(results),
        "latestPublishTime": latest_publish_time,
        "runs": runs,
        "data": results,
    }


@router.get("/wind/day-ahead")
async def get_day_ahead_forecasts(
    delivery_date: date = Query(
        ...,
        description="Delivery date for which you want the day-ahead forecast (YYYY-MM-DD)",
    ),
):
    """
    Return the 'day-ahead' forecast for a specific delivery date.
    Day-ahead = the latest forecast published on D-1 (day before delivery) before 12:00 UTC.
    This mirrors the gate closure timing for UK day-ahead market decisions.
    """
    # D-1 = delivery_date - 1 day; window = midnight to noon UTC on D-1
    d_minus_1 = date(delivery_date.year, delivery_date.month, delivery_date.day) - timedelta(days=1)
    publish_from = datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, 0, 0, 0, tzinfo=timezone.utc)
    publish_to = datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, 23, 59, 59, tzinfo=timezone.utc)

    try:
        raw = await fetch_forecasts_wind(publish_from, publish_to)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Elexon API error: {str(e)}")

    # Filter to delivery date and parse publish times
    day_records = [
        r for r in raw
        if (r.get("startTime") or "").startswith(delivery_date.isoformat())
    ]

    if not day_records:
        return {
            "deliveryDate": delivery_date.isoformat(),
            "dayAheadPublishTime": None,
            "data": [],
            "message": "No day-ahead forecasts found for this date",
        }

    # Find the latest publishTime on D-1
    pub_times = sorted(set(r["publishTime"] for r in day_records if r.get("publishTime")))
    latest_pt = pub_times[-1] if pub_times else None

    # Return only the latest run
    latest_run = [r for r in day_records if r.get("publishTime") == latest_pt]
    latest_run.sort(key=lambda x: x.get("startTime") or "")

    return {
        "deliveryDate": delivery_date.isoformat(),
        "dayAheadPublishTime": latest_pt,
        "allPublishTimesOnDMinus1": pub_times,
        "count": len(latest_run),
        "data": [{
            "startTime": r.get("startTime"),
            "publishTime": r.get("publishTime"),
            "generation": r.get("generation"),
        } for r in latest_run],
    }
