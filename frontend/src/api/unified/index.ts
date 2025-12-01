/**
 * Unified API Client
 * 
 * This file exports all API modules and utilities from the unified API client architecture.
 * It provides a clean public interface for consuming components.
 */

// Core API client and utilities
import enhancedApiClient, { EnhancedApiClient } from './enhancedApiClient';
import { getFullUrl, getMethod, resolvePath, validateParams } from './apiResolver';
import { ErrorFactory, createErrorHandler, showErrorNotification } from './errorHandler';
import apiConfig from './apiConfig';

// API modules
import issuesApi from './issuesApi';
import eventsApi from './eventsApi';
import discoverApi from './discoverApi';
import alertsApi from './alertsApi';
import aiApi from './aiApi';
import analyzersApi from './analyzersApi';
import configApi from './configApi';
import templateApi from './templateApi';
import metricsApi from './metricsApi';
import n1QueryApi from './n1QueryApi';
import memoryLeakApi from './memoryLeakApi';
import knowledgeBaseApi from './knowledgeBaseApi';

// API hooks
import { 
  useIssues, 
  useIssue, 
  useUpdateIssue, 
  useAssignIssue, 
  useResolveIssue, 
  useIgnoreIssue, 
  useBulkUpdateIssues 
} from './hooks/useIssues';

import {
  useEvents,
  useEvent,
  useEventTags,
  useRelatedEvents,
  useLatestEvent
} from './hooks/useEvents';

import {
  useDiscoverQuery,
  useSavedQueries,
  useSaveQuery
} from './hooks/useDiscover';

import {
  useAlertRules,
  useAlertRule,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule
} from './hooks/useAlerts';

import {
  useAiModels,
  useExplainError,
  useEventErrorExplanation,
  useIssueErrorExplanation,
  useExplainErrorText
} from './hooks/useAi';

import {
  useConfig,
  useCheckConfig,
  useUpdateConfig,
  useHealthStatus
} from './hooks/useConfig';

import {
  useTemplates,
  useTemplate,
  useTemplateVersions,
  useDefaultTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useRenderTemplate,
  useSetTemplateAsDefault
} from './hooks/useTemplates';

import {
  useModelMetrics,
  useModelMetricsByPeriod,
  useTimeSeriesData,
  useProviderMetrics,
  useModelComparison,
  useOverallMetrics,
  useRecordUsage
} from './hooks/useMetrics';

import {
  useAnalyzeN1Query,
  useN1QueryAnalysis,
  useN1QueryDataAnalysis,
  useExportN1QuerySVG,
  useN1QueryWorkflow,
  useBatchN1QueryAnalysis
} from './hooks/useN1Query';

import {
  useAnalyzeMemoryLeak,
  useMemoryLeakAnalysis,
  useMemoryLeakDataAnalysis,
  useUploadHeapSnapshot,
  useMemoryLeakCapabilities,
  useReanalyzeMemoryLeak,
  useExportMemoryLeakSVG,
  useMemoryLeakWorkflow
} from './hooks/useMemoryLeak';

import {
  useKnowledgeBase,
  useKnowledgeBaseStats,
  useKnowledgeBaseIssues,
  useKnowledgeBaseIssue,
  useSimilarIssuesSearch,
  useFeedback,
  useFeedbackStats,
  useSubmitFeedback,
  useValidationQueue,
  useValidationMetrics,
  useValidateIssue,
  useRejectIssue,
  useApplyCorrection,
  useRAGExplanation,
  useRAGStatus
} from './hooks/useKnowledgeBase';

// Types
import {
  // Core types
  ApiClient,
  ApiConfig,
  ApiCallOptions,
  ApiError,
  ApiResponse,
  PaginatedResponse,
  EndpointConfig,
  CategoryConfig,
  PathParams,
  QueryParams,
  
  // Enum types
  HttpMethod,
  ErrorCategory,
  
  // Issue types
  Issue,
  IssuesResponse,
  IssueComment,
  FetchIssuesOptions,
  IssueUpdateData,
  BulkUpdateOptions
} from './types';

// Event types
import {
  Event,
  EventsResponse,
  EventDetails,
  FetchEventsOptions
} from './eventsApi';

// Discover types
import {
  DiscoverQuery,
  DiscoverResult,
  SavedQuery,
  DiscoverQueryOptions,
  SavedQueryOptions
} from './discoverApi';

// Alerts types
import {
  AlertRule,
  AlertRuleAction,
  AlertRuleInput
} from './alertsApi';

// AI types
import {
  AiModel,
  ErrorExplanationRequest,
  ErrorExplanationResponse
} from './aiApi';

// Export main API client instance
export const apiClient = enhancedApiClient;

// Export API modules
export const api = {
  issues: issuesApi,
  events: eventsApi,
  discover: discoverApi,
  alerts: alertsApi,
  ai: aiApi,
  analyzers: analyzersApi,
  config: configApi,
  templates: templateApi,
  metrics: metricsApi,
  n1Query: n1QueryApi,
  memoryLeak: memoryLeakApi,
  knowledgeBase: knowledgeBaseApi
};

