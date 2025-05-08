// src/utils/errorTracking.ts
// Simplified error tracking utilities that don't depend on Sentry or JSX

/**
 * Interface for error tracking initialization options
 */
export interface ErrorTrackingOptions {
  /** Environment name (development, production, etc.) */
  environment?: string;
  /** Release version */
  release?: string;
}

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
 * Interface for an Enhanced Error object
 */
export interface EnhancedErrorLike {
  category?: string;
  retryable?: boolean;
  metadata?: Record<string, unknown>;
  retryCount?: number;
  [key: string]: unknown;
}

/**
 * Log an error (simplified version)
 * @param error - The error object
 * @param context - Additional context information
 */
export function logErrorToService(
  error: unknown,
  context: Record<string, unknown> = {}
): void {
  // In a real implementation, this would send the error to a service like Sentry
  console.error('Error logged (would be sent to error tracking service):', error);
  
  if (Object.keys(context).length > 0) {
    console.error('Error context:', context);
  }
}

// Basic error boundary factory function to avoid React dependency
// In a real implementation, this would return a proper React error boundary component
export function createErrorBoundary() {
  return {
    name: "SimplifiedErrorBoundary",
    handleError: (error: Error) => {
      console.error("Error caught by boundary:", error);
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
