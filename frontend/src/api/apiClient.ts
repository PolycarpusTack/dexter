// File: frontend/src/api/apiClient.ts

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { API_BASE_URL, axiosConfig } from './config';
import retryManager, { RetryConfig } from '../utils/retryManager';
import ErrorFactory, { ApiError } from '../utils/errorFactory';
import { logErrorToService } from '../utils/errorTracking';
import { requestBatcher } from '../utils/requestBatcher';
import { requestDeduplicator } from '../utils/requestDeduplicator';
import { requestCache } from '../utils/requestCache';

// Define type alias for AxiosResponse for better type safety
type ApiResponse<T = any> = AxiosResponse<T>;

/**
 * API optimization options
 */
interface OptimizationOptions {
  enableBatching?: boolean;
  enableDeduplication?: boolean;
  enableCaching?: boolean;
  cacheOptions?: {
    ttl?: number;
    storage?: 'memory' | 'localStorage' | 'sessionStorage';
  };
  compressionThreshold?: number;
}

/**
 * Enhanced API client with retry capability, structured error handling, and performance optimizations
 */
export class EnhancedApiClient {
  protected axiosInstance: AxiosInstance;
  private defaultRetryConfig: Partial<RetryConfig>;
  private optimizations: Required<OptimizationOptions>;
  
