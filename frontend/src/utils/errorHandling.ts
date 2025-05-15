import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import React from 'react';

/**
 * Error notification options
 */
interface ErrorNotificationOptions {
  title?: string;
  message: string;
  duration?: number;
  withBorder?: boolean;
  icon?: React.ReactNode;
}

/**
 * Success notification options
 */
interface SuccessNotificationOptions {
  title?: string;
  message: string;
  duration?: number;
  withBorder?: boolean;
  icon?: React.ReactNode;
}

/**
 * Show a success notification
 * @param options - Notification options
 */
export const showSuccessNotification = (options: SuccessNotificationOptions) => {
  const {
    title = 'Success',
    message,
    duration = 3000,
    withBorder = true,
    icon = React.createElement(IconCheck, { size: 18 })
  } = options;
  
  notifications.show({
    title,
    message,
    color: 'green',
    icon,
    withBorder,
    autoClose: duration,
  });
};

/**
 * Show an error notification
 * @param options - Notification options
 */
export const showErrorNotification = (options: ErrorNotificationOptions) => {
  const {
    title = 'Error',
    message,
    duration = 5000,
    withBorder = true,
    icon = React.createElement(IconX, { size: 18 })
  } = options;
  
  notifications.show({
    title,
    message,
    color: 'red',
    icon,
    withBorder,
    autoClose: duration,
  });
};

/**
 * Format an error object into a readable message
 * @param error - Error object
 * @returns Formatted error message
 */
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null) {
    // Try to extract message from API error responses
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
    
    if ('detail' in error && typeof error.detail === 'string') {
      return error.detail;
    }
    
    return JSON.stringify(error);
  }
  
  return 'An unknown error occurred';
};

/**
 * Handle an error with appropriate logging and notification
 * @param error - Error object
 * @param options - Additional options
 */
export const handleError = (
  error: unknown,
  options: {
    showNotification?: boolean;
    title?: string;
    context?: string;
    notificationDuration?: number;
    logLevel?: 'error' | 'warn' | 'info';
  } = {}
) => {
  const {
    showNotification = true,
    title = 'Error',
    context = '',
    notificationDuration = 5000,
    logLevel = 'error'
  } = options;
  
  // Format the error message
  const errorMessage = formatErrorMessage(error);
  
  // Log the error
  const contextPrefix = context ? `[${context}] ` : '';
  switch (logLevel) {
    case 'warn':
      console.warn(`${contextPrefix}Error:`, error);
      break;
    case 'info':
      console.info(`${contextPrefix}Error:`, error);
      break;
    case 'error':
    default:
      console.error(`${contextPrefix}Error:`, error);
      break;
  }
  
  // Show notification if requested
  if (showNotification) {
    showErrorNotification({
      title,
      message: errorMessage,
      duration: notificationDuration
    });
  }
  
  return errorMessage;
};

export default {
  showSuccessNotification,
  showErrorNotification,
  formatErrorMessage,
  handleError
};
