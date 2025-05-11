import React from 'react';
import { 
  categorizeError as originalCategorizeError,
  ErrorCategory,
  ErrorContext,
  createErrorHandler as originalCreateErrorHandler,
  showErrorNotification
} from './index';
import { 
  handleApiError, 
  apiErrorHandler, 
  ApiErrorOptions,
  ErrorDetails,
  withApiErrorHandling
} from '../apiErrorHandler';
import { Logger } from '../logger';

// Enhanced error categorization that delegates to the original
export function enhancedCategorizeError(error: any): ErrorCategory {
  // First try the original categorization
  const category = originalCategorizeError(error);
  
  // If it's unknown, try our API error handler's categorization
  if (category === 'unknown') {
    const apiCategory = apiErrorHandler.categorizeError(error);
    return apiCategory as ErrorCategory;
  }
  
  return category;
}

// Enhanced error handler that combines both systems
export function createEnhancedErrorHandler(context: ErrorContext = {}) {
  const originalHandler = originalCreateErrorHandler(context.component || 'Unknown', { context });
  
  return async (error: any, options: ApiErrorOptions = {}) => {
    // Use original handler for basic error handling
    originalHandler(error, context);
    
    // Add API-specific error handling
    await handleApiError(error, {
      ...options,
      context: { ...context, ...options.context }
    });
  };
}

// Wrapper for API calls that combines both error handling systems
export function withEnhancedApiErrorHandling<T>(
  apiCall: () => Promise<T>,
  context: ErrorContext = {},
  options: ApiErrorOptions = {}
): Promise<T> {
  const enhancedHandler = createEnhancedErrorHandler(context);
  
  return apiCall().catch(async error => {
    await enhancedHandler(error, options);
    throw error;
  });
}

// Enhanced error recovery that combines strategies
export async function enhancedErrorRecovery(error: any): Promise<boolean> {
  try {
    // First try the API error handler's recovery
    const apiRecovered = await apiErrorHandler.attemptRecovery(error);
    if (apiRecovered) {
      return true;
    }
    
    // If that fails, try any custom recovery strategies
    // This could be extended with additional recovery logic
    return false;
  } catch (recoveryError) {
    Logger.error('Error recovery failed', { 
      originalError: error, 
      recoveryError 
    });
    return false;
  }
}

// Hook that combines both error handling approaches
export function useEnhancedErrorHandler(componentName: string) {
  const context: ErrorContext = {
    component: componentName,
    timestamp: new Date().toISOString()
  };
  
  const handleError = React.useCallback((error: any, options: ApiErrorOptions = {}) => {
    const enhancedHandler = createEnhancedErrorHandler(context);
    return enhancedHandler(error, options);
  }, [componentName]);
  
  return { handleError };
}

// Enhanced error notification that uses both systems
export function showEnhancedErrorNotification(
  error: any,
  title = 'Error',
  customMessage?: string
) {
  // Get user-friendly message from API error handler
  const errorDetails: ErrorDetails = apiErrorHandler.createErrorDetails(error, {});
  const message = customMessage || apiErrorHandler.getUserFriendlyMessage(errorDetails);
  
  // Use the original notification system
  showErrorNotification({
    title,
    message,
    autoClose: errorDetails.category === 'validation' ? 10000 : 5000
  });
}

// Export enhanced versions that work with existing code
export const enhancedErrorHandling = {
  categorizeError: enhancedCategorizeError,
  createErrorHandler: createEnhancedErrorHandler,
  withApiErrorHandling: withEnhancedApiErrorHandling,
  attemptRecovery: enhancedErrorRecovery,
  useErrorHandler: useEnhancedErrorHandler,
  showErrorNotification: showEnhancedErrorNotification
};

// Export the original withApiErrorHandling for compatibility
export { withApiErrorHandling };
