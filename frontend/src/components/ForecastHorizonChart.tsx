import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { HorizonMetrics } from '../types';

interface ForecastHorizonChartProps {
  byHorizon: HorizonMetrics[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-2xl text-sm">
      <p className="text-slate-300 font-medium mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-white font-medium">
            {entry.value != null ? `${Math.round(entry.value)} MW` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

export function ForecastHorizonChart({ byHorizon }: ForecastHorizonChartProps) {
  const chartData = byHorizon.map((h) => ({
    label: `${h.leadHoursMin}–${h.leadHoursMax}h`,
    MAE: h.mae != null ? Math.round(h.mae) : null,
    RMSE: h.rmse != null ? Math.round(h.rmse) : null,
    Bias: h.bias != null ? Math.round(h.bias) : null,
    n: h.n,
  }));

  return (
    <div>
      <p className="text-xs font-medium text-slate-400 mb-3">
        Forecast Error vs Lead Time — how accuracy degrades with horizon
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            label={{ value: 'Lead time (hours)', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={55}
            tickFormatter={(v) => `${v.toLocaleString()}`}
            label={{ value: 'MW', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
          <Bar dataKey="MAE" name="MAE" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          <Bar dataKey="RMSE" name="RMSE" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 mt-2 text-center">
        Day-ahead decisions use 24–36h lead time forecasts
      </p>
    </div>
  );
}
