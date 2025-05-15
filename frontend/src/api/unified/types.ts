/**
 * Unified API Client Types
 * 
 * This file defines the TypeScript interfaces for the API client architecture.
 */

import { z } from 'zod';

// HTTP Methods
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

// API Endpoint Configuration
export interface EndpointConfig {
  // Endpoint identifier
  name: string;
  // Path for the frontend API
  path: string;
  // HTTP method for the endpoint
  method: HttpMethod;
  // Description of the endpoint
  description: string;
  // Whether the endpoint requires authentication
  requiresAuth?: boolean;
  // Cache TTL in seconds
  cacheTTL?: number; 
}

// Category Configuration
export interface CategoryConfig {
  // Base path for all endpoints in this category
  basePath: string;
  // Map of endpoints in this category
  endpoints: Record<string, EndpointConfig>;
}

// API Configuration
export interface ApiConfig {
  // Base URL for API calls
  baseUrl: string;
  // Map of categories
  categories: Record<string, CategoryConfig>;
}

// Path Parameters
export interface PathParams {
  [key: string]: string | number | boolean;
}

// Query Parameters
export interface QueryParams {
  [key: string]: string | number | boolean | string[] | undefined;
}

// API Call Options
export interface ApiCallOptions {
  // Authentication token (if not using global auth)
  token?: string;
  // Whether to bypass cache
  bypassCache?: boolean;
  // Request timeout in milliseconds
  timeout?: number;
  // Custom headers
  headers?: Record<string, string>;
  // Response type
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  // Abort controller signal
  signal?: AbortSignal;
  // Retry options
  retry?: {
    // Maximum number of retries
    maxRetries?: number;
    // Base delay between retries in milliseconds
    baseDelay?: number;
    // Whether to use exponential backoff
    useExponentialBackoff?: boolean;
  };
  // HTTP Method override
  method?: HttpMethod | string;
  // Cache-Control override
  cache?: RequestCache;
}

// Basic Response Interface
export interface ApiResponse<T = any> {
  // Response data
  data: T;
  // Response status
  status: number;
  // Response headers
  headers?: Record<string, string>;
  // Original response object (for direct access)
  originalResponse?: any;
}

// Paginated Response
export interface PaginatedResponse<T = any> {
  // Items in the current page
  items: T[];
  // Pagination metadata
  pagination: {
    // Next page cursor (if available)
    next?: string;
    // Previous page cursor (if available)
    previous?: string;
    // Total number of items (if available)
    total?: number;
    // Current page number (if using page-based pagination)
    page?: number;
    // Number of items per page
    perPage?: number;
  };
}

// Error Types
export enum ErrorCategory {
  // Network errors (timeout, connection refused, etc.)
  NETWORK = 'network',
  // Authentication errors (401, 403)
  AUTH = 'auth',
  // Server errors (500, 502, 504)
  SERVER = 'server',
  // Client errors (400, 404, 422)
  CLIENT = 'client',
  // Validation errors (422 with specific format)
  VALIDATION = 'validation',
  // Rate limiting errors (429)
  RATE_LIMIT = 'rate_limit',
  // Unknown errors
  UNKNOWN = 'unknown',
  // Added categories for more specific error types
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  INPUT = 'input',
  SYNTAX = 'syntax',
  DEADLOCK = 'deadlock',
  MEMORY = 'memory',
  TIMEOUT = 'timeout',
  CONFIGURATION = 'configuration',
  DEPENDENCY = 'dependency',
}

// API Error Interface
export interface ApiError extends Error {
  // HTTP status code
  status?: number;
  // Error category
  category: ErrorCategory;
  // Original error object
  originalError?: Error;
  // Error data from response
  data?: any;
  // Whether the error is retryable
  retryable: boolean;
  // Number of retry attempts made
  retryCount: number;
  // Additional metadata
  metadata?: Record<string, any>;
}

// API Client Interface
export interface ApiClient {
  // Core HTTP methods
  get<T = any>(url: string, options?: ApiCallOptions): Promise<T>;
  post<T = any>(url: string, data?: any, options?: ApiCallOptions): Promise<T>;
  put<T = any>(url: string, data?: any, options?: ApiCallOptions): Promise<T>;
  delete<T = any>(url: string, options?: ApiCallOptions): Promise<T>;
  patch<T = any>(url: string, data?: any, options?: ApiCallOptions): Promise<T>;
  
  // Path-aware methods
  callEndpoint<T = any>(
    category: string,
    endpoint: string,
    pathParams?: PathParams,
    queryParams?: QueryParams,
    data?: any,
    options?: ApiCallOptions
  ): Promise<T>;
  
  // Batch methods
  batchGet<T = any>(urls: string[], options?: ApiCallOptions): Promise<T[]>;
  
  // Cache management
  clearCache(): void;
  invalidateCache(pattern: string | RegExp): void;
  
