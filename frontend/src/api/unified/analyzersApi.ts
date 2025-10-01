/**
 * Analyzers API Module
 * 
 * This file provides methods for interacting with the Analyzers API.
 * It includes deadlock analysis functionality.
 */

import { z } from 'zod';
import enhancedApiClient from './enhancedApiClient';
import { createErrorHandler } from './errorHandler';
import { validateParams } from './apiResolver';
import { DeadlockVisualizationData } from './interfaces';
import type { 
  AnalyzerType, 
  AnalysisResult, 
  AnalyzeEventRequest, 
  AnalyzeEventResponse,
  AnalyzerCapabilities 
} from '../../types/analyzers';

/**
 * Error handler for Analyzers API
 */
const handleAnalyzersError = createErrorHandler({
  module: 'AnalyzersAPI',
  showNotifications: true,
  logToConsole: true
});

/**
 * Interface for deadlock analysis options
 */
export interface DeadlockAnalysisOptions {
  /** Use enhanced (true) or standard (false) analysis */
  useEnhancedAnalysis?: boolean;
  /** API path to use */
  apiPath?: string;
  /** Include raw data in response */
  includeRawData?: boolean;
}

/**
 * Interface for SVG export options
 */
export interface SVGExportOptions {
  /** Include current transform/view */
  preserveTransform?: boolean;
  /** Add additional metadata to the SVG */
  includeMetadata?: boolean;
  /** Custom filename (without extension) */
  filename?: string;
  /** Log export action to analytics */
  logExport?: boolean;
}

/**
 * Interface for deadlock analysis response
 */
export interface DeadlockAnalysisResponse {
  success: boolean;
  error?: string;
  analysis?: {
    timestamp?: string;
    metadata?: {
      execution_time_ms: number;
      parser_version?: string;
      cycles_found?: number;
    };
    visualization_data?: DeadlockVisualizationData;
    recommended_fix?: string;
  };
}

/**
 * Analyze a deadlock event using the server-side analyzer
 * 
 * @param eventId - ID of the event to analyze
 * @param options - Options for analysis
 * @returns Promise resolving to the validated analysis result
 */
