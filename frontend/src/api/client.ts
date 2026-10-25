import axios from 'axios';
import type {
  ActualsResponse,
  ForecastsResponse,
  DayAheadForecastResponse,
  AnalyticsResponse,
} from '../types';

// Use /api prefix which Vite proxies to backend in dev
// In production, set VITE_API_BASE_URL env variable
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Fetch wind actuals for a date range (defaults to January 2026)
 */
export async function fetchActuals(
  dateFrom: string = '2026-01-01',
  dateTo: string = '2026-01-31'
): Promise<ActualsResponse> {
  const res = await api.get('/actuals/wind', {
    params: { date_from: dateFrom, date_to: dateTo },
  });
  return res.data;
}

/**
 * Fetch all wind forecasts for a target date
 */
export async function fetchForecasts(targetDate: string): Promise<ForecastsResponse> {
  const res = await api.get('/forecasts/wind', {
    params: { target_date: targetDate },
  });
  return res.data;
}

/**
 * Fetch the day-ahead forecast for a specific delivery date
 * (Latest forecast run published on D-1)
 */
export async function fetchDayAheadForecast(
  deliveryDate: string
): Promise<DayAheadForecastResponse> {
  const res = await api.get('/forecasts/wind/day-ahead', {
    params: { delivery_date: deliveryDate },
  });
  return res.data;
}

/**
 * Fetch forecast accuracy analytics for January 2026
 */
export async function fetchAnalytics(
  dateFrom: string = '2026-01-01',
  dateTo: string = '2026-01-31'
): Promise<AnalyticsResponse> {
  const res = await api.get('/analytics/accuracy', {
    params: { date_from: dateFrom, date_to: dateTo },
  });
  return res.data;
}
