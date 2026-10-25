"""Elexon BMRS API async client."""

from datetime import date, datetime, timezone
from typing import Optional
import httpx
import logging

logger = logging.getLogger(__name__)

ELEXON_BASE = "https://data.elexon.co.uk/bmrs/api/v1"

# Shared async client (reused across requests)
_client: Optional[httpx.AsyncClient] = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=ELEXON_BASE,
            timeout=60.0,
            headers={"Accept": "application/json"},
        )
    return _client


async def fetch_actuals_wind(
    date_from: date,
    date_to: date,
) -> list[dict]:
    """
    Fetch FUELHH wind actuals for a date range.
    Returns raw list of records from Elexon /datasets/FUELHH/stream.
    """
    client = get_client()
    params = {
        "settlementDateFrom": date_from.isoformat(),
        "settlementDateTo": date_to.isoformat(),
        "fuelType": "WIND",
    }
    logger.info(f"Fetching FUELHH actuals from {date_from} to {date_to}")
    try:
        resp = await client.get("/datasets/FUELHH/stream", params=params)
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"FUELHH returned {len(data)} records")
        return data
    except httpx.HTTPStatusError as e:
        logger.error(f"FUELHH HTTP error: {e.response.status_code} - {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"FUELHH fetch error: {e}")
        raise


async def fetch_forecasts_wind(
    publish_from: datetime,
    publish_to: datetime,
) -> list[dict]:
    """
    Fetch WINDFOR wind forecasts published within a time window.
    Returns raw list of records from Elexon /datasets/WINDFOR/stream.
    """
    client = get_client()
    params = {
        "publishDateTimeFrom": publish_from.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "publishDateTimeTo": publish_to.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    logger.info(f"Fetching WINDFOR forecasts from {publish_from} to {publish_to}")
    try:
        resp = await client.get("/datasets/WINDFOR/stream", params=params)
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"WINDFOR returned {len(data)} records")
        return data
    except httpx.HTTPStatusError as e:
        logger.error(f"WINDFOR HTTP error: {e.response.status_code} - {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"WINDFOR fetch error: {e}")
        raise
