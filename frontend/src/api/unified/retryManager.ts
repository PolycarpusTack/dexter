/**
 * Retry manager with exponential backoff
 */

export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
}

export interface RetryContext {
  attempt: number;
  error: any;
  delay: number;
}

export class RetryManager {
  private readonly maxRetries: number;
  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private readonly backoffMultiplier: number;
  private readonly retryCondition: (error: any) => boolean;

  constructor(config: RetryConfig = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.initialDelay = config.initialDelay || 1000;
    this.maxDelay = config.maxDelay || 30000;
    this.backoffMultiplier = config.backoffMultiplier || 2;
    this.retryCondition = config.retryCondition || this.defaultRetryCondition;
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    context?: { onRetry?: (ctx: RetryContext) => void }
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (attempt < this.maxRetries && this.retryCondition(error)) {
          const delay = this.calculateDelay(attempt);
          
          // Call retry callback if provided
          if (context?.onRetry) {
            context.onRetry({ attempt, error, delay });
          }
          
          // Wait before retrying
          await this.sleep(delay);
        } else {
          // No more retries or not retryable
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Calculate delay for exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay = this.initialDelay * Math.pow(this.backoffMultiplier, attempt);
    return Math.min(delay, this.maxDelay);
  }

  /**
   * Default retry condition
   */
  private defaultRetryCondition(error: any): boolean {
    // Retry on network errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    // Retry on specific status codes
    const status = error.response?.status;
    if (status === 429 || status === 502 || status === 503 || status === 504) {
      return true;
    }
    
    // Don't retry on client errors (4xx except 429)
    if (status && status >= 400 && status < 500) {
      return false;
    }
    
    // Retry on other errors
    return true;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: any): boolean {
    return this.retryCondition(error);
  }

  /**
   * Get retry statistics
   */
  getRetryStats(error: any): { 
    isRetryable: boolean; 
    maxRetries: number; 
    backoffStrategy: string 
  } {
    return {
      isRetryable: this.isRetryable(error),
      maxRetries: this.maxRetries,
      backoffStrategy: `exponential (${this.initialDelay}ms, ${this.backoffMultiplier}x)`
    };
  }
}

// Export default retry manager instance
export const defaultRetryManager = new RetryManager();

// Custom retry manager for specific use cases
export const createRetryManager = (config: RetryConfig): RetryManager => {
  return new RetryManager(config);
};