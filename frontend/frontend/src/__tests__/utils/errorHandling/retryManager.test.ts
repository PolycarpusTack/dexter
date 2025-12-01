// tests/utils/errorHandling/retryManager.test.ts

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  RetryManager, 
  createRetryManager,
  RetryConfig
} from '../../../src/utils/errorHandling/retryManager';
import ErrorFactory from '../../../src/utils/errorHandling/errorFactory';
import { isRetryableError } from '../../../src/utils/errorHandling/errorHandling';

// Mock dependencies
vi.mock('../../../src/utils/errorHandling/errorFactory', () => ({
  default: {
    create: vi.fn((error, options) => ({
      ...error,
      ...options
    }))
  }
}));

vi.mock('../../../src/utils/errorHandling/errorHandling', () => ({
  isRetryableError: vi.fn()
}));

describe('retryManager module', () => {
  // Mock console methods
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default mock implementations
    vi.mocked(isRetryableError).mockImplementation((error: any) => {
      return error?.retryable === true || error?.code === 'ERR_NETWORK';
    });
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  describe('RetryManager', () => {
    describe('constructor', () => {
      it('should use default configuration when not provided', () => {
        const manager = new RetryManager();
        
        expect(manager.config.maxRetries).toBe(3);
        expect(manager.config.initialDelay).toBe(500);
        expect(manager.config.maxDelay).toBe(10000);
        expect(manager.config.backoffFactor).toBe(2);
        expect(manager.config.jitter).toBe(true);
        expect(manager.config.retryableCheck).toBe(isRetryableError);
      });
      
      it('should merge custom configuration with defaults', () => {
        const manager = new RetryManager({
          maxRetries: 5,
          initialDelay: 100,
          backoffFactor: 3
        });
        
        expect(manager.config.maxRetries).toBe(5);
        expect(manager.config.initialDelay).toBe(100);
        expect(manager.config.backoffFactor).toBe(3);
        expect(manager.config.maxDelay).toBe(10000); // Default
        expect(manager.config.jitter).toBe(true); // Default
      });
      
      it('should allow custom retryableCheck function', () => {
        const customCheck = (error: unknown) => false;
        const manager = new RetryManager({
          retryableCheck: customCheck
        });
        
        expect(manager.config.retryableCheck).toBe(customCheck);
      });
    });
    
    describe('calculateDelay', () => {
      it('should calculate delay with exponential backoff', () => {
        const manager = new RetryManager({
          initialDelay: 100,
          backoffFactor: 2,
          jitter: false
        });
        
        expect(manager.calculateDelay(0, manager.config)).toBe(100); // 100 * 2^0
        expect(manager.calculateDelay(1, manager.config)).toBe(200); // 100 * 2^1
        expect(manager.calculateDelay(2, manager.config)).toBe(400); // 100 * 2^2
        expect(manager.calculateDelay(3, manager.config)).toBe(800); // 100 * 2^3
      });
      
      it('should cap delay at maxDelay', () => {
        const manager = new RetryManager({
          initialDelay: 100,
          maxDelay: 250,
          backoffFactor: 2,
          jitter: false
        });
        
        expect(manager.calculateDelay(0, manager.config)).toBe(100); // 100 * 2^0
        expect(manager.calculateDelay(1, manager.config)).toBe(200); // 100 * 2^1
        expect(manager.calculateDelay(2, manager.config)).toBe(250); // Capped at maxDelay
        expect(manager.calculateDelay(3, manager.config)).toBe(250); // Capped at maxDelay
      });
      
      it('should add jitter when enabled', () => {
        const manager = new RetryManager({
          initialDelay: 100,
          jitter: true
        });
        
        // Mock Math.random to return a predictable value
        const originalRandom = Math.random;
        Math.random = vi.fn().mockReturnValue(0.5);
        
        // With jitter at 0.5, should be exactly the base delay
        // (if random is 0, would be 12.5% lower; if 1, would be 12.5% higher)
        expect(manager.calculateDelay(0, manager.config)).toBe(100);
        
        // Restore Math.random
        Math.random = originalRandom;
      });
    });
    
    describe('execute', () => {
      it('should return function result on success', async () => {
        const manager = new RetryManager();
        const fn = vi.fn().mockResolvedValue('success');
        
        const result = await manager.execute(fn);
        
        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
      });
      
      it('should retry when function fails with retryable error', async () => {
        const manager = new RetryManager({
          maxRetries: 2,
          initialDelay: 100,
          jitter: false // Disable jitter for predictable tests
        });
        
        const error = new Error('Network error');
        (error as any).code = 'ERR_NETWORK';
        
        const fn = vi.fn()
          .mockRejectedValueOnce(error)
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce('success');
        
        const promise = manager.execute(fn);
        
        // First call happens immediately
        expect(fn).toHaveBeenCalledTimes(1);
        
        // Advance timer to trigger first retry
        await vi.advanceTimersByTimeAsync(100);
        expect(fn).toHaveBeenCalledTimes(2);
        
        // Advance timer to trigger second retry
        await vi.advanceTimersByTimeAsync(200); // 100ms * 2^1
        expect(fn).toHaveBeenCalledTimes(3);
        
        const result = await promise;
        expect(result).toBe('success');
        
        // Verify console.warn was called for each retry
        expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
      });
      
      it('should stop retrying after maxRetries and throw enhanced error', async () => {
        const manager = new RetryManager({
          maxRetries: 2,
          initialDelay: 100,
          jitter: false
        });
        
        const error = new Error('Network error');
        (error as any).code = 'ERR_NETWORK';
        
        const fn = vi.fn().mockRejectedValue(error);
        
        const promise = manager.execute(fn);
        
        // Advance timers for all retries
        await vi.advanceTimersByTimeAsync(100); // First retry
        await vi.advanceTimersByTimeAsync(200); // Second retry
        
        await expect(promise).rejects.toMatchObject({
          retryCount: 2,
          metadata: {
            retryAttempts: 2,
            maxRetries: 2
          }
        });
        
        expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
        expect(ErrorFactory.create).toHaveBeenCalled();
      });
      
      it('should not retry non-retryable errors', async () => {
        const manager = new RetryManager();
        
        const error = new Error('Client error');
        
        const fn = vi.fn().mockRejectedValue(error);
        
        await expect(manager.execute(fn)).rejects.toBeDefined();
        expect(fn).toHaveBeenCalledTimes(1); // No retries
      });
      
      it('should respect custom retry options', async () => {
        const manager = new RetryManager();
        
        const error = new Error('Custom error');
        
        const fn = vi.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce('success');
        
        const customCheck = vi.fn().mockReturnValue(true);
        
        const promise = manager.execute(fn, {
          retryableCheck: customCheck,
          maxRetries: 1,
          initialDelay: 50,
          jitter: false
        });
        
        await vi.advanceTimersByTimeAsync(50);
        
        const result = await promise;
        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
        expect(customCheck).toHaveBeenCalledWith(error);
      });
    });
    
    describe('wrapApiFunction', () => {
      it('should return a function that executes with retry', async () => {
        const manager = new RetryManager();
        const apiFn = vi.fn().mockResolvedValue('api result');
        
        const wrappedFn = manager.wrapApiFunction(apiFn);
        const result = await wrappedFn('arg1', 'arg2');
        
        expect(result).toBe('api result');
        expect(apiFn).toHaveBeenCalledWith('arg1', 'arg2');
      });
      
      it('should apply retry options to the wrapped function', async () => {
        const manager = new RetryManager();
        
        const error = new Error('API error');
        (error as any).code = 'ERR_NETWORK';
        
        const apiFn = vi.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce('api result');
        
        const wrappedFn = manager.wrapApiFunction(apiFn, {
          maxRetries: 1,
          initialDelay: 50,
          jitter: false
        });
        
        const promise = wrappedFn('arg1');
        
        await vi.advanceTimersByTimeAsync(50);
        
        const result = await promise;
        expect(result).toBe('api result');
        expect(apiFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
      });
    });
  });
  
  describe('createRetryManager', () => {
    it('should create a RetryManager instance with custom config', () => {
      const manager = createRetryManager({
        maxRetries: 5,
        initialDelay: 1000
      });
      
      expect(manager).toBeInstanceOf(RetryManager);
      expect(manager.config.maxRetries).toBe(5);
      expect(manager.config.initialDelay).toBe(1000);
    });
  });
  
  describe('default export', () => {
    it('should be an instance of RetryManager', () => {
      const retryManager = require('../../../src/utils/errorHandling/retryManager').default;
      expect(retryManager).toBeInstanceOf(RetryManager);
    });
  });
});
