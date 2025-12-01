// tests/utils/errorHandling/errorFactory.test.ts

import { vi, describe, it, expect, beforeEach } from 'vitest';
import ErrorFactory, { 
  EnhancedError,
  NetworkError,
  ApiError
} from '../../../src/utils/errorHandling/errorFactory';
import { categorizeError, isRetryableError } from '../../../src/utils/errorHandling/errorHandling';

// Mock dependencies
vi.mock('../../../src/utils/errorHandling/errorHandling', () => ({
  categorizeError: vi.fn(),
  isRetryableError: vi.fn()
}));

describe('errorFactory module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Default mock implementations
    vi.mocked(categorizeError).mockReturnValue('unknown');
    vi.mocked(isRetryableError).mockReturnValue(false);
  });
  
  describe('EnhancedError', () => {
    it('should extend Error with additional properties', () => {
      const error = new EnhancedError('Test error', {
        category: 'network',
        retryable: true,
        metadata: { test: 'value' },
        retryCount: 2
      });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('EnhancedError');
      expect(error.category).toBe('network');
      expect(error.retryable).toBe(true);
      expect(error.metadata).toEqual({ test: 'value' });
      expect(error.retryCount).toBe(2);
    });
    
    it('should use default values when options are not provided', () => {
      const error = new EnhancedError('Test error');
      
      expect(error.category).toBe('unknown');
      expect(error.retryable).toBe(false);
      expect(error.metadata).toEqual({});
      expect(error.retryCount).toBe(0);
      expect(error.originalError).toBe(null);
    });
    
    it('should append original error stack', () => {
      const originalError = new Error('Original error');
      const error = new EnhancedError('Enhanced error', {
        originalError
      });
      
      expect(error.originalError).toBe(originalError);
      expect(error.stack).toContain('Caused by:');
    });
  });
  
  describe('NetworkError', () => {
    it('should extend EnhancedError with network-specific defaults', () => {
      const error = new NetworkError('Network failed');
      
      expect(error).toBeInstanceOf(EnhancedError);
      expect(error.name).toBe('NetworkError');
      expect(error.category).toBe('network');
      expect(error.retryable).toBe(true);
    });
    
    it('should allow overriding the retryable property', () => {
      const error = new NetworkError('Network failed', { retryable: false });
      
      expect(error.retryable).toBe(false);
    });
    
    it('should preserve other EnhancedError properties', () => {
      const originalError = new Error('Original');
      const error = new NetworkError('Network failed', {
        metadata: { test: 'value' },
        retryCount: 3,
        originalError
      });
      
      expect(error.metadata).toEqual({ test: 'value' });
      expect(error.retryCount).toBe(3);
      expect(error.originalError).toBe(originalError);
    });
  });
  
  describe('ApiError', () => {
    it('should extend EnhancedError with API-specific properties', () => {
      const error = new ApiError('API failed', {
        status: 404,
        data: { detail: 'Not found' }
      });
      
      expect(error).toBeInstanceOf(EnhancedError);
      expect(error.name).toBe('ApiError');
      expect(error.status).toBe(404);
      expect(error.data).toEqual({ detail: 'Not found' });
    });
    
    it('should set category based on status code', () => {
      const error400 = new ApiError('Client error', { status: 400 });
      const error500 = new ApiError('Server error', { status: 500 });
      
      expect(error400.category).toBe('client_error');
      expect(error500.category).toBe('server_error');
    });
    
    it('should set retryable based on status code', () => {
      const error400 = new ApiError('Client error', { status: 400 });
      const error500 = new ApiError('Server error', { status: 500 });
      
      expect(error400.retryable).toBe(false);
      expect(error500.retryable).toBe(true);
    });
    
    it('should allow overriding category and retryable', () => {
      const error = new ApiError('Custom error', {
        status: 400,
        category: 'custom',
        retryable: true
      });
      
      expect(error.category).toBe('custom');
      expect(error.retryable).toBe(true);
    });
    
    it('should include status and data in metadata', () => {
      const data = { detail: 'Not found' };
      const error = new ApiError('API error', { status: 404, data });
      
      expect(error.metadata).toMatchObject({
        status: 404,
        data
      });
    });
  });
  
  describe('ErrorFactory.create', () => {
    it('should handle string errors', () => {
      const error = ErrorFactory.create('Test error');
      
      expect(error).toBeInstanceOf(EnhancedError);
      expect(error.message).toBe('Test error');
    });
    
    it('should handle Error objects', () => {
      const originalError = new Error('Original error');
      const error = ErrorFactory.create(originalError);
      
      expect(error).toBeInstanceOf(EnhancedError);
      expect(error.message).toBe('Original error');
      expect(error.originalError).toBe(originalError);
      
      // Should use categorizeError and isRetryableError
      expect(categorizeError).toHaveBeenCalledWith(originalError);
      expect(isRetryableError).toHaveBeenCalledWith(originalError);
    });
    
    it('should handle Axios-like errors with response', () => {
      const axiosError = {
        response: {
          status: 404,
          data: { detail: 'Not found' }
        },
        message: 'Request failed with status code 404'
      };
      
      const error = ErrorFactory.create(axiosError);
      
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(404);
      expect(error.data).toEqual({ detail: 'Not found' });
    });
    
    it('should extract message from response data', () => {
      // With string detail
      const error1 = ErrorFactory.create({
        response: {
          status: 400,
          data: { detail: 'Validation error' }
        }
      });
      expect(error1.message).toBe('Validation error');
      
      // With object detail
      const error2 = ErrorFactory.create({
        response: {
          status: 400,
          data: { detail: { message: 'Field error' } }
        }
      });
      expect(error2.message).toBe('Field error');
      
      // With message property
      const error3 = ErrorFactory.create({
        response: {
          status: 400,
          data: { message: 'Bad request' }
        }
      });
      expect(error3.message).toBe('Bad request');
    });
    
    it('should handle network errors', () => {
      const networkError1 = {
        code: 'ECONNABORTED',
        message: 'Request timed out'
      };
      
      const error1 = ErrorFactory.create(networkError1);
      expect(error1).toBeInstanceOf(NetworkError);
      expect(error1.message).toBe('Request timed out');
      
      const networkError2 = {
        code: 'ERR_NETWORK',
        message: 'Network error'
      };
      
      const error2 = ErrorFactory.create(networkError2);
      expect(error2).toBeInstanceOf(NetworkError);
      expect(error2.message).toBe('Network error');
    });
    
    it('should handle unknown error types', () => {
      const unknownError = { foo: 'bar' };
      const error = ErrorFactory.create(unknownError);
      
      expect(error).toBeInstanceOf(EnhancedError);
      expect(error.message).toBe('An unknown error occurred');
    });
    
    it('should apply additional options', () => {
      const originalError = new Error('Test');
      const error = ErrorFactory.create(originalError, {
        category: 'custom',
        retryable: true,
        metadata: { foo: 'bar' },
        retryCount: 3
      });
      
      expect(error.category).toBe('custom');
      expect(error.retryable).toBe(true);
      expect(error.metadata).toEqual({ foo: 'bar' });
      expect(error.retryCount).toBe(3);
    });
  });
  
  describe('ErrorFactory.createNetworkError', () => {
    it('should create a NetworkError', () => {
      const error = ErrorFactory.createNetworkError('Network failed');
      
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe('Network failed');
      expect(error.category).toBe('network');
      expect(error.retryable).toBe(true);
    });
    
    it('should accept additional options', () => {
      const error = ErrorFactory.createNetworkError('Network failed', {
        retryable: false,
        retryCount: 2,
        metadata: { source: 'test' }
      });
      
      expect(error.retryable).toBe(false);
      expect(error.retryCount).toBe(2);
      expect(error.metadata).toEqual({ source: 'test' });
    });
  });
  
  describe('ErrorFactory.createApiError', () => {
    it('should create an ApiError', () => {
      const error = ErrorFactory.createApiError('API failed', 404, { detail: 'Not found' });
      
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('API failed');
      expect(error.status).toBe(404);
      expect(error.data).toEqual({ detail: 'Not found' });
      expect(error.category).toBe('client_error');
      expect(error.retryable).toBe(false);
    });
    
    it('should handle server errors', () => {
      const error = ErrorFactory.createApiError('Server error', 500);
      
      expect(error.category).toBe('server_error');
      expect(error.retryable).toBe(true);
    });
    
    it('should accept additional options', () => {
      const error = ErrorFactory.createApiError('API error', 400, null, {
        category: 'validation_error',
        retryable: true,
        metadata: { field: 'username' }
      });
      
      expect(error.category).toBe('validation_error');
      expect(error.retryable).toBe(true);
      expect(error.metadata).toMatchObject({ field: 'username' });
    });
  });
});
