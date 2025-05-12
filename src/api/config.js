/**
 * API configuration management
 * 
 * This module handles loading, parsing, and resolving API endpoint configurations.
 * It provides utilities for resolving API paths and working with the endpoint configuration.
 */
import client from './client';

// Cache for the API configuration
let apiConfigCache = null;
let apiConfigPromise = null;

/**
 * Load the API configuration from the server
 */
export const loadApiConfig = async () => {
  if (apiConfigCache) {
    return apiConfigCache;
  }

  if (!apiConfigPromise) {
    apiConfigPromise = client.get('/api/v1/config/api')
      .then(data => {
        apiConfigCache = data;
        return data;
      })
      .catch(error => {
        console.error('Failed to load API configuration:', error);
        // Fallback to an empty config
        return { };
      });
  }

  return apiConfigPromise;
};

/**
 * Extract path parameters from a template
 */
export const extractPathParams = (pathTemplate) => {
  if (!pathTemplate) return [];
  
  const params = [];
  const parts = pathTemplate.split('/');
  
  for (const part of parts) {
    if (part.startsWith('{') && part.endsWith('}')) {
      const paramName = part.substring(1, part.length - 1);
      params.push(paramName);
    }
  }
  
  return params;
};

/**
 * Resolve an API path based on the endpoint key and parameters
 */
export const resolveApiPath = async (endpointKey, pathParams = {}) => {
  // Ensure config is loaded
  const config = await loadApiConfig();
  
  // Split the endpoint key into category and endpoint
  const [category, endpoint] = endpointKey.split('.');
  
  // Get the endpoint configuration
  if (!config[category] || !config[category][endpoint]) {
    throw new Error(`Unknown API endpoint: ${endpointKey}`);
  }
  
  const endpointConfig = config[category][endpoint];
  const pathTemplate = endpointConfig.frontend_path;
  
  if (!pathTemplate) {
    throw new Error(`Missing path template for endpoint: ${endpointKey}`);
  }
  
  // Validate required parameters
  const requiredParams = extractPathParams(pathTemplate);
  for (const param of requiredParams) {
    if (!pathParams[param]) {
      throw new Error(`Missing required path parameter: ${param}`);
    }
  }
  
  // Replace parameters in template
  let path = pathTemplate;
  for (const [key, value] of Object.entries(pathParams)) {
    const placeholder = `{${key}}`;
    if (path.includes(placeholder)) {
      path = path.replace(placeholder, encodeURIComponent(value));
    }
  }
  
  return path;
};

/**
 * Synchronous version of path resolution (requires config to be pre-loaded)
 */
export const resolveApiPathSync = (endpointKey, pathParams = {}) => {
  if (!apiConfigCache) {
    throw new Error('API configuration not loaded. Call loadApiConfig() first.');
  }
  
  // Split the endpoint key into category and endpoint
  const [category, endpoint] = endpointKey.split('.');
  
  // Get the endpoint configuration
  if (!apiConfigCache[category] || !apiConfigCache[category][endpoint]) {
    throw new Error(`Unknown API endpoint: ${endpointKey}`);
  }
  
  const endpointConfig = apiConfigCache[category][endpoint];
  const pathTemplate = endpointConfig.frontend_path;
  
  if (!pathTemplate) {
    throw new Error(`Missing path template for endpoint: ${endpointKey}`);
  }
  
  // Validate required parameters
  const requiredParams = extractPathParams(pathTemplate);
  for (const param of requiredParams) {
    if (!pathParams[param]) {
      throw new Error(`Missing required path parameter: ${param}`);
    }
  }
  
  // Replace parameters in template
  let path = pathTemplate;
  for (const [key, value] of Object.entries(pathParams)) {
    const placeholder = `{${key}}`;
    if (path.includes(placeholder)) {
      path = path.replace(placeholder, encodeURIComponent(value));
    }
  }
  
  return path;
};

/**
 * Get the supported query parameters for an endpoint
 */
export const getQueryParams = async (endpointKey) => {
  // Ensure config is loaded
  const config = await loadApiConfig();
  
  // Split the endpoint key into category and endpoint
  const [category, endpoint] = endpointKey.split('.');
  
  // Get the endpoint configuration
  if (!config[category] || !config[category][endpoint]) {
    throw new Error(`Unknown API endpoint: ${endpointKey}`);
  }
  
  const endpointConfig = config[category][endpoint];
  return endpointConfig.query_params || [];
};

/**
 * Get the HTTP method for an endpoint
 */
export const getEndpointMethod = async (endpointKey) => {
  // Ensure config is loaded
  const config = await loadApiConfig();
  
  // Split the endpoint key into category and endpoint
  const [category, endpoint] = endpointKey.split('.');
  
  // Get the endpoint configuration
  if (!config[category] || !config[category][endpoint]) {
    throw new Error(`Unknown API endpoint: ${endpointKey}`);
  }
  
  const endpointConfig = config[category][endpoint];
  return endpointConfig.method || 'GET';
};

/**
 * Get all endpoints in a category
 */
export const getCategoryEndpoints = async (category) => {
  // Ensure config is loaded
  const config = await loadApiConfig();
  
  // Get the category configuration
  if (!config[category]) {
    throw new Error(`Unknown API category: ${category}`);
  }
  
  return Object.keys(config[category]);
};

/**
 * Get all API categories
 */
export const getAllCategories = async () => {
  // Ensure config is loaded
  const config = await loadApiConfig();
  
  return Object.keys(config);
};

// Export default configuration object
export default {
  loadApiConfig,
  resolveApiPath,
  resolveApiPathSync,
  extractPathParams,
  getQueryParams,
  getEndpointMethod,
  getCategoryEndpoints,
  getAllCategories
};
