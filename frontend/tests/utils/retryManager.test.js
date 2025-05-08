// tests/utils/retryManager.test.js
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RetryManager, createRetryManager } from '../../src/utils/retryManager';
import ErrorFactory from '../../src/utils/errorFactory';
import { isRetryableError } from '../../src/utils/errorHandling';

// Mock dependencies
vi.mock('../../src/utils/errorFactory', () => ({
  default: {
    create: vi.fn((error, options) => ({
      ...error,
      ...options
    }))
  }
}));

vi.mock('../../src/utils/errorHandling', () => ({
  isRetryableError: vi.fn()
}));

describe('RetryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset isRetryableError mock default implementation
    isRetryableError.mockImplementation((error) => {
      if (error.shouldRetry !== undefined) return error.shouldRetry;
      return error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('uses default configuration when no config provided', () => {
      const manager = new RetryManager();
      
      expect(manager.config).toEqual(expect.objectContaining({
        maxRetries: 3,
        initialDelay: 500,
        maxDelay: 10000,
        backoffFactor: 2,
        jitter: true
      }));
    });

    it('merges custom configuration with defaults', () => {
      const manager = new RetryManager({
        maxRetries: 5,
        initialDelay: 1000
      });
      
      expect(manager.config.maxRetries).toBe(5);
      expect(manager.config.initialDelay).toBe(1000);
      expect(manager.config.backoffFactor).toBe(2); // Default value
    });
  });

  describe('calculateDelay', () => {
    it('applies exponential backoff', () => {
      const manager = new RetryManager({
        initialDelay: 100,
        backoffFactor: 2,
        jitter: false
      });
      
      expect(manager.calculateDelay(0, manager.config)).toBe(100);  // 100 * 2^0
      expect(manager.calculateDelay(1, manager.config)).toBe(200);  // 100 * 2^1
      expect(manager.calculateDelay(2, manager.config)).toBe(400);  // 100 * 2^2
      expect(manager.calculateDelay(3, manager.config)).toBe(800);  // 100 * 2^3
    });

    it('caps delay at maxDelay', () => {
      const manager = new RetryManager({
        initialDelay: 1000,
        maxDelay: 2000,
        backoffFactor: 2,
        jitter: false
      });
      
      expect(manager.calculateDelay(0, manager.config)).toBe(1000); // 1000 * 2^0
      expect(manager.calculateDelay(1, manager.config)).toBe(2000); // 1000 * 2^1 = 2000
      expect(manager.calculateDelay(2, manager.config)).toBe(2000); // 1000 * 2^2 = 4000, capped at 2000
    });

    it('adds jitter when enabled', () => {
      const manager = new RetryManager({
        initialDelay: 1000,
        jitter: true
      });
      
      // Mock Math.random to return a predictable value
      const originalRandom = Math.random;
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const delay = manager.calculateDelay(0, manager.config);
      
      // With jitter, the delay should be adjusted
      // For a factor of 0.5, the delay should be exactly the base delay
      expect(delay).toBe(1000);
      
      // Restore Math.random
      Math.random = originalRandom;
    });
  });

  describe('execute', () => {
    it('returns the function result on success', async () => {
      const manager = new RetryManager();
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await manager.execute(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries when function fails with retryable error', async () => {
      const manager = new RetryManager({
        maxRetries: 2,
        initialDelay: 100,
        jitter: false
      });
      
      const error = new Error('Network error');
      error.code = 'ERR_NETWORK';
      
      const fn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');
      
      const executePromise = manager.execute(fn);
      
      // First call fails, should retry after 100ms
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Advance time to trigger first retry
      await vi.advanceTimersByTimeAsync(100);
      expect(fn).toHaveBeenCalledTimes(2);
      
      // Advance time to trigger second retry
      await vi.advanceTimersByTimeAsync(200); // 100ms * 2^1 = 200ms
      expect(fn).toHaveBeenCalledTimes(3);
      
      const result = await executePromise;
      expect(result).toBe('success');
    });

    it('throws enhanced error when max retries exceeded', async () => {
      const manager = new RetryManager({
        maxRetries: 2,
        initialDelay: 100,
        jitter: false
      });
      
      const error = new Error('Network error');
      error.code = 'ERR_NETWORK';
      
      const fn = vi.fn().mockRejectedValue(error);
      
      const executePromise = manager.execute(fn);
      
      // Advance time for all retries
      await vi.advanceTimersByTimeAsync(100); // First retry
      await vi.advanceTimersByTimeAsync(200); // Second retry
      
      await expect(executePromise).rejects.toEqual(expect.objectContaining({
        retryCount: 2,
        metadata: expect.objectContaining({
          retryAttempts: 2,
          maxRetries: 2
        })
      }));
      
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(ErrorFactory.create).toHaveBeenCalled();
    });

    it('does not retry non-retryable errors', async () => {
      const manager = new RetryManager();
      
      const error = new Error('Client error');
      error.response = { status: 400 };
      error.shouldRetry = false;
      
      const fn = vi.fn().mockRejectedValue(error);
      
      await expect(manager.execute(fn)).rejects.toEqual(expect.objectContaining({
        message: 'Client error'
      }));
      
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    it('respects custom retry options', async () => {
      const manager = new RetryManager();
      
      const error = new Error('Custom error');
      error.shouldRetry = false; // Would not retry by default
      
      const fn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');
      
      const options = {
        retryableCheck: () => true, // Override to always retry
        maxRetries: 1,
        initialDelay: 50
      };
      
      const executePromise = manager.execute(fn, options);
      
      // Advance time for the retry
      await vi.advanceTimersByTimeAsync(50);
      
      const result = await executePromise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('wrapApiFunction', () => {
    it('returns a function that executes with retry', async () => {
      const manager = new RetryManager();
      const apiFn = vi.fn().mockResolvedValue('api result');
      
      const wrappedFn = manager.wrapApiFunction(apiFn);
      const result = await wrappedFn('arg1', 'arg2');
      
      expect(result).toBe('api result');
      expect(apiFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('applies custom options to the wrapped function', async () => {
      const manager = new RetryManager();
      
      const error = new Error('API error');
      error.code = 'ERR_NETWORK';
      
      const apiFn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('api result');
      
      const options = {
        maxRetries: 1,
        initialDelay: 50
      };
      
      const wrappedFn = manager.wrapApiFunction(apiFn, options);
      const executePromise = wrappedFn('arg1');
      
      // Advance time for the retry
      await vi.advanceTimersByTimeAsync(50);
      
      const result = await executePromise;
      expect(result).toBe('api result');
      expect(apiFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('createRetryManager', () => {
    it('creates a RetryManager instance with custom config', () => {
      const manager = createRetryManager({
        maxRetries: 5,
        initialDelay: 1000
      });
      
      expect(manager).toBeInstanceOf(RetryManager);
      expect(manager.config.maxRetries).toBe(5);
      expect(manager.config.initialDelay).toBe(1000);
    });
  });
});
