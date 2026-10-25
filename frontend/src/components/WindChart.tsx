import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { ChartDataPoint } from '../types';

interface WindChartProps {
  data: ChartDataPoint[];
  title?: string;
  showError?: boolean;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-2xl text-sm">
      <p className="text-slate-300 font-medium mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-white font-medium">
            {entry.value != null ? `${Math.round(entry.value).toLocaleString()} MW` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

export function WindChart({ data, title, showError = false, height = 300 }: WindChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-500 text-sm"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  return (
    <div>
      {title && (
        <p className="text-sm font-medium text-slate-400 mb-3">{title}</p>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="displayTime"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
            label={{
              value: 'MW',
              angle: -90,
              position: 'insideLeft',
              fill: '#64748b',
              fontSize: 11,
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
          />

          {/* Actual generation area */}
          {data.some((d) => d.actual != null) && (
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual Generation"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.1}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#22c55e' }}
            />
          )}

          {/* Forecast line */}
          {data.some((d) => d.forecast != null) && (
            <Line
              type="monotone"
              dataKey="forecast"
              name="Wind Forecast"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              strokeDasharray="6 3"
              activeDot={{ r: 4, fill: '#3b82f6' }}
            />
          )}

          {/* Error band (optional) */}
          {showError && data.some((d) => d.error != null) && (
            <>
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
              <Line
                type="monotone"
                dataKey="error"
                name="Forecast Error"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: '#f59e0b' }}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