  /**
   * Creates a new EnhancedApiClient instance
   * @param baseURL - Base URL for API requests
   * @param config - Axios config options
   * @param retryConfig - Retry configuration
   * @param optimizations - Performance optimization options
   */
  constructor(
    baseURL: string = API_BASE_URL, 
    config: AxiosRequestConfig = axiosConfig,
    retryConfig: Partial<RetryConfig> = {},
    optimizations: OptimizationOptions = {}
  ) {
    // Set default optimization options
    this.optimizations = {
      enableBatching: true,
      enableDeduplication: true,
      enableCaching: true,
      cacheOptions: {
        ttl: 5 * 60 * 1000, // 5 minutes
        storage: 'memory',
        ...optimizations.cacheOptions
      },
      compressionThreshold: 1024, // 1KB
      ...optimizations
    };
    
    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL,
      ...config,
      headers: {
        ...config.headers,
        'Accept': 'application/json, application/gzip',
        'Accept-Encoding': 'gzip, deflate',
      }
    });
    
    // Set default retry config
    this.defaultRetryConfig = {
      maxRetries: 3,
      ...retryConfig
    };
    
    // Add request and response interceptors
    this.setupInterceptors();
  }
  
  /**
   * Set up request and response interceptors
   */
  private setupInterceptors() {
    // Request interceptor for logging, compression, and caching
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add request timing
        (config as any).metadata = { startTime: new Date().getTime() };
        
        // Check if request should be compressed
        if (config.data && this.shouldCompress(config.data)) {
          // In a real implementation, you'd compress the data here
          config.headers['Content-Encoding'] = 'gzip';
        }
        
        // Add cache headers if caching is enabled
        if (this.optimizations.enableCaching && config.method === 'GET') {
          const cached = requestCache.get(config.url!, config);
          if (cached && typeof cached === 'object' && 'etag' in cached) {
            config.headers['If-None-Match'] = (cached as any).etag;
          }
        }
        
        return config;
      },
      (error) => {
        console.error('Request preparation error:', error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for error handling, timing, and caching
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Calculate request duration
        const metadata = (response.config as any).metadata;
        if (metadata?.startTime) {
          const duration = new Date().getTime() - metadata.startTime;
          (response as any).duration = duration;
        }
        
        // Handle caching for GET requests
        if (this.optimizations.enableCaching && response.config.method === 'GET') {
          const etag = response.headers['etag'];
          const cacheControl = response.headers['cache-control'];
          
          let ttl: number | undefined;
          if (cacheControl) {
            const maxAge = cacheControl.match(/max-age=(\d+)/);
            if (maxAge) {
              ttl = parseInt(maxAge[1]) * 1000;
            }
          }
          
          requestCache.set(
            response.config.url!,
            response.data,
            response.config,
            { ttl, etag }
          );
        }
        
        return response;
      },
      (error: AxiosError) => {
        // Handle 304 Not Modified
        if (error.response?.status === 304) {
          const cached = requestCache.get(error.config!.url!, error.config);
          if (cached) {
            const response: ApiResponse = {
              ...error.response,
              data: cached,
              status: 200,
              statusText: 'OK',
              headers: error.response.headers,
              config: error.config!
            };
            return response;
          }
        }
        
        // Log the error
        console.error('API Error:', error);
        
        // Check for CORS errors
        if (error.message === 'Network Error') {
          console.warn('Possible CORS issue detected');
        }
        
        // Enhanced error with ErrorFactory
        const enhancedError = this.enhanceError(error);
        
        // Log to error tracking service for server errors or unexpected client errors
        if (enhancedError instanceof ApiError && enhancedError.status >= 500) {
          logErrorToService(enhancedError, {
            source: 'apiClient',
            url: error.config?.url,
            method: error.config?.method,
            duration: (error.response as any)?.duration,
          });
        }
        
        return Promise.reject(enhancedError);
      }
    );
  }
  
  /**
   * Create enhanced error objects from Axios errors
   */
  private enhanceError(error: AxiosError): Error {
    // Network errors
    if (error.code === 'ECONNABORTED') {
      return ErrorFactory.createNetworkError('Request timed out', {
        originalError: error as unknown as Error,
        metadata: {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
        }
      });
    }
    
    if (error.code === 'ERR_NETWORK') {
      return ErrorFactory.createNetworkError('Network error. Please check your connection.', {
        originalError: error as unknown as Error,
        metadata: {
          url: error.config?.url,
          method: error.config?.method,
        }
      });
    }
    
    // API errors with response
    if (error.response) {
      const { status, data } = error.response;
      
      // Extract error message
      let message = 'An error occurred';
      if (data) {
        if (typeof data === 'string') {
          message = data;
        } else if (typeof data === 'object') {
          if ((data as any).detail) {
            message = typeof (data as any).detail === 'string' ? 
              (data as any).detail : 
              ((data as any).detail.message || JSON.stringify((data as any).detail));
          } else if ((data as any).message) {
            message = (data as any).message;
          } else if ((data as any).error) {
            message = (data as any).error;
          }
        }
      }
      
      // Create API error with status and data
      return ErrorFactory.createApiError(message, status, data, {
        originalError: error as unknown as Error,
        metadata: {
          url: error.config?.url,
          method: error.config?.method,
          requestData: error.config?.data,
        }
      });
    }
    
    // Fallback for other types of errors
    return ErrorFactory.create(error as unknown as Error);
  }
  
  /**
   * Check if data should be compressed
   */
  private shouldCompress(data: any): boolean {
    if (!data) return false;
    
    const size = typeof data === 'string' ? 
      data.length : 
      JSON.stringify(data).length;
    
    return size > this.optimizations.compressionThreshold;
  }
  
  /**
   * Make optimized GET request
   */
  async get<T = any>(
    url: string, 
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    // Check cache first
    if (this.optimizations.enableCaching) {
      const cached = requestCache.get<T>(url, config);
      if (cached !== null) {
        return cached;
      }
    }
    
    // Define the actual request function
    const requestFn = () => retryManager.execute(
      () => this.axiosInstance.get<T>(url, config).then(response => response.data),
      { ...this.defaultRetryConfig, ...retryConfig }
    );
    
    // Apply deduplication
    if (this.optimizations.enableDeduplication) {
      return requestDeduplicator.deduplicate(url, requestFn, config);
    }
    
    return requestFn();
  }
  
  /**
   * Make optimized POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    // POST requests typically shouldn't be deduplicated or cached
    return retryManager.execute(
      () => this.axiosInstance.post<T>(url, data, config).then(response => response.data),
      { ...this.defaultRetryConfig, ...retryConfig }
    );
  }
  
  /**
   * Make optimized PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    return retryManager.execute(
      () => this.axiosInstance.put<T>(url, data, config).then(response => response.data),
      { ...this.defaultRetryConfig, ...retryConfig }
    );
  }
  
  /**
   * Make optimized DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    // Clear cache for this resource
    if (this.optimizations.enableCaching) {
      requestCache.remove(url, config);
    }
    
    return retryManager.execute(
      () => this.axiosInstance.delete<T>(url, config).then(response => response.data),
      { ...this.defaultRetryConfig, ...retryConfig }
    );
  }
  
  /**
   * Make optimized PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    // Clear cache for this resource
    if (this.optimizations.enableCaching) {
      requestCache.remove(url, config);
    }
    
    return retryManager.execute(
      () => this.axiosInstance.patch<T>(url, data, config).then(response => response.data),
      { ...this.defaultRetryConfig, ...retryConfig }
    );
  }
  
  /**
   * Batch multiple GET requests
   */
  async batchGet<T = any>(urls: string[], config?: AxiosRequestConfig): Promise<T[]> {
    if (!this.optimizations.enableBatching) {
      // Fallback to individual requests
      return Promise.all(urls.map(url => this.get<T>(url, config)));
    }
    
    // Use request batcher
    return Promise.all(
      urls.map(url => requestBatcher.batch<T>(url, config))
    );
  }
  
  /**
   * Invalidate cache for specific URL or pattern
   */
  invalidateCache(urlPattern: string | RegExp) {
    if (typeof urlPattern === 'string') {
      requestCache.remove(urlPattern);
    } else {
      // For RegExp patterns, we'd need to implement pattern matching in the cache
      console.warn('RegExp cache invalidation not yet implemented');
    }
  }
  
  /**
   * Clear all caches
   */
  clearCache() {
    requestCache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return requestCache.getStats();
  }
  
  /**
   * Get raw axios instance for custom usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
  
  /**
   * Make a raw request that returns the full Axios response
   * This is useful when you need access to headers, status, etc.
   */
  async makeRawRequest<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance(config);
  }
  
  /**
   * Update optimization settings
   */
  updateOptimizations(options: Partial<OptimizationOptions>) {
    this.optimizations = {
      ...this.optimizations,
      ...options
    };
  }
}

// Export default API client instance with optimizations
export const apiClient = new EnhancedApiClient();

// Export factory function for creating custom API clients
export function createApiClient(
  baseURL?: string,
  config?: AxiosRequestConfig,
  retryConfig?: Partial<RetryConfig>,
  optimizations?: OptimizationOptions
): EnhancedApiClient {
  return new EnhancedApiClient(baseURL, config, retryConfig, optimizations);
}

// Create specialized clients for different use cases
export const uncachedClient = createApiClient(undefined, undefined, undefined, {
  enableCaching: false
});

export const persistentClient = createApiClient(undefined, undefined, undefined, {
  cacheOptions: {
    storage: 'localStorage',
    ttl: 30 * 60 * 1000 // 30 minutes
  }
});

export default apiClient;
