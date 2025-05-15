/**
 * Default error handler for API calls
 * 
 * @param error Error object from API call
 * @param defaultMessage Default message to show if error object doesn't have one
 * @returns ApiError with formatted message
 */
export function handleApiError(error: any, defaultMessage: string = 'API call failed'): ApiError {
  return createErrorHandler('API')(error);
}

/**
 * Error handling utilities for the unified API client
 */

import { AxiosError } from 'axios';
import { ApiError, ErrorCategory } from './types';

/**
 * Factory for creating API errors with consistent format
 */
export class ErrorFactory {
  /**
   * Create a network error
   */
  static createNetworkError(originalError: Error): ApiError {
    return {
      message: 'Network error occurred. Please check your connection.',
      status: 0,
      category: ErrorCategory.Network,
      originalError,
      isRetryable: true
    };
  }

  /**
   * Create an authentication error
   */
  static createAuthenticationError(status: number, message?: string): ApiError {
    return {
      message: message || 'Authentication failed. Please sign in again.',
      status,
      category: ErrorCategory.Authentication,
      isRetryable: false
    };
  }

  /**
   * Create an authorization error
   */
  static createAuthorizationError(status: number, message?: string): ApiError {
    return {
      message: message || 'You do not have permission to perform this action.',
      status,
      category: ErrorCategory.Authorization,
      isRetryable: false
    };
  }

  /**
   * Create a not found error
   */
  static createNotFoundError(status: number, message?: string): ApiError {
    return {
      message: message || 'The requested resource was not found.',
      status,
      category: ErrorCategory.NotFound,
      isRetryable: false
    };
  }

  /**
   * Create a validation error
   */
  static createValidationError(status: number, message?: string, details?: any): ApiError {
    return {
      message: message || 'Validation failed. Please check your input.',
      status,
      category: ErrorCategory.Validation,
      details,
      isRetryable: false
    };
  }

  /**
   * Create a rate limit error
   */
  static createRateLimitError(status: number, message?: string): ApiError {
    return {
      message: message || 'Rate limit exceeded. Please try again later.',
      status,
      category: ErrorCategory.RateLimit,
      isRetryable: true
    };
  }

  /**
   * Create a server error
   */
  static createServerError(status: number, message?: string): ApiError {
    return {
      message: message || 'Server error occurred. Please try again later.',
      status,
      category: ErrorCategory.Server,
      isRetryable: true
    };
  }

  /**
   * Create a timeout error
   */
  static createTimeoutError(originalError: Error): ApiError {
    return {
      message: 'Request timed out. Please try again.',
      status: 0,
      category: ErrorCategory.Timeout,
      originalError,
      isRetryable: true
    };
  }

  /**
   * Create a generic error
   */
  static createUnknownError(status: number, message?: string, originalError?: Error): ApiError {
    return {
      message: message || 'An unknown error occurred.',
      status,
      category: ErrorCategory.Unknown,
      originalError,
      isRetryable: true
    };
  }

  /**
   * Create an error from an Axios error
   */
  static fromAxiosError(error: AxiosError): ApiError {
    // Network error
    if (error.code === 'ECONNABORTED') {
      return this.createTimeoutError(error);
    }

    if (!error.response) {
      return this.createNetworkError(error);
    }

    const status = error.response.status;
    const data = error.response.data as any;
    const message = data?.message || data?.error || error.message;

    // Categorize based on status code
    switch (true) {
      case status === 401:
        return this.createAuthenticationError(status, message);
      case status === 403:
        return this.createAuthorizationError(status, message);
      case status === 404:
        return this.createNotFoundError(status, message);
      case status === 422:
        return this.createValidationError(status, message, data?.errors);
      case status === 429:
        return this.createRateLimitError(status, message);
      case status >= 500:
        return this.createServerError(status, message);
      default:
        return this.createUnknownError(status, message, error);
    }
  }
}

/**
 * Create an error handler for a specific domain
 */
export function createErrorHandler(domain: string) {
  return (error: Error | AxiosError): ApiError => {
    // If it's already an ApiError, return it
    if ((error as any).category) {
      return error as unknown as ApiError;
    }

    // Handle Axios errors
    if (isAxiosError(error)) {
      const apiError = ErrorFactory.fromAxiosError(error);
      apiError.message = `[${domain}] ${apiError.message}`;
      return apiError;
    }

    // Handle other errors
    return {
      message: `[${domain}] ${error.message}`,
      status: 0,
      category: ErrorCategory.Unknown,
      originalError: error,
      isRetryable: true
    };
  };
}

/**
 * Type guard for Axios errors
 */
function isAxiosError(error: any): error is AxiosError {
  return error.isAxiosError === true;
}

// Import the real notification system
import {
  showErrorNotification as displayErrorNotification,
  NotificationOptions
} from '../../utils/errorHandling/notifications';

/**
 * Show an error notification to the user
 * 
 * @param options - Notification options with title and error
 */
export function showErrorNotification(options: NotificationOptions) {
  // Check if this error should be suppressed from notifications
  if (options.error && (options.error as any).suppressNotifications) {
    console.debug('Suppressing error notification:', options.title);
    return;
  }
  
  // Forward to the real notification system
  return displayErrorNotification(options);
}