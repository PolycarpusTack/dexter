// frontend/src/api/unified/hooks/useKnowledgeBase.ts

/**
 * React Query hooks for Knowledge Base API
 *
 * Provides hooks for:
 * - Searching similar issues
 * - Browsing knowledge base
 * - Submitting feedback
 * - Managing validation queue
 * - RAG-enhanced explanations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showErrorNotification } from '../errorHandler';
import {
  searchSimilarIssues,
  getKnowledgeBaseStats,
  getKnowledgeBaseIssue,
  listKnowledgeBaseIssues,
  submitFeedback,
  getFeedbackStats,
  getValidationQueue,
  getValidationMetrics,
  validateIssue,
  rejectIssue,
  applyCorrection,
  getRAGExplanation,
  getRAGStatus,
  // Phase 8: Clustering
  getErrorClusters,
  getClusterIssues,
  findSimilarErrors,
  type KnowledgeBaseIssue,
  type KnowledgeBaseListParams,
  type KnowledgeBaseListResponse,
  type SearchResult,
  type KnowledgeBaseStats,
  type FeedbackRequest,
  type FeedbackResponse,
  type FeedbackStats,
  type ValidationQueueItem,
  type ValidationMetrics,
  type RAGExplanationRequest,
  type RAGExplanationResponse,
  // Phase 8: Clustering types
  type ClusterSummary,
  type ClusteringResponse,
  type ClusterIssue,
  type ClusterDetailResponse,
} from '../knowledgeBaseApi';

// =============================================================================
// Query Keys
// =============================================================================

export const knowledgeBaseKeys = {
  all: ['knowledgeBase'] as const,
  stats: () => [...knowledgeBaseKeys.all, 'stats'] as const,
  ragStatus: () => [...knowledgeBaseKeys.all, 'ragStatus'] as const,
  issues: () => [...knowledgeBaseKeys.all, 'issues'] as const,
  issuesList: (params: KnowledgeBaseListParams) =>
    [...knowledgeBaseKeys.issues(), params] as const,
  issue: (id: number) => [...knowledgeBaseKeys.issues(), id] as const,
  search: (errorType: string, errorMessage: string) =>
    [...knowledgeBaseKeys.all, 'search', errorType, errorMessage] as const,
  feedback: () => [...knowledgeBaseKeys.all, 'feedback'] as const,
  feedbackStats: (issueId: number) =>
    [...knowledgeBaseKeys.feedback(), 'stats', issueId] as const,
  validation: () => [...knowledgeBaseKeys.all, 'validation'] as const,
  validationQueue: () => [...knowledgeBaseKeys.validation(), 'queue'] as const,
  validationMetrics: () =>
    [...knowledgeBaseKeys.validation(), 'metrics'] as const,
  // Phase 8: Clustering keys
  clusters: () => [...knowledgeBaseKeys.all, 'clusters'] as const,
  clustersList: (options?: { threshold?: number; min_size?: number }) =>
    [...knowledgeBaseKeys.clusters(), options] as const,
  clusterDetail: (clusterId: number) =>
    [...knowledgeBaseKeys.clusters(), 'detail', clusterId] as const,
  similarErrors: (errorType: string, errorMessage: string) =>
    [...knowledgeBaseKeys.all, 'similarErrors', errorType, errorMessage] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to get knowledge base statistics
 */
export function useKnowledgeBaseStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: knowledgeBaseKeys.stats(),
    queryFn: getKnowledgeBaseStats,
    staleTime: 60000, // 1 minute
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to get RAG system status
 */
export function useRAGStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: knowledgeBaseKeys.ragStatus(),
    queryFn: getRAGStatus,
    staleTime: 30000, // 30 seconds
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to list knowledge base issues with filtering and pagination
 */
export function useKnowledgeBaseIssues(
  params: KnowledgeBaseListParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: knowledgeBaseKeys.issuesList(params),
    queryFn: () => listKnowledgeBaseIssues(params),
    staleTime: 30000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to get a single knowledge base issue
 */
export function useKnowledgeBaseIssue(
  issueId: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: knowledgeBaseKeys.issue(issueId),
    queryFn: () => getKnowledgeBaseIssue(issueId),
    staleTime: 60000,
    enabled: (options?.enabled ?? true) && issueId > 0,
  });
}

/**
 * Hook to search for similar issues
 */
