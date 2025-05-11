// File: frontend/src/utils/requestBatcher.ts

import { AxiosRequestConfig } from 'axios';

/**
 * Request batch item interface
 */
interface BatchItem<T> {
  id: string;
  endpoint: string;
  config?: AxiosRequestConfig;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  timestamp: number;
}

/**
 * Batch processor options
 */
interface BatchOptions {
  maxBatchSize: number;
  maxWaitTime: number;
  enableAutoFlush?: boolean;
}

/**
 * Request batching class to optimize API calls
 */
export class RequestBatcher {
  private batches: Map<string, BatchItem<any>[]> = new Map();
  private processors: Map<string, (items: BatchItem<any>[]) => Promise<any[]>> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private options: BatchOptions;

  constructor(options: Partial<BatchOptions> = {}) {
    this.options = {
      maxBatchSize: 10,
      maxWaitTime: 100, // milliseconds
      enableAutoFlush: true,
      ...options
    };
  }

  /**
   * Register a batch processor for a specific endpoint pattern
   */
  registerProcessor(
    endpointPattern: string,
    processor: (items: BatchItem<any>[]) => Promise<any[]>
  ) {
    this.processors.set(endpointPattern, processor);
  }

  /**
   * Add request to batch
   */
  async batch<T>(
    endpoint: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const batchKey = this.getBatchKey(endpoint, config?.method || 'GET');
      const id = `${Date.now()}-${Math.random()}`;
      
      const item: BatchItem<T> = {
        id,
        endpoint,
        config,
        resolve,
        reject,
        timestamp: Date.now()
      };

      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, []);
      }

      this.batches.get(batchKey)!.push(item);

      // Check if we should flush the batch
      if (this.shouldFlush(batchKey)) {
        this.flushBatch(batchKey);
      } else if (this.options.enableAutoFlush) {
        this.scheduleFlush(batchKey);
      }
    });
  }

  /**
   * Determine if a batch should be flushed
   */
  private shouldFlush(batchKey: string): boolean {
    const batch = this.batches.get(batchKey);
    if (!batch) return false;

    return batch.length >= this.options.maxBatchSize;
  }

  /**
   * Schedule batch flush
   */
  private scheduleFlush(batchKey: string) {
    if (this.timers.has(batchKey)) return;

    const timer = setTimeout(() => {
      this.flushBatch(batchKey);
    }, this.options.maxWaitTime);

    this.timers.set(batchKey, timer);
  }

  /**
   * Flush a batch and process requests
   */
  private async flushBatch(batchKey: string) {
    const batch = this.batches.get(batchKey);
    if (!batch || batch.length === 0) return;

    // Clear the batch and timer
    this.batches.set(batchKey, []);
    if (this.timers.has(batchKey)) {
      clearTimeout(this.timers.get(batchKey)!);
      this.timers.delete(batchKey);
    }

    // Find appropriate processor
    const processor = this.findProcessor(batchKey);
    if (!processor) {
      // No processor found, reject all items
      batch.forEach(item => {
        item.reject(new Error(`No batch processor found for ${batchKey}`));
      });
      return;
    }

    try {
      // Process the batch
      const results = await processor(batch);

      // Resolve individual promises
      batch.forEach((item, index) => {
        if (results[index] !== undefined) {
          item.resolve(results[index]);
        } else {
          item.reject(new Error('No result returned for batch item'));
        }
      });
    } catch (error) {
      // Reject all items on error
      batch.forEach(item => {
        item.reject(error);
      });
    }
  }

  /**
   * Get batch key from endpoint and method
   */
  private getBatchKey(endpoint: string, method: string): string {
    // Extract base path for batching similar requests
    const basePath = endpoint ? endpoint.split('?')[0]?.split('/')?.slice(0, 3)?.join('/') : '';
    return `${method}:${basePath}`;
  }

  /**
   * Find processor for batch key
   */
  private findProcessor(batchKey: string): ((items: BatchItem<any>[]) => Promise<any[]>) | undefined {
    for (const [pattern, processor] of this.processors.entries()) {
      if (batchKey.includes(pattern) || new RegExp(pattern).test(batchKey)) {
        return processor;
      }
    }
    return undefined;
  }

  /**
   * Force flush all batches
   */
  async flushAll() {
    const promises = Array.from(this.batches.keys()).map(key => 
      this.flushBatch(key)
    );
    await Promise.all(promises);
  }

  /**
   * Clear all pending batches
   */
  clear() {
    this.batches.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

// Create default batcher instance
export const requestBatcher = new RequestBatcher();

// Batch processor for issues endpoint
requestBatcher.registerProcessor('GET:/issues', async (items) => {
  // Combine all issue IDs
  const issueIds = items.map(item => {
    const match = item.endpoint.match(/\/issues\/([^\/\?]+)/);
    return match ? match[1] : null;
  }).filter(Boolean);

  if (issueIds.length === 0) return [];

  // Make a single batch request
  const response = await fetch(`/api/issues/batch?ids=${issueIds.join(',')}`);
  const data = await response.json();

  // Map results back to individual requests
  return items.map(item => {
    const match = item.endpoint.match(/\/issues\/([^\/\?]+)/);
    if (match && match[1]) {
      return data[match[1]];
    }
    return null;
  });
});

export default requestBatcher;
