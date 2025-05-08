// File: src/utils/retryManager.js

import { isRetryableError } from './errorHandling';
import ErrorFactory from './errorFactory';

/**
 * Retry configuration defaults
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 500, // ms
  maxDelay: 10000, // ms
  backoffFactor: 2,
  retryableCheck: isRetryableError,
  jitter: true
};

/**
 * RetryManager class for handling automatic retries with exponential backoff
 */
export class RetryManager {
  /**
   * @param {Object} config - Retry configuration
   * @param {number} config.maxRetries - Maximum number of retry attempts
   * @param {number} config.initialDelay - Initial delay between retries (ms)
   * @param {number} config.maxDelay - Maximum delay between retries (ms)
   * @param {number} config.backoffFactor - Exponential backoff multiplier
   * @param {Function} config.retryableCheck - Function to determine if an error is retryable
   * @param {boolean} config.jitter - Whether to add randomness to the delay
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }
  
  /**
   * Execute a function with automatic retries
   * @param {Function} fn - The function to execute (returning a Promise)
   * @param {Object} options - Retry options for this specific call
   * @returns {Promise} - Promise resolving to the function result
   */
  async execute(fn, options = {}) {
    // Merge config with specific options for this call
    const config = { ...this.config, ...options };
    let retryCount = 0;
    let lastError = null;
    
    // Keep trying until max retries is reached
    while (retryCount <= config.maxRetries) {
      try {
        // Execute the function
        const result = await fn();
        
        // If successful, return the result
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if the error is retryable and we haven't exceeded max retries
        const isRetryable = config.retryableCheck(error);
        
        if (!isRetryable || retryCount >= config.maxRetries) {
          // Enhance the error with retry information before re-throwing
          const enhancedError = ErrorFactory.create(error, {
            retryCount,
            metadata: {
              ...(error.metadata || {}),
              retryAttempts: retryCount,
              maxRetries: config.maxRetries
            }
          });
          
          throw enhancedError;
        }
        
        // Calculate delay for this retry
        const delay = this.calculateDelay(retryCount, config);
        
        // Log retry attempt
        console.warn(
          `Retry attempt ${retryCount + 1}/${config.maxRetries} after ${delay}ms:`,
          error.message || error
        );
        
        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Increment retry counter
        retryCount++;
      }
    }
    
    // This should never be reached due to the error handling above,
    // but just in case
    throw lastError;
  }
  
  /**
   * Calculate delay with exponential backoff and optional jitter
   * @param {number} retryCount - Current retry count
   * @param {Object} config - Configuration options
   * @returns {number} - Delay in milliseconds
   */
  calculateDelay(retryCount, config) {
    // Calculate exponential backoff
    const exponentialDelay = config.initialDelay * Math.pow(config.backoffFactor, retryCount);
    
    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
    
    // Add jitter if enabled (prevents synchronized retries)
    if (config.jitter) {
      // Add up to 25% random jitter
      const jitterRange = cappedDelay * 0.25;
      return cappedDelay - (jitterRange / 2) + (Math.random() * jitterRange);
    }
    
    return cappedDelay;
  }
  
  /**
   * Create a retry wrapper function for API functions
   * @param {Function} apiFn - API function to wrap
   * @param {Object} options - Retry options
   * @returns {Function} - Wrapped function with retry capability
   */
  wrapApiFunction(apiFn, options = {}) {
    return (...args) => {
      return this.execute(() => apiFn(...args), options);
    };
  }
}

/**
 * Create a pre-configured RetryManager instance
 * @param {Object} config - Custom configuration
 * @returns {RetryManager} - Configured RetryManager instance
 */
export function createRetryManager(config = {}) {
  return new RetryManager(config);
}

// Export default instance with standard configuration
export default new RetryManager();
