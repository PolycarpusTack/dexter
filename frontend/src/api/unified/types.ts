/**
 * Types for the unified API client
 */

import { AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  AlertCondition,
  AlertAction,
  EventEntry,
  EventUser,
  EventContext,
  BreadcrumbData,
  ProgressEvent,
  ApiMetadata,
  ApiErrorDetails,
  UISettings,
  ProviderSettings,
  ErrorContext,
  ModelMetrics
} from './interfaces';

// HTTP Method enum
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

// Error category enum
export enum ErrorCategory {
  Network = 'network',
  Authentication = 'authentication',
  Authorization = 'authorization',
  NotFound = 'not_found',
  Validation = 'validation',
  RateLimit = 'rate_limit',
  Server = 'server',
  Timeout = 'timeout',
  Unknown = 'unknown'
}

// Model-related enums
export enum ModelStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  DOWNLOADING = 'downloading',
  ERROR = 'error'
}

export enum ModelSize {
  TINY = 'tiny',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  XLARGE = 'xlarge'
}

export enum ModelCapability {
  TEXT = 'text',
  CODE = 'code',
  VISION = 'vision',
  STRUCTURED = 'structured',
  MULTILINGUAL = 'multilingual'
}

export enum ModelProvider {
  OLLAMA = 'ollama',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  HUGGINGFACE = 'huggingface',
  CUSTOM = 'custom'
}

// AI Model interfaces
export interface Model {
  id: string;
  name: string;
  description?: string;
  provider: ModelProvider;
  status: ModelStatus;
  size: ModelSize;
  size_mb?: number;
  capabilities: ModelCapability[];  // Keep it required but ensure defaults are provided
  metrics?: ModelMetrics;
  error?: string;
}

export interface ModelGroup {
  name: string;
  description?: string;
  models: { id: string; priority?: number }[];
}

export interface FallbackChain {
  name: string;
  description?: string;
  models: string[];
  is_default: boolean;
}

// API Client interface
export interface ApiClient {
  request<T = unknown>(config: ApiCallOptions): Promise<ApiResponse<T>>;
  get<T = unknown>(path: string, options?: Omit<ApiCallOptions, 'method'>): Promise<ApiResponse<T>>;
  post<T = unknown>(path: string, data?: unknown, options?: Omit<ApiCallOptions, 'method' | 'data'>): Promise<ApiResponse<T>>;
  put<T = unknown>(path: string, data?: unknown, options?: Omit<ApiCallOptions, 'method' | 'data'>): Promise<ApiResponse<T>>;
  patch<T = unknown>(path: string, data?: unknown, options?: Omit<ApiCallOptions, 'method' | 'data'>): Promise<ApiResponse<T>>;
  delete<T = unknown>(path: string, options?: Omit<ApiCallOptions, 'method'>): Promise<ApiResponse<T>>;
}

// API Configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  defaultHeaders: Record<string, string>;
  endpoints: Record<string, CategoryConfig>;
}

// Category configuration for endpoints
export interface CategoryConfig {
  base: string;
  endpoints: Record<string, EndpointConfig>;
}

// Endpoint configuration
export interface EndpointConfig {
  path: string;
  method: HttpMethod;
}

// Path parameters for dynamic paths
export type PathParams = Record<string, string | number>;

// Query parameters
export type QueryParams = Record<string, string | number | boolean | Array<string | number> | null | undefined>;

// API call options
export interface ApiCallOptions {
  method?: HttpMethod;
  path?: string;
  url?: string;
  data?: unknown;
  params?: QueryParams;
  pathParams?: PathParams;
  headers?: Record<string, string>;
  timeout?: number;
  withCredentials?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  signal?: AbortSignal;
  cache?: boolean;
  cacheTime?: number;
  retry?: boolean;
  retryCount?: number;
  retryDelay?: number;
  validateStatus?: (status: number) => boolean;
  onUploadProgress?: (progressEvent: ProgressEvent) => void;
  onDownloadProgress?: (progressEvent: ProgressEvent) => void;
  requestId?: string;
}

// API Error interface
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  category: ErrorCategory;
  requestId?: string;
  details?: ApiErrorDetails;
  originalError?: Error;
  isRetryable: boolean;
  suppressNotifications?: boolean;  // Whether to suppress UI notifications for this error
}

// API Response interface
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
  requestId?: string;
  metadata?: ApiMetadata;
}

// Paginated Response interface
export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    next?: string;
    previous?: string;
    cursor?: string;
    total?: number;
    totalPages?: number;
    count?: number;
    perPage?: number;
    currentPage?: number;
    hasMore?: boolean;
  }
}

// Basic resource interfaces
export interface Issue {
  id: string;
  title: string;
  status: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  projectSlug: string;
  timestamp: string;
  type: string;
}

export interface AlertRule {
  id: string;
  name: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
}

// AI Model request and response types
export interface ModelRequest {
  model_id: string;
  options?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string[];
    [key: string]: unknown;
  };
}

export interface ModelResponse {
  model: Model;
  status: string;
  message?: string;
}

export interface ModelsResponse {
  models: Model[];
  groups: ModelGroup[];
  fallback_chains: FallbackChain[];
  current_model?: string;
  current_fallback_chain?: string;
  providers: string[];
  status: Record<string, boolean>;
}

export interface ModelPreferences {
  default_model_id?: string;
  default_fallback_chain?: string;
  provider_settings?: ProviderSettings;
  ui_settings?: UISettings;
}

export interface AiModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
}

export interface ErrorExplanationRequest {
  type: 'event' | 'issue' | 'text';
  id?: string;
  content?: string;
  context?: ErrorContext;
}

export interface ErrorExplanationResponse {
  explanation: string;
  model?: string;
  processing_time?: number;
  debug?: {
    prompt?: string;
    tokens_used?: number;
    raw_response?: string;
    [key: string]: unknown;
  };
}