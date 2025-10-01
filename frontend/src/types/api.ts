/**
 * API-related type definitions
 */

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  metadata?: ApiMetadata;
}

// API error response
export interface ApiErrorResponse {
  success: false;
  error_code: string;
  message: string;
  details?: Record<string, unknown>;
}

// API metadata
export interface ApiMetadata {
  timestamp?: string;
  version?: string;
  requestId?: string;
  pagination?: PaginationInfo;
  [key: string]: unknown;
}

// Pagination information
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

// Common query parameters
export interface QueryParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filter?: Record<string, unknown>;
  cursor?: string;
}

// Path parameters
export interface PathParams {
  [key: string]: string | number;
}

// Request options
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

// HTTP methods
export type HttpMethod = 
  | 'GET' 
  | 'POST' 
  | 'PUT' 
  | 'PATCH' 
  | 'DELETE' 
  | 'HEAD' 
  | 'OPTIONS';

// API endpoint configuration
export interface EndpointConfig {
  path: string;
  method: HttpMethod;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
}

// API category configuration
export interface CategoryConfig {
  basePath: string;
  endpoints: Record<string, EndpointConfig>;
  defaultTimeout?: number;
  defaultRetries?: number;
}

// Complete API configuration
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  endpoints: Record<string, CategoryConfig>;
}

// Error categories
export type ErrorCategory = 
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'not_found'
  | 'server_error'
  | 'rate_limit'
  | 'timeout'
  | 'abort'
  | 'unknown';

// API error details
export interface ApiErrorDetails {
  category: ErrorCategory;
  status?: number;
  statusText?: string;
  url?: string;
  method?: HttpMethod;
  timestamp: string;
  requestId?: string;
  retryable: boolean;
}

// Custom API error class interface
export interface ApiError extends Error {
  category: ErrorCategory;
  status?: number;
  statusText?: string;
  details: ApiErrorDetails;
  response?: unknown;
  request?: unknown;
}

// Cache entry for API responses
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
  size: number;
}

// Request deduplication key
export type DeduplicationKey = string;

// Retry configuration
export interface RetryConfig {
  attempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
  retryableErrors: string[];
}

// Token information
export interface TokenInfo {
  token: string;
  type: 'Bearer' | 'Basic' | 'ApiKey';
  expiresAt?: number;
  refreshToken?: string;
}

// Organization and project context
export interface OrganizationContext {
  organizationSlug: string;
  organizationId?: string;
  organizationName?: string;
}

export interface ProjectContext {
  projectSlug: string;
  projectSlugId?: string;
  projectName?: string;
}

// Combined context for API calls
export interface ApiContext extends OrganizationContext, Partial<ProjectContext> {
  userId?: string;
  userEmail?: string;
  teamId?: string;
  environment?: string;
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: Record<string, ServiceStatus>;
  uptime: number;
}

// Service status
export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  lastCheck: string;
  message?: string;
}

// Configuration response
export interface ConfigResponse {
  sentry_api_token?: string;
  sentry_base_url: string;
  sentry_web_url: string;
  organization_slug: string;
  project_slug: string;
  ollama_base_url?: string;
  ollama_model?: string;
  environment: string;
  features: Record<string, boolean>;
}

// Generic list response
export interface ListResponse<T> {
  items: T[];
  pagination: PaginationInfo;
  filters?: Record<string, unknown>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

// Generic create/update response
export interface MutationResponse<T = unknown> {
  id: string;
  data: T;
  created?: string;
  updated?: string;
  version?: number;
}

// Validation error details
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

// Bulk operation response
export interface BulkOperationResponse<T = unknown> {
  succeeded: T[];
  failed: Array<{
    item: T;
    error: string;
    code: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

// Export convenience types
export type Response<T = unknown> = ApiResponse<T>;
export type ErrorResponse = ApiErrorResponse;
export type Metadata = ApiMetadata;
export type Pagination = PaginationInfo;
export type Config = ApiConfig;
export type Error = ApiError;