// Export all API hooks
export const hooks = {
  // Issues hooks
  useIssues,
  useIssue,
  useUpdateIssue,
  useAssignIssue,
  useResolveIssue,
  useIgnoreIssue,
  useBulkUpdateIssues,
  
  // Events hooks
  useEvents,
  useEvent,
  useEventTags,
  useRelatedEvents,
  useLatestEvent,
  
  // Discover hooks
  useDiscoverQuery,
  useSavedQueries,
  useSaveQuery,
  
  // Alerts hooks
  useAlertRules,
  useAlertRule,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
  
  // AI hooks
  useAiModels,
  useExplainError,
  useEventErrorExplanation,
  useIssueErrorExplanation,
  useExplainErrorText,
  
  // Config hooks
  useConfig,
  useCheckConfig,
  useUpdateConfig,
  useHealthStatus,
  
  // Template hooks
  useTemplates,
  useTemplate,
  useTemplateVersions,
  useDefaultTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useRenderTemplate,
  useSetTemplateAsDefault,
  
  // Metrics hooks
  useModelMetrics,
  useModelMetricsByPeriod,
  useTimeSeriesData,
  useProviderMetrics,
  useModelComparison,
  useOverallMetrics,
  useRecordUsage,
  
  // N+1 Query hooks
  useAnalyzeN1Query,
  useN1QueryAnalysis,
  useN1QueryDataAnalysis,
  useExportN1QuerySVG,
  useN1QueryWorkflow,
  useBatchN1QueryAnalysis,
  
  // Memory Leak hooks
  useAnalyzeMemoryLeak,
  useMemoryLeakAnalysis,
  useMemoryLeakDataAnalysis,
  useUploadHeapSnapshot,
  useMemoryLeakCapabilities,
  useReanalyzeMemoryLeak,
  useExportMemoryLeakSVG,
  useMemoryLeakWorkflow,

  // Knowledge Base hooks
  useKnowledgeBase,
  useKnowledgeBaseStats,
  useKnowledgeBaseIssues,
  useKnowledgeBaseIssue,
  useSimilarIssuesSearch,
  useFeedback,
  useFeedbackStats,
  useSubmitFeedback,
  useValidationQueue,
  useValidationMetrics,
  useValidateIssue,
  useRejectIssue,
  useApplyCorrection,
  useRAGExplanation,
  useRAGStatus
};

// Export utilities
export const utils = {
  ErrorFactory,
  createErrorHandler,
  showErrorNotification,
  resolvePath,
  getFullUrl
};

// Import config types
import {
  Config,
  ConfigParams,
  HealthStatus
} from './configApi';

// Import template types
import {
  TemplateCategory,
  TemplateType,
  TemplateVariable,
  TemplateVersion,
  PromptTemplate,
  TemplateListResponse,
  TemplateResponse,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateSearchParams,
  RenderTemplateResponse
} from './templateApi';

// Import metric types
import type { 
  MetricType, 
  TimePeriod, 
  TimeInterval, 
  ModelMetrics,
  TimeSeriesData,
  ModelComparison,
  UsageRecordRequest 
} from '../../types/metrics';

// Export types
export type {
  // Core types
  ApiClient,
  ApiConfig,
  ApiCallOptions,
  ApiError,
  ApiResponse,
  PaginatedResponse,
  EndpointConfig,
  CategoryConfig,
  PathParams,
  QueryParams,
  
  // Issue types
  Issue,
  IssuesResponse,
  IssueComment,
  FetchIssuesOptions,
  IssueUpdateData,
  BulkUpdateOptions,
  
  // Event types
  Event,
  EventsResponse,
  EventDetails,
  FetchEventsOptions,
  
  // Discover types
  DiscoverQuery,
  DiscoverResult,
  SavedQuery,
  DiscoverQueryOptions,
  SavedQueryOptions,
  
  // Alerts types
  AlertRule,
  AlertRuleAction,
  AlertRuleInput,
  
  // AI types
  AiModel,
  ErrorExplanationRequest,
  ErrorExplanationResponse,
  
  // Config types
  Config,
  ConfigParams,
  HealthStatus,
  
  // Template types
  TemplateCategory,
  TemplateType,
  TemplateVariable,
  TemplateVersion,
  PromptTemplate,
  TemplateListResponse,
  TemplateResponse,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateSearchParams,
  RenderTemplateResponse,
  
  // Metrics types
  MetricType,
  TimePeriod,
  TimeInterval,
  ModelMetrics,
  TimeSeriesData,
  ModelComparison,
  UsageRecordRequest
};

// Export enums
export {
  HttpMethod,
  ErrorCategory,
  TemplateCategory,
  TemplateType
};

// Export config
export { apiConfig };

// Define PathResolutionError if not imported
class PathResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathResolutionError';
  }
}

// Export classes
export { EnhancedApiClient, PathResolutionError };

// Default export for backward compatibility
export default {
  apiClient,
  api,
  hooks,
  utils
};