/**
 * Path Resolver
 * 
 * This file provides utilities for resolving API paths with parameter substitution.
 * It works with the unified API configuration to dynamically generate URLs.
 */

import apiConfig from './apiConfig';
import { ApiConfig, PathParams, HttpMethod } from './types';

/**
 * Interface for resolved path details
 */
interface ResolvedPath {
  path: string;
  pathParams: Record<string, string | number | boolean>;
  queryParams: Record<string, any>;
  originalPath?: string;
}

/**
 * Interface for validation results
 */
interface ValidationResult {
  isValid: boolean;
  missingParams: string[];
}

/**
 * Error class for path resolution errors
 */
export class PathResolutionError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'PathResolutionError';
  }
}

/**
 * Check if a category exists in the API configuration
 * 
 * @param category - Category name to check
 * @param config - API configuration
 * @returns Whether the category exists
 */
export const categoryExists = (category: string, config: ApiConfig = apiConfig): boolean => {
  return !!config.categories[category];
};

/**
 * Check if an endpoint exists in a category
 * 
 * @param category - Category name
 * @param endpoint - Endpoint name
 * @param config - API configuration
 * @returns Whether the endpoint exists
 */
export const endpointExists = (
  category: string,
  endpoint: string,
  config: ApiConfig = apiConfig
): boolean => {
  return categoryExists(category, config) && !!config.categories[category].endpoints[endpoint];
};

/**
 * Get the resolved path with replaced parameters
 * 
 * @param category - Category name
 * @param endpoint - Endpoint name
 * @param params - Path parameters to substitute
 * @param config - API configuration
 * @returns Resolved path
 * @throws PathResolutionError if category or endpoint doesn't exist
 */
export const resolvePath = (
  category: string,
  endpoint: string,
  params: PathParams = {},
  config: ApiConfig = apiConfig
): string => {
  // Check if category exists
  if (!categoryExists(category, config)) {
    throw new PathResolutionError(`Category not found: ${category}`);
  }
  
  // Check if endpoint exists
  if (!endpointExists(category, endpoint, config)) {
    throw new PathResolutionError(`Endpoint not found: ${endpoint} in category ${category}`);
  }
  
  const categoryConfig = config.categories[category];
  const endpointConfig = categoryConfig.endpoints[endpoint];
  
  // Start with the base path from the category (if any)
  let basePath = categoryConfig.basePath || '';
  
  // Replace parameters in the base path
  if (basePath) {
    try {
      basePath = replacePlaceholders(basePath, params);
    } catch (error) {
      if (error instanceof Error) {
        throw new PathResolutionError(
          `Error resolving base path for ${category}: ${error.message}`,
          { basePath, params }
        );
      }
      throw error;
    }
  }
  
  // Get the endpoint path
  let endpointPath = endpointConfig.path;
  
  // Replace parameters in the endpoint path
  try {
    endpointPath = replacePlaceholders(endpointPath, params);
  } catch (error) {
    if (error instanceof Error) {
      throw new PathResolutionError(
        `Error resolving path for ${category}.${endpoint}: ${error.message}`,
        { endpointPath, params }
      );
    }
    throw error;
  }
  
  // Combine the paths
  return `${basePath}${endpointPath}`;
};

/**
 * Helper function to replace placeholders in a template string
 * 
 * @param template - Template string with {placeholders}
 * @param params - Parameters to substitute
 * @returns String with placeholders replaced
 * @throws Error if a required parameter is missing
 */
export const replacePlaceholders = (
  template: string,
  params: PathParams
): string => {
  return template.replace(/{([^}]+)}/g, (match, key) => {
    if (params[key] === undefined) {
      throw new Error(`Missing required parameter: ${key}`);
    }
    return encodeURIComponent(String(params[key]));
  });
};

/**
 * Get a full URL with base URL and resolved path
 * 
 * @param category - Category name
 * @param endpoint - Endpoint name
 * @param params - Path parameters to substitute
 * @param config - API configuration
 * @returns Full URL
 */
export const getFullUrl = (
  category: string,
  endpoint: string,
  params: PathParams = {},
  config: ApiConfig = apiConfig
): string => {
  const path = resolvePath(category, endpoint, params, config);
  return `${config.baseUrl}${path}`;
};

/**
 * Get HTTP method for a specific endpoint
 * 
 * @param category - Category name
 * @param endpoint - Endpoint name
 * @param config - API configuration
 * @returns HTTP method (GET, POST, etc.)
 * @throws PathResolutionError if category or endpoint doesn't exist
 */
