/**
 * Enhanced API Client Implementation
 * 
 * This file implements a robust API client with built-in error handling,
 * path resolution, caching, and other performance optimizations.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import {
  ApiCallOptions,
  ApiClient,
  ApiConfig,
  ApiError,
  ErrorCategory,
  HttpMethod,
  PathParams,
  QueryParams
} from './types';
import apiConfig from './apiConfig';
import { getFullUrl, getMethod, resolvePath, validateParams } from './utils';
import { BoundedCache, CacheEntry, RequestDeduplicator } from './cache';
import { RetryManager, RetryConfig } from './retryManager';
import { tokenManager } from './tokenManager';
import { useAuthStore } from '../../store';
import { REQUEST_TIMEOUTS, CONTENT_TYPES } from '../../constants/api';
import { CACHE_CONFIG } from '../../constants/cache';
import { addCSRFHeader, fetchCSRFToken, getCSRFToken } from '../../utils/csrf';

// Default axios config
const defaultAxiosConfig: AxiosRequestConfig = {
  headers: {
    'Content-Type': CONTENT_TYPES.JSON,
    'Accept': CONTENT_TYPES.JSON,
  },
  timeout: REQUEST_TIMEOUTS.DEFAULT,
  withCredentials: false,
};

// Cache adapter for backward compatibility
class ApiCache {
  private cache: BoundedCache<unknown>;

  constructor() {
    this.cache = new BoundedCache({
      maxSize: CACHE_CONFIG.DEFAULT_MAX_SIZE,
      maxBytes: CACHE_CONFIG.DEFAULT_MAX_BYTES,
      defaultTTL: CACHE_CONFIG.DEFAULT_TTL
    });
  }

  /**
   * Store data in cache with optional TTL and ETag
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds
   * @param etag - Optional ETag for cache validation
   */
  set(key: string, data: unknown, ttl: number = CACHE_CONFIG.DEFAULT_TTL, etag?: string): void {
    this.cache.set(key, data, ttl, etag);
  }

  /**
   * Retrieve data from cache
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  get<T>(key: string): T | null {
    return this.cache.get(key) as T;
  }

  /**
   * Get ETag for cached entry
   * @param key - Cache key
   * @returns ETag string or undefined if not found
   */
  getEtag(key: string): string | undefined {
    const entry = this.cache.getEntry(key);
    return entry?.etag;
  }

  remove(key: string): void {
    this.cache.remove(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key) && this.cache.isValid(key);
  }

  // Remove entries with keys that match the pattern
  removePattern(pattern: RegExp): void {
    const stats = this.cache.getStats();
    for (const key of Object.keys(stats.entries)) {
      if (pattern.test(key)) {
        this.cache.remove(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    return this.cache.getStats();
  }
}

// Use imported RequestDeduplicator - already defined in cache.ts

/**
 * Enhanced API Client Implementation
 */
export class EnhancedApiClient implements ApiClient {
  private axiosInstance: AxiosInstance;
  private cache: ApiCache;
  private deduplicator: RequestDeduplicator;
  private retryManager: RetryManager;
  private config: ApiConfig;

  constructor(config: ApiConfig = apiConfig, axiosConfig: AxiosRequestConfig = defaultAxiosConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      ...axiosConfig
    });
    this.cache = new ApiCache();
    this.deduplicator = new RequestDeduplicator();
    this.retryManager = new RetryManager({
      maxRetries: 3,
      initialDelay: 300,
      backoffMultiplier: 2
    });
    
    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async config => {
        // Log the full URL being requested
        const fullURL = `${config.baseURL}${config.url}`;
        console.log(`[${config.method?.toUpperCase()}] ${fullURL}`);
        
        // Add request timing
        const configWithMetadata = config as AxiosRequestConfig & { metadata?: { startTime: number } };
        configWithMetadata.metadata = { startTime: Date.now() };
        
        // Add authorization header using token manager
        const skipAuth = (config as any).skipAuth;
        if (!skipAuth) {
          try {
            const token = await tokenManager.getValidToken();
            if (token) {
              config.headers = { 
                ...config.headers, 
                'Authorization': `Bearer ${token}` 
              };
            }
          } catch (error) {
            console.warn('Failed to get auth token:', error);
            // Fall back to store token
            const apiToken = useAuthStore.getState().apiToken;
            if (apiToken) {
              config.headers = { 
                ...config.headers, 
                'Authorization': `Bearer ${apiToken}` 
              };
            }
          }
        }
        
        // Add CSRF token for non-safe methods
        const method = config.method?.toUpperCase();
        if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
          // Ensure we have a CSRF token
          if (!getCSRFToken()) {
            try {
              await fetchCSRFToken();
            } catch (error) {
              console.warn('Failed to fetch CSRF token:', error);
            }
          }
          
          config.headers = addCSRFHeader(config.headers || {});
        }
        
        // Add cache headers if applicable
        if (config.method?.toLowerCase() === 'get') {
          const etag = this.cache.getEtag(config.url || '');
          if (etag) {
            config.headers = { ...config.headers, 'If-None-Match': etag };
          }
        }
        
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      response => {
        // Store cache info for GET requests
        if (response.config.method?.toLowerCase() === 'get') {
          const etag = response.headers['etag'];
          const cacheControl = response.headers['cache-control'];
          let ttl = 5 * 60 * 1000; // Default 5 minutes
          
          if (cacheControl) {
            const maxAge = cacheControl.match(/max-age=(\d+)/);
            if (maxAge) {
              ttl = parseInt(maxAge[1]) * 1000;
            }
          }
          
          this.cache.set(response.config.url || '', response.data, ttl, etag);
        }
        
        return response;
      },
      async error => {
        // Handle 304 Not Modified
        if (error.response?.status === 304) {
          const cachedData = this.cache.get(error.config.url || '');
          if (cachedData) {
            return {
              ...error.response,
              data: cachedData,
              status: 200,
              statusText: 'OK (from cache)'
            };
          }
        }
        
        // Get URL for analysis and specific error handling
        const url = error.config?.url || '';
        const status = error.response?.status;
        // Update to include both ai and ai-enhanced paths, and config endpoint
        const isCommonAPIEndpoint = url.includes('/api/v1/config') || 
                                   url.includes('/api/v1/ai-enhanced/models') ||
                                   url.includes('/api/v1/ai/models');
        
        // Only log detailed error information for non-404 errors or if the endpoint
        // isn't one of our common API endpoints that might not be available
        if (!(status === 404 && isCommonAPIEndpoint)) {
          if (error.response) {
            console.error(`API Error: ${status} ${error.response.statusText}`, url);
          } else if (error.request) {
            console.error('API Error: No response received', url);
          } else {
            console.error('API Error:', error.message);
          }
        }
        
        const apiError = this.createApiError(error);
        
        // For certain common endpoints, add a flag to suppress notifications
        if (isCommonAPIEndpoint && status === 404) {
          apiError.suppressNotifications = true;
        }
        
        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Create an enhanced API error from an Axios error
   */
  private createApiError(error: AxiosError): ApiError {
    let category: ErrorCategory = ErrorCategory.UNKNOWN;
    let message = 'An unknown error occurred';
    let status: number | undefined = undefined;
    let retryable = false;
    let data: unknown = undefined;
    
    // Network errors
    if (!error.response) {
      category = ErrorCategory.NETWORK;
      message = error.message || 'Network error';
      retryable = true;
    } 
    // Response errors
    else {
      status = error.response.status;
      data = error.response.data;
      
      // Extract message from response data if possible
      if (data) {
        if (typeof data === 'string') {
          message = data;
        } else if (typeof data === 'object') {
          const dataObj = data as { message?: string; error?: string; detail?: string | object };
          if (dataObj.message) message = dataObj.message;
          else if (dataObj.error) message = dataObj.error;
          else if (dataObj.detail) message = typeof dataObj.detail === 'string' ? dataObj.detail : JSON.stringify(dataObj.detail);
        }
      }
      
      // Categorize based on status code
      if (status === 401 || status === 403) {
        category = ErrorCategory.AUTH;
        message = status === 401 ? 'Authentication required' : 'Access denied';
        retryable = false;
      } else if (status === 422) {
        category = ErrorCategory.VALIDATION;
        retryable = false;
      } else if (status === 429) {
        category = ErrorCategory.RATE_LIMIT;
        message = 'Rate limit exceeded';
        retryable = true;
      } else if (status >= 500) {
        category = ErrorCategory.SERVER;
        message = `Server error: ${status}`;
        retryable = true;
      } else if (status >= 400) {
        category = ErrorCategory.CLIENT;
        retryable = false;
      }
    }
    
    // Determine if we should suppress notifications for this error
    // Suppress common expected errors like missing endpoints
    const shouldSuppressNotification = 
      (status === 404 && (error.config?.url?.includes('/api/v1/ai/models') || 
                         error.config?.url?.includes('/api/v1/config') ||
                         error.config?.url?.includes('/api/v1/ai-enhanced/models')));

    // Create the error object
    const apiError: ApiError = {
      message,
      status: status || 0,
      category,
      isRetryable: retryable,
      originalError: error,
      suppressNotifications: !!shouldSuppressNotification,
      details: typeof data === 'object' && data !== null ? data as ApiErrorDetails : undefined
    };
    
    return apiError;
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(url: string, options: ApiCallOptions = {}): Promise<T> {
    const cacheKey = url;
    
    // Check cache first (unless bypass requested)
    if (!options.bypassCache) {
      const cachedData = this.cache.get<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Prepare request config
    const config: AxiosRequestConfig = {
      ...this.createRequestConfig(options),
      method: 'GET',
      url
    };
    
    // Use deduplication for GET requests
    return this.deduplicator.deduplicate<T>(cacheKey, () => {
      return this.retryManager.execute(
        () => this.axiosInstance.request<T>(config).then(response => response.data),
        options.retry?.maxRetries || 3
      );
    });
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(url: string, data?: unknown, options: ApiCallOptions = {}): Promise<T> {
    const config: AxiosRequestConfig = {
      ...this.createRequestConfig(options),
      method: 'POST',
      url,
      data
    };
    
    return this.retryManager.execute(
      () => this.axiosInstance.request<T>(config).then(response => response.data),
      options.retry?.maxRetries || 3
    );
  }

  /**
   * Make a PUT request
   */
  async put<T = unknown>(url: string, data?: unknown, options: ApiCallOptions = {}): Promise<T> {
    const config: AxiosRequestConfig = {
      ...this.createRequestConfig(options),
      method: 'PUT',
      url,
      data
    };
    
    return this.retryManager.execute(
      () => this.axiosInstance.request<T>(config).then(response => response.data),
      options.retry?.maxRetries || 3
    );
  }

  /**
   * Make a DELETE request
   */
  async delete<T = unknown>(url: string, options: ApiCallOptions = {}): Promise<T> {
    // Invalidate cache for this URL
    this.cache.remove(url);
    
    const config: AxiosRequestConfig = {
      ...this.createRequestConfig(options),
      method: 'DELETE',
      url
    };
    
    return this.retryManager.execute(
      () => this.axiosInstance.request<T>(config).then(response => response.data),
      options.retry?.maxRetries || 3
    );
  }

  /**
   * Make a PATCH request
   */
  async patch<T = unknown>(url: string, data?: unknown, options: ApiCallOptions = {}): Promise<T> {
    // Invalidate cache for this URL
    this.cache.remove(url);
    
    const config: AxiosRequestConfig = {
      ...this.createRequestConfig(options),
      method: 'PATCH',
      url,
      data
    };
    
    return this.retryManager.execute(
      () => this.axiosInstance.request<T>(config).then(response => response.data),
      options.retry?.maxRetries || 3
    );
  }

  /**
   * Create a request config from API call options
   */
  private createRequestConfig(options: ApiCallOptions): AxiosRequestConfig {
    return {
      headers: options.headers,
      params: options.params,
      timeout: options.timeout,
      responseType: options.responseType,
      signal: options.signal
    };
  }

  /**
   * Make a request using endpoint name, resolving path automatically
   */
  async callEndpoint<T = unknown>(
    category: string,
    endpoint: string,
    pathParams: PathParams = {},
    queryParams: QueryParams = {},
    data?: unknown,
    options: ApiCallOptions = {}
  ): Promise<T> {
    try {
      // All mock implementations have been removed - using real API only
      
      // Get the method
      const method = getMethod(category, endpoint);
      
      // Get the full URL
      const url = getFullUrl(category, endpoint, pathParams);
      
      // Make the appropriate request based on method
      switch (method.toUpperCase()) {
        case HttpMethod.GET:
          return await this.get<T>(url, {
            ...options,
            params: queryParams,
          });
          
        case HttpMethod.POST:
          return await this.post<T>(url, data, {
            ...options,
            params: queryParams,
          });
          
        case HttpMethod.PUT:
          return await this.put<T>(url, data, {
            ...options,
            params: queryParams,
          });
          
        case HttpMethod.DELETE:
          return await this.delete<T>(url, {
            ...options,
            params: queryParams,
          });
          
        case HttpMethod.PATCH:
          return await this.patch<T>(url, data, {
            ...options,
            params: queryParams,
          });
          
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
    } catch (error) {
      console.error(`API Error for endpoint ${category}.${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Batch multiple GET requests
   */
  async batchGet<T = unknown>(urls: string[], options: ApiCallOptions = {}): Promise<T[]> {
    return Promise.all(urls.map(url => this.get<T>(url, options)));
  }

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidateCache(pattern: string | RegExp): void {
    if (typeof pattern === 'string') {
      this.cache.remove(pattern);
    } else {
      this.cache.removePattern(pattern);
    }
  }

  /**
   * Get the current API configuration
   */
  getConfig(): ApiConfig {
    return this.config;
  }

  /**
   * Update the API configuration
   */
  updateConfig(config: Partial<ApiConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  /**
   * Resolve an API path
   */
  resolvePath(category: string, endpoint: string, pathParams: PathParams = {}): string {
    return resolvePath(category, endpoint, pathParams);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Get the axios instance for direct use
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Create and export a default instance
export const enhancedApiClient = new EnhancedApiClient();

export default enhancedApiClient;
