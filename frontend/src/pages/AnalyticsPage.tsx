import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { RefreshCw, AlertCircle, BarChart2, TrendingUp, Calendar } from 'lucide-react';
import { ErrorMetricsPanel } from '../components/ErrorMetricsPanel';
import { DayAccuracyChart } from '../components/DayAccuracyChart';
import { ForecastHorizonChart } from '../components/ForecastHorizonChart';
import { fetchAnalytics } from '../api/client';
import type { AnalyticsResponse } from '../types';
import clsx from 'clsx';

type MetricKey = 'mae' | 'rmse' | 'mape' | 'bias';

const METRIC_TABS: { key: MetricKey; label: string }[] = [
  { key: 'mae', label: 'MAE' },
  { key: 'rmse', label: 'RMSE' },
  { key: 'mape', label: 'MAPE %' },
  { key: 'bias', label: 'Bias' },
];

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('mae');
  const [sortByMetric, setSortByMetric] = useState<MetricKey>('mae');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const sortedByDay = analytics
    ? [...analytics.byDay].sort((a, b) => {
        const av = a.metrics[sortByMetric] ?? 0;
        const bv = b.metrics[sortByMetric] ?? 0;
        return sortDir === 'desc' ? bv - av : av - bv;
      })
    : [];

  const toggleSort = (metric: MetricKey) => {
    if (metric === sortByMetric) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortByMetric(metric);
      setSortDir('desc');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Forecast Accuracy Analysis</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Day-ahead wind forecasts vs actuals — January 2026
          </p>
        </div>
        <button onClick={loadAnalytics} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Reload
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800/50">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-300">Data fetch error</p>
            <p className="text-xs text-red-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Computing accuracy metrics from Elexon data…</span>
          <span className="text-xs text-slate-600">(This may take 15–30 seconds)</span>
        </div>
      )}

      {!loading && analytics && (
        <>
          {/* Overall summary panel */}
          <ErrorMetricsPanel
            metrics={analytics.overall}
            title="Overall January 2026 — Day-Ahead Forecast Accuracy"
          />

          {/* By-day accuracy chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Daily Accuracy Breakdown
                </h3>
              </div>
              {/* Metric selector tabs */}
              <div className="flex gap-1">
                {METRIC_TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setSelectedMetric(t.key)}
                    className={selectedMetric === t.key ? 'tab-active' : 'tab-inactive'}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <DayAccuracyChart byDay={analytics.byDay} metric={selectedMetric} />
          </div>

          {/* Horizon analysis */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Accuracy vs Forecast Lead Time
              </h3>
            </div>
            <ForecastHorizonChart byHorizon={analytics.byHorizon} />
            <div className="mt-4 p-3 rounded-lg bg-blue-900/20 border border-blue-800/30">
              <p className="text-xs text-blue-300 leading-relaxed">
                <strong>Procurement implication:</strong> Day-ahead market decisions are made ~24–36h before delivery.
                If accuracy degrades significantly at this horizon, consider adding a procurement buffer proportional
                to the RMSE at 24–36h lead time.
              </p>
            </div>
          </div>

          {/* Day-by-day table */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">Day-by-Day Metrics Table</h3>
              <span className="text-xs text-slate-500 ml-auto">Click column to sort</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left pb-2 text-slate-400 font-medium text-xs uppercase tracking-wider w-32">
                      Date
                    </th>
                    <th className="text-left pb-2 text-slate-400 font-medium text-xs uppercase tracking-wider">
                      Forecast Run (D−1)
                    </th>
                    {METRIC_TABS.map((t) => (
                      <th
                        key={t.key}
                        className="text-right pb-2 text-slate-400 font-medium text-xs uppercase tracking-wider cursor-pointer hover:text-slate-200 select-none"
                        onClick={() => toggleSort(t.key)}
                      >
                        {t.label}
                        {sortByMetric === t.key && (sortDir === 'desc' ? ' ↓' : ' ↑')}
                      </th>
                    ))}
                    <th className="text-right pb-2 text-slate-400 font-medium text-xs uppercase tracking-wider">
                      N
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByDay.map((d) => {
                    const mae = d.metrics.mae;
                    const maeColor =
                      mae == null
                        ? 'text-slate-500'
                        : mae < 500
                        ? 'text-green-400'
                        : mae < 1200
                        ? 'text-amber-400'
                        : 'text-red-400';

                    return (
                      <tr
                        key={d.date}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-2 text-slate-200 font-medium">
                          {format(parseISO(d.date), 'EEE, d MMM')}
                        </td>
                        <td className="py-2 text-slate-400 font-mono text-xs">
                          {d.forecastPublishTime
                            ? format(parseISO(d.forecastPublishTime), 'HH:mm dd/MM')
                            : '—'}
                        </td>
                        <td className={`py-2 text-right font-medium ${maeColor}`}>
                          {d.metrics.mae != null ? `${d.metrics.mae.toFixed(0)} MW` : '—'}
                        </td>
                        <td className="py-2 text-right text-slate-300">
                          {d.metrics.rmse != null ? `${d.metrics.rmse.toFixed(0)} MW` : '—'}
                        </td>
                        <td className="py-2 text-right text-slate-300">
                          {d.metrics.mape != null ? `${d.metrics.mape.toFixed(1)}%` : '—'}
                        </td>
                        <td className={clsx(
                          'py-2 text-right',
                          d.metrics.bias == null
                            ? 'text-slate-500'
                            : d.metrics.bias > 100
                            ? 'text-amber-400'
                            : d.metrics.bias < -100
                            ? 'text-blue-400'
                            : 'text-slate-300'
                        )}>
                          {d.metrics.bias != null
                            ? `${d.metrics.bias > 0 ? '+' : ''}${d.metrics.bias.toFixed(0)} MW`
                            : '—'}
                        </td>
                        <td className="py-2 text-right text-slate-500 text-xs">
                          {d.metrics.n}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Methodology note */}
          <div className="card-sm bg-slate-900/50 border-slate-700">
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-400">Methodology:</strong> Day-ahead forecasts are the latest WINDFOR run
              published on D−1 (day before delivery). Actuals are from FUELHH (WIND fuel type), half-hourly resolution.
              Matching is by <code className="bg-slate-800 px-1 rounded text-slate-300">startTime</code> (30-min periods).
              MAE and RMSE are in MW; MAPE excludes periods where actual generation ≈ 0 to avoid division distortion.
              Bias = mean(forecast − actual); positive = systematic over-forecasting.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