export const getMethod = (
  category: string,
  endpoint: string,
  config: ApiConfig = apiConfig
): HttpMethod => {
  // Check if category exists
  if (!categoryExists(category, config)) {
    throw new PathResolutionError(`Category not found: ${category}`);
  }
  
  // Check if endpoint exists
  if (!endpointExists(category, endpoint, config)) {
    throw new PathResolutionError(`Endpoint not found: ${endpoint} in category ${category}`);
  }
  
  return config.categories[category].endpoints[endpoint].method || HttpMethod.GET;
};

/**
 * Validate parameters for an endpoint
 * 
 * @param category - Category name
 * @param endpoint - Endpoint name
 * @param params - Parameters to validate
 * @param config - API configuration
 * @returns Validation result
 */
export const validateParams = (
  category: string, 
  endpoint: string, 
  params: PathParams = {},
  config: ApiConfig = apiConfig
): ValidationResult => {
  // Check if category and endpoint exist
  if (!categoryExists(category, config) || !endpointExists(category, endpoint, config)) {
    return {
      isValid: false,
      missingParams: [`Unknown endpoint: ${category}.${endpoint}`]
    };
  }
  
  const missingParams: string[] = [];
  
  // Extract required parameters from the path format
  const categoryConfig = config.categories[category];
  const basePath = categoryConfig.basePath || '';
  const endpointConfig = categoryConfig.endpoints[endpoint];
  const endpointPath = endpointConfig.path;
  
  // Extract parameter names from the paths
  const allParams = new Set<string>();
  
  // Extract from base path
  if (basePath) {
    const baseParams = basePath.match(/{([^}]+)}/g) || [];
    baseParams.forEach(param => allParams.add(param.slice(1, -1)));
  }
  
  // Extract from endpoint path
  const endpointParams = endpointPath.match(/{([^}]+)}/g) || [];
  endpointParams.forEach(param => allParams.add(param.slice(1, -1)));
  
  // Check if all required parameters are provided
  allParams.forEach(param => {
    if (params[param] === undefined) {
      missingParams.push(param);
    }
  });
  
  return {
    isValid: missingParams.length === 0,
    missingParams
  };
};

/**
 * List all available endpoints
 * 
 * @param config - API configuration
 * @returns Array of endpoint identifiers (category.endpoint)
 */
export const listEndpoints = (config: ApiConfig = apiConfig): string[] => {
  const endpoints: string[] = [];
  
  Object.keys(config.categories).forEach(category => {
    const categoryConfig = config.categories[category];
    Object.keys(categoryConfig.endpoints).forEach(endpoint => {
      endpoints.push(`${category}.${endpoint}`);
    });
  });
  
  return endpoints;
};

/**
 * Get details about a specific endpoint
 * 
 * @param category - Category name
 * @param endpoint - Endpoint name
 * @param config - API configuration
 * @returns Endpoint details or null if not found
 */
export const getEndpointDetails = (
  category: string,
  endpoint: string,
  config: ApiConfig = apiConfig
) => {
  if (!categoryExists(category, config) || !endpointExists(category, endpoint, config)) {
    return null;
  }
  
  const categoryConfig = config.categories[category];
  const endpointConfig = categoryConfig.endpoints[endpoint];
  
  // Extract parameter names from the paths
  const allParams = new Set<string>();
  
  // Extract from base path
  if (categoryConfig.basePath) {
    const baseParams = categoryConfig.basePath.match(/{([^}]+)}/g) || [];
    baseParams.forEach(param => allParams.add(param.slice(1, -1)));
  }
  
  // Extract from endpoint path
  const endpointParams = endpointConfig.path.match(/{([^}]+)}/g) || [];
  endpointParams.forEach(param => allParams.add(param.slice(1, -1)));
  
  return {
    identifier: `${category}.${endpoint}`,
    category,
    endpoint,
    method: endpointConfig.method,
    path: `${categoryConfig.basePath || ''}${endpointConfig.path}`,
    requiredParams: Array.from(allParams),
    description: endpointConfig.description,
    requiresAuth: endpointConfig.requiresAuth !== false,
    cacheTTL: endpointConfig.cacheTTL
  };
};

export default {
  categoryExists,
  endpointExists,
  resolvePath,
  replacePlaceholders,
  getFullUrl,
  getMethod,
  validateParams,
  listEndpoints,
  getEndpointDetails
};