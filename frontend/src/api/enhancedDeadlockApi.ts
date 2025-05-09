// File: src/api/enhancedDeadlockApi.ts

import apiClient from './apiClient';
import { 
  DeadlockAnalysisResponse, 
  AnalyzeDeadlockOptions 
} from '../types/deadlock';
import { createErrorHandler } from '../utils/errorHandling';

// Error handler for deadlock API
const handleDeadlockError = createErrorHandler('Deadlock Analysis Error', {
  context: { apiModule: 'enhancedDeadlockApi' }
});

/**
 * Analyze a PostgreSQL deadlock from an event
 * 
 * @param eventId - Event ID to analyze
 * @param options - Analysis options
 * @returns Promise with deadlock analysis data
 */
export const analyzeDeadlock = async (
  eventId: string,
  options: AnalyzeDeadlockOptions = {}
): Promise<DeadlockAnalysisResponse> => {
  const { useEnhancedAnalysis = true } = options;
  
  try {
    return await apiClient.get<DeadlockAnalysisResponse>(
      `/analyze/deadlock/${eventId}`,
      { 
        params: { 
          enhanced: useEnhancedAnalysis 
        } 
      }
    );
  } catch (error) {
    handleDeadlockError(error, {
      operation: 'analyzeDeadlock',
      eventId,
      options
    });
    throw error;
  }
};

/**
 * Export deadlock visualization as SVG
 * 
 * @param eventId - Event ID for the visualization
 * @param svgElement - SVG element to export
 * @returns Promise resolving when export completes
 */
export const exportDeadlockSVG = async (
  eventId: string,
  svgElement: SVGElement
): Promise<void> => {
  try {
    // Clone SVG element to add export attributes
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    
    // Set attributes needed for standalone SVG
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('width', svgElement.clientWidth.toString());
    svgClone.setAttribute('height', svgElement.clientHeight.toString());
    
    // Create appropriate filename
    const filename = `deadlock-${eventId.substring(0, 8)}.svg`;
    
    // Convert to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    
    // Create blob and download link
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    handleDeadlockError(error, {
      operation: 'exportDeadlockSVG',
      eventId
    });
    throw error;
  }
};

export default {
  analyzeDeadlock,
  exportDeadlockSVG
};
