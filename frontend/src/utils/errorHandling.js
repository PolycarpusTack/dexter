// File: frontend/src/utils/errorHandling.js

import { showNotification } from '@mantine/notifications';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';

/**
 * Standard error notification with consistent styling
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string|Error} options.error - Error message or Error object
 * @param {string} [options.defaultMessage] - Default message if error doesn't provide one
 */
export const showErrorNotification = ({ title, error, defaultMessage = 'An unexpected error occurred' }) => {
  // Extract error message from different possible error formats
  let message = defaultMessage;
  
  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message || defaultMessage;
  } else if (error?.response?.data?.detail) {
    message = error.response.data.detail;
  } else if (error?.message) {
    message = error.message;
  }
  
  showNotification({
    title,
    message,
    color: 'red',
    icon: <IconAlertCircle size={18} />,
    autoClose: 5000,
  });
  
  // Also log to console for debugging
  console.error(`${title}:`, error);
};

/**
 * Success notification with consistent styling
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Success message
 */
export const showSuccessNotification = ({ title, message }) => {
  showNotification({
    title,
    message,
    color: 'teal',
    autoClose: 3000,
  });
};

/**
 * Info notification with consistent styling
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Info message
 */
export const showInfoNotification = ({ title, message }) => {
  showNotification({
    title,
    message,
    color: 'blue',
    icon: <IconInfoCircle size={18} />,
    autoClose: 3000,
  });
};

/**
 * Format API errors to human-readable format
 * @param {Error|Object} error - Error object from API call
 * @param {string} [defaultMessage] - Default message if error doesn't provide one
 * @returns {string} - Formatted error message
 */
export const formatApiError = (error, defaultMessage = 'An error occurred while communicating with the server') => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.response) {
    // Axios error with response
    const status = error.response.status;
    const detail = error.response.data?.detail;
    
    if (detail) {
      return detail;
    }
    
    // Standard HTTP errors
    if (status === 401) {
      return 'Authentication failed. Please check your Sentry API token.';
    }
    if (status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (status === 404) {
      return 'The requested resource was not found.';
    }
    if (status === 429) {
      return 'Rate limit exceeded. Please try again later.';
    }
    if (status >= 500) {
      return 'The server encountered an error. Please try again later.';
    }
    
    return `Server error (${status}): ${defaultMessage}`;
  }
  
  if (error?.request) {
    // Request was made but no response received
    if (error.code === 'ECONNABORTED') {
      return 'The request timed out. Please check your connection and try again.';
    }
    return 'No response received from server. Please check your connection.';
  }
  
  // Something happened in setting up the request
  return error?.message || defaultMessage;
};

/**
 * Create an error handler for API requests
 * @param {Object} options - Error handler options 
 * @param {string} options.operation - Name of the operation (for logging/display)
 * @param {string} [options.component] - Component name (for better error tracking)
 * @param {Function} [options.onError] - Optional callback for custom error handling
 * @returns {Function} - Error handler function that takes an error and handles it
 */
export const createErrorHandler = ({ operation, component, onError }) => {
  return (error) => {
    const errorMessage = formatApiError(error);
    
    showErrorNotification({
      title: `${operation} Failed`,
      error: errorMessage,
    });
    
    // Log with component info for better debugging
    console.error(`Error in ${component || 'unknown component'} during ${operation}:`, error);
    
    // Optional callback for custom handling
    if (onError && typeof onError === 'function') {
      onError(error, errorMessage);
    }
    
    // Re-throw for promise chaining if needed
    throw error;
  };
};
