/**
 * React Query hooks for the Analyzers API
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import analyzersApi from '../analyzersApi';
import type { 
  AnalyzerType, 
  AnalysisResult, 
  AnalyzeEventRequest, 
  AnalyzeEventResponse,
  AnalyzerCapabilities 
} from '../../../types/analyzers';
import type { DeadlockAnalysisOptions, DeadlockAnalysisResponse } from '../analyzersApi';

/**
 * Query key factory for analyzers
 */
export const analyzerKeys = {
  all: ['analyzers'] as const,
  lists: () => [...analyzerKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...analyzerKeys.lists(), filters] as const,
  details: () => [...analyzerKeys.all, 'detail'] as const,
  detail: (type: AnalyzerType) => [...analyzerKeys.details(), type] as const,
  health: () => [...analyzerKeys.all, 'health'] as const,
  metrics: () => [...analyzerKeys.all, 'metrics'] as const,
  analysis: (eventId: string) => [...analyzerKeys.all, 'analysis', eventId] as const,
  deadlock: (eventId: string) => [...analyzerKeys.all, 'deadlock', eventId] as const,
  patterns: () => [...analyzerKeys.all, 'patterns'] as const,
  matrix: () => [...analyzerKeys.all, 'matrix'] as const,
};

/**
 * Hook to list all available analyzers
 */
export const useListAnalyzers = (
  options?: UseQueryOptions<AnalyzerCapabilities[], Error>
) => {
  return useQuery({
    queryKey: analyzerKeys.lists(),
    queryFn: () => analyzersApi.listAnalyzers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options
  });
};

/**
 * Hook to get capabilities for a specific analyzer
 */
export const useAnalyzerCapabilities = (
  analyzerType: AnalyzerType,
  options?: UseQueryOptions<AnalyzerCapabilities | null, Error>
) => {
  return useQuery({
    queryKey: analyzerKeys.detail(analyzerType),
    queryFn: () => analyzersApi.getAnalyzerCapabilities(analyzerType),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options
  });
};

/**
 * Hook to analyze an event
 */
export const useAnalyzeEvent = (
  options?: UseMutationOptions<AnalyzeEventResponse | null, Error, AnalyzeEventRequest>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: AnalyzeEventRequest) => analyzersApi.analyzeEvent(request),
    onSuccess: (data, variables) => {
      if (data) {
        // Invalidate any cached analysis for this event
        queryClient.invalidateQueries({
          queryKey: analyzerKeys.analysis(variables.event_data.id)
        });
      }
    },
    ...options
  });
};

/**
 * Hook to analyze with a specific analyzer
 */
export const useAnalyzeWithSpecificAnalyzer = (
  options?: UseMutationOptions<AnalysisResult | null, Error, { analyzerType: AnalyzerType; eventData: Record<string, any> }>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ analyzerType, eventData }) => 
      analyzersApi.analyzeWithSpecificAnalyzer(analyzerType, eventData),
    onSuccess: (data, variables) => {
      if (data) {
        // Invalidate any cached analysis for this event
        queryClient.invalidateQueries({
          queryKey: analyzerKeys.analysis(variables.eventData.id)
        });
      }
    },
    ...options
  });
};

/**
 * Hook to get analyzer health status
 */
export const useAnalyzerHealth = (
  options?: UseQueryOptions<{
    healthy: boolean;
    registry_status: Record<string, any>;
    orchestrator_status: Record<string, any>;
  } | null, Error>
) => {
  return useQuery({
    queryKey: analyzerKeys.health(),
    queryFn: () => analyzersApi.getAnalyzerHealth(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    ...options
  });
};

/**
 * Hook to get analyzer metrics
 */
export const useAnalyzerMetrics = (
  options?: UseQueryOptions<Record<string, any> | null, Error>
) => {
  return useQuery({
    queryKey: analyzerKeys.metrics(),
    queryFn: () => analyzersApi.getAnalyzerMetrics(),
    staleTime: 30 * 1000, // 30 seconds
    ...options
  });
};

/**
 * Hook to clear analyzer cache
 */
export const useClearAnalyzerCache = (
  options?: UseMutationOptions<{ success: boolean; message: string } | null, Error, string | undefined>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (eventId?: string) => analyzersApi.clearAnalyzerCache(eventId),
    onSuccess: (data, eventId) => {
      if (data?.success) {
        if (eventId) {
          // Clear specific event cache
          queryClient.removeQueries({
            queryKey: analyzerKeys.analysis(eventId)
          });
        } else {
          // Clear all analyzer caches
          queryClient.removeQueries({
            queryKey: analyzerKeys.all
          });
        }
      }
    },
    ...options
  });
};

/**
 * Hook to analyze deadlock (legacy)
 */
export const useAnalyzeDeadlock = (
  eventId: string,
  options?: DeadlockAnalysisOptions & UseQueryOptions<DeadlockAnalysisResponse, Error>
) => {
  return useQuery({
    queryKey: analyzerKeys.deadlock(eventId),
    queryFn: () => analyzersApi.analyzeDeadlock(eventId, options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options
  });
};

/**
 * Hook to get deadlock patterns
 */
export const useDeadlockPatterns = (
  options?: UseQueryOptions<{ success: boolean; patterns: any[] }, Error>
) => {
  return useQuery({
    queryKey: analyzerKeys.patterns(),
    queryFn: () => analyzersApi.getDeadlockPatterns(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options
  });
};

/**
 * Hook to get lock compatibility matrix
 */
export const useLockCompatibilityMatrix = (
  options?: UseQueryOptions<{ success: boolean; matrix: Record<string, Record<string, boolean>> }, Error>
) => {
  return useQuery({
    queryKey: analyzerKeys.matrix(),
    queryFn: () => analyzersApi.getLockCompatibilityMatrix(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options
  });
};

// Export all hooks
export default {
  useListAnalyzers,
  useAnalyzerCapabilities,
  useAnalyzeEvent,
  useAnalyzeWithSpecificAnalyzer,
  useAnalyzerHealth,
  useAnalyzerMetrics,
  useClearAnalyzerCache,
  useAnalyzeDeadlock,
  useDeadlockPatterns,
  useLockCompatibilityMatrix
};