/**
 * Tests for N+1 Query React Query Hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useAnalyzeN1Query,
  useN1QueryAnalysis,
  useN1QueryDataAnalysis,
  // useExportN1QuerySVG, // TODO: Implement this hook
  useN1QueryWorkflow,
  // useBatchN1QueryAnalysis // TODO: Implement this hook
} from '../useN1Query';
import * as n1QueryApi from '../../n1QueryApi';

// Mock the API module
jest.mock('../../n1QueryApi');
jest.mock('../../errorHandler', () => ({
  showErrorNotification: jest.fn()
}));

describe('N+1 Query Hooks', () => {
  let queryClient: QueryClient;
  let wrapper: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Wrapper component for React Query
    wrapper = ({ children }: { children: ReactNode }) => {
      return QueryClientProvider({ client: queryClient, children });
    };

    jest.clearAllMocks();
  });

  describe('useAnalyzeN1Query', () => {
    it('should analyze an event for N+1 query patterns', async () => {
      const mockResponse = {
        success: true,
        analysis: {
          timestamp: '2024-01-01T00:00:00Z',
          metadata: {
            execution_time_ms: 150,
            parser_version: '1.0.0',
            patterns_found: 3,
            confidence_score: 0.95
          },
          visualization_data: {
            nodes: [],
            edges: [],
            patterns: []
          },
          recommended_fix: 'Use eager loading'
        }
      };

      (n1QueryApi.analyzeN1Query as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAnalyzeN1Query(), { wrapper });

      result.current.mutate({ eventId: 'test-event-id' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(n1QueryApi.analyzeN1Query).toHaveBeenCalledWith('test-event-id', undefined);
    });

    it('should handle enhanced analysis option', async () => {
      const { result } = renderHook(() => useAnalyzeN1Query(), { wrapper });

      result.current.mutate({ 
        eventId: 'test-event-id',
        options: { useEnhancedAnalysis: true }
      });

      await waitFor(() => {
        expect(n1QueryApi.analyzeN1Query).toHaveBeenCalledWith(
          'test-event-id',
          { useEnhancedAnalysis: true }
        );
      });
    });
  });

  describe('useN1QueryAnalysis', () => {
    it('should fetch N+1 query analysis for an event', async () => {
      const mockResponse = {
        success: true,
        analysis: {
          timestamp: '2024-01-01T00:00:00Z',
          metadata: {
            execution_time_ms: 150,
            parser_version: '1.0.0',
            patterns_found: 3,
            confidence_score: 0.95
          },
          visualization_data: {
            nodes: [],
            edges: [],
            patterns: []
          },
          recommended_fix: 'Use eager loading'
        }
      };

      (n1QueryApi.analyzeN1Query as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useN1QueryAnalysis('test-event-id'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it('should not fetch when eventId is null', () => {
      const { result } = renderHook(
        () => useN1QueryAnalysis(null),
        { wrapper }
      );

      expect(result.current.isIdle).toBe(true);
      expect(n1QueryApi.analyzeN1Query).not.toHaveBeenCalled();
    });
  });

  describe('useN1QueryWorkflow', () => {
    it('should provide complete workflow interface', async () => {
      const mockResponse = {
        success: true,
        analysis: {
          timestamp: '2024-01-01T00:00:00Z',
          metadata: {
            execution_time_ms: 150,
            parser_version: '1.0.0',
            patterns_found: 3,
            confidence_score: 0.95
          },
          visualization_data: {
            nodes: [{ id: '1', label: 'Query 1', type: 'parent' }],
            edges: [{ source: '1', target: '2', label: 'N+1' }],
            patterns: [
              {
                id: '1',
                parent_query: 'SELECT * FROM users',
                child_queries: ['SELECT * FROM posts WHERE user_id = ?'],
                total_time: 1000,
                optimized_time: 100,
                savings_percentage: 90,
                child_count: 10
              }
            ]
          },
          recommended_fix: 'Use eager loading'
        }
      };

      (n1QueryApi.analyzeN1Query as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useN1QueryWorkflow('test-event-id'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.analysis).toBeTruthy();
      });

      expect(result.current.patterns).toHaveLength(1);
      expect(result.current.nodes).toHaveLength(1);
      expect(result.current.edges).toHaveLength(1);
      expect(result.current.hasPatterns).toBe(true);
      expect(result.current.totalPatterns).toBe(3);
      expect(result.current.confidenceScore).toBe(0.95);
      expect(result.current.potentialSavings).toBe(90);
    });
  });

  // TODO: Implement useBatchN1QueryAnalysis hook and uncomment this test
  // describe('useBatchN1QueryAnalysis', () => {
  //   it('should analyze multiple events', async () => {
  //     const mockResponses = [
  //       { success: true, analysis: { /* ... */ } },
  //       { success: true, analysis: { /* ... */ } }
  //     ];

  //     (n1QueryApi.analyzeN1Query as jest.Mock)
  //       .mockResolvedValueOnce(mockResponses[0])
  //       .mockResolvedValueOnce(mockResponses[1]);

  //     const { result } = renderHook(() => useBatchN1QueryAnalysis(), { wrapper });

  //     result.current.mutate({
  //       eventIds: ['event-1', 'event-2']
  //     });

  //     await waitFor(() => {
  //       expect(result.current.isSuccess).toBe(true);
  //     });

  //     expect(n1QueryApi.analyzeN1Query).toHaveBeenCalledTimes(2);
  //     expect(n1QueryApi.analyzeN1Query).toHaveBeenNthCalledWith(1, 'event-1', undefined);
  //     expect(n1QueryApi.analyzeN1Query).toHaveBeenNthCalledWith(2, 'event-2', undefined);
  //   });
  // });
});