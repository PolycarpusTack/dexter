// File: src/utils/errorFactory.ts

import { categorizeError, isRetryableError, ErrorCategory } from './errorHandling';

/**
 * Interface for EnhancedError constructor options
 */
export interface EnhancedErrorOptions {
  /** Error category */
  category?: ErrorCategory;
  /** Whether the error is retryable */
  retryable?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Number of retry attempts made */
  retryCount?: number;
  /** Original error object */
  originalError?: Error | null;
}

/**
 * EnhancedError class extends Error with additional context
 */
export class EnhancedError extends Error {
  /** Error category */
  category: ErrorCategory;
  /** Whether the error is retryable */
  retryable: boolean;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** Number of retry attempts made */
  retryCount: number;
  /** Original error object */
  originalError: Error | null;

  /**
   * @param message - Error message
   * @param options - Additional options
   */
  constructor(message: string, options: EnhancedErrorOptions = {}) {
    super(message);
    this.name = 'EnhancedError';
    this.category = options.category || 'unknown';
    this.retryable = options.retryable !== undefined ? options.retryable : false;
    this.metadata = options.metadata || {};
    this.retryCount = options.retryCount || 0;
    this.originalError = options.originalError || null;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnhancedError);
    }
    
    // If we have an original error, append its stack
    if (this.originalError && this.originalError.stack) {
      this.stack = (this.stack || '') + '\nCaused by: ' + this.originalError.stack;
    }
  }
}

/**
 * Interface for network error options
 */
export interface NetworkErrorOptions extends Omit<EnhancedErrorOptions, 'category'> {
  /** Whether the error is retryable (defaults to true for network errors) */
  retryable?: boolean;
}

/**
 * Network error specific class
 */
export class NetworkError extends EnhancedError {
  /**
   * @param message - Error message
   * @param options - Additional options
   */
  constructor(message: string, options: NetworkErrorOptions = {}) {
    super(message, {
      ...options,
      category: 'network',
      retryable: options.retryable !== undefined ? options.retryable : true
    });
    this.name = 'NetworkError';
  }
}

/**
 * Interface for API error options
 */
export interface ApiErrorOptions extends EnhancedErrorOptions {
  /** HTTP status code */
  status: number;
  /** Response data */
  data?: unknown;
}

/**
 * API error specific class
 */
export class ApiError extends EnhancedError {
  /** HTTP status code */
  status: number;
  /** Response data */
  data?: unknown;

  /**
   * @param message - Error message
   * @param options - Additional options
   */
  constructor(message: string, options: ApiErrorOptions) {
    const { status, data, ...rest } = options;
    
    super(message, {
      ...rest,
      category: options.category || (status >= 500 ? 'server_error' : 'client_error'),
      retryable: options.retryable !== undefined ? options.retryable : (status >= 500),
      metadata: {
        ...(options.metadata || {}),
        status,
        data
      }
    });
    
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Type for generic error
 */
export type ErrorLike = Error | { [key: string]: unknown } | string;

/**
 * Type for Axios-like response
 */
interface AxiosResponse {
  status: number;
  data?: unknown;
}

/**
 * Type for Axios-like error
 */
interface AxiosError {
  response?: AxiosResponse;
  code?: string;
  message?: string;
  isAxiosError?: boolean;
  [key: string]: unknown;
}

/**
 * Error factory to create appropriate enhanced error objects
 */
export const ErrorFactory = {
  /**
   * Create an enhanced error from various error types
   * @param error - Original error
   * @param options - Additional options
   * @returns Enhanced error object
   */
  create(error: ErrorLike, options: Partial<EnhancedErrorOptions> = {}): EnhancedError | ApiError | NetworkError {
    // Handle string errors
    if (typeof error === 'string') {
      return new EnhancedError(error, options);
    }
    
    // Default message if none provided
    const message = typeof error === 'object' && 'message' in error && typeof error.message === 'string' 
      ? error.message 
      : 'An unknown error occurred';
    
    // Handle Axios error responses
    if (typeof error === 'object' && 'response' in error && error.response) {
      const axiosError = error as AxiosError;
      const { status, data } = axiosError.response!;
      
      // Try to extract a more specific message from the response
      let apiMessage = message;
      
      if (data && typeof data === 'object') {
        const dataObj = data as Record<string, unknown>;
        
        if ('detail' in dataObj) {
          if (typeof dataObj.detail === 'string') {
            apiMessage = dataObj.detail;
          } else if (typeof dataObj.detail === 'object' && dataObj.detail && 'message' in (dataObj.detail as object)) {
            const detailObj = dataObj.detail as { message?: string };
            if (detailObj.message) {
              apiMessage = detailObj.message;
            }
          }
        } else if ('message' in dataObj && typeof dataObj.message === 'string') {
          apiMessage = dataObj.message;
        }
      }
      
      return new ApiError(apiMessage, {
        status,
        data,
        originalError: error instanceof Error ? error : undefined,
        ...options
      });
    }
    
    // Handle network errors
    if (typeof error === 'object' && 'code' in error) {
      const networkError = error as { code?: string };
      if (networkError.code === 'ECONNABORTED' || networkError.code === 'ERR_NETWORK') {
        return new NetworkError(message, {
          originalError: error instanceof Error ? error : undefined,
          ...options
        });
      }
    }
    
    // Handle regular errors
    if (error instanceof Error) {
      const category = categorizeError(error);
      const retryable = isRetryableError(error);
      
      return new EnhancedError(message, {
        category,
        retryable,
        originalError: error,
        ...options
      });
    }
    
    // Fallback for unknown error types
    return new EnhancedError(message, {
      originalError: error instanceof Error ? error : undefined,
      ...options
    });
  },
  
  /**
   * Create a network error
   * @param message - Error message
   * @param options - Additional options
   * @returns Network error object
   */
  createNetworkError(message: string, options: NetworkErrorOptions = {}): NetworkError {
    return new NetworkError(message, options);
  },
  
  /**
   * Create an API error
   * @param message - Error message
   * @param status - HTTP status code
   * @param data - Response data
   * @param options - Additional options
   * @returns API error object
   */
  createApiError(
    message: string, 
    status: number, 
    data?: unknown, 
    options: Omit<ApiErrorOptions, 'status' | 'data'> = {}
  ): ApiError {
    return new ApiError(message, { status, data, ...options });
  }
};

export default ErrorFactory;
