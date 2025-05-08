// File: frontend/src/api/apiClient.ts

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_BASE_URL, axiosConfig } from './config';
import retryManager, { RetryConfig } from '../utils/retryManager';
import ErrorFactory, { ApiError, NetworkError } from '../utils/errorFactory';
import { logErrorToService } from '../utils/errorTracking';

/**
 * Enhanced API client with retry capability and structured error handling
 */
export class EnhancedApiClient {
  private axiosInstance: AxiosInstance;
  private defaultRetryConfig: Partial<RetryConfig>;
  
  /**
   * Creates a new EnhancedApiClient instance
   * @param baseURL - Base URL for API requests
   * @param config - Axios config options
   * @param retryConfig - Retry configuration
   */
  constructor(
    baseURL: string = API_BASE_URL, 
    config: AxiosRequestConfig = axiosConfig,
    retryConfig: Partial<RetryConfig> = {}
  ) {
    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL,
      ...config,
      headers: {
        ...config.headers,
        'Accept': 'application/json',
      }
    });
    
    // Set default retry config
    this.defaultRetryConfig = {
      maxRetries: 3,
      ...retryConfig
    };
    
    // Add response interceptors
    this.setupInterceptors();
  }
  
  /**
   * Set up request and response interceptors
   */
  private setupInterceptors() {
    // Request interceptor for logging and request enhancement
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // You could add request timing, logging, etc. here
        return config;
      },
      (error) => {
        // Handle request preparation errors
        console.error('Request preparation error:', error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
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
          if (data.detail) {
            message = typeof data.detail === 'string' ? 
              data.detail : 
              (data.detail.message || JSON.stringify(data.detail));
          } else if (data.message) {
            message = data.message;
          } else if (data.error) {
            message = data.error;
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
   * Make GET request with retry
   * @param url - Request URL
   * @param config - Axios request config
   * @param retryConfig - Custom retry configuration for this request
   * @returns Promise with the response data
   */
  async get<T = any>(
    url: string, 
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    return retryManager.execute(
      () => this.axiosInstance.get<T>(url, config).then(response => response.data),
      { ...this.defaultRetryConfig, ...retryConfig }
    );
  }
  
  /**
   * Make POST request with retry
   * @param url - Request URL
   * @param data - Request payload
   * @param config - Axios request config
   * @param retryConfig - Custom retry configuration for this request
   * @returns Promise with the response data
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    return retryManager.execute(
      () => this.axiosInstance.post<T>(url, data, config).then(response => response.data),
      { ...this.defaultRetryConfig, ...retryConfig }
    );
  }
  
  /**
   * Make PUT request with retry
   * @param url - Request URL
   * @param data - Request payload
   * @param config - Axios request config
   * @param retryConfig - Custom retry configuration for this request
   * @returns Promise with the response data
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
   * Make DELETE request with retry
   * @param url - Request URL
   * @param config - Axios request config
   * @param retryConfig - Custom retry configuration for this request
   * @returns Promise with the response data
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    return retryManager.execute(
      () => this.axiosInstance.delete<T>(url, config).then(response => response.data),
      { ...this.defaultRetryConfig, ...retryConfig }
    );
  }
  
  /**
   * Make PATCH request with retry
   * @param url - Request URL
   * @param data - Request payload
   * @param config - Axios request config
   * @param retryConfig - Custom retry configuration for this request
   * @returns Promise with the response data
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    return retryManager.execute(
      () => this.axiosInstance.patch<T>(url, data, config).then(response => response.data),
      { ...this.defaultRetryConfig, ...retryConfig }
    );
  }
  
  /**
   * Get raw axios instance for custom usage
   * @returns Axios instance
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Export default API client instance
export const apiClient = new EnhancedApiClient();

// Export factory function for creating custom API clients
export function createApiClient(
  baseURL?: string,
  config?: AxiosRequestConfig,
  retryConfig?: Partial<RetryConfig>
): EnhancedApiClient {
  return new EnhancedApiClient(baseURL, config, retryConfig);
}

export default apiClient;
