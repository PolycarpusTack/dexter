// frontend/src/api/enhancedDeadlockApi.ts

import { apiClient } from './apiClient';
import { 
  AnalyzeDeadlockOptions, 
  DeadlockAnalysisResponse 
} from '../types/deadlock';
import { 
  validateDeadlockAnalysisResponse, 
  safeValidateDeadlockAnalysisResponse 
} from '../schemas/deadlockSchemas';

/**
 * Base API path for deadlock analyzers
 */
const ANALYZERS_BASE_PATH = '/api/analyzers';

/**
 * Analyze a deadlock from a Sentry event
 * 
 * @param eventId Sentry event ID
 * @param options Analysis options
 * @returns Deadlock analysis response
 */
export async function analyzeDeadlock(
  eventId: string, 
  options: AnalyzeDeadlockOptions = {}
): Promise<DeadlockAnalysisResponse> {
  const { 
    useEnhancedAnalysis = true, 
    apiPath = 'analyzers' 
  } = options;
  
  const path = useEnhancedAnalysis 
    ? `${ANALYZERS_BASE_PATH}/enhanced-deadlock/${eventId}` 
    : `${ANALYZERS_BASE_PATH}/deadlock/${eventId}`;
  
  try {
    const response = await apiClient.get(path);
    
    // Validate the response with zod schema
    return validateDeadlockAnalysisResponse(response.data);
  } catch (error) {
    console.error('Error analyzing deadlock:', error);
    
    // Check if the error is from validation or API
    if ((error as Error).message === 'Invalid deadlock analysis response format') {
      throw new Error('The server returned an invalid response format. Please try again or use a different analyzer.');
    }
    
    throw error;
  }
}

/**
 * Export a deadlock visualization as SVG
 * 
 * @param eventId Sentry event ID
 * @param svgElement SVG element to export
 * @returns Success response
 */
export async function exportDeadlockSVG(
  eventId: string, 
  svgElement: SVGElement
): Promise<{ success: boolean }> {
  try {
    // Get SVG content
    const svgContent = new XMLSerializer().serializeToString(svgElement);
    
    // Create a Blob from the SVG content
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('svg', blob, `deadlock-${eventId}.svg`);
    formData.append('eventId', eventId);
    
    // Optional: Upload to server
    // const response = await apiClient.post(`${ANALYZERS_BASE_PATH}/export/svg`, formData);
    // return response.data;
    
    // For now, just trigger a client-side download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deadlock-${eventId}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Error exporting SVG:', error);
    throw error;
  }
}

/**
 * Get the history of deadlock analyses for an event
 * 
 * @param eventId Sentry event ID
 * @returns Array of analysis history entries
 */
export async function getDeadlockHistory(eventId: string): Promise<any[]> {
  try {
    const response = await apiClient.get(`${ANALYZERS_BASE_PATH}/deadlock/${eventId}/history`);
    return response.data.history || [];
  } catch (error) {
    console.error('Error fetching deadlock history:', error);
    throw error;
  }
}
