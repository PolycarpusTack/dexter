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
import { getFullUrl, getMethod, resolvePath } from './pathResolver';

// Default axios config
const defaultAxiosConfig: AxiosRequestConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds
  withCredentials: false,
};

// Cache implementation
class ApiCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number; etag?: string }> = new Map();

  set(key: string, data: any, ttl: number = 300000, etag?: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      etag
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  getEtag(key: string): string | undefined {
    const entry = this.cache.get(key);
    return entry?.etag;
  }

  remove(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // Remove entries with keys that match the pattern
  removePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; sizeBytes: number; entries: Record<string, { age: number; ttl: number; hasEtag: boolean }> } {
    let sizeBytes = 0;
    const entries: Record<string, { age: number; ttl: number; hasEtag: boolean }> = {};
    
    for (const [key, entry] of this.cache.entries()) {
      const age = Date.now() - entry.timestamp;
      entries[key] = {
        age,
        ttl: entry.ttl,
        hasEtag: !!entry.etag
      };
      
      // Estimate size in bytes
      sizeBytes += key.length * 2; // Rough estimate for string
      sizeBytes += JSON.stringify(entry.data).length * 2; // Rough estimate for data
    }
    
    return {
      size: this.cache.size,
      sizeBytes,
      entries
    };
  }
}

// Request deduplication implementation
class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<any>> = new Map();

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If there's already a pending request for this key, return it
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }
    
    // Create a new request and store it
    const requestPromise = requestFn()
      .finally(() => {
        // Remove the request from pending when it's done
        this.pendingRequests.delete(key);
      });
    
    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  clearPending(): void {
    this.pendingRequests.clear();
  }
}

// Request retry implementation
class RetryManager {
  async retry<T>(
    requestFn: () => Promise<T>, 
    maxRetries: number = 3,
    baseDelay: number = 300,
    retryableStatusCodes: number[] = [408, 429, 500, 502, 503, 504]
  ): Promise<T> {
    let retryCount = 0;
    
    const executeWithRetry = async (): Promise<T> => {
      try {
        return await requestFn();
      } catch (error) {
        // Handle axios errors
        if (error && typeof error === 'object' && 'isAxiosError' in error) {
          const axiosError = error as AxiosError;
          
          // Check if we can retry
          const canRetry = retryCount < maxRetries && (
            // Network errors
            !axiosError.response ||
            // Retryable status codes
            (axiosError.response && retryableStatusCodes.includes(axiosError.response.status))
          );
          
          if (canRetry) {
            retryCount++;
            
            // Exponential backoff with jitter
            const delay = baseDelay * Math.pow(2, retryCount - 1) * (1 + Math.random() * 0.1);
            
            console.warn(`API request failed, retrying (${retryCount}/${maxRetries}) in ${delay}ms...`);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Retry
            return executeWithRetry();
          }
        }
        
        // If we can't retry, rethrow
        throw error;
      }
    };
    
    return executeWithRetry();
  }
}

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
    this.retryManager = new RetryManager();
    
    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      config => {
        // Add request timing
        (config as any).metadata = { startTime: Date.now() };
        
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
        
        // Log API errors
        if (error.response) {
          console.error(`API Error: ${error.response.status} ${error.response.statusText}`, error.config?.url);
        } else if (error.request) {
          console.error('API Error: No response received', error.config?.url);
        } else {
          console.error('API Error:', error.message);
        }
        
        return Promise.reject(this.createApiError(error));
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
    let data: any = undefined;
    
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
          if (data.message) message = data.message;
          else if (data.error) message = data.error;
          else if (data.detail) message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
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
    
    // Create the error object
    const apiError = new Error(message) as ApiError;
    apiError.name = 'ApiError';
    apiError.status = status;
    apiError.category = category;
    apiError.data = data;
    apiError.retryable = retryable;
    apiError.retryCount = 0;
    apiError.originalError = error;
    apiError.metadata = {
      url: error.config?.url,
      method: error.config?.method
    };
    
    return apiError;
  }

  /**
   * Make a GET request
   */
  async get<T = any>(url: string, options: ApiCallOptions = {}): Promise<T> {
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
      return this.retryManager.retry(
        () => this.axiosInstance.request<T>(config).then(response => response.data),
        options.retry?.maxRetries || 3
      );
    });
  }

  /**
   * Make a POST request
   */
  async post<T = any>(url: string, data?: any, options: ApiCallOptions = {}): Promise<T> {
    const config: AxiosRequestConfig = {
      ...this.createRequestConfig(options),
      method: 'POST',
      url,
      data
    };
    
    return this.retryManager.retry(
      () => this.axiosInstance.request<T>(config).then(response => response.data),
      options.retry?.maxRetries || 3
    );
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(url: string, data?: any, options: ApiCallOptions = {}): Promise<T> {
    const config: AxiosRequestConfig = {
      ...this.createRequestConfig(options),
      method: 'PUT',
      url,
      data
    };
    
    return this.retryManager.retry(
      () => this.axiosInstance.request<T>(config).then(response => response.data),
      options.retry?.maxRetries || 3
    );
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(url: string, options: ApiCallOptions = {}): Promise<T> {
    // Invalidate cache for this URL
    this.cache.remove(url);
    
    const config: AxiosRequestConfig = {
      ...this.createRequestConfig(options),
      method: 'DELETE',
      url
    };
    
    return this.retryManager.retry(
      () => this.axiosInstance.request<T>(config).then(response => response.data),
      options.retry?.maxRetries || 3
    );
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(url: string, data?: any, options: ApiCallOptions = {}): Promise<T> {
    // Invalidate cache for this URL
    this.cache.remove(url);
    
    const config: AxiosRequestConfig = {
      ...this.createRequestConfig(options),
      method: 'PATCH',
      url,
      data
    };
    
    return this.retryManager.retry(
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
      timeout: options.timeout,
      responseType: options.responseType,
      signal: options.signal
    };
  }

  /**
   * Make a request using endpoint name, resolving path automatically
   */
  async callEndpoint<T = any>(
    category: string,
    endpoint: string,
    pathParams: PathParams = {},
    queryParams: QueryParams = {},
    data?: any,
    options: ApiCallOptions = {}
  ): Promise<T> {
    try {
      // Get the method
      const method = getMethod(category, endpoint);
      
      // Get the full URL
      const url = getFullUrl(category, endpoint, pathParams);
      
      // Make the appropriate request based on method
      switch (method.toUpperCase()) {
        case HttpMethod.GET:
          return await this.get<T>(url, {
            ...options,
            headers: {
              ...options.headers,
              params: queryParams
            }
          });
          
        case HttpMethod.POST:
          return await this.post<T>(url, data, {
            ...options,
            headers: {
              ...options.headers,
              params: queryParams
            }
          });
          
        case HttpMethod.PUT:
          return await this.put<T>(url, data, {
            ...options,
            headers: {
              ...options.headers,
              params: queryParams
            }
          });
          
        case HttpMethod.DELETE:
          return await this.delete<T>(url, {
            ...options,
            headers: {
              ...options.headers,
              params: queryParams
            }
          });
          
        case HttpMethod.PATCH:
          return await this.patch<T>(url, data, {
            ...options,
            headers: {
              ...options.headers,
              params: queryParams
            }
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
  async batchGet<T = any>(urls: string[], options: ApiCallOptions = {}): Promise<T[]> {
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