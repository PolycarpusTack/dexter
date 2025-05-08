// tests/utils/errorFactory.test.js
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ErrorFactory, { EnhancedError, NetworkError, ApiError } from '../../src/utils/errorFactory';
import { categorizeError, isRetryableError } from '../../src/utils/errorHandling';

// Mock dependencies
vi.mock('../../src/utils/errorHandling', () => ({
  categorizeError: vi.fn((error) => {
    if (error.code === 'ECONNABORTED') return 'timeout';
    if (error.code === 'ERR_NETWORK') return 'network';
    if (error.response?.status >= 400 && error.response?.status < 500) return 'client_error';
    if (error.response?.status >= 500) return 'server_error';
    if (error instanceof TypeError) return 'type_error';
    return 'unknown';
  }),
  isRetryableError: vi.fn((error) => {
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') return true;
    if (error.response?.status >= 500) return true;
    if (error.response?.status === 429) return true;
    return false;
  })
}));

describe('ErrorFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('EnhancedError class', () => {
    it('extends Error with additional properties', () => {
      const error = new EnhancedError('Test error', {
        category: 'test',
        retryable: true,
        metadata: { test: 'value' },
        retryCount: 2
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('EnhancedError');
      expect(error.category).toBe('test');
      expect(error.retryable).toBe(true);
      expect(error.metadata).toEqual({ test: 'value' });
      expect(error.retryCount).toBe(2);
    });

    it('provides default values for optional properties', () => {
      const error = new EnhancedError('Test error');

      expect(error.category).toBe('unknown');
      expect(error.retryable).toBe(false);
      expect(error.metadata).toEqual({});
      expect(error.retryCount).toBe(0);
      expect(error.originalError).toBe(null);
    });

    it('attaches original error stack', () => {
      const originalError = new Error('Original error');
      const error = new EnhancedError('Enhanced error', {
        originalError
      });

      expect(error.originalError).toBe(originalError);
      expect(error.stack).toContain('Caused by:');
    });
  });

  describe('NetworkError class', () => {
    it('extends EnhancedError with network-specific defaults', () => {
      const error = new NetworkError('Network failed');

      expect(error).toBeInstanceOf(EnhancedError);
      expect(error.name).toBe('NetworkError');
      expect(error.category).toBe('network');
      expect(error.retryable).toBe(true);
    });

    it('allows overriding the retryable property', () => {
      const error = new NetworkError('Network failed', { retryable: false });

      expect(error.retryable).toBe(false);
    });
  });

  describe('ApiError class', () => {
    it('extends EnhancedError with API-specific properties', () => {
      const error = new ApiError('API failed', {
        status: 404,
        data: { detail: 'Not found' }
      });

      expect(error).toBeInstanceOf(EnhancedError);
      expect(error.name).toBe('ApiError');
      expect(error.category).toBe('client_error');
      expect(error.retryable).toBe(false);
      expect(error.status).toBe(404);
      expect(error.data).toEqual({ detail: 'Not found' });
    });

    it('sets category based on status code', () => {
      const error400 = new ApiError('Client error', { status: 400 });
      const error500 = new ApiError('Server error', { status: 500 });

      expect(error400.category).toBe('client_error');
      expect(error500.category).toBe('server_error');
    });

    it('sets retryable based on status code', () => {
      const error400 = new ApiError('Client error', { status: 400 });
      const error500 = new ApiError('Server error', { status: 500 });

      expect(error400.retryable).toBe(false);
      expect(error500.retryable).toBe(true);
    });

    it('allows overriding category and retryable', () => {
      const error = new ApiError('Custom error', {
        status: 400,
        category: 'custom',
        retryable: true
      });

      expect(error.category).toBe('custom');
      expect(error.retryable).toBe(true);
    });
  });

  describe('ErrorFactory.create', () => {
    it('handles string errors', () => {
      const error = ErrorFactory.create('Test error');

      expect(error).toBeInstanceOf(EnhancedError);
      expect(error.message).toBe('Test error');
    });

    it('handles Axios error responses', () => {
      const axiosError = {
        response: {
          status: 404,
          data: {
            detail: 'Resource not found'
          }
        }
      };

      const error = ErrorFactory.create(axiosError);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Resource not found');
      expect(error.status).toBe(404);
      expect(error.data).toEqual({ detail: 'Resource not found' });
    });

    it('handles network errors', () => {
      const networkError = {
        code: 'ERR_NETWORK',
        message: 'Network error'
      };

      const error = ErrorFactory.create(networkError);

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe('Network error');
      expect(error.category).toBe('network');
      expect(error.retryable).toBe(true);
    });

    it('handles timeout errors', () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'Request timed out'
      };

      const error = ErrorFactory.create(timeoutError);

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe('Request timed out');
    });

    it('handles regular Error objects', () => {
      const originalError = new TypeError('Type error');
      
      const error = ErrorFactory.create(originalError);

      expect(error).toBeInstanceOf(EnhancedError);
      expect(error.message).toBe('Type error');
      expect(error.originalError).toBe(originalError);
      expect(categorizeError).toHaveBeenCalledWith(originalError);
      expect(isRetryableError).toHaveBeenCalledWith(originalError);
    });

    it('handles unknown error objects', () => {
      const error = ErrorFactory.create({ custom: 'error' });

      expect(error).toBeInstanceOf(EnhancedError);
      expect(error.message).toBe('An unknown error occurred');
      expect(error.originalError).toEqual({ custom: 'error' });
    });

    it('allows additional options', () => {
      const error = ErrorFactory.create('Test error', {
        category: 'custom',
        retryable: true,
        metadata: { foo: 'bar' }
      });

      expect(error.category).toBe('custom');
      expect(error.retryable).toBe(true);
      expect(error.metadata).toEqual({ foo: 'bar' });
    });
  });

  describe('ErrorFactory.createNetworkError', () => {
    it('creates a NetworkError', () => {
      const error = ErrorFactory.createNetworkError('Network failed');

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe('Network failed');
    });

    it('accepts additional options', () => {
      const error = ErrorFactory.createNetworkError('Network failed', {
        retryable: false,
        metadata: { attempt: 3 }
      });

      expect(error.retryable).toBe(false);
      expect(error.metadata).toEqual({ attempt: 3 });
    });
  });

  describe('ErrorFactory.createApiError', () => {
    it('creates an ApiError', () => {
      const error = ErrorFactory.createApiError('API failed', 400, { message: 'Bad request' });

      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('API failed');
      expect(error.status).toBe(400);
      expect(error.data).toEqual({ message: 'Bad request' });
    });

    it('accepts additional options', () => {
      const error = ErrorFactory.createApiError('API failed', 400, { message: 'Bad request' }, {
        category: 'custom',
        retryable: true
      });

      expect(error.category).toBe('custom');
      expect(error.retryable).toBe(true);
    });
  });
});
