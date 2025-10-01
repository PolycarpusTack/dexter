// File: frontend/src/types/analyzers.ts

/**
 * Types for the analyzer framework
 */

export enum AnalyzerType {
  DEADLOCK = 'deadlock',
  MEMORY_LEAK = 'memory_leak',
  N_PLUS_ONE = 'n_plus_one',
  PROMISE_REJECTION = 'promise_rejection',
  CUSTOM = 'custom'
}

export enum ConfidenceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum BusinessImpact {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AnalysisFinding {
  category: string;
  description: string;
  severity: BusinessImpact;
  evidence: Record<string, any>;
  location?: string;
  related_findings?: string[];
}

export interface AnalysisRecommendation {
  title: string;
  description: string;
  priority: BusinessImpact;
  effort_estimate?: string;
  code_example?: string;
  documentation_links?: string[];
}

export interface VisualizationData {
  chart_type: string;
  data: Record<string, any>;
  options: Record<string, any>;
  metadata: Record<string, any>;
}

export interface AnalysisResult {
  analyzer_type: AnalyzerType;
  analyzer_version: string;
  analysis_id: string;
  timestamp: string;
  event_id: string;
  execution_time_ms: number;
  is_detected: boolean;
  confidence: number;
  confidence_level: ConfidenceLevel;
  findings: AnalysisFinding[];
  recommendations: AnalysisRecommendation[];
  business_impact: BusinessImpact;
  affected_users_estimate?: number;
  financial_impact_estimate?: string;
  visualization_data?: VisualizationData;
  raw_analysis_data: Record<string, any>;
  debug_info?: Record<string, any>;
}

export interface AnalyzerCapabilities {
  analyzer_type: AnalyzerType;
  name: string;
  description: string;
  version: string;
  supported_platforms: string[];
  supported_error_types: string[];
  typical_execution_time_ms: number;
  max_execution_time_ms: number;
  memory_usage_mb: number;
  requires_llm: boolean;
  configurable_parameters: string[];
  external_dependencies: string[];
}

export interface AnalyzeEventRequest {
  event_data: Record<string, any>;
  requested_analyzers?: AnalyzerType[];
  force_refresh?: boolean;
}

export interface AnalyzeEventResponse {
  success: boolean;
  event_id: string;
  results: AnalysisResult[];
  metrics: {
    total_execution_time_ms: number;
    analyzers_attempted: number;
    analyzers_succeeded: number;
    analyzers_failed: number;
    analyzers_timed_out: number;
    highest_confidence: number;
    highest_business_impact: BusinessImpact;
    cache_hits: number;
    cache_misses: number;
  };
  timestamp: string;
}