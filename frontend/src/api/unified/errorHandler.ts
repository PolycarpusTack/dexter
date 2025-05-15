/**
 * API Error Handler
 * 
 * This file provides utilities for handling API errors in a consistent way.
 * It includes an error factory, error categories, and notification helpers.
 */

import { notifications } from '@mantine/notifications';
import { IconX, IconExclamationCircle, IconAlertTriangle } from '@tabler/icons-react';
import React from 'react';
import { ApiError, ErrorCategory } from './types';

/**
 * Factory for creating API error objects
 */
export class ErrorFactory {
  /**
   * Create an API error
   * 
   * @param message - Error message
   * @param status - HTTP status code
   * @param category - Error category
   * @param data - Error data from response
   * @param metadata - Additional metadata
   * @returns API error object
   */
  static createApiError(
    message: string,
    status: number,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    data?: any,
    metadata?: Record<string, any>
  ): ApiError {
    const error = new Error(message) as ApiError;
    error.name = 'ApiError';
    error.status = status;
    error.category = this.determineCategoryFromStatus(status, category);
    error.data = data;
    error.retryable = status >= 500 || status === 429;
    error.retryCount = 0;
    error.metadata = metadata || {};
    return error;
  }

  /**
   * Create a network error
   * 
   * @param message - Error message
   * @param metadata - Additional metadata
   * @returns API error object
   */
  static createNetworkError(message: string, metadata?: Record<string, any>): ApiError {
    const error = new Error(message) as ApiError;
    error.name = 'NetworkError';
    error.category = ErrorCategory.NETWORK;
    error.retryable = true;
    error.retryCount = 0;
    error.metadata = metadata || {};
    return error;
  }

  /**
   * Create an auth error
   * 
   * @param message - Error message
   * @param status - HTTP status code (401 or 403)
   * @param metadata - Additional metadata
   * @returns API error object
   */
  static createAuthError(message: string, status: 401 | 403, metadata?: Record<string, any>): ApiError {
    const error = new Error(message) as ApiError;
    error.name = 'AuthError';
    error.status = status;
    error.category = ErrorCategory.AUTH;
    error.retryable = false;
    error.retryCount = 0;
    error.metadata = metadata || {};
    return error;
  }

  /**
   * Create a validation error
   * 
   * @param message - Error message
   * @param validationErrors - Validation error details
   * @param metadata - Additional metadata
   * @returns API error object
   */
  static createValidationError(
    message: string,
    validationErrors?: Record<string, string[]>,
    metadata?: Record<string, any>
  ): ApiError {
    const error = new Error(message) as ApiError;
    error.name = 'ValidationError';
    error.status = 422;
    error.category = ErrorCategory.VALIDATION;
    error.retryable = false;
    error.retryCount = 0;
    error.data = validationErrors;
    error.metadata = metadata || {};
    return error;
  }

  /**
   * Determine the error category from HTTP status
   * 
   * @param status - HTTP status code
   * @param defaultCategory - Default category if not determined by status
   * @returns Error category
   */
  private static determineCategoryFromStatus(
    status: number,
    defaultCategory: ErrorCategory = ErrorCategory.UNKNOWN
  ): ErrorCategory {
    if (status === 401 || status === 403) {
      return ErrorCategory.AUTH;
    } else if (status === 422) {
      return ErrorCategory.VALIDATION;
    } else if (status === 429) {
      return ErrorCategory.RATE_LIMIT;
    } else if (status >= 500) {
      return ErrorCategory.SERVER;
    } else if (status >= 400) {
      return ErrorCategory.CLIENT;
    }
    return defaultCategory;
  }

  /**
   * Check if an error is retryable
   * 
   * @param error - Error to check
   * @returns Whether the error is retryable
   */
  static isRetryable(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    
    // If it's an ApiError, check the retryable flag
    if ('retryable' in error) {
      return Boolean(error.retryable);
    }
    
    // Check for network errors
    if ('code' in error && typeof error.code === 'string') {
      return ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'].includes(error.code);
    }
    
    // Check for status codes
    if ('status' in error && typeof error.status === 'number') {
      const status = error.status;
      return status === 429 || (status >= 500 && status < 600);
    }
    
    return false;
  }
}

