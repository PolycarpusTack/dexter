/**
 * Tests for Error Handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorFactory, createErrorHandler } from '../errorHandler';
import { ErrorCategory } from '../types';

// Mock console methods
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn()
  }
}));

// Import the mocked notifications
import { notifications } from '@mantine/notifications';

describe('ErrorHandler', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ErrorFactory', () => {
    it('should create API errors with correct properties', () => {
      const error = ErrorFactory.createApiError(
        'Test error message',
        404,
        ErrorCategory.CLIENT,
        { detail: 'Not found' }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error message');
      expect(error.status).toBe(404);
      expect(error.category).toBe(ErrorCategory.CLIENT);
      expect(error.data).toEqual({ detail: 'Not found' });
      expect(error.retryable).toBe(false);
      expect(error.retryCount).toBe(0);
    });

    it('should determine category from status code', () => {
      const error401 = ErrorFactory.createApiError('Unauthorized', 401);
      const error403 = ErrorFactory.createApiError('Forbidden', 403);
      const error422 = ErrorFactory.createApiError('Validation error', 422);
      const error429 = ErrorFactory.createApiError('Rate limit', 429);
      const error500 = ErrorFactory.createApiError('Server error', 500);
      const error404 = ErrorFactory.createApiError('Not found', 404);

      expect(error401.category).toBe(ErrorCategory.AUTH);
      expect(error403.category).toBe(ErrorCategory.AUTH);
      expect(error422.category).toBe(ErrorCategory.VALIDATION);
      expect(error429.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(error500.category).toBe(ErrorCategory.SERVER);
      expect(error404.category).toBe(ErrorCategory.CLIENT);
    });

    it('should create network errors', () => {
      const error = ErrorFactory.createNetworkError('Connection error');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Connection error');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.retryable).toBe(true);
    });

    it('should create auth errors', () => {
      const error = ErrorFactory.createAuthError('Unauthorized', 401);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Unauthorized');
      expect(error.status).toBe(401);
      expect(error.category).toBe(ErrorCategory.AUTH);
      expect(error.retryable).toBe(false);
    });

    it('should create validation errors', () => {
      const validationErrors = {
        name: ['Name is required'],
        email: ['Invalid email format']
      };

      const error = ErrorFactory.createValidationError('Validation failed', validationErrors);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Validation failed');
      expect(error.status).toBe(422);
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.data).toEqual(validationErrors);
      expect(error.retryable).toBe(false);
    });

    it('should correctly identify retryable errors', () => {
      // Network error (retryable)
      const networkError = { code: 'ECONNRESET' };
      expect(ErrorFactory.isRetryable(networkError)).toBe(true);

      // 429 error (retryable)
      const rateLimitError = { status: 429 };
      expect(ErrorFactory.isRetryable(rateLimitError)).toBe(true);

      // 500 error (retryable)
      const serverError = { status: 500 };
      expect(ErrorFactory.isRetryable(serverError)).toBe(true);

      // 404 error (not retryable)
      const clientError = { status: 404 };
      expect(ErrorFactory.isRetryable(clientError)).toBe(false);

      // Non-error object (not retryable)
      expect(ErrorFactory.isRetryable('string error')).toBe(false);
      expect(ErrorFactory.isRetryable(null)).toBe(false);

      // Error with retryable flag
      const customError = { retryable: true };
      expect(ErrorFactory.isRetryable(customError)).toBe(true);
    });
  });

  describe('createErrorHandler', () => {
    it('should create an error handler function', () => {
      const errorHandler = createErrorHandler({
        module: 'TestModule'
      });

      expect(typeof errorHandler).toBe('function');
    });

    it('should log errors to console', () => {
      const errorHandler = createErrorHandler({
        module: 'TestModule',
        logToConsole: true,
        showNotifications: false
      });

      const error = new Error('Test error');
      
      // This should log but not throw because rethrow is false
      errorHandler(error, { rethrow: false });
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should show notifications when enabled', () => {
      const errorHandler = createErrorHandler({
        module: 'TestModule',
        logToConsole: false,
        showNotifications: true
      });

      const error = new Error('Test error');
      
      // This should show notification but not throw because rethrow is false
      errorHandler(error, { rethrow: false });
      
      expect(notifications.show).toHaveBeenCalled();
    });

    it('should rethrow errors by default', () => {
      const errorHandler = createErrorHandler({
        module: 'TestModule',
        logToConsole: false,
        showNotifications: false
      });

      const error = new Error('Test error');
      
      // Should throw by default
      expect(() => errorHandler(error)).toThrow('Test error');
    });

    it('should not rethrow errors when specified', () => {
      const errorHandler = createErrorHandler({
        module: 'TestModule',
        logToConsole: false,
        showNotifications: false
      });

      const error = new Error('Test error');
      
      // Should not throw when rethrow is false
      expect(() => errorHandler(error, { rethrow: false })).not.toThrow();
    });

    it('should call custom onError handler if provided', () => {
      const onError = vi.fn();
      const errorHandler = createErrorHandler({
        module: 'TestModule',
        logToConsole: false,
        showNotifications: false,
        onError
      });

      const error = new Error('Test error');
      
      try {
        errorHandler(error);
      } catch (e) {
        // Expected to throw
      }
      
      expect(onError).toHaveBeenCalledWith(error, expect.objectContaining({
        module: 'TestModule'
      }));
    });

    it('should include operation and context in error info', () => {
      const errorHandler = createErrorHandler({
        module: 'TestModule',
        logToConsole: true,
        showNotifications: false
      });

      const error = new Error('Test error');
      const context = { id: '123', action: 'test' };
      
      try {
        errorHandler(error, { 
          operation: 'testOperation',
          context,
          rethrow: true
        });
      } catch (e) {
        // Expected to throw
      }
      
      // Check console was called with context info
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[TestModule:testOperation]')
      );
    });
  });
});