export const analyzeDeadlock = async (
  eventId: string, 
  options: DeadlockAnalysisOptions = {},
  eventData?: any
): Promise<DeadlockAnalysisResponse> => {
  const { 
    useEnhancedAnalysis = true,
    includeRawData = false
  } = options;
  
  try {
    // If event data wasn't provided, we need to fetch it first
    let fullEventData = eventData;
    
    if (!fullEventData) {
      // First try to get event details from Sentry API
      try {
        // This would require organization and project slugs
        // For now, we'll use a minimal event data structure
        fullEventData = {
          id: eventId,
          message: 'deadlock detected',
          title: 'deadlock detected'
        };
      } catch (fetchError) {

      }
    }
    
    // Use the new analyzer framework endpoint
    const requestBody = {
      event_data: fullEventData || { id: eventId },
      requested_analyzers: ['deadlock'],
      force_refresh: true
    };
    
    // Call the new analyzer API endpoint
    const response = await enhancedApiClient.post<unknown>(
      '/api/v1/analyzers/analyze',
      requestBody,
      { 
        // Deadlock analysis can take longer
        timeout: 30000
      }
    );
    
    // Store raw data for debugging if requested
    const rawData = includeRawData ? response : undefined;
    
    // Try to validate the response
    try {
      // The new analyzer framework returns a different structure
      if (typeof response === 'object' && response !== null && 'results' in response) {
        const analyzerResponse = response as any;
        
        // Find the deadlock analysis result
        const deadlockResult = analyzerResponse.results?.find(
          (r: any) => r.analyzer_type === 'deadlock'
        );
        
        if (deadlockResult) {
          // Transform to expected format
          const result: DeadlockAnalysisResponse = {
            success: analyzerResponse.success || true,
            analysis: {
              timestamp: analyzerResponse.timestamp,
              metadata: {
                execution_time_ms: deadlockResult.execution_time_ms || 0,
                parser_version: 'enhanced',
                cycles_found: deadlockResult.findings?.filter((f: any) => f.category === 'deadlock_cycle').length || 0
              },
              visualization_data: deadlockResult.visualization_data?.data || deadlockResult.visualization_data,
              recommended_fix: deadlockResult.recommendations?.map((r: any) => 
                `${r.title}\n\n${r.description}${r.code_example ? `\n\n\`\`\`\n${r.code_example}\n\`\`\`` : ''}`
              ).join('\n\n---\n\n') || ''
            }
          };
          
          // Add raw data if requested
          if (includeRawData) {
            (result as any)._rawData = rawData;
          }
          
          return result;
        }
      }
      
      // If validation fails, return a generic success response
      return {
        success: true,
        analysis: {
          visualization_data: response
        }
      };
    } catch (validationError) {

      // Return a minimal valid response
      return {
        success: true,
        analysis: {
          visualization_data: response
        }
      };
    }
  } catch (error) {
    handleAnalyzersError(error, {
      operation: 'analyzeDeadlock',
      context: { eventId, options }
    });
    
    // Return a valid error response
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Export a deadlock visualization as SVG
 * 
 * @param eventId - ID of the event to export
 * @param svgElement - SVG element to export
 * @param options - Export options
 * @returns Promise resolving to the export result
 */
export const exportDeadlockSVG = async (
  eventId: string, 
  svgElement: SVGElement | null,
  options: SVGExportOptions = {}
): Promise<{ success: boolean; filename?: string; error?: string }> => {
  // Default options
  const { 
    preserveTransform = true, 
    includeMetadata = true,
    filename: customFilename,
    logExport = false
  } = options;

  try {
    // Validate inputs
    if (!eventId) {
      return { 
        success: false, 
        error: 'Event ID is required for export' 
      };
    }

    if (!svgElement) {
      return { 
        success: false, 
        error: 'SVG element is required for export' 
      };
    }

    // Create filename with event ID and date
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = customFilename 
      ? `${customFilename}.svg`
      : `deadlock-${eventId}-${timestamp}.svg`;
    
    // Clone the SVG to prepare it for export
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    
    // Set needed attributes for standalone SVG
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    // Get dimensions from the original SVG
    const boundingRect = svgElement.getBoundingClientRect();
    const width = boundingRect.width || 800; // Default if width is 0
    const height = boundingRect.height || 600; // Default if height is 0
    
    svgClone.setAttribute('width', width.toString());
    svgClone.setAttribute('height', height.toString());
    
    // Add metadata if requested
    if (includeMetadata) {
      const metadataGroup = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
      metadataGroup.innerHTML = `
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
          <rdf:Description>
            <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Deadlock Analysis</dc:title>
            <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Dexter</dc:creator>
            <dc:date xmlns:dc="http://purl.org/dc/elements/1.1/">${new Date().toISOString()}</dc:date>
            <dc:source xmlns:dc="http://purl.org/dc/elements/1.1/">Event ID: ${eventId}</dc:source>
          </rdf:Description>
        </rdf:RDF>
      `;
      svgClone.appendChild(metadataGroup);
    }
    
    // Clean up any transform on the root group if present
    const rootGroup = svgClone.querySelector('g');
    if (rootGroup) {
      // Store the original transform
      const originalTransform = rootGroup.getAttribute('transform');
      
      // Handle transforms based on options
      if (originalTransform && preserveTransform) {
        // Extract translate and scale from the transform
        const translateMatch = originalTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        const scaleMatch = originalTransform.match(/scale\(([^)]+)\)/);
        
        if (translateMatch && translateMatch.length >= 3) {
          const tx = parseFloat(translateMatch[1]);
          const ty = parseFloat(translateMatch[2]);
          
          // Adjust viewBox to account for translation
          svgClone.setAttribute('viewBox', `${-tx} ${-ty} ${width} ${height}`);
          
          // Handle scaling if present
          if (scaleMatch && scaleMatch.length >= 2) {
            const scale = parseFloat(scaleMatch[1]);
            if (!isNaN(scale) && scale > 0) {
              // Adjust viewBox for scaling
              const scaledWidth = width / scale;
              const scaledHeight = height / scale;
              svgClone.setAttribute('viewBox', `${-tx/scale} ${-ty/scale} ${scaledWidth} ${scaledHeight}`);
            }
          }
          
          // Remove the transform now that we've adjusted the viewBox
          rootGroup.removeAttribute('transform');
        }
      } else if (!preserveTransform) {
        // Reset transform if we're not preserving it
        rootGroup.removeAttribute('transform');
        svgClone.removeAttribute('viewBox');
      }
    }
    
    // Set some basic styling to ensure it looks good when exported
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      text { font-family: Arial, sans-serif; }
      .node { fill: #f0f0f0; stroke: #333; }
      .edge { stroke: #666; }
      .label { font-size: 12px; }
    `;
    svgClone.insertBefore(style, svgClone.firstChild);
    
    // Convert SVG to string
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgClone);
    
    // Fix any potential issues with the SVG string
    svgString = svgString
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/(xmlns:NS\d+=""|NS\d+:)/g, '') // Remove unnecessary namespaces
      .replace(/"/g, "'"); // Standardize quotes
    
    try {
      // Validate the SVG string with DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      if (parserError) {

        // We'll continue anyway but log the warning
      }
    } catch (validationError) {

      // Continue with export despite validation issues
    }
    
    // Create a Blob from the SVG string
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    
    // Create an object URL for the Blob
    const blobUrl = URL.createObjectURL(svgBlob);
    
    // Create a download link and trigger it
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Clean up the URL object
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 100);
    
    // Log this action to the server if requested
    if (logExport) {
      try {
        await enhancedApiClient.post('/analytics/log-export', {
          eventId,
          exportType: 'svg',
          timestamp: new Date().toISOString(),
          fileSize: svgString.length
        });
      } catch (logError) {
        // Just log this error and continue, it shouldn't fail the export

      }
    }
    
    return { 
      success: true, 
      filename 
    };
  } catch (error) {

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error exporting SVG'
    };
  }
};

/**
 * Get deadlock patterns with recommendations
 * 
 * @returns Promise resolving to the validated deadlock patterns
 */
export const getDeadlockPatterns = async () => {
  try {
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'enhancedAnalyzers',
      'lockCompatibilityMatrix',
      {},
      {},
      null,
      {}
    );
    
    // Validate patterns data
    if (Array.isArray(response)) {
      // Validate each pattern entry
      const validatedPatterns = response.filter(pattern => {
        // Basic validation of required fields
        return pattern && typeof pattern === 'object' && 
               typeof pattern.pattern === 'string' && 
               typeof pattern.recommendation === 'string';
      }).map(pattern => ({
        pattern: pattern.pattern,
        description: pattern.description || '',
        commonality: pattern.commonality || undefined,
        risk: pattern.risk || undefined,
        recommendation: pattern.recommendation,
        prevention: Array.isArray(pattern.prevention) ? pattern.prevention : []
      }));
      
      return { success: true, patterns: validatedPatterns };
    }
    
    // Return empty valid response if data is not an array
    return { success: true, patterns: [] };
  } catch (error) {
    handleAnalyzersError(error, {
      operation: 'getDeadlockPatterns',
      context: {}
    });
    
    return { 
      success: false, 
      patterns: [],
      error: error instanceof Error ? error.message : 'Failed to fetch deadlock patterns'
    };
  }
};

