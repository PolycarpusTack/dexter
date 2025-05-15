/**
 * Integration tests for AI API module
 * 
 * These tests use MSW to mock the API server responses for more realistic testing.
 */

import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import * as aiApi from '../../aiApi';
import { apiConfig } from '../../apiConfig';
import { resolveApiPath } from '../../pathResolver';

// Create MSW server
const server = setupServer();

// Get API paths from configuration
const explainErrorPath = resolveApiPath('ai', 'explainError');
const modelsPath = resolveApiPath('ai', 'models');
const ollamaModelsPath = resolveApiPath('ai', 'ollamaModels');
const pullModelPath = resolveApiPath('ai', 'pullModel', { model_name: ':modelName' });
const setActiveModelPath = resolveApiPath('ai', 'setActiveModel', { model_name: ':modelName' });

// Set up the server
beforeAll(() => {
  // Mock console warnings to reduce noise
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  // Start the server
  server.listen();
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
  vi.restoreAllMocks();
});

describe('AI API Integration Tests', () => {
  describe('getModels', () => {
    it('should fetch models from the API', async () => {
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

      // Set up a mock response handler
      server.use(
        rest.get(modelsPath, (req, res, ctx) => {
          return res(ctx.status(200), ctx.json(mockModels));
        })
      );

      // Call the function
      const result = await aiApi.getModels();

      // Assertions
      expect(result).toEqual(mockModels);
    });

    it('should handle API errors', async () => {
      // Set up a mock error response
      server.use(
        rest.get(modelsPath, (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Server error' }));
        })
      );

      // Call the function and expect it to throw
      await expect(aiApi.getModels()).rejects.toThrow();
    });
  });

  describe('fetchModelsList', () => {
    it('should fetch Ollama models from the API', async () => {
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

      // Set up a mock response handler
      server.use(
        rest.get(ollamaModelsPath, (req, res, ctx) => {
          return res(ctx.status(200), ctx.json(mockResponse));
        })
      );

      // Call the function
      const result = await aiApi.fetchModelsList();

      // Assertions
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors and return fallback response', async () => {
      // Set up a mock error response
      server.use(
        rest.get(ollamaModelsPath, (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Server error' }));
        })
      );

      // Call the function
      const result = await aiApi.fetchModelsList();

      // Assertions
      expect(result).toEqual({
        models: [],
        ollama_status: 'error',
        error: expect.any(String)
      });
    });
  });

  describe('explainError', () => {
    it('should send request and receive explanation', async () => {
      // Mock request/response
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

      // Set up a mock response handler
      server.use(
        rest.post(explainErrorPath, (req, res, ctx) => {
          return res(ctx.status(200), ctx.json(mockResponse));
        })
      );

      // Call the function
      const result = await aiApi.explainError(mockRequest);

      // Assertions
      expect(result).toEqual(mockResponse);
    });

    it('should throw if no error source is provided', async () => {
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

    it('should handle API errors', async () => {
      // Mock request
      const mockRequest = {
        eventId: 'event123'
      };

      // Set up a mock error response
      server.use(
        rest.post(explainErrorPath, (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Server error' }));
        })
      );

      // Call the function and expect it to throw
      await expect(aiApi.explainError(mockRequest)).rejects.toThrow();
    });
  });

  describe('pullModel', () => {
    it('should send request to pull a model', async () => {
      // Mock response
      const mockResponse = {
        status: 'success',
        message: 'Model download initialized',
        name: 'llama2',
        estimated_time: '10 minutes'
      };

      // Set up a mock response handler
      server.use(
        rest.post(pullModelPath.replace(':modelName', 'llama2'), (req, res, ctx) => {
          return res(ctx.status(200), ctx.json(mockResponse));
        })
      );

      // Call the function
      const result = await aiApi.pullModel('llama2');

      // Assertions
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error if model name is empty', async () => {
      // Call with empty model name
      await expect(aiApi.pullModel('')).rejects.toThrow('Model name is required');
    });

    it('should handle API errors', async () => {
      // Set up a mock error response
      server.use(
        rest.post(pullModelPath.replace(':modelName', 'llama2'), (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Server error' }));
        })
      );

      // Call the function and expect it to throw
      await expect(aiApi.pullModel('llama2')).rejects.toThrow();
    });
  });

  describe('setActiveModel', () => {
    it('should send request to set active model', async () => {
      // Mock response
      const mockResponse = {
        status: 'success',
        message: 'Model set to llama2',
        model: 'llama2'
      };

      // Set up a mock response handler
      server.use(
        rest.post(setActiveModelPath.replace(':modelName', 'llama2'), (req, res, ctx) => {
          return res(ctx.status(200), ctx.json(mockResponse));
        })
      );

      // Call the function
      const result = await aiApi.setActiveModel('llama2');

      // Assertions
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error if model name is empty', async () => {
      // Call with empty model name
      await expect(aiApi.setActiveModel('')).rejects.toThrow('Model name is required');
    });

    it('should handle API errors', async () => {
      // Set up a mock error response
      server.use(
        rest.post(setActiveModelPath.replace(':modelName', 'llama2'), (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Server error' }));
        })
      );

      // Call the function and expect it to throw
      await expect(aiApi.setActiveModel('llama2')).rejects.toThrow();
    });
  });
});