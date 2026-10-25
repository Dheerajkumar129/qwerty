"""Pydantic schemas for WindView API responses."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ActualPoint(BaseModel):
    startTime: datetime
    settlementDate: str
    settlementPeriod: int
    generation: float  # MW


class ForecastPoint(BaseModel):
    startTime: datetime
    publishTime: datetime
    generation: float  # MW


class ForecastRun(BaseModel):
    """A single forecast publication (one publishTime) with all its period values."""
    publishTime: datetime
    points: list[ForecastPoint]


class ActualsResponse(BaseModel):
    date: str
    data: list[ActualPoint]


class ForecastsResponse(BaseModel):
    date: str
    latestPublishTime: Optional[datetime]
    data: list[ForecastPoint]
    allRuns: list[dict]  # [{publishTime, pointCount}]


class ErrorMetrics(BaseModel):
    mae: Optional[float]        # Mean Absolute Error (MW)
    rmse: Optional[float]       # Root Mean Squared Error (MW)
    mape: Optional[float]       # Mean Absolute Percentage Error (%)
    bias: Optional[float]       # Mean Bias (MW, positive = over-forecast)
    n: int                      # Number of matched periods


class DayMetrics(BaseModel):
    date: str
    metrics: ErrorMetrics
    forecastPublishTime: Optional[datetime]


class HorizonMetrics(BaseModel):
    leadHours: float            # Lead time in hours
    mae: Optional[float]
    rmse: Optional[float]
    bias: Optional[float]
    n: int


class AnalyticsSummaryResponse(BaseModel):
    period: str  # e.g. "January 2026"
    overall: ErrorMetrics
    byDay: list[DayMetrics]
    byHorizon: list[HorizonMetrics]
