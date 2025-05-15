/**
 * Metrics Types
 * 
 * This file contains TypeScript types related to AI model metrics and performance.
 */

/**
 * Types of metrics that can be tracked
 */
export type MetricType = 'response_time' | 'success_rate' | 'request_count' | 'token_usage';

/**
 * Time periods for data aggregation
 */
export type TimePeriod = 'hour' | 'day' | 'week' | 'month' | 'all';

/**
 * Time intervals for data points
 */
export type TimeInterval = 'minute' | 'hour' | 'day';

/**
 * Model metrics data structure
 */
export interface ModelMetrics {
  response_time: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  success_rate: number;
  request_count: number;
  token_usage: {
    input: number;
    output: number;
    total: number;
  };
  estimated_cost: number;
}

/**
 * Provider metrics data structure
 */
export interface ProviderMetrics {
  provider: string;
  models: {
    id: string;
    name: string;
    metrics: ModelMetrics;
  }[];
  total_requests: number;
  total_cost: number;
}

/**
 * Model comparison data structure
 */
export interface ModelComparison {
  models: {
    id: string;
    name: string;
    provider: string;
    available: boolean;
    metrics: ModelMetrics;
  }[];
}

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
}

/**
 * Time series data structure
 */
export interface TimeSeriesData {
  model_id: string;
  model_name: string;
  metric: MetricType;
  period: TimePeriod;
  interval: TimeInterval;
  data: TimeSeriesDataPoint[];
  statistics: {
    min: number;
    max: number;
    avg: number;
    total: number;
  };
}

/**
 * Usage record request
 */
export interface UsageRecordRequest {
  model_id: string;
  response_time: number;
  success: boolean;
  input_tokens?: number;
  output_tokens?: number;
}