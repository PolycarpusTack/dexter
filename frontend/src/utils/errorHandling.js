// File: src/utils/errorHandling.js

/**
 * Utilities for error handling and notification
 */
import { showNotification } from '@mantine/notifications';

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
 */
export function showErrorNotification({ title, error, message, onRetry }) {
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
    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    
    // Handle status code
    return `Request failed with status ${status}`;
  }
  
  // Handle timeout
  if (error.code === 'ECONNABORTED') return 'Request timed out';
  
  // Handle network errors
  if (error.message) return error.message;
  
  // Fallback
  return 'An unexpected error occurred';
}

/**
 * Handle form errors returned from API
 * @param {Object} error - Error object from API response
 * @param {function} setErrors - Form error setter function
 */
export function handleFormErrors(error, setErrors) {
  if (!error.response?.data) {
    showErrorNotification({
      title: 'Form Submission Error',
      error
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
  } else if (data.errors && typeof data.errors === 'object') {
    // Generic {field: [error messages]} format
    const formErrors = {};
    
    Object.entries(data.errors).forEach(([field, messages]) => {
      formErrors[field] = Array.isArray(messages) ? messages[0] : messages;
    });
    
    setErrors(formErrors);
  } else {
    // Fallback: show general error notification
    showErrorNotification({
      title: 'Form Submission Error',
      error: data.detail || data.message || 'Form validation failed'
    });
  }
}

/**
 * Create an error handler function for async operations
 * @param {string} title - Error notification title
 * @param {function} onError - Optional additional error handler
 * @returns {function} - Error handler function
 */
export function createErrorHandler(title, onError) {
  return (error) => {
    showErrorNotification({ title, error });
    
    if (typeof onError === 'function') {
      onError(error);
    }
  };
}
