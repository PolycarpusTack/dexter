// frontend/src/api/unified/knowledgeBaseApi.ts

/**
 * Knowledge Base API module
 *
 * Provides API methods for interacting with the knowledge base,
 * including searching similar issues, submitting feedback, and
 * browsing the knowledge base.
 */

import enhancedApiClient from './enhancedApiClient';

// =============================================================================
// Types
// =============================================================================

export interface KnowledgeBaseIssue {
  id: number;
  sentry_issue_id: string;
  error_type: string;
  error_message: string;
  platform?: string;
  ai_explanation?: string;
  ai_suggested_fix?: string;
  human_solution?: string;
  is_useful: boolean;
  confidence_score: number;
  feedback_count: number;
  created_at: string;
  updated_at: string;
}

export interface SimilarIssue {
  id: number;
  sentry_issue_id: string;
  error_type: string;
  error_message: string;
  similarity_score: number;
  ai_explanation?: string;
  ai_suggested_fix?: string;
  human_solution?: string;
  is_validated: boolean;
}

export interface SearchResult {
  query_error_type: string;
  query_error_message: string;
  similar_issues: SimilarIssue[];
  has_validated_solution: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface KnowledgeBaseStats {
  total_issues: number;
  validated_issues: number;
  pending_issues: number;
  total_feedback: number;
  top_error_types: Array<{ error_type: string; count: number }>;
}

export interface FeedbackRequest {
  issue_id: number;
  feedback_type: 'positive' | 'negative' | 'correction';
  correction_text?: string;
  user_id?: string;
}

export interface FeedbackResponse {
  success: boolean;
  feedback_id: number;
  validation_result: {
    issue_id: number;
    is_validated: boolean;
    reason: string;
    confidence_score: number;
  };
  message: string;
}

export interface FeedbackStats {
  issue_id: number;
  positive_count: number;
  negative_count: number;
  correction_count: number;
  net_score: number;
  validation_status: string;
  confidence_score: number;
}

export interface ValidationQueueItem {
  issue_id: number;
  sentry_issue_id: string;
  error_type: string;
  error_message: string;
  positive_count: number;
  negative_count: number;
  priority_score: number;
  ai_explanation?: string;
  human_solution?: string;
}

export interface ValidationMetrics {
  total_issues: number;
  validated_issues: number;
  pending_issues: number;
  rejected_issues: number;
  validation_rate: number;
  top_error_types?: Array<{ error_type: string; count: number }>;
}

export interface RAGExplanationRequest {
  error_type: string;
  error_message: string;
  platform?: string;
  stack_frames?: Array<{
    filename: string;
    function?: string;
    line?: number;
  }>;
  use_knowledge_base?: boolean;
  model_override?: string;
}

export interface RAGExplanationResponse {
  explanation: string;
  model_used: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  has_kb_context: boolean;
  similar_issues_count: number;
  has_validated_solution: boolean;
  citations: string[];
  disclaimer?: string;
  processing_time_ms: number;
}

export interface KnowledgeBaseListParams {
  search?: string;
  page?: number;
  limit?: number;
  filter?: 'all' | 'validated' | 'pending';
  sort_by?: 'created_at' | 'feedback_count' | 'error_type';
  sort_order?: 'asc' | 'desc';
}

export interface KnowledgeBaseListResponse {
  issues: KnowledgeBaseIssue[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Search for similar issues in the knowledge base
 */
export async function searchSimilarIssues(
  errorType: string,
  errorMessage: string,
  options?: {
    platform?: string;
    limit?: number;
    threshold?: number;
  }
): Promise<SearchResult> {
  const response = await enhancedApiClient.post<SearchResult>(
    '/api/knowledge-base/search',
    {
      error_type: errorType,
      error_message: errorMessage,
      platform: options?.platform,
      limit: options?.limit ?? 5,
      threshold: options?.threshold ?? 0.7,
    }
  );
  return response;
}

/**
 * Get knowledge base statistics
 */
export async function getKnowledgeBaseStats(): Promise<KnowledgeBaseStats> {
  const response = await enhancedApiClient.get<KnowledgeBaseStats>(
    '/api/knowledge-base/stats'
  );
  return response;
}

/**
 * Get a single issue from the knowledge base
 */
export async function getKnowledgeBaseIssue(
  issueId: number
): Promise<KnowledgeBaseIssue> {
  const response = await enhancedApiClient.get<KnowledgeBaseIssue>(
    `/api/knowledge-base/issues/${issueId}`
  );
  return response;
}

/**
 * List issues in the knowledge base with filtering and pagination
 */
export async function listKnowledgeBaseIssues(
  params?: KnowledgeBaseListParams
): Promise<KnowledgeBaseListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.filter && params.filter !== 'all') {
    queryParams.append('filter', params.filter);
  }
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.sort_order) queryParams.append('sort_order', params.sort_order);