export function useSimilarIssuesSearch(
  errorType: string,
  errorMessage: string,
  options?: {
    platform?: string;
    limit?: number;
    threshold?: number;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: knowledgeBaseKeys.search(errorType, errorMessage),
    queryFn: () =>
      searchSimilarIssues(errorType, errorMessage, {
        platform: options?.platform,
        limit: options?.limit,
        threshold: options?.threshold,
      }),
    staleTime: 60000,
    enabled:
      (options?.enabled ?? true) &&
      errorType.length > 0 &&
      errorMessage.length > 0,
  });
}

/**
 * Hook to get feedback stats for an issue
 */
export function useFeedbackStats(
  issueId: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: knowledgeBaseKeys.feedbackStats(issueId),
    queryFn: () => getFeedbackStats(issueId),
    staleTime: 30000,
    enabled: (options?.enabled ?? true) && issueId > 0,
  });
}

/**
 * Hook to get the validation queue
 */
export function useValidationQueue(options?: {
  limit?: number;
  min_feedback?: number;
  sort_by?: 'priority' | 'feedback_count' | 'created_at';
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: knowledgeBaseKeys.validationQueue(),
    queryFn: () =>
      getValidationQueue({
        limit: options?.limit,
        min_feedback: options?.min_feedback,
        sort_by: options?.sort_by,
      }),
    staleTime: 30000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to get validation metrics
 */
export function useValidationMetrics(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: knowledgeBaseKeys.validationMetrics(),
    queryFn: getValidationMetrics,
    staleTime: 60000,
    enabled: options?.enabled ?? true,
  });
}

// =============================================================================
// Phase 8: Clustering Hooks
// =============================================================================

/**
 * Hook to get error clusters from the knowledge base
 */
export function useErrorClusters(options?: {
  threshold?: number;
  min_size?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: knowledgeBaseKeys.clustersList({
      threshold: options?.threshold,
      min_size: options?.min_size,
    }),
    queryFn: () =>
      getErrorClusters({
        threshold: options?.threshold,
        min_size: options?.min_size,
      }),
    staleTime: 60000, // 1 minute
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to get issues in a specific cluster
 */
export function useClusterIssues(
  clusterId: number,
  options?: {
    threshold?: number;
    min_size?: number;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: knowledgeBaseKeys.clusterDetail(clusterId),
    queryFn: () =>
      getClusterIssues(clusterId, {
        threshold: options?.threshold,
        min_size: options?.min_size,
      }),
    staleTime: 60000,
    enabled: (options?.enabled ?? true) && clusterId >= 0,
  });
}

/**
 * Hook to find similar errors (mutation for on-demand search)
 */
export function useFindSimilarErrors() {
  return useMutation({
    mutationFn: ({
      errorType,
      errorMessage,
      options,
    }: {
      errorType: string;
      errorMessage: string;
      options?: { top_k?: number; min_score?: number };
    }) => findSimilarErrors(errorType, errorMessage, options),
    onError: (error) => {
      showErrorNotification({
        title: 'Similar error search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
}

/**
 * Combined hook for clustering functionality
 */
export function useClustering(options?: {
  threshold?: number;
  min_size?: number;
  enabled?: boolean;
}) {
  const clustersQuery = useErrorClusters(options);
  const findSimilarMutation = useFindSimilarErrors();

  return {
    // Cluster data
    clusters: clustersQuery.data?.clusters ?? [],
    totalClusters: clustersQuery.data?.total_clusters ?? 0,
    totalItems: clustersQuery.data?.total_items ?? 0,
    recurringClusters: clustersQuery.data?.recurring_clusters ?? 0,
    similarClusters: clustersQuery.data?.similar_clusters ?? 0,
    outliers: clustersQuery.data?.outliers ?? 0,
    statistics: clustersQuery.data?.statistics,

    // Loading states
    isLoading: clustersQuery.isLoading,
    isFetching: clustersQuery.isFetching,

    // Error states
    error: clustersQuery.error,

    // Actions
    refetch: clustersQuery.refetch,
    findSimilar: findSimilarMutation.mutate,
    findSimilarAsync: findSimilarMutation.mutateAsync,

    // Find similar state
    isFindingSimilar: findSimilarMutation.status === 'loading',
    similarResults: findSimilarMutation.data,
  };
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook to submit feedback on an issue
 */
export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: FeedbackRequest) => submitFeedback(request),
    onSuccess: (_data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.feedbackStats(variables.issue_id),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.issue(variables.issue_id),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.issues(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.validationQueue(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.validationMetrics(),
      });
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Feedback submission failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
}

/**
 * Hook to validate an issue manually
 */
export function useValidateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      issueId,
      notes,
    }: {
      issueId: number;
      notes?: string;
    }) => validateIssue(issueId, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.issue(variables.issueId),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.issues(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.validationQueue(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.validationMetrics(),
      });
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
}

/**
 * Hook to reject an issue
 */
export function useRejectIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      issueId,
      reason,
    }: {
      issueId: number;
      reason?: string;
    }) => rejectIssue(issueId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.issue(variables.issueId),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.issues(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.validationQueue(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.validationMetrics(),
      });
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Rejection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
}

/**
 * Hook to apply a correction to an issue
 */
export function useApplyCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      issueId,
      solutionText,
      updateEmbedding,
    }: {
      issueId: number;
      solutionText: string;
      updateEmbedding?: boolean;
    }) => applyCorrection(issueId, solutionText, updateEmbedding),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.issue(variables.issueId),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.issues(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.validationQueue(),
      });
      queryClient.invalidateQueries({
        queryKey: knowledgeBaseKeys.stats(),
      });
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Correction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
}

