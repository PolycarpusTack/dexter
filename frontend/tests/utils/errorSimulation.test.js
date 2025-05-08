// tests/utils/errorSimulation.test.js
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import {
  simulateNetworkError,
  simulateTimeoutError,
  simulateApiError,
  simulateValidationError,
  ErrorComponent,
  createAsyncError,
  createIntermittentFailure,
  createThrottledFunction
} from '../../src/utils/errorSimulation';

describe('Error Simulation Utilities', () => {
  describe('simulateNetworkError', () => {
    it('creates a network error with default message', () => {
      const error = simulateNetworkError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Simulated network error');
      expect(error.code).toBe('ERR_NETWORK');
      expect(error.isAxiosError).toBe(true);
    });

    it('accepts a custom error message', () => {
      const error = simulateNetworkError('Custom network error');
      
      expect(error.message).toBe('Custom network error');
    });
  });

  describe('simulateTimeoutError', () => {
    it('creates a timeout error with default message', () => {
      const error = simulateTimeoutError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Simulated request timeout');
      expect(error.code).toBe('ECONNABORTED');
      expect(error.isAxiosError).toBe(true);
    });

    it('accepts a custom error message', () => {
      const error = simulateTimeoutError('Custom timeout');
      
      expect(error.message).toBe('Custom timeout');
    });
  });

  describe('simulateApiError', () => {
    it('creates an API error with specified status code', () => {
      const error = simulateApiError(404);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.response.status).toBe(404);
      expect(error.message).toBe('Not Found');
      expect(error.isAxiosError).toBe(true);
    });

    it('creates an API error with custom data', () => {
      const data = { detail: 'Item not found' };
      const error = simulateApiError(404, data);
      
      expect(error.response.data).toEqual(data);
    });

    it('accepts a custom error message', () => {
      const error = simulateApiError(500, {}, 'Custom server error');
      
      expect(error.message).toBe('Custom server error');
    });

    it('generates appropriate default messages for common status codes', () => {
      expect(simulateApiError(400).message).toBe('Bad Request');
      expect(simulateApiError(401).message).toBe('Unauthorized');
      expect(simulateApiError(403).message).toBe('Forbidden');
      expect(simulateApiError(429).message).toBe('Too Many Requests');
      expect(simulateApiError(500).message).toBe('Server Error');
      expect(simulateApiError(418).message).toBe('HTTP Error 418');
    });
  });

  describe('simulateValidationError', () => {
    it('creates a validation error with field errors in FastAPI format', () => {
      const fieldErrors = {
        username: 'Username is required',
        email: 'Invalid email format'
      };
      
      const error = simulateValidationError(fieldErrors);
      
      expect(error.response.status).toBe(422);
      expect(error.response.data.detail).toEqual([
        {
          loc: ['body', 'username'],
          msg: 'Username is required',
          type: 'value_error'
        },
        {
          loc: ['body', 'email'],
          msg: 'Invalid email format',
          type: 'value_error'
        }
      ]);
    });
  });

  describe('ErrorComponent', () => {
    beforeEach(() => {
      // Suppress React's error boundary console errors
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('throws an error when rendered', () => {
      // We can't directly test throwing components with RTL,
      // but we can verify that rendering it throws
      expect(() => {
        render(<ErrorComponent />);
      }).toThrow('Simulated React Error');
    });

    it('throws a custom error message when provided', () => {
      expect(() => {
        render(<ErrorComponent message="Custom component error" />);
      }).toThrow('Custom component error');
    });
  });

  describe('createAsyncError', () => {
    it('creates a function that returns a rejected promise', async () => {
      const errorFn = createAsyncError('Async error');
      
      await expect(errorFn()).rejects.toThrow('Async error');
    });

    it('accepts an error object', async () => {
      const customError = new Error('Custom async error');
      customError.code = 'CUSTOM_ERROR';
      
      const errorFn = createAsyncError(customError);
      
      try {
        await errorFn();
      } catch (error) {
        expect(error).toBe(customError);
        expect(error.code).toBe('CUSTOM_ERROR');
      }
    });

    it('respects the specified delay', async () => {
      const errorFn = createAsyncError('Delayed error', 50);
      
      const start = Date.now();
      const promise = errorFn();
      
      await expect(promise).rejects.toThrow('Delayed error');
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some small timing variance
    });
  });

  describe('createIntermittentFailure', () => {
    it('sometimes calls the success function and sometimes fails', async () => {
      // Mock Math.random to control the outcome
      const originalRandom = Math.random;
      
      const successFn = vi.fn().mockResolvedValue('success');
      const errorFn = createIntermittentFailure(successFn, 'Intermittent failure', 50);
      
      // Force success
      Math.random = vi.fn().mockReturnValue(0.6); // 0.6 * 100 = 60, which is > 50% fail rate
      await expect(errorFn('arg1')).resolves.toBe('success');
      expect(successFn).toHaveBeenCalledWith('arg1');
      
      // Force failure
      Math.random = vi.fn().mockReturnValue(0.4); // 0.4 * 100 = 40, which is < 50% fail rate
      await expect(errorFn('arg2')).rejects.toThrow('Intermittent failure');
      
      // Restore Math.random
      Math.random = originalRandom;
    });

    it('works with a function that generates errors', async () => {
      // Mock Math.random
      const originalRandom = Math.random;
      Math.random = vi.fn().mockReturnValue(0.4); // Force failure
      
      const errorGenerator = (arg) => new Error(`Error with ${arg}`);
      const successFn = vi.fn();
      const errorFn = createIntermittentFailure(successFn, errorGenerator);
      
      await expect(errorFn('test arg')).rejects.toThrow('Error with test arg');
      
      // Restore Math.random
      Math.random = originalRandom;
    });
  });

  describe('createThrottledFunction', () => {
    it('fails with 429 after limit is reached', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const throttledFn = createThrottledFunction(fn, 3);
      
      // First 3 calls should succeed
      await expect(throttledFn()).resolves.toBe('success');
      await expect(throttledFn()).resolves.toBe('success');
      await expect(throttledFn()).resolves.toBe('success');
      
      // 4th call should fail with 429
      const error = await throttledFn().catch(e => e);
      expect(error.response.status).toBe(429);
      expect(error.response.data.message).toBe('Rate limit exceeded');
    });

    it('resets the counter after the reset time', async () => {
      vi.useFakeTimers();
      
      const fn = vi.fn().mockResolvedValue('success');
      const resetTimeMs = 1000;
      const throttledFn = createThrottledFunction(fn, 2, resetTimeMs);
      
      // First 2 calls should succeed
      await expect(throttledFn()).resolves.toBe('success');
      await expect(throttledFn()).resolves.toBe('success');
      
      // 3rd call should fail
      await expect(throttledFn()).rejects.toMatchObject({
        response: { status: 429 }
      });
      
      // Advance time past reset
      vi.advanceTimersByTime(resetTimeMs + 100);
      
      // Should succeed again after reset
      await expect(throttledFn()).resolves.toBe('success');
      
      vi.useRealTimers();
    });
  });
});
