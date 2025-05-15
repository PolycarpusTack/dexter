/**
 * Types for the unified API client
 */

import { AxiosRequestConfig, AxiosResponse } from 'axios';

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

// API Client interface
export interface ApiClient {
  request<T = any>(config: ApiCallOptions): Promise<ApiResponse<T>>;
  get<T = any>(path: string, options?: Omit<ApiCallOptions, 'method'>): Promise<ApiResponse<T>>;
  post<T = any>(path: string, data?: any, options?: Omit<ApiCallOptions, 'method' | 'data'>): Promise<ApiResponse<T>>;
  put<T = any>(path: string, data?: any, options?: Omit<ApiCallOptions, 'method' | 'data'>): Promise<ApiResponse<T>>;
  patch<T = any>(path: string, data?: any, options?: Omit<ApiCallOptions, 'method' | 'data'>): Promise<ApiResponse<T>>;
  delete<T = any>(path: string, options?: Omit<ApiCallOptions, 'method'>): Promise<ApiResponse<T>>;
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
  data?: any;
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
  onUploadProgress?: (progressEvent: any) => void;
  onDownloadProgress?: (progressEvent: any) => void;
  requestId?: string;
}

// API Error interface
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  category: ErrorCategory;
  requestId?: string;
  details?: any;
  originalError?: Error;
  isRetryable: boolean;
}

// API Response interface
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  requestId?: string;
}

// Paginated Response interface
export interface PaginatedResponse<T = any> {
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
  projectId: string;
  timestamp: string;
  type: string;
}

export interface AlertRule {
  id: string;
  name: string;
  conditions: any[];
  actions: any[];
}