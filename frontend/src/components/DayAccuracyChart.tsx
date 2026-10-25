import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { DayMetrics } from '../types';
import { format, parseISO } from 'date-fns';

interface DayAccuracyChartProps {
  byDay: DayMetrics[];
  metric: 'mae' | 'rmse' | 'mape' | 'bias';
}

const METRIC_CONFIG = {
  mae: { label: 'MAE (MW)', color: '#3b82f6', goodThreshold: 500, warnThreshold: 1200 },
  rmse: { label: 'RMSE (MW)', color: '#8b5cf6', goodThreshold: 700, warnThreshold: 1600 },
  mape: { label: 'MAPE (%)', color: '#06b6d4', goodThreshold: 10, warnThreshold: 20 },
  bias: { label: 'Bias (MW)', color: '#f59e0b', goodThreshold: 200, warnThreshold: 500 },
};

const CustomTooltip = ({ active, payload, label, metric }: any) => {
  if (!active || !payload?.length) return null;
  const config = METRIC_CONFIG[metric as keyof typeof METRIC_CONFIG];
  const value = payload[0]?.value;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-2xl text-sm">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      <p className="text-white font-bold">
        {value != null ? `${value.toFixed(1)} ${config.label.split(' ')[1].replace('(', '').replace(')', '')}` : '—'}
      </p>
    </div>
  );
};

export function DayAccuracyChart({ byDay, metric }: DayAccuracyChartProps) {
  const config = METRIC_CONFIG[metric];

  const chartData = byDay.map((d) => ({
    date: format(parseISO(d.date), 'dd/MM'),
    fullDate: d.date,
    value: d.metrics[metric],
    n: d.metrics.n,
  }));

  const getBarColor = (value: number | null) => {
    if (value == null) return '#334155';
    const absVal = Math.abs(value);
    if (metric === 'bias') {
      return value > 0 ? '#f59e0b' : '#3b82f6'; // amber = over, blue = under
    }
    if (absVal <= config.goodThreshold) return '#22c55e';
    if (absVal <= config.warnThreshold) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div>
      <p className="text-xs font-medium text-slate-400 mb-3">
        {config.label} — by delivery day
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            interval={2}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip metric={metric} />} />
          {metric === 'bias' && (
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
          )}
          <Bar dataKey="value" name={config.label} radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
