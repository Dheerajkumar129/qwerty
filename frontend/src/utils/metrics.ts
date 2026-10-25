import type { ActualPoint, ForecastPoint, ErrorMetrics } from '../types';

function getHourKey(isoStr: string): string {
  // Return 'YYYY-MM-DDTHH:00' — hour-level key for matching WINDFOR (hourly) to FUELHH (30-min)
  return isoStr.substring(0, 13) + ':00';
}

/**
 * Aggregate 30-min actuals to hourly (average of two 30-min periods per hour).
 */
function aggregateActualsToHourly(actuals: ActualPoint[]): Map<string, number> {
  const hourBuckets = new Map<string, number[]>();
  for (const a of actuals) {
    if (!a.startTime || a.generation == null) continue;
    const key = getHourKey(a.startTime);
    if (!hourBuckets.has(key)) hourBuckets.set(key, []);
    hourBuckets.get(key)!.push(a.generation);
  }
  const hourlyMap = new Map<string, number>();
  for (const [k, vals] of hourBuckets) {
    hourlyMap.set(k, vals.reduce((s, v) => s + v, 0) / vals.length);
  }
  return hourlyMap;
}

export function computeErrorMetrics(
  actuals: ActualPoint[],
  forecasts: ForecastPoint[]
): ErrorMetrics {
  // Aggregate actuals to hourly to match WINDFOR resolution
  const actualMap = aggregateActualsToHourly(actuals);

  // Build forecast map by hour
  const forecastMap = new Map<string, number>();
  for (const f of forecasts) {
    if (f.startTime && f.generation != null) {
      forecastMap.set(getHourKey(f.startTime), f.generation);
    }
  }

  const errors: number[] = [];
  const absErrors: number[] = [];
  const pctErrors: number[] = [];

  for (const [key, actualGen] of actualMap) {
    const forecastGen = forecastMap.get(key);
    if (forecastGen == null) continue;
    const err = forecastGen - actualGen;
    errors.push(err);
    absErrors.push(Math.abs(err));
    if (actualGen !== 0) {
      pctErrors.push((Math.abs(err) / actualGen) * 100);
    }
  }

  const n = errors.length;
  if (n === 0) return { mae: null, rmse: null, mape: null, bias: null, n: 0 };

  const mae = absErrors.reduce((s, v) => s + v, 0) / n;
  const rmse = Math.sqrt(errors.reduce((s, v) => s + v * v, 0) / n);
  const mape = pctErrors.length > 0
    ? pctErrors.reduce((s, v) => s + v, 0) / pctErrors.length
    : null;
  const bias = errors.reduce((s, v) => s + v, 0) / n;

  return { mae, rmse, mape, bias, n };
}
