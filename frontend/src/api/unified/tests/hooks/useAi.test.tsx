/**
 * Tests for AI API hooks
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import * as aiApi from '../../aiApi';
import { 
  useAiModels, 
  useOllamaModels, 
  useExplainError, 
  useEventErrorExplanation,
  useIssueErrorExplanation,
  useExplainErrorText,
  usePullModel,
  useSetActiveModel,
  aiKeys
} from '../../hooks/useAi';
import { showErrorNotification } from '../../errorHandler';

// Mock the AI API module
vi.mock('../../aiApi', () => ({
  getModels: vi.fn(),
  fetchModelsList: vi.fn(),
  explainError: vi.fn(),
  explainErrorByEventId: vi.fn(),
  explainErrorByIssueId: vi.fn(),
  explainErrorText: vi.fn(),
  pullModel: vi.fn(),
  setActiveModel: vi.fn()
}));

// Mock the error handler
vi.mock('../../errorHandler', () => ({
  showErrorNotification: vi.fn()
}));

// Test wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('AI API Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('aiKeys', () => {
    it('should generate correct query keys', () => {
      // Test all keys
      expect(aiKeys.all).toEqual(['ai']);
      expect(aiKeys.models()).toEqual(['ai', 'models']);
      expect(aiKeys.ollamaModels()).toEqual(['ai', 'ollamaModels']);
      expect(aiKeys.explanations()).toEqual(['ai', 'explanations']);
      expect(aiKeys.eventExplanation('event123', 'model1')).toEqual(
        ['ai', 'explanations', 'event', 'event123', 'model1']
      );
      expect(aiKeys.issueExplanation('issue123', 'model1')).toEqual(
        ['ai', 'explanations', 'issue', 'issue123', 'model1']
      );
      
      // Test text explanation hash
      const errorText = 'Test error';
      const hashedKey = aiKeys.textExplanation(errorText, 'model1');
      expect(hashedKey[0]).toEqual('ai');
      expect(hashedKey[1]).toEqual('explanations');
      expect(hashedKey[2]).toEqual('text');
      // Hash should be consistent
      expect(hashedKey[3]).toEqual(aiKeys.textExplanation(errorText, 'model1')[3]);
      expect(hashedKey[4]).toEqual('model1');
    });
  });

  describe('useAiModels', () => {
    it('should call getModels and return data', async () => {
      // Mock data
      const mockModels = [
        { id: 'model1', name: 'Model One' },
        { id: 'model2', name: 'Model Two' }
      ];
      
      // Setup mock
      vi.mocked(aiApi.getModels).mockResolvedValueOnce(mockModels);

      // Render hook
      const { result } = renderHook(() => useAiModels(), {
        wrapper: createWrapper()
      });

      // Initial state should be loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assertions
      expect(aiApi.getModels).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockModels);
    });

    it('should handle error from getModels', async () => {
      // Setup mock to throw error
      const mockError = new Error('API error');
      vi.mocked(aiApi.getModels).mockRejectedValueOnce(mockError);

      // Render hook
      const { result } = renderHook(() => useAiModels(), {
        wrapper: createWrapper()
      });

      // Wait for error
      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assertions
      expect(result.current.error).toEqual(mockError);
      expect(showErrorNotification).toHaveBeenCalledWith({
        title: 'Failed to fetch AI models',
        message: 'API error',
        error: mockError
      });
    });
  });

  describe('useOllamaModels', () => {
    it('should call fetchModelsList and return data', async () => {
      // Mock data
      const mockResponse = {
        models: [
          { name: 'llama2', status: 'available', size: 3800000000 }
        ],
        ollama_status: 'available'
      };
      
      // Setup mock
      vi.mocked(aiApi.fetchModelsList).mockResolvedValueOnce(mockResponse);

      // Render hook with default options
      const { result } = renderHook(() => useOllamaModels(), {
        wrapper: createWrapper()
      });

      // Wait for data
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assertions
      expect(aiApi.fetchModelsList).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should accept custom options', async () => {
      // Mock data
      const mockResponse = {
        models: [
          { name: 'llama2', status: 'available', size: 3800000000 }
        ],
        ollama_status: 'available'
      };
      
      // Setup mock
      vi.mocked(aiApi.fetchModelsList).mockResolvedValueOnce(mockResponse);

      // Custom options
      const options = {
        refetchInterval: 60000,
        enabled: true,
        staleTime: 30000
      };

      // Render hook with custom options
      const { result } = renderHook(() => useOllamaModels(options), {
        wrapper: createWrapper()
      });

      // Wait for data
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assertions
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should handle error from fetchModelsList', async () => {
      // Setup mock to throw error
      const mockError = new Error('API error');
      vi.mocked(aiApi.fetchModelsList).mockRejectedValueOnce(mockError);

      // Render hook
      const { result } = renderHook(() => useOllamaModels(), {
        wrapper: createWrapper()
      });

      // Wait for error
      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assertions
      expect(result.current.error).toEqual(mockError);
      expect(showErrorNotification).toHaveBeenCalledWith({
        title: 'Failed to fetch Ollama models',
        message: 'API error',
        error: mockError
      });
    });
  });

  describe('useExplainError', () => {
    it('should call explainError when mutate is called', async () => {
      // Mock data
      const mockRequest = {
        eventId: 'event123',
        options: { maxTokens: 1000 }
      };
      
      const mockResponse = {
        explanation: 'This is an explanation'
      };
      
      // Setup mock
      vi.mocked(aiApi.explainError).mockResolvedValueOnce(mockResponse);

      // Render hook
      const { result } = renderHook(() => useExplainError(), {
        wrapper: createWrapper()
      });

      // Call mutate
      result.current.mutate({ request: mockRequest });

      // Wait for success
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assertions
      expect(aiApi.explainError).toHaveBeenCalledWith(mockRequest, undefined);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should handle error from explainError', async () => {
      // Mock request
      const mockRequest = {
        eventId: 'event123'
      };
      
      // Setup mock to throw error
      const mockError = new Error('API error');
      vi.mocked(aiApi.explainError).mockRejectedValueOnce(mockError);

      // Render hook
      const { result } = renderHook(() => useExplainError(), {
        wrapper: createWrapper()
      });

      // Call mutate
      result.current.mutate({ request: mockRequest });

      // Wait for error
      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assertions
      expect(result.current.error).toEqual(mockError);
      expect(showErrorNotification).toHaveBeenCalledWith({
        title: 'Error explanation failed',
        message: 'API error',
        error: mockError
      });
    });
  });

  describe('useEventErrorExplanation', () => {
    it('should call explainErrorByEventId and return data', async () => {
      // Mock data
      const mockResponse = {
        explanation: 'This is an event error explanation'
      };
      
      // Setup mock
      vi.mocked(aiApi.explainErrorByEventId).mockResolvedValueOnce(mockResponse);

      // Render hook
      const { result } = renderHook(
        () => useEventErrorExplanation('event123', 'model1', true, { includeRecommendations: true }),
        { wrapper: createWrapper() }
      );

      // Wait for data
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assertions
      expect(aiApi.explainErrorByEventId).toHaveBeenCalledWith(
        'event123',
        'model1',
        { includeRecommendations: true }
      );
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should not fetch if enabled is false', async () => {
      // Render hook with enabled=false
      renderHook(
        () => useEventErrorExplanation('event123', 'model1', false),
        { wrapper: createWrapper() }
      );

      // Wait a bit to ensure no fetch happens
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assertions
      expect(aiApi.explainErrorByEventId).not.toHaveBeenCalled();
    });

    it('should handle error from explainErrorByEventId', async () => {
      // Setup mock to throw error
      const mockError = new Error('API error');
      vi.mocked(aiApi.explainErrorByEventId).mockRejectedValueOnce(mockError);

      // Render hook
      const { result } = renderHook(
        () => useEventErrorExplanation('event123'),
        { wrapper: createWrapper() }
      );

      // Wait for error
      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assertions
      expect(result.current.error).toEqual(mockError);
      expect(showErrorNotification).toHaveBeenCalledWith({
        title: 'Error explanation failed',
        message: 'API error',
        error: mockError
      });
    });
  });

  describe('useIssueErrorExplanation', () => {
    it('should call explainErrorByIssueId and return data', async () => {
      // Mock data
      const mockResponse = {
        explanation: 'This is an issue error explanation'
      };
      
      // Setup mock
      vi.mocked(aiApi.explainErrorByIssueId).mockResolvedValueOnce(mockResponse);

      // Render hook
      const { result } = renderHook(
        () => useIssueErrorExplanation('issue123', 'model1', true, { includeRecommendations: true }),
        { wrapper: createWrapper() }
      );

      // Wait for data
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assertions
      expect(aiApi.explainErrorByIssueId).toHaveBeenCalledWith(
        'issue123',
        'model1',
        { includeRecommendations: true }
      );
      expect(result.current.data).toEqual(mockResponse);
    });
  });

  describe('useExplainErrorText', () => {
    it('should call explainErrorText when mutate is called', async () => {
      // Mock data
      const mockParams = {
        errorText: 'Error message',
        stackTrace: 'Stack trace',
        modelId: 'model1',
        options: { includeRecommendations: true }
      };
      
      const mockResponse = {
        explanation: 'This is a text error explanation'
      };
      
      // Setup mock
      vi.mocked(aiApi.explainErrorText).mockResolvedValueOnce(mockResponse);

      // Render hook
      const { result } = renderHook(() => useExplainErrorText(), {
        wrapper: createWrapper()
      });

      // Call mutate
      result.current.mutate(mockParams);

      // Wait for success
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assertions
      expect(aiApi.explainErrorText).toHaveBeenCalledWith(
        'Error message',
        'Stack trace',
        'model1',
        { includeRecommendations: true }
      );
      expect(result.current.data).toEqual(mockResponse);
    });
  });

  describe('usePullModel', () => {
    it('should call pullModel when mutate is called', async () => {
      // Mock data
      const mockResponse = {
        status: 'success',
        message: 'Model download initialized',
        name: 'llama2'
      };
      
      // Setup mock
      vi.mocked(aiApi.pullModel).mockResolvedValueOnce(mockResponse);

      // Render hook
      const { result } = renderHook(() => usePullModel(), {
        wrapper: createWrapper()
      });

      // Call mutate
      result.current.mutate('llama2');

      // Wait for success
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assertions
      expect(aiApi.pullModel).toHaveBeenCalledWith('llama2');
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should handle error from pullModel', async () => {
      // Setup mock to throw error
      const mockError = new Error('API error');
      vi.mocked(aiApi.pullModel).mockRejectedValueOnce(mockError);

      // Render hook
      const { result } = renderHook(() => usePullModel(), {
        wrapper: createWrapper()
      });

      // Call mutate
      result.current.mutate('llama2');

      // Wait for error
      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assertions
      expect(result.current.error).toEqual(mockError);
      expect(showErrorNotification).toHaveBeenCalledWith({
        title: 'Model download failed',
        message: 'API error',
        error: mockError
      });
    });
  });

  describe('useSetActiveModel', () => {
    it('should call setActiveModel when mutate is called', async () => {
      // Mock data
      const mockResponse = {
        status: 'success',
        message: 'Model set to llama2',
        model: 'llama2'
      };
      
      // Setup mock
      vi.mocked(aiApi.setActiveModel).mockResolvedValueOnce(mockResponse);

      // Render hook
      const { result } = renderHook(() => useSetActiveModel(), {
        wrapper: createWrapper()
      });

      // Call mutate
      result.current.mutate('llama2');

      // Wait for success
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assertions
      expect(aiApi.setActiveModel).toHaveBeenCalledWith('llama2');
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should handle error from setActiveModel', async () => {
      // Setup mock to throw error
      const mockError = new Error('API error');
      vi.mocked(aiApi.setActiveModel).mockRejectedValueOnce(mockError);

      // Render hook
      const { result } = renderHook(() => useSetActiveModel(), {
        wrapper: createWrapper()
      });

      // Call mutate
      result.current.mutate('llama2');

      // Wait for error
      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assertions
      expect(result.current.error).toEqual(mockError);
      expect(showErrorNotification).toHaveBeenCalledWith({
        title: 'Failed to change model',
        message: 'API error',
        error: mockError
      });
    });
  });
});