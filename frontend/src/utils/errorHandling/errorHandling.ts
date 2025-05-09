// File: src/utils/errorHandling/errorHandling.ts

import { showErrorNotification } from './notifications';
import { EnhancedError } from '../errorFactory';
import { ErrorCategory, ErrorContext, ErrorHandlerOptions } from '../../types/errorHandling';

/**
 * Categorize an error based on its type or properties
 * 
 * @param error - The error to categorize
 * @returns The error category
 */
export function categorizeError(error: any): ErrorCategory {
  // Check if it's already categorized
  if (error instanceof EnhancedError) {
    return error.category as ErrorCategory;
  }
  
  // Check for network errors
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
    return 'network';
  }
  
  // Check for API errors
  if ('status' in error) {
    const status = error.status;
    
    if (status >= 500) return 'server_error';
    if (status === 401 || status === 403) return 'authorization';
    if (status === 404) return 'not_found';
    if (status === 422) return 'validation';
    if (status >= 400) return 'client_error';
  }
  
  // Check error message
  const message = error?.message?.toLowerCase() || '';
  
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }
  
  if (message.includes('network') || message.includes('connection')) {
    return 'network';
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return 'not_found';
  }
  
  if (message.includes('permission') || message.includes('forbidden') || 
      message.includes('unauthorized') || message.includes('authentication')) {
    return 'authorization';
  }
  
  if (message.includes('parse') || message.includes('json') || message.includes('syntax')) {
    return 'parsing';
  }
  
  return 'unknown';
}

/**
 * Determine if an error is retryable
 * 
 * @param error - The error to check
 * @returns Whether the error is retryable
 */
export function isRetryableError(error: any): boolean {
  const category = categorizeError(error);
  
  // Network errors are generally retryable
  if (category === 'network' || category === 'timeout') {
    return true;
  }
  
  // Server errors are sometimes retryable
  if (category === 'server_error') {
    // 503 Service Unavailable is often temporary
    if (error.status === 503) {
      return true;
    }
    
    // Check if server explicitly says to retry
    const retryAfter = error.headers?.['retry-after'];
    if (retryAfter) {
      return true;
    }
  }
  
  // Check for specific retryable flag
  if (error.retryable !== undefined) {
    return error.retryable;
  }
  
  return false;
}

/**
 * Create an error handler function
 * 
 * @param defaultTitle - Default title for error notifications
 * @param options - Handler options
 * @returns Error handler function
 */
export function createErrorHandler(
  defaultTitle: string = 'An error occurred',
  options: ErrorHandlerOptions = {}
): (error: any, contextOverride?: ErrorContext) => void {
  const {
    context = {},
    showNotification: shouldShowNotification = true,
    logError = true,
    sendToErrorTracking = true
  } = options;
  
  return (error: any, contextOverride: ErrorContext = {}): void => {
    // Merge contexts
    const fullContext = { ...context, ...contextOverride };
    
    // Categorize error
    const category = categorizeError(error);
    
    // Log error
    if (logError) {
      console.error(
        `Error [${category}] in ${fullContext.component || fullContext.apiModule || 'unknown'}:`, 
        error,
        fullContext
      );
    }
    
    // Send to error tracking if enabled
    if (sendToErrorTracking) {
      // Implement as needed - could integrate with Sentry or similar
    }
    
    // Show notification if enabled
    if (shouldShowNotification) {
      showErrorNotification({
        title: defaultTitle,
        error: error instanceof Error ? error : new Error(String(error)),
        disableAutoClose: category === 'server_error' || category === 'authorization'
      });
    }
  };
}

export type { ErrorCategory, ErrorContext, ErrorHandlerOptions };
