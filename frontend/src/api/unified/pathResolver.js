// Frontend path resolver for API calls
// This module provides functionality similar to the backend path_resolver.py

import apiConfig from './apiConfig';

/**
 * Resolve an API path with the given parameters
 * 
 * @param {string} category - The category name from apiConfig
 * @param {string} endpoint - The endpoint name within the category
 * @param {Object} params - Path parameters to substitute
 * @returns {string} - The resolved path
 */
export const resolvePath = (category, endpoint, params = {}) => {
  // Get the category configuration
  const categoryConfig = apiConfig.categories[category];
  if (!categoryConfig) {
    throw new Error(`Category not found: ${category}`);
  }
  
  // Get the endpoint configuration
  const endpointConfig = categoryConfig.endpoints[endpoint];
  if (!endpointConfig) {
    throw new Error(`Endpoint not found: ${endpoint} in category ${category}`);
  }
  
  // Start with the base path from the category (if any)
  let basePath = categoryConfig.basePath || '';
  
  // Replace parameters in the base path
  if (basePath) {
    basePath = replacePlaceholders(basePath, params);
  }
  
  // Get the endpoint path
  let endpointPath = endpointConfig.path;
  
  // Replace parameters in the endpoint path
  endpointPath = replacePlaceholders(endpointPath, params);
  
  // Combine the paths
  return `${basePath}${endpointPath}`;
};

/**
 * Get a full URL with base URL and resolved path
 * 
 * @param {string} category - The category name from apiConfig
 * @param {string} endpoint - The endpoint name within the category
 * @param {Object} params - Path parameters to substitute
 * @returns {string} - The full URL
 */
export const getFullUrl = (category, endpoint, params = {}) => {
  const path = resolvePath(category, endpoint, params);
  
  // Replace any placeholders in the base URL as well
  let baseUrl = apiConfig.baseUrl;
  baseUrl = replacePlaceholders(baseUrl, params);
  
  return `${baseUrl}${path}`;
};

/**
 * Helper function to replace placeholders in a template string
 * 
 * @param {string} template - Template string with {placeholders}
 * @param {Object} params - Parameters to substitute
 * @returns {string} - String with placeholders replaced
 */
function replacePlaceholders(template, params) {
  return template.replace(/{([^}]+)}/g, (match, key) => {
    if (params[key] === undefined) {
      throw new Error(`Missing required parameter: ${key}`);
    }
    return encodeURIComponent(params[key]);
  });
}

/**
 * Get HTTP method for a specific endpoint
 * 
 * @param {string} category - The category name from apiConfig
 * @param {string} endpoint - The endpoint name within the category
 * @returns {string} - The HTTP method (GET, POST, etc.)
 */
export const getMethod = (category, endpoint) => {
  const categoryConfig = apiConfig.categories[category];
  if (!categoryConfig) {
    throw new Error(`Category not found: ${category}`);
  }
  
  const endpointConfig = categoryConfig.endpoints[endpoint];
  if (!endpointConfig) {
    throw new Error(`Endpoint not found: ${endpoint} in category ${category}`);
  }
  
  return endpointConfig.method || 'GET';
};

export default {
  resolvePath,
  getFullUrl,
  getMethod
};
