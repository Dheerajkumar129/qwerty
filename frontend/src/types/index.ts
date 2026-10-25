// API types for WindView frontend

export interface ActualPoint {
  startTime: string;
  settlementDate: string;
  settlementPeriod: number;
  generation: number;
}

export interface ForecastPoint {
  startTime: string;
  publishTime: string;
  generation: number;
}

export interface ForecastRun {
  publishTime: string;
  count: number;
}

export interface ActualsResponse {
  dateFrom: string;
  dateTo: string;
  count: number;
  data: ActualPoint[];
}

export interface ForecastsResponse {
  targetDate: string | null;
  publishFrom: string;
  publishTo: string;
  count: number;
  latestPublishTime: string | null;
  runs: ForecastRun[];
  data: ForecastPoint[];
}

export interface DayAheadForecastResponse {
  deliveryDate: string;
  dayAheadPublishTime: string | null;
  allPublishTimesOnDMinus1: string[];
  count: number;
  data: ForecastPoint[];
}

export interface ErrorMetrics {
  mae: number | null;
  rmse: number | null;
  mape: number | null;
  bias: number | null;
  n: number;
}

export interface DayMetrics {
  date: string;
  forecastPublishTime: string | null;
  metrics: ErrorMetrics;
}

export interface HorizonMetrics {
  leadHoursMin: number;
  leadHoursMax: number;
  leadHours: number;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  n: number;
}

export interface AnalyticsResponse {
  period: string;
  overall: ErrorMetrics;
  byDay: DayMetrics[];
  byHorizon: HorizonMetrics[];
}

export interface ChartDataPoint {
  time: string;
  displayTime: string;
  actual?: number;
  forecast?: number;
  error?: number;
}
