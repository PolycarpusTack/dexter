/**
 * Type definitions for AI analysis transparency and confidence scoring.
 *
 * These types support EPIC Q: AI Transparency & UX Polish by providing
 * comprehensive type safety for transparency information displayed to users.
 */

export interface SimilarIssueRef {
  id: number;
  title: string;
  similarity: number; // 0-1
  project?: string;
  status?: string;
  first_seen?: string;
  last_seen?: string;
}

export interface ModelInfo {
  name: string;
  provider: string;
  version?: string;
  context_window?: number;
}

export interface ConfidenceFactors {
  high_similarity_count: number;
  enrichment_coverage: number; // 0-1
  freshness_score: number; // 0-1
  reasoning: string;
}

export interface TransparencyInfo {
  similar_issues_count: number;
  similar_issues: SimilarIssueRef[];
  enrichment_sources_used: string[];
  enrichment_sources_stale: string[];
  ranking_variant: string;
  model_info: ModelInfo;
  confidence_factors: ConfidenceFactors;
}

export interface AnalysisSources {
  similar_issues: SimilarIssueRef[];
  enrichment_data: Record<string, any>;
  citations: string[];
}

export interface PIIScrubResult {
  scrubbed_data: Record<string, any>;
  pii_detected: boolean;
  fields_scrubbed: string[];
  scrub_count: number;
}

export interface AnalysisResponse {
  analysis: string;
  confidence: number; // 0-1
  sources: AnalysisSources;
  transparency: TransparencyInfo;
  processing_time_ms: number;
  pii_scrub_info?: PIIScrubResult;
}

export interface QuickPromptType {
  prompt_type: string;
  label: string;
  icon: string;
  system_prompt: string;
  enrichment_priority: string[];
}

export interface QuickPromptRequest {
  issue_id: number;
  prompt_type: string;
  user_query?: string;
}

export interface DataQualityIndicators {
  stale_sources: string[];
  very_stale_sources: string[];
  missing_sources: string[];
  pii_scrubbed?: PIIScrubResult;
  overall_quality_score: number; // 0-1
}

/**
 * Helper function to format confidence score as a level
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

/**
 * Helper function to get confidence color for Mantine components
 */
export function getConfidenceColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high':
      return 'green';
    case 'medium':
      return 'yellow';
    case 'low':
      return 'red';
  }
}

/**
 * Helper function to format enrichment source names for display
 */
export function formatSourceName(source: string): string {
  return source
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Helper to check if data is stale (older than 7 days)
 */
export function isStale(fetchedAt: string | undefined): boolean {
  if (!fetchedAt) return true;

  const fetched = new Date(fetchedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - fetched.getTime()) / (1000 * 60 * 60 * 24);

  return daysDiff > 7;
}

/**
 * Helper to check if data is very stale (older than 30 days)
 */
export function isVeryStale(fetchedAt: string | undefined): boolean {
  if (!fetchedAt) return true;

  const fetched = new Date(fetchedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - fetched.getTime()) / (1000 * 60 * 60 * 24);

  return daysDiff > 30;
}
