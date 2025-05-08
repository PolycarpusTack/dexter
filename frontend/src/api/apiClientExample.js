// File: src/api/apiClientExample.js

/**
 * Example API client with enhanced error handling and retry logic
 * This demonstrates how to integrate the error handling and retry utilities
 * with your API clients
 */
import axios from 'axios';
import { API_BASE_URL, axiosConfig } from './config';
import { logErrorToService } from '../utils/errorTracking';
import ErrorFactory from '../utils/errorFactory';
import retryManager from '../utils/retryManager';
import { createErrorHandler } from '../utils/errorHandling';

// Create an axios instance with our configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  ...axiosConfig,
  headers: {
    ...axiosConfig.headers,
    'Accept': 'application/json',
  }
});

// Add response interceptor to enhance errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Transform error into an EnhancedError
    const enhancedError = ErrorFactory.create(error, {
      metadata: {
        source: 'apiClient',
        url: error.config?.url,
        method: error.config?.method
      }
    });
    
    // Log the error to the service
    logErrorToService(enhancedError, {
      source: 'apiClientInterceptor',
      url: error.config?.url,
      method: error.config?.method
    });
    
    // Rethrow the enhanced error for further handling
    return Promise.reject(enhancedError);
  }
);

/**
 * Example function to fetch items with retries and error handling
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - List of items
 */
export async function fetchItems(options = {}) {
  return retryManager.execute(async () => {
    try {
      const response = await apiClient.get('/items', { params: options });
      return response.data;
    } catch (error) {
      // Let the error propagate to be handled by the retry manager
      throw error;
    }
  });
}

/**
 * Generic API request function with retry and error handling
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request data (for POST, PUT, etc.)
 * @param {Object} options - Additional options
 * @returns {Promise<any>} - API response
 */
export async function makeRequest(method, endpoint, data = null, options = {}) {
  const { 
    params = {}, 
    headers = {}, 
    enableRetry = true,
    maxRetries = 3,
    context = {}
  } = options;
  
  const requestFn = async () => {
    try {
      const config = {
        method,
        url: endpoint,
        headers,
        params
      };
      
      // Add data for POST, PUT, etc.
      if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
        config.data = data;
      }
      
      const response = await apiClient(config);
      return response.data;
    } catch (error) {
      // Enhance the error with additional context
      const enhancedError = ErrorFactory.create(error, {
        metadata: {
          ...context,
          endpoint,
          method,
          params: JSON.stringify(params)
        }
      });
      
      throw enhancedError;
    }
  };
  
  if (enableRetry) {
    return retryManager.execute(requestFn, { maxRetries });
  } else {
    return requestFn();
  }
}

/**
 * Create an error handler for a specific API function
 * @param {string} functionName - Name of the API function
 * @returns {Function} - Error handler
 */
export function createApiErrorHandler(functionName) {
  return createErrorHandler(`API Error: ${functionName}`, {
    context: {
      apiFunction: functionName
    }
  });
}

/**
 * Usage example with React Query:
 * 
 * const { data, error, isLoading } = useQuery({
 *   queryKey: ['items'],
 *   queryFn: () => fetchItems({ status: 'active' }),
 *   onError: createApiErrorHandler('fetchItems')
 * });
 */

export default {
  client: apiClient,
  fetchItems,
  makeRequest,
  createApiErrorHandler
};
