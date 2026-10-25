import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Wind, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { DaySelector } from '../components/DaySelector';
import { WindChart } from '../components/WindChart';
import { ForecastVersions } from '../components/ForecastVersions';
import { ErrorMetricsPanel } from '../components/ErrorMetricsPanel';
import { fetchActuals, fetchForecasts } from '../api/client';
import type {
  ActualPoint,
  ForecastPoint,
  ForecastRun,
  ChartDataPoint,
  ErrorMetrics,
} from '../types';
import { computeErrorMetrics } from '../utils/metrics';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
      <RefreshCw className="w-5 h-5 animate-spin" />
      <span className="text-sm">Fetching data from Elexon BMRS…</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800/50">
      <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-red-300">Data fetch error</p>
        <p className="text-xs text-red-400 mt-0.5">{message}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState('2026-01-15');
  const [actuals, setActuals] = useState<ActualPoint[]>([]);
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [runs, setRuns] = useState<ForecastRun[]>([]);
  const [latestPublishTime, setLatestPublishTime] = useState<string | null>(null);
  const [selectedPublishTime, setSelectedPublishTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  async function loadData(date: string) {
    setLoading(true);
    setError(null);
    setActuals([]);
    setForecastData([]);
    setRuns([]);
    setSelectedPublishTime(null);

    try {
      const [actualsRes, forecastsRes] = await Promise.all([
        fetchActuals(date, date),
        fetchForecasts(date),
      ]);

      setActuals(actualsRes.data);
      setForecastData(forecastsRes.data);
      setRuns(forecastsRes.runs);
      setLatestPublishTime(forecastsRes.latestPublishTime);
      setSelectedPublishTime(forecastsRes.latestPublishTime);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // Filter forecasts by selectedPublishTime
  const filteredForecasts = useMemo(() => {
    if (!selectedPublishTime) return forecastData;
    return forecastData.filter((f) => f.publishTime === selectedPublishTime);
  }, [forecastData, selectedPublishTime]);

  // Merge actuals + forecasts into chart data
  const chartData = useMemo((): ChartDataPoint[] => {
    const map = new Map<string, ChartDataPoint>();

    for (const a of actuals) {
      const key = a.startTime;
      const existing = map.get(key) || { time: key, displayTime: '', actual: undefined, forecast: undefined };
      existing.actual = a.generation;
      try {
        existing.displayTime = format(parseISO(key), 'HH:mm');
      } catch {
        existing.displayTime = key.substring(11, 16);
      }
      map.set(key, existing);
    }

    for (const f of filteredForecasts) {
      const key = f.startTime;
      const existing = map.get(key) || { time: key, displayTime: '', actual: undefined, forecast: undefined };
      existing.forecast = f.generation;
      if (!existing.displayTime) {
        try {
          existing.displayTime = format(parseISO(key), 'HH:mm');
        } catch {
          existing.displayTime = key.substring(11, 16);
        }
      }
      map.set(key, existing);
    }

    const points = Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time));
    // Add error column
    return points.map((p) => ({
      ...p,
      error:
        p.actual != null && p.forecast != null ? p.forecast - p.actual : undefined,
    }));
  }, [actuals, filteredForecasts]);

  // Compute metrics for selected run vs actuals
  const metrics = useMemo((): ErrorMetrics | null => {
    if (!filteredForecasts.length || !actuals.length) return null;
    return computeErrorMetrics(actuals, filteredForecasts);
  }, [actuals, filteredForecasts]);

  // Summary stats
  const avgForecast =
    filteredForecasts.length > 0
      ? filteredForecasts.reduce((s, f) => s + f.generation, 0) / filteredForecasts.length
      : null;
  const avgActual =
    actuals.length > 0
      ? actuals.reduce((s, a) => s + a.generation, 0) / actuals.length
      : null;

  const hasActuals = actuals.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <DaySelector
          selectedDate={selectedDate}
          onChange={setSelectedDate}
          label="Delivery date (day-ahead market)"
        />
        <button
          onClick={() => loadData(selectedDate)}
          disabled={loading}
          className="btn-secondary self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Top KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card-sm">
              <p className="metric-label">Avg Wind Forecast</p>
              <p className="metric-value text-blue-400">
                {avgForecast != null ? `${Math.round(avgForecast).toLocaleString()}` : '—'}
                <span className="text-sm font-normal text-slate-400 ml-1">MW</span>
              </p>
            </div>
            <div className="card-sm">
              <p className="metric-label">Avg Wind Actual</p>
              <p className="metric-value text-green-400">
                {avgActual != null ? `${Math.round(avgActual).toLocaleString()}` : '—'}
                <span className="text-sm font-normal text-slate-400 ml-1">MW</span>
              </p>
            </div>
            <div className="card-sm">
              <p className="metric-label">Forecast Periods</p>
              <p className="metric-value text-slate-200">
                {filteredForecasts.length}
                <span className="text-sm font-normal text-slate-400 ml-1">× 30 min</span>
              </p>
            </div>
            <div className="card-sm">
              <p className="metric-label">Actuals Available</p>
              <p className={`metric-value ${hasActuals ? 'text-green-400' : 'text-slate-500'}`}>
                {hasActuals ? `${actuals.length}` : 'Pending'}
                <span className="text-sm font-normal text-slate-400 ml-1">periods</span>
              </p>
            </div>
          </div>

          {/* Main chart + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Chart — takes 3/4 */}
            <div className="lg:col-span-3 card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">
                    Wind Generation — {format(parseISO(selectedDate), 'd MMMM yyyy')}
                  </h2>
                  {selectedPublishTime && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Forecast run published:{' '}
                      <span className="text-blue-400 font-medium font-mono">
                        {format(parseISO(selectedPublishTime), 'HH:mm dd/MM/yyyy')} UTC
                      </span>
                    </p>
                  )}
                </div>
                {!hasActuals && (
                  <span className="badge-amber text-xs">
                    <Info className="w-3 h-3" />
                    Actuals not yet available
                  </span>
                )}
              </div>
              <WindChart data={chartData} height={340} showError={hasActuals} />
              {/* Legend note */}
              <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-800 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-0.5 bg-green-500 rounded" />
                  Actual wind generation
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-8 border-t-2 border-dashed border-blue-500 rounded" />
                  Wind forecast (WINDFOR)
                </div>
                {hasActuals && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-8 h-0.5 bg-amber-500 rounded" />
                    Forecast error (forecast − actual)
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar — forecast versions */}
            <div className="lg:col-span-1">
              <ForecastVersions
                runs={runs}
                selectedPublishTime={selectedPublishTime}
                onSelect={setSelectedPublishTime}
                latestPublishTime={latestPublishTime}
              />
            </div>
          </div>

          {/* Accuracy metrics (only when actuals available) */}
          {hasActuals && metrics ? (
            <ErrorMetricsPanel
              metrics={metrics}
              title={`Accuracy — ${format(parseISO(selectedDate), 'd MMMM yyyy')}`}
            />
          ) : (
            <div className="card flex items-center gap-3 text-slate-400">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <p className="text-sm">
                Forecast accuracy metrics will appear here once actuals are published for this delivery date.
                Actuals for January 2026 are available after the settlement period.
              </p>
            </div>
          )}

          {/* Context note */}
          <div className="card-sm bg-slate-900/50 border-slate-800">
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-400">Decision context:</strong> The UK day-ahead power market (EPEX SPOT GB)
              closes at 09:20 UTC on D−1. Your team uses the latest available WINDFOR forecast run before this gate
              closure to estimate residual thermal procurement needed = estimated demand − wind forecast.
              A higher wind forecast → less thermal power needed from day-ahead market → lower procurement cost.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