/**
 * Options for creating an error handler
 */
interface ErrorHandlerOptions {
  /** 
   * Module name for error context
   */
  module: string;
  
  /**
   * Global context for all errors
   */
  context?: Record<string, any>;
  
  /**
   * Whether to show notifications for errors
   */
  showNotifications?: boolean;
  
  /**
   * Whether to log errors to console
   */
  logToConsole?: boolean;
  
  /**
   * Custom error handler
   */
  onError?: (error: Error, handlerContext: Record<string, any>) => void;
}

/**
 * Options for handling a specific error
 */
interface HandleErrorOptions {
  /**
   * Operation name for error context
   */
  operation?: string;
  
  /**
   * Error-specific context
   */
  context?: Record<string, any>;
  
  /**
   * Whether to show a notification for this error
   */
  showNotification?: boolean;
  
  /**
   * Whether to throw the error after handling
   */
  rethrow?: boolean;
  
  /**
   * Custom title for error notification
   */
  notificationTitle?: string;
  
  /**
   * Custom message for error notification
   */
  notificationMessage?: string;
}

/**
 * Create an error handler function
 * 
 * @param options - Error handler options
 * @returns Error handler function
 */
export const createErrorHandler = (options: ErrorHandlerOptions) => {
  const {
    module,
    context = {},
    showNotifications = true,
    logToConsole = true,
    onError
  } = options;
  
  return (error: unknown, handleOptions: HandleErrorOptions = {}): never | void => {
    const {
      operation,
      context: errorContext = {},
      showNotification = showNotifications,
      rethrow = true,
      notificationTitle,
      notificationMessage
    } = handleOptions;
    
    // Merge context
    const fullContext = {
      ...context,
      ...errorContext,
      module,
      operation
    };
    
    // Format error for logging
    const errorObject = error instanceof Error ? error : new Error(String(error));
    const contextString = Object.entries(fullContext)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join(', ');
    
    // Log to console
    if (logToConsole) {
      console.error(`[${module}${operation ? `:${operation}` : ''}] ${errorObject.message}`);
      if (contextString) {
        console.error(`Context: ${contextString}`);
      }
      console.error(errorObject);
    }
    
    // Show notification
    if (showNotification) {
      showErrorNotification({
        title: notificationTitle || `${module} Error`,
        message: notificationMessage || errorObject.message,
        error: errorObject
      });
    }
    
    // Custom error handler
    if (onError) {
      onError(errorObject, fullContext);
    }
    
    // Rethrow if requested
    if (rethrow) {
      throw errorObject;
    }
  };
};

/**
 * Options for error notifications
 */
interface ErrorNotificationOptions {
  /**
   * Notification title
   */
  title: string;
  
  /**
   * Notification message
   */
  message: string;
  
  /**
   * Error object
   */
  error?: Error;
  
  /**
   * Notification duration (ms)
   */
  duration?: number;
  
  /**
   * Error context for display
   */
  context?: Record<string, string>;
}

/**
 * Show an error notification
 * 
 * @param options - Notification options
 */
export const showErrorNotification = (options: ErrorNotificationOptions) => {
  const {
    title,
    message,
    error,
    duration = 5000,
    context
  } = options;
  
  let icon = React.createElement(IconX, { size: 18 });
  let color = 'red';
  
  // Customize based on error type
  if (error && 'category' in error && typeof error.category === 'string') {
    const category = error.category as ErrorCategory;
    
    switch (category) {
      case ErrorCategory.AUTH:
        icon = React.createElement(IconExclamationCircle, { size: 18 });
        color = 'yellow';
        break;
      case ErrorCategory.SERVER:
        icon = React.createElement(IconAlertTriangle, { size: 18 });
        color = 'orange';
        break;
    }
  }
  
  // Create context display
  let contextDisplay = '';
  if (context && Object.keys(context).length > 0) {
    contextDisplay = Object.entries(context)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }
  
  notifications.show({
    title,
    message: contextDisplay ? `${message}\n\n${contextDisplay}` : message,
    color,
    icon,
    autoClose: duration,
    withBorder: true
  });
};

export default {
  ErrorFactory,
  createErrorHandler,
  showErrorNotification
};