  // Configuration
  getConfig(): ApiConfig;
  updateConfig(config: Partial<ApiConfig>): void;
  
  // Path handling
  resolvePath(
    category: string,
    endpoint: string,
    pathParams?: PathParams
  ): string;
}

// Response Validator Interface
export interface ResponseValidator<T> {
  // Validate response data
  validate(data: unknown): T;
  // Validate partial response data
  validatePartial(data: unknown): Partial<T>;
}

// ============================
// Enhanced AI Model Types
// ============================

// Error explanation types
export interface ErrorExplanationRequest {
  eventId?: string;
  issueId?: string;
  errorText?: string;
  stackTrace?: string;
  model?: string;
  options?: {
    includeRecommendations?: boolean;
    includeCodeExamples?: boolean;
    maxTokens?: number;
  };
  context?: Record<string, any>;
}

export interface ErrorExplanationResponse {
  explanation: string;
  model?: string;
  processing_time?: number;
  debug?: Record<string, any>;
}

// Enhanced AI model types
export enum ModelProvider {
  OLLAMA = 'ollama',
  OPENAI = 'openai',
  HUGGINGFACE = 'huggingface',
  ANTHROPIC = 'anthropic',
  CUSTOM = 'custom'
}

export enum ModelStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  DOWNLOADING = 'downloading',
  ERROR = 'error'
}

export enum ModelCapability {
  CODE = 'code',
  TEXT = 'text',
  VISION = 'vision',
  STRUCTURED = 'structured',
  MULTILINGUAL = 'multilingual'
}

export enum ModelSize {
  TINY = 'tiny',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  XLARGE = 'xlarge'
}

export interface ModelParameters {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop_sequences?: string[];
}

export interface ModelMetrics {
  avg_response_time?: number;
  success_rate?: number;
  usage_count?: number;
  last_used?: string;
  error_count?: number;
}

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  status: ModelStatus;
  capabilities: ModelCapability[];
  size: ModelSize;
  size_mb?: number;
  description?: string;
  version?: string;
  parameters?: ModelParameters;
  metrics?: ModelMetrics;
  error?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ModelGroup {
  name: string;
  models: Model[];
  description?: string;
}

export interface FallbackChain {
  name: string;
  models: string[];
  description?: string;
  is_default?: boolean;
}

export interface ModelPreferences {
  primary_model: string;
  fallback_models: string[];
  parameters?: Record<string, ModelParameters>;
  default_parameters?: ModelParameters;
}

export interface ModelsResponse {
  models: Model[];
  groups?: ModelGroup[];
  fallback_chains?: FallbackChain[];
  current_model?: string;
  current_fallback_chain?: string;
  providers?: ModelProvider[];
  status?: Record<string, any>;
}

export interface ModelRequest {
  model_id: string;
  fallback_chain_id?: string;
  parameters?: ModelParameters;
}

export interface ModelResponse {
  model: Model;
  status: string;
  message: string;
}

// Legacy model types
export interface OllamaModelDetails {
  name: string;
  status: string;
  size?: number;
  modified_at?: string;
  error?: string;
  details?: Record<string, any>;
}

export interface OllamaModelsResponse {
  models: OllamaModelDetails[];
  current_model?: string;
  ollama_status: string;
  error?: string;
}

// Schema validations for responses
export const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.enum([
    ModelProvider.OLLAMA, 
    ModelProvider.OPENAI, 
    ModelProvider.HUGGINGFACE, 
    ModelProvider.ANTHROPIC, 
    ModelProvider.CUSTOM
  ]),
  status: z.enum([
    ModelStatus.AVAILABLE,
    ModelStatus.UNAVAILABLE,
    ModelStatus.DOWNLOADING,
    ModelStatus.ERROR
  ]),
  capabilities: z.array(z.enum([
    ModelCapability.CODE,
    ModelCapability.TEXT,
    ModelCapability.VISION,
    ModelCapability.STRUCTURED,
    ModelCapability.MULTILINGUAL
  ])),
  size: z.enum([
    ModelSize.TINY,
    ModelSize.SMALL,
    ModelSize.MEDIUM,
    ModelSize.LARGE,
    ModelSize.XLARGE
  ]),
  size_mb: z.number().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  error: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export const modelsResponseSchema = z.object({
  models: z.array(modelSchema),
  groups: z.array(z.object({
    name: z.string(),
    models: z.array(modelSchema),
    description: z.string().optional()
  })).optional(),
  fallback_chains: z.array(z.object({
    name: z.string(),
    models: z.array(z.string()),
    description: z.string().optional(),
    is_default: z.boolean().optional()
  })).optional(),
  current_model: z.string().optional(),
  current_fallback_chain: z.string().optional(),
  providers: z.array(z.string()).optional(),
  status: z.record(z.any()).optional()
});