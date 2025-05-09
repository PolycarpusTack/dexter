// src/utils/errorTracking.js
// Enhanced error tracking utilities with error taxonomy and sanitization

/**
 * Initialize error tracking (simplified version)
 * @param {Object} options - Configuration options
 * @param {string} options.environment - Environment name (development, production, etc.)
 * @param {string} options.release - Release version
 */
export function initErrorTracking(options = {}) {
  const { environment = 'development', release = '1.0.0' } = options;
  
  // Just log that we would initialize error tracking in a real implementation
  console.log(`Error tracking would be initialized in a real implementation (environment: ${environment}, release: ${release})`);
}

/**
 * Log an error with enhanced metadata
 * @param {Error} error - The error object
 * @param {Object} metadata - Additional context information
 */
export function logErrorToService(error, metadata = {}) {
  if (!error) return;
  
  // Sanitize error details in production
  const errorDetails = process.env.NODE_ENV === 'production' 
    ? sanitizeErrorDetails(error, metadata)
    : { error, metadata };
  
  // Determine error severity
  const severity = determineSeverity(error);
  
  // In a real implementation, this would send the error to a service like Sentry
  console.error(`Error logged (${severity}):`, errorDetails.error);
  
  if (Object.keys(errorDetails.metadata).length > 0) {
    console.error('Error context:', errorDetails.metadata);
  }
  
  // Add performance monitoring
  recordPerformanceMetric('error_occurrence', { severity });
}

/**
 * Sanitize error details to prevent sensitive information leakage in production
 * @param {Error} error - The error object
 * @param {Object} metadata - Additional context information
 * @returns {Object} Sanitized error object and metadata
 */
function sanitizeErrorDetails(error, metadata) {
  // Clone the error to avoid modifying the original
  const sanitizedError = {
    name: error.name,
    message: sanitizeMessage(error.message),
    stack: error.stack ? sanitizeStack(error.stack) : undefined
  };
  
  // Sanitize metadata
  const sanitizedMetadata = { ...metadata };
  
  // Remove potentially sensitive information
  if (sanitizedMetadata.user) {
    sanitizedMetadata.user = {
      id: sanitizedMetadata.user.id,
      // Remove sensitive user data but keep identifier
      isAuthenticated: !!sanitizedMetadata.user
    };
  }
  
  // Clean state data if present
  if (sanitizedMetadata.state) {
    sanitizedMetadata.state = {
      // Keep basic state shape without sensitive values
      hasState: true
    };
  }
  
  return { error: sanitizedError, metadata: sanitizedMetadata };
}

/**
 * Sanitize error messages to remove potentially sensitive data
 * @param {string} message - Error message
 * @returns {string} Sanitized message
 */
function sanitizeMessage(message) {
  if (!message) return 'Unknown error';
  
  // Replace potential PII patterns (emails, IDs, etc.)
  return message
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{5,}\b/g, '[ID]')
    .replace(/token=[\w\d._-]+/g, 'token=[TOKEN]')
    .replace(/key=[\w\d._-]+/g, 'key=[KEY]');
}

/**
 * Sanitize error stack to remove file paths
 * @param {string} stack - Error stack trace
 * @returns {string} Sanitized stack
 */
function sanitizeStack(stack) {
  if (!stack) return '';
  
  // Replace file paths with basename only
  return stack
    .split('\n')
    .map(line => {
      // Keep line format but sanitize file paths
      return line.replace(/\(([^)]+)\)/, match => {
        const path = match.replace(/^\(|\)$/g, '');
        const filename = path.split(/[\/\\]/).pop();
        return `(${filename})`;
      });
    })
    .join('\n');
}

/**
 * Determine error severity based on error properties
 * @param {Error} error - The error object
 * @returns {string} Severity level (critical, warning, info)
 */
function determineSeverity(error) {
  if (!error) return 'info';
  
  // Critical errors
  if (
    error.name === 'ChunkLoadError' || 
    error.name === 'SyntaxError' ||
    error.status === 500 ||
    error.fatal === true
  ) {
    return 'critical';
  }
  
  // Warning level errors
  if (
    error.status === 404 ||
    error.status === 403 ||
    error.status === 429 ||
    error.name === 'ValidationError' ||
    error.name === 'TypeError'
  ) {
    return 'warning';
  }
  
  // Info level errors
  if (
    error.status === 422 ||
    error.status === 400 ||
    error.name === 'NotFoundError'
  ) {
    return 'info';
  }
  
  return 'warning'; // Default to warning for unknown error types
}

/**
 * Record performance metric for error tracking
 * @param {string} metricName - Name of the metric to record
 * @param {Object} attributes - Additional attributes
 */
function recordPerformanceMetric(metricName, attributes = {}) {
  // In a real app, this would integrate with a performance monitoring system
  console.log(`Recording metric: ${metricName}`, attributes);
  
  // Use Performance API if available
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    performance.mark(`${metricName}-${Date.now()}`);
  }
}

/**
 * Basic error boundary factory function to avoid React dependency
 * In a real implementation, this would return a proper React error boundary component
 */
export function createErrorBoundary() {
  return {
    name: "SimplifiedErrorBoundary",
    handleError: (error) => {
      console.error("Error caught by boundary:", error);
      logErrorToService(error, { source: 'ErrorBoundary' });
      return true; // error handled
    }
  };
}

// Export a dummy object for compatibility
export const SentryErrorBoundary = createErrorBoundary();

export default {
  initErrorTracking,
  logErrorToService,
  createErrorBoundary,
  SentryErrorBoundary
};
