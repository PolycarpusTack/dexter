// File: src/utils/errorHandling.js

/**
 * Utilities for error handling and notification
 */
import { showNotification } from '@mantine/notifications';
import { logErrorToService } from './errorTracking';

/**
 * Format and display a success notification
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Success message
 * @param {function} options.onAction - Optional action callback
 * @param {string} options.actionLabel - Label for the action button
 */
export function showSuccessNotification({ title, message, onAction, actionLabel }) {
  showNotification({
    title,
    message,
    color: 'green',
    autoClose: 5000,
    icon: '✅',
    ...(onAction && actionLabel && {
      withCloseButton: true,
      onClose: () => {}, // Required for autoClose to work with withCloseButton
      action: {
        label: actionLabel,
        onClick: onAction,
      }
    })
  });
  
  // Also log to console for debugging
  console.info(`${title}:`, message);
}

/**
 * Format and display an error notification
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string|Error} options.error - Error object or message
 * @param {string} options.message - Optional override message
 * @param {function} options.onRetry - Optional retry callback
 * @param {Object} options.context - Additional context for error tracking
 * @param {boolean} options.logToSentry - Whether to log to Sentry (default: true)
 */
export function showErrorNotification({ 
  title, 
  error, 
  message, 
  onRetry, 
  context = {},
  logToSentry = true 
}) {
  const errorMessage = message || formatErrorMessage(error);
  
  showNotification({
    title,
    message: errorMessage,
    color: 'red',
    autoClose: 5000,
    icon: '⚠️',
    ...(onRetry && {
      withCloseButton: true,
      onClose: () => {}, // Required for autoClose to work with withCloseButton
      action: {
        label: 'Retry',
        onClick: onRetry,
      }
    })
  });
  
  // Also log to console for debugging
  console.error(`${title}:`, error);
  
  // Log to error tracking service if enabled
  if (logToSentry && error) {
    logErrorToService(error, {
      source: 'showErrorNotification',
      title,
      message: errorMessage,
      ...context
    });
  }
}

/**
 * Format an error message from various error types
 * @param {string|Error|Object} error - The error to format
 * @returns {string} - Formatted error message
 */
export function formatErrorMessage(error) {
  if (!error) return 'An unknown error occurred';
  
  // Handle string errors
  if (typeof error === 'string') return error;
  
  // Handle Error objects
  if (error instanceof Error) return error.message;
  
  // Handle Axios error responses
  if (error.response) {
    const { status, data } = error.response;
    
    // Handle structured API error responses
    if (data?.detail) {
      // Handle detail as string or object
      if (typeof data.detail === 'string') return data.detail;
      if (typeof data.detail === 'object' && data.detail.message) return data.detail.message;
    }
    
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    
    // Handle common HTTP status codes
    if (status === 401) return 'Authentication required. Please check your credentials.';
    if (status === 403) return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested resource was not found.';
    if (status >= 500) return 'A server error occurred. Please try again later.';
    
    // Handle status code
    return `Request failed with status ${status}`;
  }
  
  // Handle network errors
  if (error.code === 'ECONNABORTED') return 'Request timed out';
  if (error.code === 'ERR_NETWORK') return 'Network error. Please check your connection.';
  if (error.message) return error.message;
  
  // Fallback
  return 'An unexpected error occurred';
}

/**
 * Handle form errors returned from API
 * @param {Object} error - Error object from API response
 * @param {function} setErrors - Form error setter function
 * @param {Object} options - Additional options
 * @param {boolean} options.logToSentry - Whether to log to Sentry (default: true)
 */
export function handleFormErrors(error, setErrors, { logToSentry = true } = {}) {
  if (!error.response?.data) {
    showErrorNotification({
      title: 'Form Submission Error',
      error,
      logToSentry
    });
    return;
  }
  
  const { data } = error.response;
  
  // Handle structured validation errors 
  if (data.detail && Array.isArray(data.detail)) {
    // FastAPI validation errors format
    const formErrors = {};
    
    data.detail.forEach(item => {
      // Convert from ['body', 'field_name'] to 'field_name'
      const fieldName = item.loc[item.loc.length - 1];
      formErrors[fieldName] = item.msg;
    });
    
    setErrors(formErrors);
    
    // Log form validation errors to error tracking service
    if (logToSentry) {
      logErrorToService(error, {
        source: 'handleFormErrors',
        formErrors,
        formValidation: true
      });
    }
  } else if (data.errors && typeof data.errors === 'object') {
    // Generic {field: [error messages]} format
    const formErrors = {};
    
    Object.entries(data.errors).forEach(([field, messages]) => {
      formErrors[field] = Array.isArray(messages) ? messages[0] : messages;
    });
    
    setErrors(formErrors);
    
    // Log form validation errors to error tracking service
    if (logToSentry) {
      logErrorToService(error, {
        source: 'handleFormErrors',
        formErrors,
        formValidation: true
      });
    }
  } else {
    // Fallback: show general error notification
    showErrorNotification({
      title: 'Form Submission Error',
      error: data.detail || data.message || 'Form validation failed',
      logToSentry
    });
  }
}

/**
 * Create an error handler function for async operations
 * @param {string} title - Error notification title
 * @param {Object} options - Handler options
 * @param {function} options.onError - Optional additional error handler
 * @param {Object} options.context - Additional context for error tracking
 * @param {boolean} options.logToSentry - Whether to log to Sentry (default: true)
 * @returns {function} - Error handler function
 */
export function createErrorHandler(title, options = {}) {
  const { onError, context = {}, logToSentry = true } = typeof options === 'function' 
    ? { onError: options }  // Handle legacy usage
    : options;
    
  return (error) => {
    showErrorNotification({ 
      title, 
      error,
      context: {
        source: 'createErrorHandler',
        handlerTitle: title,
        ...context
      },
      logToSentry
    });
    
    if (typeof onError === 'function') {
      onError(error);
    }
    
    // Return the error for potential chaining
    return error;
  };
}

/**
 * Determine if an error is retryable
 * Generally network errors and server errors (5xx) are retryable,
 * but client errors (4xx) are not
 * 
 * @param {Error} error - The error to check
 * @returns {boolean} - Whether the error is retryable
 */
export function isRetryableError(error) {
  // Network errors are retryable
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
    return true;
  }
  
  // Server errors (5xx) are retryable
  if (error.response && error.response.status >= 500 && error.response.status < 600) {
    return true;
  }
  
  // Too many requests (429) is retryable
  if (error.response && error.response.status === 429) {
    return true;
  }
  
  // Some timeouts are retryable but marked differently
  if (error.message && 
     (error.message.includes('timeout') || 
      error.message.includes('timed out'))) {
    return true;
  }
  
  // Generally, client errors (4xx) are not retryable
  return false;
}

/**
 * Categorize an error to help with reporting and handling
 * @param {Error} error - The error to categorize
 * @returns {string} - The error category
 */
export function categorizeError(error) {
  // Network errors
  if (error.code === 'ECONNABORTED') return 'timeout';
  if (error.code === 'ERR_NETWORK') return 'network';
  
  // Handle Axios error responses
  if (error.response) {
    const { status } = error.response;
    
    // Group by status code range
    if (status >= 400 && status < 500) return 'client_error';
    if (status >= 500) return 'server_error';
  }
  
  // JavaScript errors
  if (error instanceof TypeError) return 'type_error';
  if (error instanceof SyntaxError) return 'syntax_error';
  if (error instanceof ReferenceError) return 'reference_error';
  
  // Default
  return 'unknown';
}
