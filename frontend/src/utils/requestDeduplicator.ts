// File: frontend/src/utils/requestDeduplicator.ts

import { AxiosRequestConfig } from 'axios';

/**
 * Request key generator function type
 */
type KeyGenerator = (url: string, config?: AxiosRequestConfig) => string;

/**
 * Request deduplicator options
 */
interface DeduplicatorOptions {
  keyGenerator?: KeyGenerator;
  ttl?: number; // Time to live for deduplication in milliseconds
}

/**
 * Pending request interface
 */
interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  refCount: number;
}

/**
 * Request deduplicator to prevent duplicate concurrent requests
 */
export class RequestDeduplicator {
  private pending: Map<string, PendingRequest<any>> = new Map();
  private options: Required<DeduplicatorOptions>;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: DeduplicatorOptions = {}) {
    this.options = {
      keyGenerator: this.defaultKeyGenerator,
      ttl: 5000, // 5 seconds default TTL
      ...options
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Deduplicate a request
   */
  async deduplicate<T>(
    url: string,
    requestFn: () => Promise<T>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const key = this.options.keyGenerator(url, config);

    // Check if request is already pending
    if (this.pending.has(key)) {
      const pending = this.pending.get(key)!;
      pending.refCount++;
      
      try {
        return await pending.promise;
      } finally {
        pending.refCount--;
        if (pending.refCount === 0) {
          this.pending.delete(key);
        }
      }
    }

    // Create new pending request
    const pendingRequest: PendingRequest<T> = {
      promise: requestFn(),
      timestamp: Date.now(),
      refCount: 1
    };

    this.pending.set(key, pendingRequest);

    try {
      return await pendingRequest.promise;
    } finally {
      pendingRequest.refCount--;
      if (pendingRequest.refCount === 0) {
        this.pending.delete(key);
      }
    }
  }

  /**
   * Default key generator
   */
  private defaultKeyGenerator(url: string, config?: AxiosRequestConfig): string {
    const method = config?.method || 'GET';
    const params = config?.params ? JSON.stringify(config.params) : '';
    const data = config?.data ? JSON.stringify(config.data) : '';
    return `${method}:${url}:${params}:${data}`;
  }

  /**
   * Start cleanup timer for expired requests
   */
  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, pending] of this.pending.entries()) {
        if (now - pending.timestamp > this.options.ttl && pending.refCount === 0) {
          this.pending.delete(key);
        }
      }
    }, this.options.ttl);
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.pending.clear();
  }

  /**
   * Stop the deduplicator
   */
  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * Check if a request is pending
   */
  isPending(url: string, config?: AxiosRequestConfig): boolean {
    const key = this.options.keyGenerator(url, config);
    return this.pending.has(key);
  }
}

// Create default deduplicator instance
export const requestDeduplicator = new RequestDeduplicator();

// Create a deduplicator with custom key generator for more specific matching
export const createDeduplicator = (options?: DeduplicatorOptions) => 
  new RequestDeduplicator(options);

// Decorator for deduplicating async functions
export function deduplicated(keyGenerator?: KeyGenerator) {
  const deduplicator = new RequestDeduplicator({ keyGenerator });

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor?.name || 'Unknown';

    descriptor.value = async function (...args: any[]) {
      // Generate key from class name, method name and arguments to ensure uniqueness
      const key = keyGenerator ? 
        keyGenerator(propertyKey, { data: args }) : 
        `${className}.${propertyKey}:${JSON.stringify(args)}`;

      return deduplicator.deduplicate(
        key,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

export default requestDeduplicator;
