import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import type { ErrorMetrics } from '../types';

interface MetricCardProps {
  label: string;
  value: number | null | undefined;
  unit: string;
  description: string;
  colorThreshold?: { good: number; warn: number }; // values below 'good' = green
  higherIsBetter?: boolean;
  showBias?: boolean;
}

function MetricCard({
  label,
  value,
  unit,
  description,
  colorThreshold,
  higherIsBetter = false,
  showBias = false,
}: MetricCardProps) {
  const getColorClass = () => {
    if (value == null || !colorThreshold) return 'text-slate-100';
    const absVal = Math.abs(value);
    if (absVal <= colorThreshold.good) return 'text-green-400';
    if (absVal <= colorThreshold.warn) return 'text-amber-400';
    return 'text-red-400';
  };

  const getBiasIcon = () => {
    if (!showBias || value == null) return null;
    if (Math.abs(value) < 50) return <Minus className="w-4 h-4 text-slate-400" />;
    if (value > 0) return <TrendingUp className="w-4 h-4 text-amber-400" />;
    return <TrendingDown className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="card-sm flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="metric-label">{label}</p>
        {getBiasIcon()}
      </div>
      <div className="flex items-end gap-1.5">
        <span className={clsx('text-2xl font-bold tracking-tight', getColorClass())}>
          {value != null ? Math.abs(value).toFixed(0) : '—'}
        </span>
        <span className="text-slate-400 text-sm mb-0.5">{unit}</span>
        {showBias && value != null && (
          <span className={clsx('text-sm mb-0.5', value > 0 ? 'text-amber-400' : 'text-blue-400')}>
            ({value > 0 ? '+' : ''}{value.toFixed(0)})
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
    </div>
  );
}

interface ErrorMetricsPanelProps {
  metrics: ErrorMetrics | null;
  title?: string;
  compact?: boolean;
}

export function ErrorMetricsPanel({
  metrics,
  title = 'Forecast Accuracy',
  compact = false,
}: ErrorMetricsPanelProps) {
  if (!metrics) {
    return (
      <div className="card animate-pulse-slow">
        <p className="text-slate-500 text-sm">Loading metrics…</p>
      </div>
    );
  }

  const gridCols = compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        <span className="text-xs text-slate-500">{metrics.n} periods matched</span>
      </div>
      <div className={`grid ${gridCols} gap-3`}>
        <MetricCard
          label="MAE"
          value={metrics.mae}
          unit="MW"
          description="Mean Absolute Error — average magnitude of forecast error"
          colorThreshold={{ good: 500, warn: 1200 }}
        />
        <MetricCard
          label="RMSE"
          value={metrics.rmse}
          unit="MW"
          description="Root Mean Square Error — penalises large errors more heavily"
          colorThreshold={{ good: 700, warn: 1600 }}
        />
        <MetricCard
          label="MAPE"
          value={metrics.mape}
          unit="%"
          description="Mean Absolute % Error — relative accuracy across wind levels"
          colorThreshold={{ good: 10, warn: 20 }}
        />
        <MetricCard
          label="Bias"
          value={metrics.bias}
          unit="MW"
          description="Mean error — positive means over-forecasting wind (less procurement needed)"
          showBias
        />
      </div>

      {/* Interpretation hint */}
      {metrics.bias != null && Math.abs(metrics.bias) > 100 && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed">
            {metrics.bias > 0
              ? `Forecasts over-predict wind by ${Math.abs(metrics.bias).toFixed(0)} MW on average. This means less thermal procurement was needed than anticipated — consider building a downward buffer into your procurement strategy.`
              : `Forecasts under-predict wind by ${Math.abs(metrics.bias).toFixed(0)} MW on average. You may need to procure more thermal backup than the forecast suggests.`}
          </p>
        </div>
      )}
    </div>
  );
}
