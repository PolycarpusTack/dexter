// File: src/utils/errorFactory.js

/**
 * EnhancedError class extends Error with additional context
 */
export class EnhancedError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   * @param {string} options.category - Error category
   * @param {boolean} options.retryable - Whether the error is retryable
   * @param {Object} options.metadata - Additional metadata
   * @param {number} options.retryCount - Number of retry attempts made
   * @param {Error} options.originalError - Original error object
   */
  constructor(message, options = {}) {
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
  constructor(message, options = {}) {
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
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   * @param {number} options.status - HTTP status code
   * @param {Object} options.data - Response data
   */
  constructor(message, options = {}) {
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
 * Error factory to create appropriate enhanced error objects
 */
export const ErrorFactory = {
  /**
   * Create an enhanced error from various error types
   * @param {Error|Object|string} error - Original error
   * @param {Object} options - Additional options
   * @returns {EnhancedError} - Enhanced error object
   */
  create(error, options = {}) {
    // Handle string errors
    if (typeof error === 'string') {
      return new EnhancedError(error, options);
    }
    
    // Default message if none provided
    const message = error?.message || 'An unknown error occurred';
    
    // Handle Axios error responses
    if (error?.response) {
      const { status, data } = error.response;
      const apiMessage = data?.detail || data?.message || message;
      
      return new ApiError(apiMessage, {
        status,
        data,
        originalError: error,
        ...options
      });
    }
    
    // Handle network errors
    if (error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK') {
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
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   * @returns {NetworkError} - Network error object
   */
  createNetworkError(message, options = {}) {
    return new NetworkError(message, options);
  },
  
  /**
   * Create an API error
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @param {Object} data - Response data
   * @param {Object} options - Additional options
   * @returns {ApiError} - API error object
   */
  createApiError(message, status, data, options = {}) {
    return new ApiError(message, { status, data, ...options });
  },
  
  /**
   * Determine if an error is retryable
   */
  isRetryableError(error) {
    // Network errors are retryable
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      return true;
    }
    
    // Server errors (5xx) are retryable
    if (error.response && error.response.status >= 500 && error.response.status < 600) {
      return true;
    }
    
    // Generally, client errors (4xx) are not retryable
    return false;
  },
  
  /**
   * Categorize an error to help with reporting and handling
   */
  categorizeError(error) {
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
};

export default ErrorFactory;
