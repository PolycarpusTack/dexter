// tests/utils/errorHandling.test.js
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  formatErrorMessage, 
  showErrorNotification, 
  createErrorHandler,
  isRetryableError,
  categorizeError
} from '../../src/utils/errorHandling';
import { showNotification } from '@mantine/notifications';
import { logErrorToService } from '../../src/utils/errorTracking';

// Mock dependencies
vi.mock('@mantine/notifications', () => ({
  showNotification: vi.fn()
}));

vi.mock('../../src/utils/errorTracking', () => ({
  logErrorToService: vi.fn()
}));

// Spy on console methods
const consoleSpy = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  info: vi.spyOn(console, 'info').mockImplementation(() => {})
};

describe('errorHandling utilities', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('formatErrorMessage', () => {
    it('handles null or undefined errors', () => {
      expect(formatErrorMessage(null)).toBe('An unknown error occurred');
      expect(formatErrorMessage(undefined)).toBe('An unknown error occurred');
    });

    it('handles string errors', () => {
      expect(formatErrorMessage('Test error')).toBe('Test error');
    });

    it('handles Error objects', () => {
      const error = new Error('Test error');
      expect(formatErrorMessage(error)).toBe('Test error');
    });

    it('handles Axios error responses with detail string', () => {
      const error = {
        response: {
          status: 400,
          data: {
            detail: 'Validation failed'
          }
        }
      };
      expect(formatErrorMessage(error)).toBe('Validation failed');
    });

    it('handles Axios error responses with detail object', () => {
      const error = {
        response: {
          status: 400,
          data: {
            detail: {
              message: 'Validation failed'
            }
          }
        }
      };
      expect(formatErrorMessage(error)).toBe('Validation failed');
    });

    it('handles Axios error responses with message', () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: 'Bad request'
          }
        }
      };
      expect(formatErrorMessage(error)).toBe('Bad request');
    });

    it('handles common HTTP status codes', () => {
      const error401 = {
        response: {
          status: 401,
          data: {}
        }
      };
      expect(formatErrorMessage(error401)).toBe('Authentication required. Please check your credentials.');

      const error404 = {
        response: {
          status: 404,
          data: {}
        }
      };
      expect(formatErrorMessage(error404)).toBe('The requested resource was not found.');

      const error500 = {
        response: {
          status: 500,
          data: {}
        }
      };
      expect(formatErrorMessage(error500)).toBe('A server error occurred. Please try again later.');
    });

    it('handles network errors', () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'Request timeout'
      };
      expect(formatErrorMessage(timeoutError)).toBe('Request timed out');

      const networkError = {
        code: 'ERR_NETWORK',
        message: 'Network error'
      };
      expect(formatErrorMessage(networkError)).toBe('Network error. Please check your connection.');
    });

    it('falls back to generic message when no patterns match', () => {
      const unknownError = {
        foo: 'bar'
      };
      expect(formatErrorMessage(unknownError)).toBe('An unexpected error occurred');
    });
  });

  describe('showErrorNotification', () => {
    it('displays a notification with default options', () => {
      const error = new Error('Test error');
      showErrorNotification({
        title: 'Error Title',
        error
      });

      expect(showNotification).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error Title',
        message: 'Test error',
        color: 'red',
        icon: '⚠️'
      }));
      expect(consoleSpy.error).toHaveBeenCalledWith('Error Title:', error);
      expect(logErrorToService).toHaveBeenCalledWith(error, expect.objectContaining({
        source: 'showErrorNotification',
        title: 'Error Title'
      }));
    });

    it('uses a custom message when provided', () => {
      const error = new Error('Test error');
      showErrorNotification({
        title: 'Error Title',
        error,
        message: 'Custom message'
      });

      expect(showNotification).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error Title',
        message: 'Custom message'
      }));
    });

    it('adds a retry action when onRetry is provided', () => {
      const error = new Error('Test error');
      const onRetry = vi.fn();
      showErrorNotification({
        title: 'Error Title',
        error,
        onRetry
      });

      const call = showNotification.mock.calls[0][0];
      expect(call.action).toBeDefined();
      expect(call.action.label).toBe('Retry');
      
      // Simulate clicking the retry button
      call.action.onClick();
      expect(onRetry).toHaveBeenCalled();
    });

    it('skips Sentry logging when disabled', () => {
      const error = new Error('Test error');
      showErrorNotification({
        title: 'Error Title',
        error,
        logToSentry: false
      });

      expect(logErrorToService).not.toHaveBeenCalled();
    });
  });

  describe('createErrorHandler', () => {
    it('returns a function that shows an error notification', () => {
      const handler = createErrorHandler('Test Error');
      const error = new Error('Something went wrong');
      
      handler(error);
      
      expect(showNotification).toHaveBeenCalled();
      expect(logErrorToService).toHaveBeenCalledWith(error, expect.objectContaining({
        source: 'createErrorHandler',
        handlerTitle: 'Test Error'
      }));
    });

    it('calls onError callback if provided', () => {
      const onError = vi.fn();
      const handler = createErrorHandler('Test Error', { onError });
      const error = new Error('Something went wrong');
      
      handler(error);
      
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('handles legacy usage with function as options', () => {
      const onError = vi.fn();
      const handler = createErrorHandler('Test Error', onError);
      const error = new Error('Something went wrong');
      
      handler(error);
      
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('returns the error for potential chaining', () => {
      const handler = createErrorHandler('Test Error');
      const error = new Error('Something went wrong');
      
      const result = handler(error);
      
      expect(result).toBe(error);
    });
  });

  describe('isRetryableError', () => {
    it('identifies network errors as retryable', () => {
      expect(isRetryableError({ code: 'ECONNABORTED' })).toBe(true);
      expect(isRetryableError({ code: 'ERR_NETWORK' })).toBe(true);
    });

    it('identifies server errors (5xx) as retryable', () => {
      expect(isRetryableError({ response: { status: 500 } })).toBe(true);
      expect(isRetryableError({ response: { status: 503 } })).toBe(true);
    });

    it('identifies too many requests (429) as retryable', () => {
      expect(isRetryableError({ response: { status: 429 } })).toBe(true);
    });

    it('identifies timeouts as retryable', () => {
      expect(isRetryableError({ message: 'request timeout' })).toBe(true);
      expect(isRetryableError({ message: 'operation timed out' })).toBe(true);
    });

    it('identifies client errors (4xx) as non-retryable', () => {
      expect(isRetryableError({ response: { status: 400 } })).toBe(false);
      expect(isRetryableError({ response: { status: 404 } })).toBe(false);
    });
  });

  describe('categorizeError', () => {
    it('categorizes network errors', () => {
      expect(categorizeError({ code: 'ECONNABORTED' })).toBe('timeout');
      expect(categorizeError({ code: 'ERR_NETWORK' })).toBe('network');
    });

    it('categorizes HTTP status errors', () => {
      expect(categorizeError({ response: { status: 400 } })).toBe('client_error');
      expect(categorizeError({ response: { status: 500 } })).toBe('server_error');
    });

    it('categorizes JavaScript errors', () => {
      expect(categorizeError(new TypeError())).toBe('type_error');
      expect(categorizeError(new SyntaxError())).toBe('syntax_error');
      expect(categorizeError(new ReferenceError())).toBe('reference_error');
    });

    it('defaults to unknown for unrecognized errors', () => {
      expect(categorizeError({})).toBe('unknown');
    });
  });
});
