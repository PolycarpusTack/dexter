import { AxiosError } from 'axios';

interface EnhancedErrorOptions {
  category?: string;
  retryable?: boolean;
  metadata?: Record<string, any>;
  retryCount?: number;
  originalError?: Error | null;
}

interface ApiErrorOptions extends EnhancedErrorOptions {
  status?: number;
  data?: any;
}

/**
 * EnhancedError class extends Error with additional context
 */
export class EnhancedError extends Error {
  name: string;
  category: string;
  retryable: boolean;
  metadata: Record<string, any>;
  retryCount: number;
  originalError: Error | null;

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
      this.stack += '\nCaused by: ' + this.originalError.stack;
    }
  }
}

/**
 * Network error specific class
 */
export class NetworkError extends EnhancedError {
  constructor(message: string, options: EnhancedErrorOptions = {}) {
    super(message, {
      ...options,
      category: 'network',
      retryable: options.retryable !== undefined ? options.retryable : true
    });
    this.name = 'NetworkError';
  }
}

/**
 * API error specific class
 */
export class ApiError extends EnhancedError {
  status?: number;
  data?: any;

  constructor(message: string, options: ApiErrorOptions = {}) {
    const { status, data, ...rest } = options;
    
    super(message, {
      ...rest,
      category: options.category || (status && status >= 500 ? 'server_error' : 'client_error'),
      retryable: options.retryable !== undefined ? options.retryable : (status ? status >= 500 : false),
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
 * Error factory to create appropriate enhanced error objects
 */
export const ErrorFactory = {
  /**
   * Create an enhanced error from various error types
   */
  create(error: Error | AxiosError | string | any, options: EnhancedErrorOptions = {}): EnhancedError {
    // Handle string errors
    if (typeof error === 'string') {
      return new EnhancedError(error, options);
    }
    
    // Default message if none provided
    const message = error?.message || 'An unknown error occurred';
    
    // Handle Axios error responses
    if ((error as AxiosError)?.response) {
      const axiosError = error as AxiosError;
      const { status, data } = axiosError.response!;
      const apiMessage = data?.detail || data?.message || message;
      
      return new ApiError(apiMessage, {
        status,
        data,
        originalError: error,
        ...options
      });
    }
    
    // Handle network errors
    if ((error as any)?.code === 'ECONNABORTED' || (error as any)?.code === 'ERR_NETWORK') {
      return new NetworkError(message, {
        originalError: error,
        ...options
      });
    }
    
    // Handle regular errors
    if (error instanceof Error) {
      const category = this.categorizeError(error);
      const retryable = this.isRetryableError(error);
      
      return new EnhancedError(message, {
        category,
        retryable,
        originalError: error,
        ...options
      });
    }
    
    // Fallback for unknown error types
    return new EnhancedError(message, {
      originalError: error instanceof Object ? error : undefined,
      ...options
    });
  },
  
  /**
   * Create a network error
   */
  createNetworkError(message: string, options: EnhancedErrorOptions = {}): NetworkError {
    return new NetworkError(message, options);
  },
  
  /**
   * Create an API error
   */
  createApiError(message: string, status: number, data: any, options: EnhancedErrorOptions = {}): ApiError {
    return new ApiError(message, { status, data, ...options });
  },
  
  /**
   * Determine if an error is retryable
   */
  isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      return true;
    }
    
    // Server errors (5xx) are retryable
    if ((error as AxiosError)?.response && (error as AxiosError).response!.status >= 500 && (error as AxiosError).response!.status < 600) {
      return true;
    }
    
    // Generally, client errors (4xx) are not retryable
    return false;
  },
  
  /**
   * Categorize an error to help with reporting and handling
   */
  categorizeError(error: any): string {
    // Network errors
    if (error.code === 'ECONNABORTED') return 'timeout';
    if (error.code === 'ERR_NETWORK') return 'network';
    
    // Handle Axios error responses
    if ((error as AxiosError)?.response) {
      const { status } = (error as AxiosError).response!;
      
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
};

export default ErrorFactory;