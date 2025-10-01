/**
 * Memory Leak React Query Hooks
 * 
 * This file provides React Query hooks for the Memory Leak analyzer functionality
 * using the unified analyzer framework.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  analyzeMemoryLeak, 
  analyzeMemoryLeakData, 
  exportMemoryLeakSVG,
  getMemoryLeakAnalysis,
  uploadHeapSnapshot,
  getMemoryLeakCapabilities,
  reanalyzeMemoryLeak
} from '../memoryLeakApi';
import { showErrorNotification } from '../errorHandler';

/**
 * Hook to analyze an event for memory leaks using the unified analyzer framework
 * 
 * @param eventId - The Sentry event ID to analyze
 * @param options - Options for the analysis
 * @returns Mutation for analyzing the event
 */
export const useAnalyzeMemoryLeak = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      eventId, 
      options 
    }: { 
      eventId: string; 
      options?: { 
        useEnhancedAnalysis?: boolean;
        enableAiRecommendations?: boolean;
        enableMlDetection?: boolean;
      }
    }) => analyzeMemoryLeak(eventId, options),
    onSuccess: (data, variables) => {
      // Update cache with new analysis results
      queryClient.setQueryData(['memory-leak-analysis', variables.eventId], data);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['memory-leak'] });
    },
    onError: (error: any) => {
      showErrorNotification('Memory Leak Analysis Error', error);
    }
  });
};

/**
 * Hook to get existing memory leak analysis results
 * 
 * @param eventId - The Sentry event ID
 * @param enabled - Whether the query should be enabled
 * @returns Query result with analysis data
 */
export const useMemoryLeakAnalysis = (
  eventId: string | null | undefined,
  enabled = true
) => {
  return useQuery({
    queryKey: ['memory-leak-analysis', eventId],
    queryFn: () => eventId ? getMemoryLeakAnalysis(eventId) : null,
    enabled: enabled && Boolean(eventId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (analysis not found)
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    },
    onError: (error: any) => {
      // Only show error notification if it's not a 404
      if (error?.response?.status !== 404) {
        showErrorNotification('Memory Leak Analysis Error', error);
      }
    }
  });
};

/**
 * Hook for analyzing event data directly for memory leaks
 * 
 * @returns Mutation for analyzing event data
 */
export const useMemoryLeakDataAnalysis = () => {
  return useMutation({
    mutationFn: ({
      eventData,
      useEnhancedAnalysis = false
    }: {
      eventData: any;
      useEnhancedAnalysis?: boolean;
    }) => {
      return analyzeMemoryLeakData(eventData, { useEnhancedAnalysis });
    },
    onError: (error: any) => {
      showErrorNotification('Memory Leak Analysis Error', error);
    }
  });
};

/**
 * Hook to upload heap snapshot files
 */
export const useUploadHeapSnapshot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      eventId, 
      heapSnapshot, 
      format 
    }: { 
      eventId: string; 
      heapSnapshot: File | Blob; 
      format?: 'v8' | 'javascriptcore' | 'spidermonkey' 
    }) => uploadHeapSnapshot(eventId, heapSnapshot, format),
    onSuccess: (data, variables) => {
      // Invalidate analysis queries for this event
      queryClient.invalidateQueries({ queryKey: ['memory-leak-analysis', variables.eventId] });
    },
    onError: (error: any) => {
      showErrorNotification('Upload Error', error);
    }
  });
};

/**
 * Hook to get memory leak analyzer capabilities
 */
export const useMemoryLeakCapabilities = () => {
  return useQuery({
    queryKey: ['memory-leak-capabilities'],
    queryFn: getMemoryLeakCapabilities,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    onError: (error: any) => {
      showErrorNotification('Capabilities Error', error);
    }
  });
};

/**
 * Hook to re-analyze an event with updated parameters
 */
export const useReanalyzeMemoryLeak = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      eventId, 
      options 
    }: { 
      eventId: string; 
      options?: {
        enableAiRecommendations?: boolean;
        enableMlDetection?: boolean;
        forceRefresh?: boolean;
      }
    }) => reanalyzeMemoryLeak(eventId, options),
    onSuccess: (data, variables) => {
      // Update the cache with new analysis results
      queryClient.setQueryData(['memory-leak-analysis', variables.eventId], data);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['memory-leak'] });
    },
    onError: (error: any) => {
      showErrorNotification('Re-analysis Error', error);
    }
  });
};

/**
 * Hook for exporting memory leak visualization as SVG
 * 
 * @returns Mutation for exporting SVG
 */
export const useExportMemoryLeakSVG = () => {
  return useMutation({
    mutationFn: ({
      eventId,
      svgElement
    }: {
      eventId: string;
      svgElement: SVGElement;
    }) => {
      return exportMemoryLeakSVG(eventId, svgElement);
    },
    onError: (error: any) => {
      showErrorNotification('Export Error', error);
    }
  });
};

/**
 * Combined hook for memory leak analysis workflow
 */
export const useMemoryLeakWorkflow = (eventId: string) => {
  const analyze = useAnalyzeMemoryLeak();
  const reanalyze = useReanalyzeMemoryLeak();
  const upload = useUploadHeapSnapshot();
  const exportSvg = useExportMemoryLeakSVG();
  const capabilities = useMemoryLeakCapabilities();
  
  // Get current analysis if available
  const { data: analysis, isLoading, error } = useMemoryLeakAnalysis(eventId);
  
  return {
    // Data
    analysis,
    capabilities: capabilities.data,
    
    // Loading states
    isLoading,
    isAnalyzing: analyze.isPending || reanalyze.isPending,
    isUploading: upload.isPending,
    isExporting: exportSvg.isPending,
    
    // Error states
    error,
    analyzeError: analyze.error,
    reanalyzeError: reanalyze.error,
    uploadError: upload.error,
    exportError: exportSvg.error,
    
    // Actions
    analyzeEvent: (options?: { 
      useEnhancedAnalysis?: boolean;
      enableAiRecommendations?: boolean;
      enableMlDetection?: boolean;
    }) => analyze.mutate({ eventId, options }),
    
    reanalyzeEvent: (options?: {
      enableAiRecommendations?: boolean;
      enableMlDetection?: boolean;
      forceRefresh?: boolean;
    }) => reanalyze.mutate({ eventId, options }),
    
    uploadSnapshot: (heapSnapshot: File | Blob, format?: 'v8' | 'javascriptcore' | 'spidermonkey') => 
      upload.mutate({ eventId, heapSnapshot, format }),
    
    exportVisualization: (svgElement: SVGElement) => 
      exportSvg.mutate({ eventId, svgElement }),
    
    // Success indicators
    analyzeSuccess: analyze.isSuccess,
    reanalyzeSuccess: reanalyze.isSuccess,
    uploadSuccess: upload.isSuccess,
    exportSuccess: exportSvg.isSuccess
  };
};