/**
 * Memory Leak API Client
 * 
 * This file provides API methods for the Memory Leak analyzer functionality
 * using the new unified analyzer framework.
 */

import enhancedApiClient from './enhancedApiClient';
import { handleApiError } from './errorHandler';

/**
 * Memory leak pattern types
 */
export interface LeakPattern {
  type: string;
  confidence: number;
  affected_objects: string[];
  total_retained_size: number;
  description: string;
  evidence: Record<string, any>;
}

/**
 * Object retention path for memory leak analysis
 */
export interface RetentionPath {
  object_id: string;
  path: Array<{
    object_id: string;
    type: string;
    name: string;
    size: number;
    property: string;
    step_index?: number;
  }>;
  retained_size: number;
  leak_probability: number;
}

/**
 * Memory leak analysis recommendation
 */
export interface MemoryLeakRecommendation {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  code_example?: string;
  tags: string[];
}

/**
 * Complete memory leak analysis from the new analyzer framework
 */
export interface MemoryLeakAnalysis {
  snapshot_id: string;
  timestamp: string;
  format: string;
  leaks_detected: LeakPattern[];
  growth_pattern: string;
  leak_score: number;
  retention_paths: RetentionPath[];
  recommendations: MemoryLeakRecommendation[];
  visualization_data?: {
    graphs: Array<{
      type: string;
      data: any;
    }>;
  };
  analysis_duration_ms: number;
  ml_confidence?: number;
  errors?: any[];
}

/**
 * Unified analyzer result format
 */
export interface AnalysisResult {
  analyzer_type: string;
  event_id: string;
  timestamp: string;
  is_detected: boolean;
  confidence: number;
  confidence_level: 'low' | 'medium' | 'high';
  findings: any[];
  recommendations: MemoryLeakRecommendation[];
  metadata: Record<string, any>;
  visualization_data?: {
    graphs: Array<{
      type: string;
      data: any;
    }>;
  };
}

/**
 * Response from the Memory Leak analysis (legacy format for compatibility)
 */
export interface MemoryLeakAnalysisResponse {
  success: boolean;
  analysis?: {
    timestamp: string;
    metadata: {
      execution_time_ms: number;
      parser_version: string;
      objects_analyzed: number;
      leaks_found: number;
      confidence_score: number;
    };
    visualization_data: {
      timestamps: string[];
      total_memory: number[];
      used_memory: number[];
      objects: Array<{
        name: string;
        counts: number[];
        sizes: number[];
      }>;
      leaking_objects: Array<{
        name: string;
        count: number;
        size_bytes: number;
        growth_rate: number;
        retention_paths: string[];
      }>;
    };
    recommended_fix: string;
  };
  error?: string;
}

/**
 * Analyze an event for memory leaks using the new analyzer framework
 * 
 * @param eventId - The Sentry event ID to analyze
 * @param options - Optional configuration
 * @returns Analysis results with visualization data and recommendations
 */
