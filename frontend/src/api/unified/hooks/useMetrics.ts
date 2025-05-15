/**
 * Metrics API Hooks
 * 
 * This module provides React Query hooks for retrieving and visualizing
 * AI model performance metrics.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getModelMetrics,
  getModelMetricsByPeriod,
  getTimeSeriesData,
  getProviderMetrics,
  compareModels,
  getOverallMetrics,
  recordUsage
} from '../metricsApi';
import { showErrorNotification } from '../errorHandler';

// Query keys for metrics data
export const metricsKeys = {
  model: (modelId: string) => ['metrics', 'model', modelId],
  modelPeriod: (modelId: string, period: string) => ['metrics', 'model', modelId, period],
  timeSeries: (modelId: string, metric: string, period: string, interval: string) => 
    ['metrics', 'timeSeries', modelId, metric, period, interval],
  provider: (provider: string) => ['metrics', 'provider', provider],
  comparison: (modelIds: string[]) => ['metrics', 'comparison', ...modelIds],
  overall: () => ['metrics', 'overall'],
};

/**
 * Hook for fetching metrics for a specific model
 */
export const useModelMetrics = (
  modelId: string,
  options: {
    enabled?: boolean;
    refetchInterval?: number;
  } = {}
) => {
  return useQuery({
    queryKey: metricsKeys.model(modelId),
    queryFn: () => getModelMetrics(modelId),
    enabled: options.enabled !== false && !!modelId,
    refetchInterval: options.refetchInterval,
    onError: (error) => {
      showErrorNotification({
        title: 'Error fetching model metrics',
        message: `Failed to fetch metrics for ${modelId}`,
        error: error instanceof Error ? error : undefined
      });
    }
  });
};

/**
 * Hook for fetching metrics for a specific model over a time period
 */
export const useModelMetricsByPeriod = (
  modelId: string,
  period: 'hour' | 'day' | 'week' | 'month' | 'all',
  options: {
    enabled?: boolean;
    refetchInterval?: number;
  } = {}
) => {
  return useQuery({
    queryKey: metricsKeys.modelPeriod(modelId, period),
    queryFn: () => getModelMetricsByPeriod(modelId, period),
    enabled: options.enabled !== false && !!modelId,
    refetchInterval: options.refetchInterval,
    onError: (error) => {
      showErrorNotification({
        title: 'Error fetching model metrics',
        message: `Failed to fetch ${period} metrics for ${modelId}`,
        error: error instanceof Error ? error : undefined
      });
    }
  });
};

/**
 * Hook for fetching time series data for a specific metric
 */
export const useTimeSeriesData = (
  modelId: string,
  metric: 'response_time' | 'success_rate' | 'request_count' | 'token_usage',
  period: 'hour' | 'day' | 'week' | 'month' | 'all' = 'day',
  interval: 'minute' | 'hour' | 'day' = 'hour',
  options: {
    enabled?: boolean;
    refetchInterval?: number;
  } = {}
) => {
  return useQuery({
    queryKey: metricsKeys.timeSeries(modelId, metric, period, interval),
    queryFn: () => getTimeSeriesData(modelId, metric, period, interval),
    enabled: options.enabled !== false && !!modelId,
    refetchInterval: options.refetchInterval,
    onError: (error) => {
      showErrorNotification({
        title: 'Error fetching time series data',
        message: `Failed to fetch ${metric} data for ${modelId}`,
        error: error instanceof Error ? error : undefined
      });
    }
  });
};

/**
 * Hook for fetching metrics for a specific provider
 */
export const useProviderMetrics = (
  provider: string,
  options: {
    enabled?: boolean;
    refetchInterval?: number;
  } = {}
) => {
  return useQuery({
    queryKey: metricsKeys.provider(provider),
    queryFn: () => getProviderMetrics(provider),
    enabled: options.enabled !== false && !!provider,
    refetchInterval: options.refetchInterval,
    onError: (error) => {
      showErrorNotification({
        title: 'Error fetching provider metrics',
        message: `Failed to fetch metrics for ${provider} provider`,
        error: error instanceof Error ? error : undefined
      });
    }
  });
};

/**
 * Hook for comparing metrics for multiple models
 */
export const useModelComparison = (
  modelIds: string[],
  options: {
    enabled?: boolean;
    refetchInterval?: number;
  } = {}
) => {
  return useQuery({
    queryKey: metricsKeys.comparison(modelIds),
    queryFn: () => compareModels(modelIds),
    enabled: options.enabled !== false && modelIds.length > 0,
    refetchInterval: options.refetchInterval,
    onError: (error) => {
      showErrorNotification({
        title: 'Error comparing models',
        message: 'Failed to fetch comparison data',
        error: error instanceof Error ? error : undefined
      });
    }
  });
};

/**
 * Hook for fetching overall metrics for all models and providers
 */
export const useOverallMetrics = (
  options: {
    enabled?: boolean;
    refetchInterval?: number;
  } = {}
) => {
  return useQuery({
    queryKey: metricsKeys.overall(),
    queryFn: () => getOverallMetrics(),
    enabled: options.enabled !== false,
    refetchInterval: options.refetchInterval,
    onError: (error) => {
      showErrorNotification({
        title: 'Error fetching overall metrics',
        message: 'Failed to fetch overall AI performance metrics',
        error: error instanceof Error ? error : undefined
      });
    }
  });
};

/**
 * Hook for recording usage metrics for a model
 */
export const useRecordUsage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ modelId, data }: { 
      modelId: string; 
      data: { 
        response_time: number; 
        success: boolean; 
        input_tokens?: number; 
        output_tokens?: number; 
      } 
    }) => recordUsage(modelId, data),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: metricsKeys.model(variables.modelId)
      });
      queryClient.invalidateQueries({
        queryKey: metricsKeys.overall()
      });
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Error recording metrics',
        message: 'Failed to record model usage metrics',
        error: error instanceof Error ? error : undefined
      });
    }
  });
};

// Export all hooks
export default {
  useModelMetrics,
  useModelMetricsByPeriod,
  useTimeSeriesData,
  useProviderMetrics,
  useModelComparison,
  useOverallMetrics,
  useRecordUsage
};