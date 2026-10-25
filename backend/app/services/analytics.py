"""Forecast accuracy analytics computations."""

import math
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def _safe_mean(values: list[float]) -> Optional[float]:
    if not values:
        return None
    return sum(values) / len(values)


def _safe_rmse(errors: list[float]) -> Optional[float]:
    if not errors:
        return None
    return math.sqrt(sum(e ** 2 for e in errors) / len(errors))


def _aggregate_actuals_to_hourly(actuals: list[dict]) -> dict[str, float]:
    """
    FUELHH is 30-min resolution; WINDFOR is hourly.
    Aggregate actuals to hourly by averaging the two 30-min periods.
    Key: 'YYYY-MM-DDTHH:00' (hour start in UTC).
    """
    hourly: dict[str, list[float]] = {}
    for a in actuals:
        st = _parse_dt(a.get("startTime", ""))
        gen = a.get("generation")
        if st is None or gen is None:
            continue
        # Round down to hour
        hour_key = st.replace(minute=0, second=0, microsecond=0).strftime("%Y-%m-%dT%H:%M")
        hourly.setdefault(hour_key, []).append(float(gen))
    return {k: sum(v) / len(v) for k, v in hourly.items()}


def compute_error_metrics(
    actuals: list[dict],  # {startTime, generation}
    forecasts: list[dict],  # {startTime, generation, publishTime}
    forecast_publish_time: Optional[datetime] = None,
) -> dict:
    """
    Match actuals (FUELHH, 30-min) and forecasts (WINDFOR, hourly) and compute error metrics.
    Actuals are aggregated to hourly to align with forecast resolution.
    If forecast_publish_time is given, only use forecasts from that run.
    """
    # Aggregate 30-min actuals → hourly
    actual_map = _aggregate_actuals_to_hourly(actuals)

    # Build lookup: startTime (hour) → forecast generation
    forecast_map: dict[str, float] = {}
    for f in forecasts:
        if forecast_publish_time is not None:
            pt = _parse_dt(f.get("publishTime", ""))
            if pt is None:
                continue
            # Match publish time (allow small tolerance)
            ref_pt = _parse_dt(str(forecast_publish_time))
            if ref_pt and abs((pt - ref_pt).total_seconds()) > 300:
                continue
        st = f.get("startTime", "")
        gen = f.get("generation")
        if st and gen is not None:
            key = _normalize_dt(st)
            forecast_map[key] = float(gen)

    # Compute errors for matched periods
    errors: list[float] = []
    abs_errors: list[float] = []
    pct_errors: list[float] = []

    for key, actual_gen in actual_map.items():
        if key in forecast_map:
            forecast_gen = forecast_map[key]
            err = forecast_gen - actual_gen  # positive = over-forecast
            errors.append(err)
            abs_errors.append(abs(err))
            if actual_gen != 0:
                pct_errors.append(abs(err / actual_gen) * 100)

    return {
        "mae": _safe_mean(abs_errors),
        "rmse": _safe_rmse(errors),
        "mape": _safe_mean(pct_errors),
        "bias": _safe_mean(errors),
        "n": len(errors),
    }


def compute_horizon_metrics(
    actuals: list[dict],
    forecasts: list[dict],
    horizon_bins: list[float] = None,  # lead hours breakpoints
) -> list[dict]:
    """
    Compute error metrics grouped by forecast lead time (hours from publishTime to startTime).
    Actuals (30-min FUELHH) are aggregated to hourly to match WINDFOR resolution.
    """
    if horizon_bins is None:
        # Bins: <12h, 12-24h, 24-36h, 36-48h, 48+h
        horizon_bins = [0, 12, 24, 36, 48, 72]

    actual_map = _aggregate_actuals_to_hourly(actuals)

    # Group forecast errors by lead time bin
    bins: dict[tuple, list[float]] = {}
    for i in range(len(horizon_bins) - 1):
        bins[(horizon_bins[i], horizon_bins[i + 1])] = []

    for f in forecasts:
        st = f.get("startTime", "")
        pt = f.get("publishTime", "")
        gen = f.get("generation")
        if not st or not pt or gen is None:
            continue

        start_dt = _parse_dt(st)
        pub_dt = _parse_dt(pt)
        if start_dt is None or pub_dt is None:
            continue

        lead_hours = (start_dt - pub_dt).total_seconds() / 3600
        if lead_hours < 0:
            continue  # skip if forecast is after actual

        # Match to hourly actual
        hour_key = start_dt.replace(minute=0, second=0, microsecond=0).strftime("%Y-%m-%dT%H:%M")
        actual_gen = actual_map.get(hour_key)
        if actual_gen is None:
            continue

        err = float(gen) - actual_gen

        for (lo, hi) in bins:
            if lo <= lead_hours < hi:
                bins[(lo, hi)].append(err)
                break

    results = []
    for (lo, hi), errors in sorted(bins.items()):
        abs_errors = [abs(e) for e in errors]
        results.append({
            "leadHoursMin": lo,
            "leadHoursMax": hi,
            "leadHours": (lo + hi) / 2,
            "mae": _safe_mean(abs_errors),
            "rmse": _safe_rmse(errors),
            "bias": _safe_mean(errors),
            "n": len(errors),
        })

    return results


def _normalize_dt(dt_str: str) -> str:
    """Normalize a datetime string to a compact UTC key (YYYY-MM-DDTHH:MM)."""
    dt = _parse_dt(dt_str)
    if dt is None:
        return dt_str
    return dt.strftime("%Y-%m-%dT%H:%M")


def _parse_dt(dt_str: str) -> Optional[datetime]:
    """Parse ISO datetime string to UTC-aware datetime."""
    if not dt_str:
        return None
    try:
        # Handle both Z and +00:00 suffix
        dt_str = dt_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None
