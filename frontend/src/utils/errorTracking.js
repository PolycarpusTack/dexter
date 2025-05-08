// src/utils/errorTracking.js
// Simplified error tracking utilities that don't depend on Sentry or JSX

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
 * Log an error (simplified version)
 * @param {Error} error - The error object
 * @param {Object} context - Additional context information
 */
export function logErrorToService(error, context = {}) {
  // In a real implementation, this would send the error to a service like Sentry
  console.error('Error logged (would be sent to error tracking service):', error);
  
  if (Object.keys(context).length > 0) {
    console.error('Error context:', context);
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
