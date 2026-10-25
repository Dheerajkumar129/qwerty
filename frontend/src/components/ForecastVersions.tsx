import { format, parseISO } from 'date-fns';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import type { ForecastRun } from '../types';

interface ForecastVersionsProps {
  runs: ForecastRun[];
  selectedPublishTime: string | null;
  onSelect: (pt: string) => void;
  latestPublishTime: string | null;
}

export function ForecastVersions({
  runs,
  selectedPublishTime,
  onSelect,
  latestPublishTime,
}: ForecastVersionsProps) {
  if (!runs || runs.length === 0) {
    return (
      <div className="card-sm text-slate-500 text-sm">
        No forecast runs available for this date.
      </div>
    );
  }

  // Sort most recent first
  const sorted = [...runs].sort((a, b) =>
    b.publishTime.localeCompare(a.publishTime)
  );

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">
        Forecast Runs ({runs.length} available)
      </h3>
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
        {sorted.map((run) => {
          const isSelected = run.publishTime === selectedPublishTime;
          const isLatest = run.publishTime === latestPublishTime;
          const publishDt = parseISO(run.publishTime);

          return (
            <button
              key={run.publishTime}
              onClick={() => onSelect(run.publishTime)}
              className={clsx(
                'flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all',
                isSelected
                  ? 'bg-blue-900/50 border border-blue-600/50 text-blue-200'
                  : 'bg-slate-800/50 border border-slate-700/30 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              )}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">
                    {format(publishDt, 'HH:mm')} UTC
                  </p>
                  <p className="text-xs text-slate-500">
                    {format(publishDt, 'd MMM yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{run.count} pts</span>
                {isLatest && (
                  <span className="badge-blue text-xs">Latest</span>
                )}
                {isSelected && (
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 mt-3">
        NESO typically publishes forecasts at 03:30, 05:30, 08:30, 10:30, 12:30, 16:30, 19:30, 23:30 UTC.
        <br />
        Day-ahead procurement uses the latest run available before 09:20 UTC on D−1.
      </p>
    </div>
  );
}
