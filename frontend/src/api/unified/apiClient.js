// Unified API client for the frontend
// This client uses the path resolver to make API calls

import axios from 'axios';
import { getFullUrl, getMethod } from './pathResolver';

// Default axios config
const axiosConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds
  withCredentials: false,
};

// Create an axios instance with our configuration
const axiosInstance = axios.create(axiosConfig);

// Add response interceptor to handle common errors
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    
    // Check for CORS errors
    if (error.message === 'Network Error') {
      console.warn('Possible CORS issue detected');
    }
    
    return Promise.reject(error);
  }
);

/**
 * Call an API endpoint using the unified configuration
 * 
 * @param {string} category - API category from configuration
 * @param {string} endpoint - Endpoint name within the category
 * @param {Object} pathParams - Path parameters for URL resolution
 * @param {Object} queryParams - Query parameters to append to the URL
 * @param {Object} data - Data payload for POST/PUT requests
 * @param {Object} options - Additional axios options
 * @returns {Promise} - Promise resolving to the API response
 */
export const callEndpoint = async (
  category,
  endpoint,
  pathParams = {},
  queryParams = {},
  data = null,
  options = {}
) => {
  try {
    // Get the full URL
    const url = getFullUrl(category, endpoint, pathParams);
    
    // Get the HTTP method
    const method = getMethod(category, endpoint);
    
    // Create request configuration
    const requestConfig = {
      ...options,
      params: queryParams
    };
    
    // Log the request (for debugging)
    console.log(`API Call: ${method} ${url}`, {
      pathParams,
      queryParams,
      data: data ? '...' : null
    });
    
    // Make the request based on the method
    let response;
    switch (method.toUpperCase()) {
      case 'GET':
        response = await axiosInstance.get(url, requestConfig);
        break;
      case 'POST':
        response = await axiosInstance.post(url, data, requestConfig);
        break;
      case 'PUT':
        response = await axiosInstance.put(url, data, requestConfig);
        break;
      case 'DELETE':
        response = await axiosInstance.delete(url, { ...requestConfig, data });
        break;
      case 'PATCH':
        response = await axiosInstance.patch(url, data, requestConfig);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
    
    return response.data;
  } catch (error) {
    // Log the error
    console.error(`API Error (${category}.${endpoint}):`, error);
    
    // For development, provide mock data if available
    if (import.meta.env.DEV) {
      // This would be expanded in a full implementation
      console.log('Would return mock data in development mode');
      
      // Example of returning mock data based on category/endpoint
      if (category === 'issues' && endpoint === 'list') {
        return {
          data: [
            {
              id: 'mock-issue-1',
              title: 'Mock Issue 1',
              level: 'error',
              status: 'unresolved',
              count: 5,
              userCount: 2,
              lastSeen: new Date().toISOString(),
              firstSeen: new Date().toISOString(),
            },
            {
              id: 'mock-issue-2',
              title: 'Mock Issue 2',
              level: 'warning',
              status: 'unresolved',
              count: 3,
              userCount: 1,
              lastSeen: new Date().toISOString(),
              firstSeen: new Date().toISOString(),
            }
          ],
          pagination: {
            next: null,
            previous: null
          }
        };
      }
    }
    
    // Re-throw the error for the caller to handle
    throw error;
  }
};

export default {
  callEndpoint
};
