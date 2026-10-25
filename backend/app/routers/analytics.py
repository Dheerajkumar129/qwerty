"""Router: Forecast analytics (error metrics)."""

from datetime import date, datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Query
from app.services.elexon import fetch_actuals_wind, fetch_forecasts_wind
from app.services.analytics import compute_error_metrics, compute_horizon_metrics

router = APIRouter(prefix="/analytics", tags=["analytics"])

JAN_2026_START = date(2026, 1, 1)
JAN_2026_END = date(2026, 1, 31)


@router.get("/accuracy")
async def get_forecast_accuracy(
    date_from: date = Query(default=JAN_2026_START),
    date_to: date = Query(default=JAN_2026_END),
):
    """
    Compute wind forecast accuracy metrics for January 2026.
    - Matches day-ahead forecasts (latest run on D-1) against FUELHH actuals
    - Returns overall MAE, RMSE, MAPE, bias
    - Returns per-day breakdown
    - Returns error vs lead-time breakdown
    """
    # Fetch actuals
    try:
        actuals_raw = await fetch_actuals_wind(date_from, date_to)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Elexon actuals error: {str(e)}")

    actuals = [
        {
            "startTime": r.get("startTime"),
            "generation": r.get("generation"),
        }
        for r in actuals_raw
        if r.get("fuelType") == "WIND" and r.get("generation") is not None
    ]

    # Fetch forecasts (window: from Dec 30 to cover Jan 1 D-1 forecasts)
    publish_from = datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc) - timedelta(days=2)
    publish_to = datetime(date_to.year, date_to.month, date_to.day, 23, 59, 59, tzinfo=timezone.utc)

    try:
        forecasts_raw = await fetch_forecasts_wind(publish_from, publish_to)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Elexon forecasts error: {str(e)}")

    # For each delivery day, pick the latest D-1 forecast run
    # Then compute error metrics day by day
    by_day = []
    all_matched_actuals = []
    all_matched_forecasts = []

    current = date_from
    while current <= date_to:
        d_minus_1 = current - timedelta(days=1)

        # Actuals for this day
        day_actuals = [
            a for a in actuals
            if (a.get("startTime") or "").startswith(current.isoformat())
        ]

        # Forecasts published on D-1 targeting this delivery day
        day_forecasts_raw = [
            f for f in forecasts_raw
            if (f.get("startTime") or "").startswith(current.isoformat())
            and (f.get("publishTime") or "").startswith(d_minus_1.isoformat())
        ]

        # Pick the latest publish time on D-1
        pub_times = sorted(set(f.get("publishTime") for f in day_forecasts_raw if f.get("publishTime")))
        latest_pt = pub_times[-1] if pub_times else None

        day_forecasts = [f for f in day_forecasts_raw if f.get("publishTime") == latest_pt] if latest_pt else []

        # Compute metrics
        metrics = compute_error_metrics(day_actuals, day_forecasts)

        by_day.append({
            "date": current.isoformat(),
            "forecastPublishTime": latest_pt,
            "metrics": metrics,
        })

        all_matched_actuals.extend(day_actuals)
        all_matched_forecasts.extend(day_forecasts)

        current += timedelta(days=1)

    # Overall metrics
    overall = compute_error_metrics(all_matched_actuals, all_matched_forecasts)

    # Horizon breakdown: use ALL forecasts (not just D-1 latest) vs actuals
    horizon = compute_horizon_metrics(actuals, forecasts_raw)

    return {
        "period": f"{date_from.isoformat()} to {date_to.isoformat()}",
        "overall": overall,
        "byDay": by_day,
        "byHorizon": horizon,
    }


@router.get("/accuracy/day")
async def get_day_accuracy(
    delivery_date: date = Query(..., description="Delivery date (YYYY-MM-DD)"),
):
    """
    Compute forecast accuracy for a single delivery day.
    Shows multiple forecast runs and their accuracy vs actuals.
    """
    d_minus_2 = delivery_date - timedelta(days=2)

    # Fetch actuals for the specific day
    try:
        actuals_raw = await fetch_actuals_wind(delivery_date, delivery_date)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Elexon actuals error: {str(e)}")

    actuals = [
        {"startTime": r.get("startTime"), "generation": r.get("generation")}
        for r in actuals_raw
        if r.get("fuelType") == "WIND" and r.get("generation") is not None
    ]

    # Fetch forecasts for this delivery date from various publish times
    pub_from = datetime(d_minus_2.year, d_minus_2.month, d_minus_2.day, tzinfo=timezone.utc)
    pub_to = datetime(delivery_date.year, delivery_date.month, delivery_date.day, 23, 59, 59, tzinfo=timezone.utc)

    try:
        forecasts_raw = await fetch_forecasts_wind(pub_from, pub_to)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Elexon forecasts error: {str(e)}")

    # Filter to this delivery date
    day_forecasts = [
        f for f in forecasts_raw
        if (f.get("startTime") or "").startswith(delivery_date.isoformat())
    ]

    # Group by publishTime and compute per-run metrics
    pub_times = sorted(set(f.get("publishTime") for f in day_forecasts if f.get("publishTime")))

    runs = []
    for pt in pub_times:
        run_forecasts = [f for f in day_forecasts if f.get("publishTime") == pt]
        metrics = compute_error_metrics(actuals, run_forecasts)
        runs.append({
            "publishTime": pt,
            "pointCount": len(run_forecasts),
            "metrics": metrics,
        })

    # Overall metrics using the latest run (D-1)
    d_minus_1_str = (delivery_date - timedelta(days=1)).isoformat()
    d1_pub_times = [pt for pt in pub_times if pt.startswith(d_minus_1_str)]
    latest_d1 = d1_pub_times[-1] if d1_pub_times else None

    return {
        "deliveryDate": delivery_date.isoformat(),
        "actualsCount": len(actuals),
        "forecastRuns": runs,
        "dayAheadPublishTime": latest_d1,
    }
