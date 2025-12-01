// tests/services/errorAnalyticsService.test.ts

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import errorAnalytics, { ErrorAnalyticsEntry } from '../../src/services/errorAnalyticsService';
import ErrorFactory from '../../src/utils/errorHandling/errorFactory';
import { logErrorToService } from '../../src/utils/errorHandling/errorTracking';

// Mock dependencies
vi.mock('../../src/utils/errorHandling/errorTracking', () => ({
  logErrorToService: vi.fn()
}));

describe('errorAnalyticsService', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    
    return {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      })
    };
  })();
  
  // Mock navigator
  const navigatorMock = {
    userAgent: 'test-user-agent'
  };
  
  // Mock window.location
  const locationMock = {
    href: 'https://test.example.com/path'
  };
  
  beforeEach(() => {
    // Setup mocks
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    Object.defineProperty(window, 'navigator', { value: navigatorMock });
    Object.defineProperty(window, 'location', { value: locationMock });
    
    // Clear localStorage
    localStorageMock.clear();
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Reset analytics service
    errorAnalytics.clearErrors();
  });
  
  describe('recordError', () => {
    it('should record an error to analytics', () => {
      // Create an error to record
      const error = new Error('Test error');
      
      // Record the error
      errorAnalytics.recordError(error, { source: 'test' });
      
      // Get recorded errors
      const errors = errorAnalytics.getErrors();
      
      // Expect one error to be recorded
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('Test error');
      expect(errors[0].category).toBe('unknown'); // Default category
      expect(errors[0].source).toBe('test');
      expect(errors[0].url).toBe('https://test.example.com/path');
      expect(errors[0].userAgent).toBe('test-user-agent');
      expect(errors[0].isRepeated).toBe(false);
      expect(errors[0].impact).toBe('Medium'); // Default impact
      
      // Expect localStorage to be used
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dexter_error_analytics',
        expect.any(String)
      );
      
      // Expect error to be logged to service
      expect(logErrorToService).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          source: 'test',
          errorAnalyticsTracked: true,
          sessionId: expect.any(String)
        })
      );
    });
    
    it('should update existing similar error', () => {
      // Create and record an initial error
      const error1 = new Error('Test error for duplication');
      errorAnalytics.recordError(error1, { 
        source: 'test',
        category: 'network'
      });
      
      // Create and record a similar error
      const error2 = new Error('Test error for duplication');
      errorAnalytics.recordError(error2, { 
        source: 'test',
        category: 'network'
      });
      
      // Get recorded errors
      const errors = errorAnalytics.getErrors();
      
      // Expect only one error to be recorded (updated)
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('Test error for duplication');
      expect(errors[0].isRepeated).toBe(true);
      expect(errors[0].frequency).toBe(2);
    });
    
    it('should determine impact level based on error category', () => {
      // High impact error
      const serverError = ErrorFactory.createApiError('Server error', 500);
      errorAnalytics.recordError(serverError);
      
      // Medium impact error
      const clientError = ErrorFactory.createApiError('Client error', 400);
      errorAnalytics.recordError(clientError);
      
      // Low impact error (default for unknown categories)
      const unknownError = ErrorFactory.create('Unknown error', { 
        category: 'unknown' 
      });
      errorAnalytics.recordError(unknownError);
      
      // Get recorded errors
      const errors = errorAnalytics.getErrors();
      
      // Check impact levels
      const serverErrorRecord = errors.find(e => e.message === 'Server error');
      const clientErrorRecord = errors.find(e => e.message === 'Client error');
      const unknownErrorRecord = errors.find(e => e.message === 'Unknown error');
      
      expect(serverErrorRecord?.impact).toBe('High');
      expect(clientErrorRecord?.impact).toBe('Medium');
      expect(unknownErrorRecord?.impact).toBe('Low');
    });
  });
  
  describe('getErrors', () => {
    it('should return all recorded errors', () => {
      // Record some errors
      errorAnalytics.recordError(new Error('Error 1'));
      errorAnalytics.recordError(new Error('Error 2'));
      errorAnalytics.recordError(new Error('Error 3'));
      
      // Get errors
      const errors = errorAnalytics.getErrors();
      
      // Expect three errors
      expect(errors.length).toBe(3);
      expect(errors.map(e => e.message)).toEqual([
        'Error 1',
        'Error 2',
        'Error 3'
      ]);
    });
    
    it('should load errors from localStorage', () => {
      // Create mock stored errors
      const mockErrors: ErrorAnalyticsEntry[] = [
        {
          id: '123',
          timestamp: new Date().toISOString(),
          message: 'Stored error',
          category: 'network',
          source: 'test',
          url: 'https://test.example.com',
          userAgent: 'test-agent',
          isRepeated: false,
          impact: 'Medium',
          sessionId: 'test-session'
        }
      ];
      
      // Store in localStorage
      localStorageMock.setItem('dexter_error_analytics', JSON.stringify(mockErrors));
      
      // Create new instance (should load from localStorage)
      const newErrorAnalytics = require('../../src/services/errorAnalyticsService').default;
      
      // Get errors
      const errors = newErrorAnalytics.getErrors();
      
      // Expect one error from localStorage
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('Stored error');
    });
  });
  
  describe('getErrorCountByCategory', () => {
    it('should return error counts grouped by category', () => {
      // Record errors with different categories
      errorAnalytics.recordError(
        ErrorFactory.create('Network error 1', { category: 'network' })
      );
      errorAnalytics.recordError(
        ErrorFactory.create('Network error 2', { category: 'network' })
      );
      errorAnalytics.recordError(
        ErrorFactory.createApiError('API error', 404)
      );
      
      // Get error counts by category
      const counts = errorAnalytics.getErrorCountByCategory();
      
      // Expect counts for network and client_error categories
      expect(counts.network).toBe(2);
      expect(counts.client_error).toBe(1);
    });
  });
  
  describe('getErrorCountByImpact', () => {
    it('should return error counts grouped by impact level', () => {
      // Record errors with different impact levels
      errorAnalytics.recordError(
        ErrorFactory.createApiError('Server error', 500)
      ); // High
      
      errorAnalytics.recordError(
        ErrorFactory.createApiError('Client error 1', 400)
      ); // Medium
      
      errorAnalytics.recordError(
        ErrorFactory.createApiError('Client error 2', 400)
      ); // Medium
      
      errorAnalytics.recordError(
        ErrorFactory.create('Low impact error', { 
          category: 'unknown',
          metadata: { impact: 'low' }
        })
      ); // Low
      
      // Get error counts by impact
      const counts = errorAnalytics.getErrorCountByImpact();
      
      // Expect counts for each impact level
      expect(counts.High).toBe(1);
      expect(counts.Medium).toBe(2);
      expect(counts.Low).toBe(1);
    });
  });
  
  describe('clearErrors', () => {
    it('should clear all recorded errors', () => {
      // Record some errors
      errorAnalytics.recordError(new Error('Error 1'));
      errorAnalytics.recordError(new Error('Error 2'));
      
      // Verify errors are recorded
      expect(errorAnalytics.getErrors().length).toBe(2);
      
      // Clear errors
      errorAnalytics.clearErrors();
      
      // Verify errors are cleared
      expect(errorAnalytics.getErrors().length).toBe(0);
      
      // Verify localStorage item is removed
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('dexter_error_analytics');
    });
  });
});