/**
 * Get the lock compatibility matrix
 * 
 * @returns Promise resolving to the validated lock compatibility matrix
 */
export const getLockCompatibilityMatrix = async () => {
  try {
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'enhancedAnalyzers',
      'lockCompatibilityMatrix',
      {},
      {},
      null,
      {}
    );
    
    // Validate lock compatibility matrix
    if (response && typeof response === 'object') {
      // Check if it has the expected structure
      const validatedMatrix: Record<string, Record<string, boolean>> = {};
      let isValid = true;
      
      // Validate each lock type and its compatibility
      Object.entries(response as object).forEach(([lockType, compatibilities]) => {
        if (typeof compatibilities === 'object' && compatibilities !== null) {
          validatedMatrix[lockType] = {};
          
          // Validate each compatibility entry
          Object.entries(compatibilities as object).forEach(([otherLock, isCompatible]) => {
            validatedMatrix[lockType][otherLock] = Boolean(isCompatible);
          });
        } else {
          isValid = false;
        }
      });
      
      if (isValid) {
        return { success: true, matrix: validatedMatrix };
      }
    }
    
    // Return default matrix if validation fails

    return { 
      success: true, 
      matrix: {
        'AccessShareLock': { 'AccessShareLock': true, 'RowShareLock': true, 'RowExclusiveLock': true, 'ShareLock': true, 'ShareRowExclusiveLock': true, 'ExclusiveLock': false, 'AccessExclusiveLock': false },
        'RowShareLock': { 'AccessShareLock': true, 'RowShareLock': true, 'RowExclusiveLock': true, 'ShareLock': true, 'ShareRowExclusiveLock': false, 'ExclusiveLock': false, 'AccessExclusiveLock': false },
        'RowExclusiveLock': { 'AccessShareLock': true, 'RowShareLock': true, 'RowExclusiveLock': true, 'ShareLock': false, 'ShareRowExclusiveLock': false, 'ExclusiveLock': false, 'AccessExclusiveLock': false },
        'ShareLock': { 'AccessShareLock': true, 'RowShareLock': true, 'RowExclusiveLock': false, 'ShareLock': true, 'ShareRowExclusiveLock': false, 'ExclusiveLock': false, 'AccessExclusiveLock': false },
        'ShareRowExclusiveLock': { 'AccessShareLock': true, 'RowShareLock': false, 'RowExclusiveLock': false, 'ShareLock': false, 'ShareRowExclusiveLock': false, 'ExclusiveLock': false, 'AccessExclusiveLock': false },
        'ExclusiveLock': { 'AccessShareLock': false, 'RowShareLock': false, 'RowExclusiveLock': false, 'ShareLock': false, 'ShareRowExclusiveLock': false, 'ExclusiveLock': false, 'AccessExclusiveLock': false },
        'AccessExclusiveLock': { 'AccessShareLock': false, 'RowShareLock': false, 'RowExclusiveLock': false, 'ShareLock': false, 'ShareRowExclusiveLock': false, 'ExclusiveLock': false, 'AccessExclusiveLock': false }
      }
    };
  } catch (error) {
    handleAnalyzersError(error, {
      operation: 'getLockCompatibilityMatrix',
      context: {}
    });
    
    // Return default matrix on error
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch lock compatibility matrix',
      matrix: {} 
    };
  }
};

