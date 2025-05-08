// File: src/utils/errorHandling.ts

/**
 * Utilities for error handling and notification
 */
import { showNotification, NotificationProps } from '@mantine/notifications';
import { logErrorToService } from './errorTracking';

/**
 * Interface for success notification options
 */
export interface SuccessNotificationOptions {
  /** Notification title */
  title: string;
  /** Success message */
  message: string;
  /** Optional action callback */
  onAction?: () => void;
  /** Label for the action button */
  actionLabel?: string;
}

/**
 * Interface for error notification options
 */
export interface ErrorNotificationOptions {
  /** Notification title */
  title: string;
  /** Error object or message */
  error?: Error | string | unknown;
  /** Optional override message */
  message?: string;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Additional context for error tracking */
  context?: Record<string, unknown>;
  /** Whether to log to Sentry (default: true) */
  logToSentry?: boolean;
}

/**
 * Interface for form error handler options
 */
export interface FormErrorHandlerOptions {
  /** Whether to log to Sentry (default: true) */
  logToSentry?: boolean;
}

/**
 * Interface for error handler options
 */
export interface ErrorHandlerOptions {
  /** Optional additional error handler */
  onError?: (error: unknown) => void;
  /** Additional context for error tracking */
  context?: Record<string, unknown>;
  /** Whether to log to Sentry (default: true) */
  logToSentry?: boolean;
}

/**
 * Type for Axios-like response
 */
interface ErrorResponse {
  status?: number;
  data?: {
    detail?: string | { message?: string } | unknown;
    message?: string;
    error?: string;
    errors?: Record<string, string | string[]>;
  };
}

/**
 * Type for Axios-like error
 */
interface AxiosLikeError {
  response?: ErrorResponse;
  code?: string;
  message?: string;
  isAxiosError?: boolean;
  [key: string]: unknown;
}

/**
 * Format and display a success notification
 * @param options - Notification options
 */
export function showSuccessNotification({
  title,
  message,
  onAction,
  actionLabel
}: SuccessNotificationOptions): void {
  const notificationProps: NotificationProps = {
    title,
    message,
    color: 'green',
    autoClose: 5000,
    icon: '✅',
  };

  if (onAction && actionLabel) {
    notificationProps.withCloseButton = true;
    notificationProps.onClose = () => {}; // Required for autoClose to work with withCloseButton
    notificationProps.action = {
      label: actionLabel,
      onClick: onAction,
    };
  }

  showNotification(notificationProps);
  
  // Also log to console for debugging
  console.info(`${title}:`, message);
}

/**
 * Format and display an error notification
 * @param options - Notification options
 */
export function showErrorNotification({ 
  title, 
  error, 
  message, 
  onRetry, 
  context = {},
  logToSentry = true 
}: ErrorNotificationOptions): void {
  const errorMessage = message || formatErrorMessage(error);
  
  const notificationProps: NotificationProps = {
    title,
    message: errorMessage,
    color: 'red',
    autoClose: 5000,
    icon: '⚠️',
  };

  if (onRetry) {
    notificationProps.withCloseButton = true;
    notificationProps.onClose = () => {}; // Required for autoClose to work with withCloseButton
    notificationProps.action = {
      label: 'Retry',
      onClick: onRetry,
    };
  }

  showNotification(notificationProps);
  
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
 * @param error - The error to format
 * @returns Formatted error message
 */
export function formatErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  
  // Handle string errors
  if (typeof error === 'string') return error;
  
  // Handle Error objects
  if (error instanceof Error) return error.message;
  
  // At this point, we need to treat it as a potentially Axios-like error
  const axiosError = error as AxiosLikeError;
  
  // Handle Axios error responses
  if (axiosError.response) {
    const { status, data } = axiosError.response;
    
    // Handle structured API error responses
    if (data?.detail) {
      // Handle detail as string or object
      if (typeof data.detail === 'string') return data.detail;
      if (typeof data.detail === 'object' && (data.detail as { message?: string }).message) {
        return (data.detail as { message: string }).message;
      }
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
  if (axiosError.code === 'ECONNABORTED') return 'Request timed out';
  if (axiosError.code === 'ERR_NETWORK') return 'Network error. Please check your connection.';
  if (axiosError.message) return axiosError.message;
  
  // Fallback
  return 'An unexpected error occurred';
}

/**
 * Handle form errors returned from API
 * @param error - Error object from API response
 * @param setErrors - Form error setter function
 * @param options - Additional options
 */
export function handleFormErrors(
  error: unknown,
  setErrors: (errors: Record<string, string>) => void,
  { logToSentry = true }: FormErrorHandlerOptions = {}
): void {
  const axiosError = error as AxiosLikeError;
  
  if (!axiosError.response?.data) {
    showErrorNotification({
      title: 'Form Submission Error',
      error,
      logToSentry
    });
    return;
  }
  
  const { data } = axiosError.response;
  
  // Handle structured validation errors 
  if (data.detail && Array.isArray(data.detail)) {
    // FastAPI validation errors format
    const formErrors: Record<string, string> = {};
    
    data.detail.forEach((item: { loc: string[], msg: string }) => {
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
    const formErrors: Record<string, string> = {};
    
    Object.entries(data.errors).forEach(([field, messages]) => {
      formErrors[field] = Array.isArray(messages) ? messages[0] : messages as string;
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
 * @param title - Error notification title
 * @param options - Handler options or legacy onError function
 * @returns Error handler function
 */
export function createErrorHandler(
  title: string,
  options: ErrorHandlerOptions | ((error: unknown) => void) = {}
): (error: unknown) => unknown {
  const { onError, context = {}, logToSentry = true } = typeof options === 'function' 
    ? { onError: options }  // Handle legacy usage
    : options;
    
  return (error: unknown) => {
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
 * @param error - The error to check
 * @returns Whether the error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const axiosError = error as AxiosLikeError;
  
  // Network errors are retryable
  if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ERR_NETWORK') {
    return true;
  }
  
  // Server errors (5xx) are retryable
  if (axiosError.response && axiosError.response.status >= 500 && axiosError.response.status < 600) {
    return true;
  }
  
  // Too many requests (429) is retryable
  if (axiosError.response && axiosError.response.status === 429) {
    return true;
  }
  
  // Some timeouts are retryable but marked differently
  if (axiosError.message && 
     (axiosError.message.includes('timeout') || 
      axiosError.message.includes('timed out'))) {
    return true;
  }
  
  // Generally, client errors (4xx) are not retryable
  return false;
}

/**
 * Error categories
 */
export type ErrorCategory = 
  | 'network'
  | 'timeout'
  | 'client_error'
  | 'server_error'
  | 'type_error'
  | 'syntax_error'
  | 'reference_error'
  | 'unknown';

/**
 * Categorize an error to help with reporting and handling
 * @param error - The error to categorize
 * @returns The error category
 */
export function categorizeError(error: unknown): ErrorCategory {
  const axiosError = error as AxiosLikeError;
  
  // Network errors
  if (axiosError.code === 'ECONNABORTED') return 'timeout';
  if (axiosError.code === 'ERR_NETWORK') return 'network';
  
  // Handle Axios error responses
  if (axiosError.response) {
    const { status } = axiosError.response;
    
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
