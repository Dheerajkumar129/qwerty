"""Router: Wind actuals (FUELHH)."""

from datetime import date, datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.elexon import fetch_actuals_wind

router = APIRouter(prefix="/actuals", tags=["actuals"])

# Scope: January 2026
JAN_2026_START = date(2026, 1, 1)
JAN_2026_END = date(2026, 1, 31)


@router.get("/wind")
async def get_wind_actuals(
    date_from: date = Query(default=JAN_2026_START, description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(default=JAN_2026_END, description="End date (YYYY-MM-DD)"),
):
    """
    Return actual wind generation from FUELHH for the given date range.
    Defaults to full January 2026.
    """
    try:
        raw = await fetch_actuals_wind(date_from, date_to)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Elexon API error: {str(e)}")

    # Parse and return cleaned records
    results = []
    for r in raw:
        if r.get("fuelType") != "WIND":
            continue
        results.append({
            "startTime": r.get("startTime"),
            "settlementDate": r.get("settlementDate"),
            "settlementPeriod": r.get("settlementPeriod"),
            "generation": r.get("generation"),
        })

    # Sort by startTime
    results.sort(key=lambda x: x.get("startTime") or "")

    return {
        "dateFrom": date_from.isoformat(),
        "dateTo": date_to.isoformat(),
        "count": len(results),
        "data": results,
    }