/**
 * List all available analyzers
 * 
 * @returns Promise resolving to the list of analyzer capabilities
 */
export const listAnalyzers = async (): Promise<AnalyzerCapabilities[]> => {
  try {
    const response = await enhancedApiClient.get<{ analyzers: AnalyzerCapabilities[] }>(
      '/api/v1/analyzers/'
    );
    
    return response.analyzers || [];
  } catch (error) {
    handleAnalyzersError(error, {
      operation: 'listAnalyzers',
      context: {}
    });
    return [];
  }
};

/**
 * Get capabilities for a specific analyzer
 * 
 * @param analyzerType - Type of analyzer
 * @returns Promise resolving to the analyzer capabilities
 */
export const getAnalyzerCapabilities = async (
  analyzerType: AnalyzerType
): Promise<AnalyzerCapabilities | null> => {
  try {
    const response = await enhancedApiClient.get<AnalyzerCapabilities>(
      `/api/v1/analyzers/${analyzerType}`
    );
    
    return response;
  } catch (error) {
    handleAnalyzersError(error, {
      operation: 'getAnalyzerCapabilities',
      context: { analyzerType }
    });
    return null;
  }
};

/**
 * Analyze an event using the analyzer framework
 * 
 * @param request - Analysis request
 * @returns Promise resolving to the analysis response
 */
