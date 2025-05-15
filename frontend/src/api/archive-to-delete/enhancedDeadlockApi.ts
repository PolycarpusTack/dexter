/**
 * @deprecated This API module is deprecated and will be removed in v1.0.0 (Q4 2025).
 * Please use the unified API modules from 'src/api/unified' instead.
 * 
 * Migration Guide: 
 * - Replace imports from this file with imports from the unified API
 * - Refer to the migration guide at 'docs/consolidated/API_MIGRATION_MASTER_GUIDE.md'
 * 
 * Recommended replacement: import { analyzersApi } from 'src/api/unified'
 * @see API_CLIENT_CONSOLIDATION_STATUS.md for migration timeline
 * @see docs/consolidated/API_MIGRATION_GUIDE_DEADLOCKDISPLAY.md for specific migration instructions
 */

import apiClient from './apiClient';
import { DeadlockAnalysisResponse, DeadlockAnalysisOptions } from '../types/deadlock';
import { 
  validateDeadlockAnalysisResponse, 
  safeValidateDeadlockAnalysisResponse,
  normalizeDeadlockData
} from '../schemas/deadlockSchemas';

/**
 * Analyze a deadlock event using the server-side analyzer
 * @param eventId - ID of the event to analyze
 * @param options - Options for analysis
 * @returns Promise resolving to the validated analysis result
 */
export async function analyzeDeadlock(
  eventId: string, 
  options: DeadlockAnalysisOptions = {}
): Promise<DeadlockAnalysisResponse> {
  const { 
    useEnhancedAnalysis = true,
    apiPath = useEnhancedAnalysis ? 'enhanced-analyzers' : 'analyzers',
    includeRawData = false
  } = options;
  
  try {
    const response = await apiClient.get(`/${apiPath}/analyze-deadlock/${eventId}`);
    
    // Store raw data for debugging if requested
    const rawData = includeRawData ? response.data : undefined;
    
    try {
      // Try strict validation first
      const validatedData = validateDeadlockAnalysisResponse(response.data);
      
      // Add raw data if requested
      if (includeRawData && validatedData) {
        (validatedData as any)._rawData = rawData;
      }
      
      return validatedData;
    } catch (validationError) {
      // If strict validation fails, try to normalize the data
      console.warn('Strict validation failed, attempting to normalize data:', validationError);
      
      // Normalize the data to ensure it conforms to our schema
      const normalizedData = normalizeDeadlockData(response.data);
      
      // Add raw data if requested
      if (includeRawData) {
        (normalizedData as any)._rawData = rawData;
      }
      
      // Log the normalization process
      console.info('Data normalized successfully');
      
      return normalizedData;
    }
  } catch (error) {
    console.error('Error analyzing deadlock:', error);
    
    // Return a valid error response
    const errorResponse: DeadlockAnalysisResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    return errorResponse;
  }
}

/**
 * Options for SVG export
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
 * Export a deadlock visualization as SVG
 * @param eventId - ID of the event to export
 * @param svgElement - SVG element to export
 * @param options - Export options
 * @returns Promise resolving to the export result
 */
export async function exportDeadlockSVG(
  eventId: string, 
  svgElement: SVGElement | null,
  options: SVGExportOptions = {}
): Promise<{ success: boolean; filename?: string; error?: string }> {
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
        console.warn('SVG validation warning:', parserError.textContent);
        // We'll continue anyway but log the warning
      }
    } catch (validationError) {
      console.warn('SVG validation error:', validationError);
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
        await apiClient.post('/analytics/log-export', {
          eventId,
          exportType: 'svg',
          timestamp: new Date().toISOString(),
          fileSize: svgString.length
        });
      } catch (logError) {
        // Just log this error and continue, it shouldn't fail the export
        console.warn('Failed to log export analytics:', logError);
      }
    }
    
    return { 
      success: true, 
      filename 
    };
  } catch (error) {
    console.error('Error exporting SVG:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error exporting SVG'
    };
  }
}

/**
 * Get the deadlock analysis history for an event
 * @param eventId - ID of the event to get history for
 * @returns Promise resolving to the validated history data
 */
export async function getDeadlockHistory(eventId: string) {
  try {
    const response = await apiClient.get(`/enhanced-analyzers/deadlock-history/${eventId}`);
    
    // Validate history data against schema
    if (Array.isArray(response.data)) {
      // Return validated entries
      return {
        success: true,
        entries: response.data.map(entry => {
          try {
            // Basic validation of required fields
            if (!entry.timestamp || !entry.eventId) {
              throw new Error('Missing required fields in history entry');
            }
            
            // Return valid entry
            return {
              timestamp: entry.timestamp,
              eventId: entry.eventId,
              analyzedBy: entry.analyzedBy || undefined,
              severity: typeof entry.severity === 'number' ? entry.severity : undefined,
              affectedTables: Array.isArray(entry.affectedTables) ? entry.affectedTables : [],
              resolution: entry.resolution || undefined
            };
          } catch (validationError) {
            console.warn('Invalid history entry, using partial data:', validationError);
            // Return minimal valid entry
            return {
              timestamp: entry.timestamp || new Date().toISOString(),
              eventId: entry.eventId || eventId,
              affectedTables: []
            };
          }
        })
      };
    }
    
    // Return empty valid response if data is not an array
    return { success: true, entries: [] };
  } catch (error) {
    console.error('Error getting deadlock history:', error);
    return { 
      success: false, 
      entries: [],
      error: error instanceof Error ? error.message : 'Failed to fetch deadlock history'
    };
  }
}

/**
 * Get the lock compatibility matrix
 * @returns Promise resolving to the validated lock compatibility matrix
 */
export async function getLockCompatibilityMatrix() {
  try {
    const response = await apiClient.get('/enhanced-analyzers/lock-compatibility-matrix');
    
    // Validate lock compatibility matrix
    if (response.data && typeof response.data === 'object') {
      // Check if it has the expected structure
      const validatedMatrix: Record<string, Record<string, boolean>> = {};
      let isValid = true;
      
      // Validate each lock type and its compatibility
      Object.entries(response.data).forEach(([lockType, compatibilities]) => {
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
    console.warn('Invalid lock compatibility matrix, using default');
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
    console.error('Error getting lock compatibility matrix:', error);
    // Return default matrix on error
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch lock compatibility matrix',
      matrix: {} 
    };
  }
}

/**
 * Get deadlock patterns with recommendations
 * @returns Promise resolving to the validated deadlock patterns
 */
export async function getDeadlockPatterns() {
  try {
    const response = await apiClient.get('/enhanced-analyzers/deadlock-patterns');
    
    // Validate patterns data
    if (Array.isArray(response.data)) {
      // Validate each pattern entry
      const validatedPatterns = response.data.filter(pattern => {
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
    console.error('Error getting deadlock patterns:', error);
    return { 
      success: false, 
      patterns: [],
      error: error instanceof Error ? error.message : 'Failed to fetch deadlock patterns'
    };
  }
}
