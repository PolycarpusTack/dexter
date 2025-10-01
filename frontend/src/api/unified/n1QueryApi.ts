/**
 * N+1 Query API Client
 * 
 * This file provides API methods for the N+1 Query analyzer functionality.
 */

import enhancedApiClient from './enhancedApiClient';
import { handleApiError } from './errorHandler';
import { SentryEvent } from '../../types/sentry';

/**
 * Response from the N+1 Query analysis
 */
export interface N1QueryAnalysisResponse {
  success: boolean;
  analysis?: {
    timestamp: string;
    metadata: {
      execution_time_ms: number;
      parser_version: string;
      patterns_found: number;
      confidence_score: number;
    };
    visualization_data: {
      nodes: Array<{
        id: string;
        label: string;
        type: string;
        sql?: string;
        table?: string;
        query_type?: string;
        execution_time?: number;
        execution_count?: number;
        is_parent?: boolean;
        is_child?: boolean;
      }>;
      edges: Array<{
        source: string;
        target: string;
        label: string;
        weight?: number;
      }>;
      patterns: Array<{
        id: string;
        parent_query: string;
        child_queries: string[];
        total_time: number;
        optimized_time: number;
        savings_percentage: number;
        child_count: number;
      }>;
    };
    recommended_fix: string;
  };
  error?: string;
}

/**
 * Analyze an event for N+1 query patterns
 * 
 * @param eventId - The Sentry event ID to analyze
 * @param options - Optional configuration
 * @returns Analysis results with visualization data and recommendations
 */
export const analyzeN1Query = async (
  eventId: string,
  options?: { useEnhancedAnalysis?: boolean }
): Promise<N1QueryAnalysisResponse> => {
  try {
    const useEnhanced = options?.useEnhancedAnalysis ? '?use_enhanced=true' : '';
    const response = await enhancedApiClient.get<N1QueryAnalysisResponse>(
      `/api/v1/n-plus-one/analyze/${eventId}${useEnhanced}`
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'Error analyzing N+1 query pattern');
    return {
      success: false,
      error: 'Failed to analyze N+1 query pattern'
    };
  }
};

/**
 * Directly analyze event data for N+1 query patterns
 * 
 * @param eventData - The Sentry event data to analyze
 * @param options - Optional configuration
 * @returns Analysis results with visualization data and recommendations
 */
export const analyzeN1QueryData = async (
  eventData: SentryEvent,
  options?: { useEnhancedAnalysis?: boolean }
): Promise<N1QueryAnalysisResponse> => {
  try {
    const useEnhanced = options?.useEnhancedAnalysis ? '?use_enhanced=true' : '';
    const response = await enhancedApiClient.post<N1QueryAnalysisResponse>(
      `/api/v1/n-plus-one/analyze${useEnhanced}`,
      eventData
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'Error analyzing N+1 query pattern');
    return {
      success: false,
      error: 'Failed to analyze N+1 query pattern'
    };
  }
};

/**
 * Export N+1 query visualization as SVG
 * 
 * @param eventId - The Sentry event ID
 * @param svgElement - The SVG element to export
 * @returns Success status
 */
export const exportN1QuerySVG = async (
  eventId: string,
  svgElement: SVGElement
): Promise<{ success: boolean }> => {
  try {
    // Get the SVG content as a string
    const svgContent = new XMLSerializer().serializeToString(svgElement);
    
    // Create a Blob from the SVG content
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    
    // Create a File object
    const file = new File([blob], `n1-query-${eventId}.svg`, { type: 'image/svg+xml' });
    
    // Create FormData and append the file
    const formData = new FormData();
    formData.append('file', file);
    
    // Upload the file
    await enhancedApiClient.post(`/api/v1/n-plus-one/export/${eventId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return { success: true };
  } catch (error) {
    handleApiError(error, 'Error exporting N+1 query visualization');
    return { success: false };
  }
};

// Export default object for convenience
export default {
  analyzeN1Query,
  analyzeN1QueryData,
  exportN1QuerySVG
};