/**
 * Hook to get RAG-enhanced explanation
 */
export function useRAGExplanation() {
  return useMutation({
    mutationFn: (request: RAGExplanationRequest) => getRAGExplanation(request),
    onError: (error) => {
      showErrorNotification({
        title: 'RAG explanation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
}

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Combined hook for knowledge base browsing with all common functionality
 */
export function useKnowledgeBase(params: KnowledgeBaseListParams = {}) {
  const issuesQuery = useKnowledgeBaseIssues(params);
  const statsQuery = useKnowledgeBaseStats();
  const ragStatusQuery = useRAGStatus();

  return {
    // Issues data
    issues: issuesQuery.data?.issues ?? [],
    total: issuesQuery.data?.total ?? 0,
    totalPages: issuesQuery.data?.total_pages ?? 1,
    currentPage: issuesQuery.data?.page ?? 1,

    // Stats data
    stats: statsQuery.data,

    // RAG status
    ragStatus: ragStatusQuery.data,
    isRAGEnabled: ragStatusQuery.data?.rag_available ?? false,

    // Loading states
    isLoading: issuesQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,

    // Error states
    error: issuesQuery.error,

    // Refetch functions
    refetch: issuesQuery.refetch,
    refetchStats: statsQuery.refetch,
  };
}

/**
 * Hook for the feedback workflow on a specific issue
 */
export function useFeedback(issueId: number) {
  const submitFeedbackMutation = useSubmitFeedback();
  const feedbackStatsQuery = useFeedbackStats(issueId, { enabled: issueId > 0 });

  const submitPositive = () =>
    submitFeedbackMutation.mutate({
      issue_id: issueId,
      feedback_type: 'positive',
    });

  const submitNegative = () =>
    submitFeedbackMutation.mutate({
      issue_id: issueId,
      feedback_type: 'negative',
    });

  const submitCorrection = (correctionText: string) =>
    submitFeedbackMutation.mutate({
      issue_id: issueId,
      feedback_type: 'correction',
      correction_text: correctionText,
    });

  return {
    // Actions
    submitPositive,
    submitNegative,
    submitCorrection,
    submitFeedback: submitFeedbackMutation.mutate,

    // Stats
    stats: feedbackStatsQuery.data,
    isLoadingStats: feedbackStatsQuery.isLoading,

    // Mutation state
    isSubmitting: submitFeedbackMutation.status === 'loading',
    isSuccess: submitFeedbackMutation.isSuccess,
    error: submitFeedbackMutation.error,
    reset: submitFeedbackMutation.reset,
  };
}

// =============================================================================
// Export Types
// =============================================================================

export type {
  KnowledgeBaseIssue,
  KnowledgeBaseListParams,
  KnowledgeBaseListResponse,
  SearchResult,
  KnowledgeBaseStats,
  FeedbackRequest,
  FeedbackResponse,
  FeedbackStats,
  ValidationQueueItem,
  ValidationMetrics,
  RAGExplanationRequest,
  RAGExplanationResponse,
  // Phase 8: Clustering types
  ClusterSummary,
  ClusteringResponse,
  ClusterIssue,
  ClusterDetailResponse,
};

// Default export
export default {
  // Query hooks
  useKnowledgeBaseStats,
  useRAGStatus,
  useKnowledgeBaseIssues,
  useKnowledgeBaseIssue,
  useSimilarIssuesSearch,
  useFeedbackStats,
  useValidationQueue,
  useValidationMetrics,

  // Phase 8: Clustering hooks
  useErrorClusters,
  useClusterIssues,
  useFindSimilarErrors,
  useClustering,

  // Mutation hooks
  useSubmitFeedback,
  useValidateIssue,
  useRejectIssue,
  useApplyCorrection,
  useRAGExplanation,

  // Convenience hooks
  useKnowledgeBase,
  useFeedback,
};