export const analyzeMemoryLeak = async (
  eventId: string,
  options?: { 
    useEnhancedAnalysis?: boolean;
    enableAiRecommendations?: boolean;
    enableMlDetection?: boolean;
  }
): Promise<AnalysisResult> => {
  try {
    // Use the unified analyzer framework endpoint
    const response = await enhancedApiClient.post<AnalysisResult>(
      `/api/v1/analyzers/analyze`,
      {
        event_id: eventId,
        analyzer_types: ['memory_leak'],
        force_refresh: true,
        options: {
          enable_ai_recommendations: options?.enableAiRecommendations ?? true,
          enable_ml_detection: options?.enableMlDetection ?? true,
          max_analysis_duration_seconds: 120
        }
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'Error analyzing memory leak');
    throw error;
  }
};

/**
 * Get memory leak analysis results (new format)
 * 
 * @param eventId - The Sentry event ID
 * @returns Analysis results in the new format
 */
export const getMemoryLeakAnalysis = async (
  eventId: string
): Promise<MemoryLeakAnalysis | null> => {
  try {
    const response = await enhancedApiClient.get<MemoryLeakAnalysis>(
      `/api/v1/memory-leak/analysis/${eventId}`
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    handleApiError(error, 'Error getting memory leak analysis');
    throw error;
  }
};

/**
 * Directly analyze event data for memory leaks
 * 
 * @param eventData - The Sentry event data to analyze
 * @param options - Optional configuration
 * @returns Analysis results with visualization data and recommendations
 */
export const analyzeMemoryLeakData = async (
  eventData: any,
  options?: { useEnhancedAnalysis?: boolean }
): Promise<MemoryLeakAnalysisResponse> => {
  try {
    const useEnhanced = options?.useEnhancedAnalysis ? '?use_enhanced=true' : '';
    const response = await enhancedApiClient.post<MemoryLeakAnalysisResponse>(
      `/api/v1/memory-leak/analyze${useEnhanced}`,
      eventData
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'Error analyzing memory leak');
    return {
      success: false,
      error: 'Failed to analyze memory leak'
    };
  }
};

/**
 * Export memory leak visualization as SVG
 * 
 * @param eventId - The Sentry event ID
 * @param svgElement - The SVG element to export
 * @returns Success status
 */
export const exportMemoryLeakSVG = async (
  eventId: string,
  svgElement: SVGElement
): Promise<{ success: boolean }> => {
  try {
    // Get the SVG content as a string
    const svgContent = new XMLSerializer().serializeToString(svgElement);
    
    // Create a Blob from the SVG content
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    
    // Create a File object
    const file = new File([blob], `memory-leak-${eventId}.svg`, { type: 'image/svg+xml' });
    
    // Create FormData and append the file
    const formData = new FormData();
    formData.append('file', file);
    
    // Upload the file
    await enhancedApiClient.post(`/api/v1/memory-leak/export/${eventId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return { success: true };
  } catch (error) {
    handleApiError(error, 'Error exporting memory leak visualization');
    return { success: false };
  }
};

/**
 * Upload a heap snapshot for analysis
 * 
 * @param eventId - The Sentry event ID
 * @param heapSnapshot - The heap snapshot file or blob
 * @param format - Optional format specification
 * @returns Upload result
 */
export const uploadHeapSnapshot = async (
  eventId: string,
  heapSnapshot: File | Blob,
  format?: 'v8' | 'javascriptcore' | 'spidermonkey'
): Promise<{ snapshot_id: string; status: string }> => {
  try {
    const formData = new FormData();
    formData.append('event_id', eventId);
    formData.append('heap_snapshot', heapSnapshot);
    
    if (format) {
      formData.append('format', format);
    }

    const response = await enhancedApiClient.post<{ snapshot_id: string; status: string }>(
      '/api/v1/memory-leak/upload-snapshot',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000 // 1 minute for upload
      }
    );

    return response.data;
  } catch (error) {
    handleApiError(error, 'Error uploading heap snapshot');
    throw error;
  }
};

/**
 * Get memory leak analyzer capabilities
 * 
 * @returns Analyzer capabilities and configuration
 */
export const getMemoryLeakCapabilities = async (): Promise<{
  analyzer_type: string;
  name: string;
  description: string;
  version: string;
  supported_platforms: string[];
  capabilities: Record<string, any>;
}> => {
  try {
    const response = await enhancedApiClient.get(
      '/api/v1/analyzers/capabilities?analyzer_type=memory_leak'
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'Error getting memory leak capabilities');
    throw error;
  }
};

/**
 * Re-analyze an event with updated parameters
 * 
 * @param eventId - The Sentry event ID to re-analyze
 * @param options - Analysis options
 * @returns Analysis results
 */
export const reanalyzeMemoryLeak = async (
  eventId: string,
  options?: {
    enableAiRecommendations?: boolean;
    enableMlDetection?: boolean;
    forceRefresh?: boolean;
  }
): Promise<AnalysisResult> => {
  try {
    const response = await enhancedApiClient.post<AnalysisResult>(
      `/api/v1/memory-leak/reanalyze/${eventId}`,
      {
        enable_ai_recommendations: options?.enableAiRecommendations ?? true,
        enable_ml_detection: options?.enableMlDetection ?? true,
        force_refresh: options?.forceRefresh ?? true
      },
      {
        timeout: 120000 // 2 minutes for re-analysis
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'Error re-analyzing memory leak');
    throw error;
  }
};

// Export default object for convenience
export default {
  analyzeMemoryLeak,
  analyzeMemoryLeakData,
  exportMemoryLeakSVG,
  getMemoryLeakAnalysis,
  uploadHeapSnapshot,
  getMemoryLeakCapabilities,
  reanalyzeMemoryLeak
};