// File: src/utils/errorHandling/retryManager.ts

import { isRetryableError } from './errorHandling';
import ErrorFactory from './errorFactory';

/**
 * Retry configuration interface
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay between retries (ms) */
  initialDelay: number;
  /** Maximum delay between retries (ms) */
  maxDelay: number;
  /** Exponential backoff multiplier */
  backoffFactor: number;
  /** Function to determine if an error is retryable */
  retryableCheck: (error: unknown) => boolean;
  /** Whether to add randomness to the delay */
  jitter: boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
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
  /** Retry configuration */
  config: RetryConfig;

  /**
   * @param config - Retry configuration
   */
  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }
  
  /**
   * Execute a function with automatic retries
   * @param fn - The function to execute (returning a Promise)
   * @param options - Retry options for this specific call
   * @returns Promise resolving to the function result
   */
  async execute<T>(fn: () => Promise<T>, options: Partial<RetryConfig> = {}): Promise<T> {
    // Merge config with specific options for this call
    const config = { ...this.config, ...options };
    let retryCount = 0;
    let lastError: unknown = null;
    
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
          const enhancedError = ErrorFactory.create(error as Error, {
            retryCount,
            metadata: {
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
          error instanceof Error ? error.message : error
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
   * @param retryCount - Current retry count
   * @param config - Configuration options
   * @returns Delay in milliseconds
   */
  calculateDelay(retryCount: number, config: RetryConfig): number {
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
   * @param apiFn - API function to wrap
   * @param options - Retry options
   * @returns Wrapped function with retry capability
   */
  wrapApiFunction<T extends (...args: any[]) => Promise<any>>(
    apiFn: T,
    options: Partial<RetryConfig> = {}
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return (...args: Parameters<T>) => {
      return this.execute(() => apiFn(...args), options) as Promise<ReturnType<T>>;
    };
  }
}

/**
 * Create a pre-configured RetryManager instance
 * @param config - Custom configuration
 * @returns Configured RetryManager instance
 */
export function createRetryManager(config: Partial<RetryConfig> = {}): RetryManager {
  return new RetryManager(config);
}

// Export default instance with standard configuration
export default new RetryManager();
