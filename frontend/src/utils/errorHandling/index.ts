// File: src/utils/errorHandling/index.ts

// Export error handling components
export { default as ErrorFactory } from './errorFactory';
export { default as withErrorBoundary } from './withErrorBoundary';
export { default as withDataFetching } from './withDataFetching';
export { default as useErrorHandler } from './useErrorHandler';
export { default as retryManager } from './retryManager';
export { default as errorAnalyticsIntegration } from './errorAnalyticsIntegration';

// Export utility functions
export { 
  showErrorNotification, 
  showSuccessNotification, 
  showInfoNotification
} from './notifications';
export { 
  categorizeError, 
  isRetryableError, 
  getErrorMessage, 
  ErrorCategory 
} from './errorHandling';
export {
  logErrorToService, 
  sanitizeErrorForTracking 
} from './errorTracking';
export { 
  createErrorHandler, 
  ErrorHandlerOptions 
} from './createErrorHandler';

// Export error analytics
export { 
  recordAndNotifyError, 
  withErrorAnalytics, 
  withErrorAnalyticsTracking 
} from './errorAnalyticsIntegration';

// Create combined error handling object for convenience
import ErrorFactory from './errorFactory';
import withErrorBoundary from './withErrorBoundary';
import withDataFetching from './withDataFetching';
import useErrorHandler from './useErrorHandler';
import retryManager from './retryManager';
import { recordAndNotifyError, withErrorAnalytics, withErrorAnalyticsTracking } from './errorAnalyticsIntegration';
import { showErrorNotification, showSuccessNotification, showInfoNotification } from './notifications';
import { categorizeError, isRetryableError, getErrorMessage } from './errorHandling';
import { logErrorToService, sanitizeErrorForTracking } from './errorTracking';
import { createErrorHandler } from './createErrorHandler';

const errorHandling = {
  // Core components
  ErrorFactory,
  withErrorBoundary,
  withDataFetching,
  useErrorHandler,
  retryManager,
  
  // Utility functions
  showErrorNotification,
  showSuccessNotification,
  showInfoNotification,
  categorizeError,
  isRetryableError,
  getErrorMessage,
  logErrorToService,
  sanitizeErrorForTracking,
  createErrorHandler,
  
  // Analytics integration
  recordAndNotifyError,
  withErrorAnalytics,
  withErrorAnalyticsTracking
};

export default errorHandling;
