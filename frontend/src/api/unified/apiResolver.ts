/**
 * API URL resolution utilities
 * 
 * This module provides functions to resolve API URLs based on the API configuration
 */

import apiConfig from './apiConfig';
import { HttpMethod } from './types';

/**
 * Get the full URL for an API endpoint
 * 
 * @param category - API category (e.g., 'ai', 'issues')
 * @param endpoint - Endpoint name within the category
 * @param pathParams - Path parameters to substitute
 * @returns Full URL for the endpoint
 */
export function getFullUrl(category: string, endpoint: string, pathParams?: Record<string, any>): string {
  // Get base URL (should be '/api/v1')
  const baseUrl = apiConfig.baseUrl || '/api/v1';
  
  // Get category configuration
  const categoryConfig = apiConfig.endpoints[category];
  if (!categoryConfig) {
    throw new Error(`Unknown API category: ${category}`);
  }
  
  // Get endpoint configuration
  const endpointConfig = categoryConfig.endpoints[endpoint];
  if (!endpointConfig) {
    throw new Error(`Unknown endpoint: ${endpoint} in category: ${category}`);
  }
  
  // Construct the full path starting with baseUrl
  let fullPath = baseUrl;
  
  // Add category base path
  if (categoryConfig.base) {
    fullPath += categoryConfig.base;
  }
  
  // Add endpoint path
  let endpointPath = endpointConfig.path;
  
  // Substitute path parameters
  if (pathParams) {
    Object.entries(pathParams).forEach(([key, value]) => {
      endpointPath = endpointPath.replace(`{${key}}`, String(value));
    });
  }
  
  fullPath += endpointPath;
  
  return fullPath;
}

/**
 * Get the HTTP method for an endpoint
 * 
 * @param category - API category
 * @param endpoint - Endpoint name
 * @returns HTTP method
 */
export function getMethod(category: string, endpoint: string): HttpMethod {
  const categoryConfig = apiConfig.endpoints[category];
  if (!categoryConfig) {
    throw new Error(`Unknown API category: ${category}`);
  }
  
  const endpointConfig = categoryConfig.endpoints[endpoint];
  if (!endpointConfig) {
    throw new Error(`Unknown endpoint: ${endpoint} in category: ${category}`);
  }
  
  return endpointConfig.method;
}

/**
 * Resolve path parameters in a URL template
 * 
 * @param path - Path template with {param} placeholders
 * @param params - Parameters to substitute
 * @returns Resolved path
 */
export function resolvePath(path: string, params?: Record<string, any>): string {
  if (!params) {
    return path;
  }
  
  let resolvedPath = path;
  Object.entries(params).forEach(([key, value]) => {
    resolvedPath = resolvedPath.replace(`{${key}}`, String(value));
  });
  
  return resolvedPath;
}

/**
 * Validate required parameters for an endpoint
 * 
 * @param category - API category
 * @param endpoint - Endpoint name  
 * @param params - Parameters to validate
 * @returns Validation result
 */
export function validateParams(
  category: string,
  endpoint: string,
  params: Record<string, any>
): { isValid: boolean; missingParams: string[] } {
  const categoryConfig = apiConfig.endpoints[category];
  if (!categoryConfig) {
    return { isValid: false, missingParams: [`Unknown category: ${category}`] };
  }
  
  const endpointConfig = categoryConfig.endpoints[endpoint];
  if (!endpointConfig) {
    return { isValid: false, missingParams: [`Unknown endpoint: ${endpoint}`] };
  }
  
  // Extract path parameters from the endpoint path
  const pathParamMatches = endpointConfig.path.match(/{([^}]+)}/g);
  const requiredParams = pathParamMatches ? pathParamMatches.map(match => match.slice(1, -1)) : [];
  
  // Check if all required parameters are provided
  const missingParams = requiredParams.filter(param => params[param] === undefined);
  
  return {
    isValid: missingParams.length === 0,
    missingParams
  };
}