  const queryString = queryParams.toString();
  const url = `/api/knowledge-base/issues${queryString ? `?${queryString}` : ''}`;

  const response = await enhancedApiClient.get<KnowledgeBaseListResponse>(url);
  return response;
}

/**
 * Submit feedback on an issue
 */
export async function submitFeedback(
  request: FeedbackRequest
): Promise<FeedbackResponse> {
  const response = await enhancedApiClient.post<FeedbackResponse>(
    '/api/validation/feedback',
    request
  );
  return response;
}

/**
 * Get feedback statistics for an issue
 */
export async function getFeedbackStats(
  issueId: number
): Promise<FeedbackStats> {
  const response = await enhancedApiClient.get<FeedbackStats>(
    `/api/validation/feedback/${issueId}/stats`
  );
  return response;
}

/**
 * Get the validation queue
 */
export async function getValidationQueue(
  options?: {
    limit?: number;
    min_feedback?: number;
    sort_by?: 'priority' | 'feedback_count' | 'created_at';
  }
): Promise<ValidationQueueItem[]> {
  const queryParams = new URLSearchParams();

  if (options?.limit) queryParams.append('limit', options.limit.toString());
  if (options?.min_feedback) queryParams.append('min_feedback', options.min_feedback.toString());
  if (options?.sort_by) queryParams.append('sort_by', options.sort_by);

  const queryString = queryParams.toString();
  const url = `/api/validation/queue${queryString ? `?${queryString}` : ''}`;

  const response = await enhancedApiClient.get<ValidationQueueItem[]>(url);
  return response;
}

/**
 * Get validation metrics
 */
export async function getValidationMetrics(): Promise<ValidationMetrics> {
  const response = await enhancedApiClient.get<ValidationMetrics>(
    '/api/validation/metrics'
  );
  return response;
}

/**
 * Manually validate an issue
 */
export async function validateIssue(
  issueId: number,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  const response = await enhancedApiClient.post<{ success: boolean; message: string }>(
    '/api/validation/validate',
    { issue_id: issueId, notes }
  );
  return response;
}

/**
 * Reject an issue
 */
export async function rejectIssue(
  issueId: number,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const response = await enhancedApiClient.post<{ success: boolean; message: string }>(
    '/api/validation/reject',
    { issue_id: issueId, reason }
  );
  return response;
}

/**
 * Apply a correction to an issue
 */
export async function applyCorrection(
  issueId: number,
  solutionText: string,
  updateEmbedding?: boolean
): Promise<{ success: boolean; message: string }> {
  const response = await enhancedApiClient.post<{ success: boolean; message: string }>(
    '/api/validation/apply-correction',
    {
      issue_id: issueId,
      solution_text: solutionText,
      update_embedding: updateEmbedding ?? true,
    }
  );
  return response;
}

/**
 * Get RAG-enhanced explanation for an error
 */
export async function getRAGExplanation(
  request: RAGExplanationRequest
): Promise<RAGExplanationResponse> {
  const response = await enhancedApiClient.post<RAGExplanationResponse>(
    '/api/ai-enhanced/explain/rag',
    request
  );
  return response;
}

/**
 * Get RAG system status
 */
