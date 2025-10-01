/**
 * N+1 Query React Query Hooks
 * 
 * This file provides React Query hooks for the N+1 Query analyzer functionality
 * using the unified analyzer framework.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  analyzeN1Query, 
  analyzeN1QueryData, 
  exportN1QuerySVG,
  type N1QueryAnalysisResponse
} from '../n1QueryApi';
import { showErrorNotification } from '../errorHandler';
import { SentryEvent } from '../../types/sentry';

/**
 * Hook to analyze an event for N+1 query patterns using the unified analyzer framework
 * 
 * @returns Mutation for analyzing the event
 */
export const useAnalyzeN1Query = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      eventId, 
      options 
    }: { 
      eventId: string; 
      options?: { 
        useEnhancedAnalysis?: boolean;
      }
    }) => analyzeN1Query(eventId, options),
    onSuccess: (data, variables) => {
      // Update cache with new analysis results
      queryClient.setQueryData(['n1-query-analysis', variables.eventId], data);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['n1-query'] });
    },
    onError: (error: Error | unknown) => {
      showErrorNotification('N+1 Query Analysis Error', error);
    }
  });
};

/**
 * Hook to get existing N+1 query analysis results
 * 
 * @param eventId - The Sentry event ID
 * @param enabled - Whether the query should be enabled
 * @returns Query result with analysis data
 */
export const useN1QueryAnalysis = (
  eventId: string | null | undefined,
  enabled = true
) => {
  return useQuery({
    queryKey: ['n1-query-analysis', eventId],
    queryFn: async (): Promise<N1QueryAnalysisResponse | null> => {
      if (!eventId) return null;
      
      // First try to analyze the event
      const result = await analyzeN1Query(eventId);
      
      // If analysis was successful, return the result
      if (result.success && result.analysis) {
        return result;
      }
      
      // Otherwise return null to indicate no analysis available
      return null;
    },
    enabled: enabled && Boolean(eventId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: Error | unknown) => {
      // Don't retry on 404 (analysis not found)
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });
};

/**
 * Hook for analyzing event data directly for N+1 query patterns
 * 
 * @returns Mutation for analyzing event data
 */
export const useN1QueryDataAnalysis = () => {
  return useMutation({
    mutationFn: ({
      eventData,
      useEnhancedAnalysis = false
    }: {
      eventData: SentryEvent;
      useEnhancedAnalysis?: boolean;
    }) => {
      return analyzeN1QueryData(eventData, { useEnhancedAnalysis });
    },
    onError: (error: Error | unknown) => {
      showErrorNotification('N+1 Query Analysis Error', error);
    }
  });
};

/**
 * Hook for exporting N+1 query visualization as SVG
 * 
 * @returns Mutation for exporting SVG
 */
export const useExportN1QuerySVG = () => {
  return useMutation({
    mutationFn: ({
      eventId,
      svgElement
    }: {
      eventId: string;
      svgElement: SVGElement;
    }) => {
      return exportN1QuerySVG(eventId, svgElement);
    },
    onError: (error: Error | unknown) => {
      showErrorNotification('Export Error', error);
    }
  });
};

/**
 * Combined hook for N+1 query analysis workflow
 */
export const useN1QueryWorkflow = (eventId: string) => {
  const analyze = useAnalyzeN1Query();
  const exportSvg = useExportN1QuerySVG();
  
  // Get current analysis if available
  const { data: analysis, isLoading, error } = useN1QueryAnalysis(eventId);
  
  return {
    // Data
    analysis: analysis?.analysis,
    patterns: analysis?.analysis?.visualization_data?.patterns || [],
    nodes: analysis?.analysis?.visualization_data?.nodes || [],
    edges: analysis?.analysis?.visualization_data?.edges || [],
    recommendedFix: analysis?.analysis?.recommended_fix,
    metadata: analysis?.analysis?.metadata,
    
    // Loading states
    isLoading,
    isAnalyzing: analyze.isPending,
    isExporting: exportSvg.isPending,
    
    // Error states
    error,
    analyzeError: analyze.error,
    exportError: exportSvg.error,
    
    // Actions
    analyzeEvent: (options?: { 
      useEnhancedAnalysis?: boolean;
    }) => analyze.mutate({ eventId, options }),
    
    exportVisualization: (svgElement: SVGElement) => 
      exportSvg.mutate({ eventId, svgElement }),
    
    // Success indicators
    analyzeSuccess: analyze.isSuccess,
    exportSuccess: exportSvg.isSuccess,
    
    // Computed properties
    hasAnalysis: Boolean(analysis?.analysis),
    hasPatterns: (analysis?.analysis?.visualization_data?.patterns?.length || 0) > 0,
    totalPatterns: analysis?.analysis?.metadata?.patterns_found || 0,
    confidenceScore: analysis?.analysis?.metadata?.confidence_score || 0,
    potentialSavings: analysis?.analysis?.visualization_data?.patterns?.reduce(
      (total, pattern) => total + pattern.savings_percentage,
      0
    ) || 0
  };
};

/**
 * Hook to analyze multiple events for N+1 query patterns
 */
export const useBatchN1QueryAnalysis = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      eventIds,
      options 
    }: { 
      eventIds: string[];
      options?: { useEnhancedAnalysis?: boolean };
    }) => {
      const results = await Promise.all(
        eventIds.map(eventId => analyzeN1Query(eventId, options))
      );
      return results;
    },
    onSuccess: (data, variables) => {
      // Update cache for each analyzed event
      data.forEach((result, index) => {
        if (result.success) {
          queryClient.setQueryData(
            ['n1-query-analysis', variables.eventIds[index]], 
            result
          );
        }
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['n1-query'] });
    },
    onError: (error: Error | unknown) => {
      showErrorNotification('Batch N+1 Query Analysis Error', error);
    }
  });
};