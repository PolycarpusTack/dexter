// src/utils/errorTracking.ts
// Enhanced error tracking utilities with error taxonomy and sanitization

/**
 * Interface for error tracking initialization options
 */
interface ErrorTrackingOptions {
  environment?: string;
  release?: string;
  dsn?: string;
  debug?: boolean;
}

/**
 * Interface for sanitized error
 */
interface SanitizedError {
  name: string;
  message: string;
  stack?: string;
}

/**
 * Interface for error metadata
 */
interface ErrorMetadata {
  [key: string]: any;
}

/**
 * Interface for sanitized error details
 */
interface SanitizedErrorDetails {
  error: SanitizedError;
  metadata: ErrorMetadata;
}

/**
 * Type for severity level
 */
type SeverityLevel = 'critical' | 'warning' | 'info';

/**
 * Initialize error tracking (simplified version)
 * @param options - Configuration options
 */
export function initErrorTracking(options: ErrorTrackingOptions = {}): void {
  const { environment = 'development', release = '1.0.0' } = options;
  
  // Just log that we would initialize error tracking in a real implementation
  console.log(`Error tracking would be initialized in a real implementation (environment: ${environment}, release: ${release})`);
}

/**
 * Log an error with enhanced metadata
 * @param error - The error object
 * @param metadata - Additional context information
 */
export function logErrorToService(error: unknown, metadata: ErrorMetadata = {}): void {
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
 * @param error - The error object
 * @param metadata - Additional context information
 * @returns Sanitized error object and metadata
 */
function sanitizeErrorDetails(error: unknown, metadata: ErrorMetadata): SanitizedErrorDetails {
  // Convert error to standard format
  const errorObject = error instanceof Error ? error : new Error(String(error));
  
  // Clone the error to avoid modifying the original
  const sanitizedError: SanitizedError = {
    name: errorObject.name,
    message: sanitizeMessage(errorObject.message),
    stack: errorObject.stack ? sanitizeStack(errorObject.stack) : undefined
  };
  
  // Sanitize metadata
  const sanitizedMetadata: ErrorMetadata = { ...metadata };
  
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
 * @param message - Error message
 * @returns Sanitized message
 */
function sanitizeMessage(message: string): string {
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
 * @param stack - Error stack trace
 * @returns Sanitized stack
 */
function sanitizeStack(stack: string): string {
  if (!stack) return '';
  
  // Replace file paths with basename only
  return stack
    .split('\n')
    .map(line => {
      // Keep line format but sanitize file paths
      return line.replace(/\(([^)]+)\)/, match => {
        const path = match.replace(/^\(|\)$/g, '');
        const filename = path.split(/[\/\\]/).pop() || '';
        return `(${filename})`;
      });
    })
    .join('\n');
}

/**
 * Determine error severity based on error properties
 * @param error - The error object
 * @returns Severity level (critical, warning, info)
 */
function determineSeverity(error: unknown): SeverityLevel {
  if (!error) return 'info';
  
  // Convert to error-like object for property access
  const errorObj = error as Record<string, any>;
  
  // Critical errors
  if (
    errorObj.name === 'ChunkLoadError' || 
    errorObj.name === 'SyntaxError' ||
    errorObj.status === 500 ||
    errorObj.fatal === true
  ) {
    return 'critical';
  }
  
  // Warning level errors
  if (
    errorObj.status === 404 ||
    errorObj.status === 403 ||
    errorObj.status === 429 ||
    errorObj.name === 'ValidationError' ||
    errorObj.name === 'TypeError'
  ) {
    return 'warning';
  }
  
  // Info level errors
  if (
    errorObj.status === 422 ||
    errorObj.status === 400 ||
    errorObj.name === 'NotFoundError'
  ) {
    return 'info';
  }
  
  return 'warning'; // Default to warning for unknown error types
}

/**
 * Record performance metric for error tracking
 * @param metricName - Name of the metric to record
 * @param attributes - Additional attributes
 */
function recordPerformanceMetric(metricName: string, attributes: Record<string, any> = {}): void {
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
export function createErrorBoundary(): {
  name: string;
  handleError: (error: unknown) => boolean;
} {
  return {
    name: "SimplifiedErrorBoundary",
    handleError: (error: unknown) => {
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
