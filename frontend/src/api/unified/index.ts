/**
 * Unified API Client
 * 
 * This file exports all API modules and utilities from the unified API client architecture.
 * It provides a clean public interface for consuming components.
 */

// Core API client and utilities
import enhancedApiClient, { EnhancedApiClient } from './enhancedApiClient';
import { PathResolutionError, resolvePath, getFullUrl } from './pathResolver.js';
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
  templates: templateApi
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
  useSetTemplateAsDefault
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
  RenderTemplateResponse
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

// Export classes
export { EnhancedApiClient, PathResolutionError };

// Default export for backward compatibility
export default {
  apiClient,
  api,
  hooks,
  utils
};