export async function getRAGStatus(): Promise<{
  knowledge_base_enabled: boolean;
  rag_available: boolean;
  knowledge_base_stats?: KnowledgeBaseStats;
  embeddings_model?: string;
  embeddings_dimension?: number;
}> {
  const response = await enhancedApiClient.get<{
    knowledge_base_enabled: boolean;
    rag_available: boolean;
    knowledge_base_stats?: KnowledgeBaseStats;
    embeddings_model?: string;
    embeddings_dimension?: number;
  }>('/api/ai-enhanced/explain/rag/status');
  return response;
}

// =============================================================================
// Clustering API Functions (Phase 8)
// =============================================================================

export interface ClusterSummary {
  cluster_id: number;
  size: number;
  cluster_type: 'recurring' | 'similar' | 'outlier';
  cohesion: number;
  representative_error: string;
  representative_message: string;
  issue_ids: number[];
}

export interface ClusteringResponse {
  total_items: number;
  total_clusters: number;
  recurring_clusters: number;
  similar_clusters: number;
  outliers: number;
  clusters: ClusterSummary[];
  statistics: Record<string, unknown>;
}

export interface ClusterIssue {
  id: number;
  error_type: string;
  error_message: string;
  platform?: string;
  is_useful: boolean;
  feedback_count: number;
  ai_explanation?: string;
  human_solution?: string;
  is_representative: boolean;
}

export interface ClusterDetailResponse {
  cluster_id: number;
  cluster_type: string;
  cohesion: number;
  issue_count: number;
  issues: ClusterIssue[];
}

/**
 * Get error clusters from the knowledge base
 */
export async function getErrorClusters(
  options?: {
    threshold?: number;
    min_size?: number;
  }
): Promise<ClusteringResponse> {
  const queryParams = new URLSearchParams();

  if (options?.threshold) queryParams.append('threshold', options.threshold.toString());
  if (options?.min_size) queryParams.append('min_size', options.min_size.toString());

  const queryString = queryParams.toString();
  const url = `/api/knowledge-base/clusters${queryString ? `?${queryString}` : ''}`;

  const response = await enhancedApiClient.get<ClusteringResponse>(url);
  return response;
}

/**
 * Get issues in a specific cluster
 */
export async function getClusterIssues(
  clusterId: number,
  options?: {
    threshold?: number;
    min_size?: number;
  }
): Promise<ClusterDetailResponse> {
  const queryParams = new URLSearchParams();

  if (options?.threshold) queryParams.append('threshold', options.threshold.toString());
  if (options?.min_size) queryParams.append('min_size', options.min_size.toString());

  const queryString = queryParams.toString();
  const url = `/api/knowledge-base/clusters/${clusterId}/issues${queryString ? `?${queryString}` : ''}`;

  const response = await enhancedApiClient.get<ClusterDetailResponse>(url);
  return response;
}

/**
 * Find similar errors to a given error
 */
export async function findSimilarErrors(
  errorType: string,
  errorMessage: string,
  options?: {
    top_k?: number;
    min_score?: number;
  }
): Promise<{
  query: { error_type: string; error_message: string };
  similar_count: number;
  similar_issues: Array<{
    id: number;
    error_type: string;
    error_message: string;
    similarity_score: number;
    is_validated: boolean;
    feedback_count: number;
    has_solution: boolean;
  }>;
}> {
  const response = await enhancedApiClient.post<{
    query: { error_type: string; error_message: string };
    similar_count: number;
    similar_issues: Array<{
      id: number;
      error_type: string;
      error_message: string;
      similarity_score: number;
      is_validated: boolean;
      feedback_count: number;
      has_solution: boolean;
    }>;
  }>('/api/knowledge-base/clusters/find-similar', {
    error_type: errorType,
    error_message: errorMessage,
    top_k: options?.top_k ?? 5,
    min_score: options?.min_score ?? 0.5,
  });
  return response;
}

// Default export
const knowledgeBaseApi = {
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
};

export default knowledgeBaseApi;
