/**
 * Metrics API Client
 * 
 * This module provides functions for retrieving AI model performance metrics,
 * including response times, success rates, token usage, and cost tracking.
 */

import { enhancedApiClient } from './enhancedApiClient';
import type { 
  MetricType, 
  TimePeriod, 
  TimeInterval, 
  ModelMetrics,
  TimeSeriesData,
  ModelComparison,
  UsageRecordRequest 
} from '../../types/metrics';

// API endpoints
const METRICS_ENDPOINTS = {
  modelMetrics: 'metrics/models/:modelId',
  modelMetricsByPeriod: 'metrics/models/:modelId/period/:period',
  timeSeriesData: 'metrics/models/:modelId/series',
  providerMetrics: 'metrics/providers/:provider',
  compareModels: 'metrics/comparison',
  overallMetrics: 'metrics/overall',
  recordUsage: 'metrics/record'
};

/**
 * Get metrics for a specific model
 */
export const getModelMetrics = async (modelId: string): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'metrics',
    'modelMetrics',
    { modelId },
    {},
    undefined,
    { cache: 'stale-while-revalidate' }
  );
};

/**
 * Get metrics for a specific model over a time period
 */
export const getModelMetricsByPeriod = async (
  modelId: string,
  period: 'hour' | 'day' | 'week' | 'month' | 'all'
): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'metrics',
    'modelMetricsByPeriod',
    { modelId, period },
    {},
    undefined,
    { cache: 'stale-while-revalidate' }
  );
};

/**
 * Get time series data for a specific metric
 */
export const getTimeSeriesData = async (
  modelId: string,
  metric: 'response_time' | 'success_rate' | 'request_count' | 'token_usage',
  period: 'hour' | 'day' | 'week' | 'month' | 'all' = 'day',
  interval: 'minute' | 'hour' | 'day' = 'hour'
): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'metrics',
    'timeSeriesData',
    { modelId },
    { metric, period, interval },
    undefined,
    { cache: 'stale-while-revalidate' }
  );
};

/**
 * Get metrics for a specific provider
 */
export const getProviderMetrics = async (provider: string): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'metrics',
    'providerMetrics',
    { provider },
    {},
    undefined,
    { cache: 'stale-while-revalidate' }
  );
};

/**
 * Compare metrics for multiple models
 */
export const compareModels = async (modelIds: string[]): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'metrics',
    'compareModels',
    {},
    { model_ids: modelIds.join(',') },
    undefined,
    { cache: 'stale-while-revalidate' }
  );
};

/**
 * Get overall metrics for all models and providers
 */
export const getOverallMetrics = async (): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'metrics',
    'overallMetrics',
    {},
    {},
    undefined,
    { cache: 'stale-while-revalidate' }
  );
};

/**
 * Record usage metrics for a model
 * 
 * @param modelId - The ID of the model
 * @param data - Usage data to record (response_time, success, tokens)
 * @returns Promise with the operation result
 */
export const recordUsage = async (
  modelId: string,
  data: Omit<UsageRecordRequest, 'model_id'>
): Promise<{ success: boolean }> => {
  return enhancedApiClient.callEndpoint(
    'metrics',
    'recordUsage',
    {},
    {},
    {
      model_id: modelId,
      ...data
    }
  );
};

// Export all metrics API functions as an object
export const metricsApi = {
  getModelMetrics,
  getModelMetricsByPeriod,
  getTimeSeriesData,
  getProviderMetrics,
  compareModels,
  getOverallMetrics,
  recordUsage
};

export default metricsApi;