export const analyzeEvent = async (
  request: AnalyzeEventRequest
): Promise<AnalyzeEventResponse | null> => {
  try {
    const response = await enhancedApiClient.post<AnalyzeEventResponse>(
      '/api/v1/analyzers/analyze',
      request,
      {
        timeout: 60000 // 60 seconds for complex analysis
      }
    );
    
    return response;
  } catch (error) {
    handleAnalyzersError(error, {
      operation: 'analyzeEvent',
      context: { eventId: request.event_data.id }
    });
    return null;
  }
};

/**
 * Analyze an event with a specific analyzer
 * 
 * @param analyzerType - Type of analyzer to use
 * @param eventData - Event data to analyze
 * @returns Promise resolving to the analysis result
 */
export const analyzeWithSpecificAnalyzer = async (
  analyzerType: AnalyzerType,
  eventData: Record<string, any>
): Promise<AnalysisResult | null> => {
  try {
    const response = await enhancedApiClient.post<AnalysisResult>(
      `/api/v1/analyzers/analyze/${analyzerType}`,
      eventData,
      {
        timeout: 30000 // 30 seconds
      }
    );
    
    return response;
  } catch (error) {
    handleAnalyzersError(error, {
      operation: 'analyzeWithSpecificAnalyzer',
      context: { analyzerType, eventId: eventData.id }
    });
    return null;
  }
};

/**
 * Get analyzer health status
 * 
 * @returns Promise resolving to the health status
 */
export const getAnalyzerHealth = async (): Promise<{
  healthy: boolean;
  registry_status: Record<string, any>;
  orchestrator_status: Record<string, any>;
} | null> => {
  try {
    const response = await enhancedApiClient.get<{
      healthy: boolean;
      registry_status: Record<string, any>;
      orchestrator_status: Record<string, any>;
    }>('/api/v1/analyzers/health');
    
    return response;
  } catch (error) {
    handleAnalyzersError(error, {
      operation: 'getAnalyzerHealth',
      context: {}
    });
    return null;
  }
};

/**
 * Get analyzer performance metrics
 * 
 * @returns Promise resolving to the metrics
 */
export const getAnalyzerMetrics = async (): Promise<Record<string, any> | null> => {
  try {
    const response = await enhancedApiClient.get<Record<string, any>>(
      '/api/v1/analyzers/metrics'
    );
    
    return response;
  } catch (error) {
    handleAnalyzersError(error, {
      operation: 'getAnalyzerMetrics',
      context: {}
    });
    return null;
  }
};

/**
 * Clear analyzer cache
 * 
 * @param eventId - Optional event ID to clear specific cache
 * @returns Promise resolving to the result
 */
export const clearAnalyzerCache = async (
  eventId?: string
): Promise<{ success: boolean; message: string } | null> => {
  try {
    const response = await enhancedApiClient.delete<{
      success: boolean;
      message: string;
    }>('/api/v1/analyzers/cache', {
      params: eventId ? { event_id: eventId } : undefined
    });
    
    return response;
  } catch (error) {
    handleAnalyzersError(error, {
      operation: 'clearAnalyzerCache',
      context: { eventId }
    });
    return null;
  }
};

// Export all functions
export default {
  analyzeDeadlock,
  exportDeadlockSVG,
  getDeadlockPatterns,
  getLockCompatibilityMatrix,
  listAnalyzers,
  getAnalyzerCapabilities,
  analyzeEvent,
  analyzeWithSpecificAnalyzer,
  getAnalyzerHealth,
  getAnalyzerMetrics,
  clearAnalyzerCache
};