import apiClient from './apiClient';

interface AnalyzeDeadlockOptions {
  useEnhancedAnalysis?: boolean;
  apiPath?: string;
}

/**
 * Analyze a deadlock event using the server-side analyzer
 * @param eventId - ID of the event to analyze
 * @param options - Options for analysis
 * @returns Promise resolving to the analysis result
 */
export async function analyzeDeadlock(
  eventId: string, 
  options: AnalyzeDeadlockOptions = {}
) {
  const { 
    useEnhancedAnalysis = true,
    apiPath = useEnhancedAnalysis ? 'enhanced-analyzers' : 'analyzers'
  } = options;
  
  try {
    const response = await apiClient.get(`/${apiPath}/analyze-deadlock/${eventId}`);
    return response.data;
  } catch (error) {
    console.error('Error analyzing deadlock:', error);
    throw error;
  }
}

/**
 * Export a deadlock visualization as SVG
 * @param eventId - ID of the event to export
 * @param svgElement - SVG element to export
 * @returns Promise resolving when the export is complete
 */
export async function exportDeadlockSVG(eventId: string, svgElement: SVGElement) {
  try {
    // Create filename with event ID and date
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `deadlock-${eventId}-${timestamp}.svg`;
    
    // Clone the SVG to prepare it for export
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    
    // Set needed attributes for standalone SVG
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('width', svgElement.getBoundingClientRect().width.toString());
    svgClone.setAttribute('height', svgElement.getBoundingClientRect().height.toString());
    
    // Clean up any transform on the root group if present
    const rootGroup = svgClone.querySelector('g');
    if (rootGroup) {
      // Store the original transform
      const originalTransform = rootGroup.getAttribute('transform');
      
      // If we're exporting with a zoom/pan applied, we might want to keep it
      // For simplicity, we'll reset the transform here
      // rootGroup.removeAttribute('transform');
      
      // Alternatively, for a proper export that includes current view:
      // We can adjust the SVG viewBox based on the transform
      if (originalTransform) {
        // Extract translate and scale from the transform
        const translateMatch = originalTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        const scaleMatch = originalTransform.match(/scale\(([^)]+)\)/);
        
        if (translateMatch && translateMatch.length >= 3) {
          const tx = parseFloat(translateMatch[1]);
          const ty = parseFloat(translateMatch[2]);
          
          // Adjust viewBox to account for translation
          const width = svgElement.getBoundingClientRect().width;
          const height = svgElement.getBoundingClientRect().height;
          svgClone.setAttribute('viewBox', `${-tx} ${-ty} ${width} ${height}`);
          
          // Remove the transform now that we've adjusted the viewBox
          rootGroup.removeAttribute('transform');
        }
      }
    }
    
    // Convert SVG to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    
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
    
    // Optionally, we could also log this action on the server
    // await apiClient.post('/analytics/log-export', {
    //   eventId,
    //   exportType: 'svg',
    //   timestamp: new Date().toISOString()
    // });
    
    return { success: true, filename };
  } catch (error) {
    console.error('Error exporting SVG:', error);
    throw error;
  }
}

/**
 * Get the deadlock analysis history for an event
 * @param eventId - ID of the event to get history for
 * @returns Promise resolving to the history data
 */
export async function getDeadlockHistory(eventId: string) {
  try {
    const response = await apiClient.get(`/enhanced-analyzers/deadlock-history/${eventId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting deadlock history:', error);
    throw error;
  }
}

/**
 * Get the lock compatibility matrix
 * @returns Promise resolving to the lock compatibility matrix
 */
export async function getLockCompatibilityMatrix() {
  try {
    const response = await apiClient.get('/enhanced-analyzers/lock-compatibility-matrix');
    return response.data;
  } catch (error) {
    console.error('Error getting lock compatibility matrix:', error);
    throw error;
  }
}

/**
 * Get deadlock patterns with recommendations
 * @returns Promise resolving to the deadlock patterns
 */
export async function getDeadlockPatterns() {
  try {
    const response = await apiClient.get('/enhanced-analyzers/deadlock-patterns');
    return response.data;
  } catch (error) {
    console.error('Error getting deadlock patterns:', error);
    throw error;
  }
}
