/**
 * Tests for AI API module
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import * as aiApi from '../aiApi';
import enhancedApiClient from '../enhancedApiClient';
import { createErrorHandler } from '../errorHandler';

// Mock the enhanced API client
vi.mock('../enhancedApiClient', () => ({
  default: {
    callEndpoint: vi.fn()
  }
}));

// Mock the error handler
vi.mock('../errorHandler', () => ({
  createErrorHandler: vi.fn().mockReturnValue(vi.fn()),
  showErrorNotification: vi.fn()
}));

// Console warning spy
let consoleWarnSpy: vi.SpyInstance;

describe('AI API Module', () => {
  // Setup before each test
  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // Cleanup after each test
  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('getModels', () => {
    it('should fetch and validate AI models', async () => {
      // Mock data
      const mockModels = [
        {
          id: 'model1',
          name: 'Model One',
          description: 'Description for Model One',
          provider: 'ollama'
        },
        {
          id: 'model2',
          name: 'Model Two',
          description: 'Description for Model Two',
          provider: 'ollama'
        }
      ];

      // Setup mock
      vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce(mockModels);

      // Call the function
      const result = await aiApi.getModels();

      // Assertions
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'ai',
        'models',
        {},
        {},
        null,
        undefined
      );
      expect(result).toEqual(mockModels);
    });

    it('should return an empty array when the response is not an array', async () => {
      // Setup mock
      vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce({ error: 'Not an array' });

      // Call the function
      const result = await aiApi.getModels();

      // Assertions
      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(
        'AI models response is not an array:',
        { error: 'Not an array' }
      );
    });

    it('should handle validation errors but still return data', async () => {
      // Mock data with missing required field
      const mockModels = [
        {
          id: 'model1',
          // name is missing, which should cause validation error
          description: 'Description for Model One',
          provider: 'ollama'
        }
      ];

      // Setup mock
      vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce(mockModels);
      
      // Spy on the validation function
      const validateSpy = vi.spyOn(z.array(aiApi.aiModelSchema), 'parse');

      // Call the function
      const result = await aiApi.getModels();

      // Assertions
      expect(validateSpy).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        'AI models validation failed:',
        expect.any(Error)
      );
      expect(result).toEqual(mockModels);
    });

    it('should handle API errors and throw', async () => {
      // Setup mock to throw error
      const mockError = new Error('API error');
      vi.mocked(enhancedApiClient.callEndpoint).mockRejectedValueOnce(mockError);

      // Call the function and expect it to throw
      await expect(aiApi.getModels()).rejects.toThrow('API error');
      
      // Verify error handler was called
      expect(createErrorHandler).toHaveBeenCalled();
    });
  });

  describe('fetchModelsList', () => {
    it('should fetch and validate Ollama models', async () => {
      // Mock data
      const mockResponse = {
        models: [
          {
            name: 'llama2',
            status: 'available',
            size: 3800000000,
            modified_at: '2023-10-15T10:30:00Z'
          }
        ],
        ollama_status: 'available'
      };

      // Setup mock
      vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce(mockResponse);

      // Call the function
      const result = await aiApi.fetchModelsList();

      // Assertions
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'ai',
        'ollamaModels',
        {},
        {},
        null,
        {
          timeout: 15000
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle validation errors but still return data', async () => {
      // Mock data with invalid status
      const mockResponse = {
        models: [
          {
            name: 'llama2',
            status: 'invalid_status', // Invalid status
            size: 3800000000
          }
        ],
        ollama_status: 'available'
      };

      // Setup mock
      vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce(mockResponse);

      // Call the function
      const result = await aiApi.fetchModelsList();

      // Assertions
      expect(console.warn).toHaveBeenCalledWith(
        'Ollama models validation failed:',
        expect.any(Error)
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return fallback response on API error', async () => {
      // Setup mock to throw error
      const mockError = new Error('API error');
      vi.mocked(enhancedApiClient.callEndpoint).mockRejectedValueOnce(mockError);

      // Call the function
      const result = await aiApi.fetchModelsList();

      // Assertions
      expect(result).toEqual({
        models: [],
        ollama_status: 'error',
        error: 'API error'
      });
    });
  });

  describe('explainError', () => {
    it('should validate request and call API', async () => {
      // Mock data
      const mockRequest = {
        eventId: 'event123',
        options: {
          maxTokens: 1000,
          includeRecommendations: true
        }
      };

      const mockResponse = {
        explanation: 'This is an explanation',
        recommendations: ['Fix this', 'Try that'],
        confidence: 0.9
      };

      // Setup mock
      vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce(mockResponse);

      // Call the function
      const result = await aiApi.explainError(mockRequest);

      // Assertions
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'ai',
        'explainError',
        {},
        {},
        mockRequest,
        {
          timeout: 60000
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error if no error source is provided', async () => {
      // Invalid request with no error source
      const mockRequest = {
        options: {
          maxTokens: 1000
        }
      };

      // Call the function and expect it to throw
      await expect(aiApi.explainError(mockRequest)).rejects.toThrow(
        'At least one of eventId, issueId, or errorText must be provided'
      );
    });

    it('should handle validation errors but still return data', async () => {
      // Mock request and invalid response
      const mockRequest = {
        eventId: 'event123'
      };

      const mockResponse = {
        // Missing required field 'explanation'
        recommendations: ['Fix this', 'Try that'],
        confidence: 0.9
      };

      // Setup mock
      vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce(mockResponse);

      // Call the function
      const result = await aiApi.explainError(mockRequest);

      // Assertions
      expect(console.warn).toHaveBeenCalledWith(
        'Error explanation response validation failed:',
        expect.any(Error)
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors and throw', async () => {
      // Mock request
      const mockRequest = {
        eventId: 'event123'
      };

      // Setup mock to throw error
      const mockError = new Error('API error');
      vi.mocked(enhancedApiClient.callEndpoint).mockRejectedValueOnce(mockError);

      // Call the function and expect it to throw
      await expect(aiApi.explainError(mockRequest)).rejects.toThrow('API error');
    });
  });

  describe('pullModel', () => {
    it('should validate model name and call API', async () => {
      // Mock data
      const mockResponse = {
        status: 'success',
        message: 'Model download initialized',
        name: 'llama2',
        estimated_time: '10 minutes'
      };

      // Setup mock
      vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce(mockResponse);

      // Call the function
      const result = await aiApi.pullModel('llama2');

      // Assertions
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'ai',
        'pullModel',
        {
          model_name: 'llama2'
        },
        {},
        null,
        {
          timeout: 30000
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error if model name is empty', async () => {
      // Call with empty model name
      await expect(aiApi.pullModel('')).rejects.toThrow('Model name is required');
    });

    it('should handle validation errors and create a valid response', async () => {
      // Mock invalid response
      const mockResponse = {
        // Missing required fields
        download_progress: 0.5
      };

      // Setup mock
      vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce(mockResponse);

      // Call the function
      const result = await aiApi.pullModel('llama2');

      // Assertions
      expect(console.warn).toHaveBeenCalledWith(
        'Pull model response validation failed:',
        expect.any(Error)
      );
      expect(result).toEqual({
        status: 'success',
        message: 'Model download initialized',
        name: 'llama2',
        download_progress: 0.5
      });
    });

    it('should handle non-object responses and return fallback', async () => {
      // Mock invalid response
      const mockResponse = 'Not an object';

      // Setup mock
      vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce(mockResponse);

      // Call the function
      const result = await aiApi.pullModel('llama2');

      // Assertions
      expect(console.warn).toHaveBeenCalledWith(
        'Pull model response validation failed:',
        expect.any(Error)
      );
      expect(result).toEqual({
        status: 'success',
        message: 'Model download initialized',
        name: 'llama2'
      });
    });

    it('should handle API errors and throw', async () => {
      // Setup mock to throw error
      const mockError = new Error('API error');
      vi.mocked(enhancedApiClient.callEndpoint).mockRejectedValueOnce(mockError);

      // Call the function and expect it to throw
      await expect(aiApi.pullModel('llama2')).rejects.toThrow('API error');
    });
  });

  describe('setActiveModel', () => {
    it('should validate model name and call API', async () => {
      // Mock data
      const mockResponse = {
        status: 'success',
        message: 'Model set to llama2',
        model: 'llama2'
      };

      // Setup mock
      vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce(mockResponse);

      // Call the function
      const result = await aiApi.setActiveModel('llama2');

      // Assertions
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'ai',
        'setActiveModel',
        {
          model_name: 'llama2'
        },
        {},
        {
          model_name: 'llama2'
        },
        {}
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error if model name is empty', async () => {
      // Call with empty model name
      await expect(aiApi.setActiveModel('')).rejects.toThrow('Model name is required');
    });

    it('should handle validation errors and create a valid response', async () => {
      // Mock invalid response
      const mockResponse = {
        // Missing required fields
        active: true
      };

      // Setup mock
      vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce(mockResponse);

      // Call the function
      const result = await aiApi.setActiveModel('llama2');

      // Assertions
      expect(console.warn).toHaveBeenCalledWith(
        'Set active model response validation failed:',
        expect.any(Error)
      );
      expect(result).toEqual({
        status: 'success',
        message: 'Model set to llama2',
        model: 'llama2',
        active: true
      });
    });

    it('should handle non-object responses and return fallback', async () => {
      // Mock invalid response
      const mockResponse = 'Not an object';

      // Setup mock
      vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce(mockResponse);

      // Call the function
      const result = await aiApi.setActiveModel('llama2');

      // Assertions
      expect(console.warn).toHaveBeenCalledWith(
        'Set active model response validation failed:',
        expect.any(Error)
      );
      expect(result).toEqual({
        status: 'success',
        message: 'Model set to llama2',
        model: 'llama2'
      });
    });

    it('should handle API errors and throw', async () => {
      // Setup mock to throw error
      const mockError = new Error('API error');
      vi.mocked(enhancedApiClient.callEndpoint).mockRejectedValueOnce(mockError);

      // Call the function and expect it to throw
      await expect(aiApi.setActiveModel('llama2')).rejects.toThrow('API error');
    });
  });

  // Helper function tests
  describe('explainErrorByEventId', () => {
    it('should call explainError with the right parameters', async () => {
      // Spy on explainError
      const explainErrorSpy = vi.spyOn(aiApi, 'explainError');
      
      // Mock its implementation
      explainErrorSpy.mockResolvedValueOnce({
        explanation: 'Event explanation'
      });

      // Call the function
      await aiApi.explainErrorByEventId('event123', 'model1', { includeRecommendations: true });

      // Assertions
      expect(explainErrorSpy).toHaveBeenCalledWith(
        {
          eventId: 'event123',
          model: 'model1',
          options: { includeRecommendations: true }
        },
        undefined
      );
    });
  });

  describe('explainErrorByIssueId', () => {
    it('should call explainError with the right parameters', async () => {
      // Spy on explainError
      const explainErrorSpy = vi.spyOn(aiApi, 'explainError');
      
      // Mock its implementation
      explainErrorSpy.mockResolvedValueOnce({
        explanation: 'Issue explanation'
      });

      // Call the function
      await aiApi.explainErrorByIssueId('issue123', 'model1', { includeRecommendations: true });

      // Assertions
      expect(explainErrorSpy).toHaveBeenCalledWith(
        {
          issueId: 'issue123',
          model: 'model1',
          options: { includeRecommendations: true }
        },
        undefined
      );
    });
  });

  describe('explainErrorText', () => {
    it('should call explainError with the right parameters', async () => {
      // Spy on explainError
      const explainErrorSpy = vi.spyOn(aiApi, 'explainError');
      
      // Mock its implementation
      explainErrorSpy.mockResolvedValueOnce({
        explanation: 'Text explanation'
      });

      // Call the function
      await aiApi.explainErrorText(
        'Error text', 
        'Stack trace', 
        'model1', 
        { includeRecommendations: true }
      );

      // Assertions
      expect(explainErrorSpy).toHaveBeenCalledWith(
        {
          errorText: 'Error text',
          stackTrace: 'Stack trace',
          model: 'model1',
          options: { includeRecommendations: true }
        },
        undefined
      );
    });
  });
});