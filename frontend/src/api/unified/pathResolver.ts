/**
 * API Path Resolution Utilities
 */

import apiConfig from './apiConfig';
import { HttpMethod } from './types';

/**
 * Simple path resolver for template API endpoints
 */
export const pathResolver = {
  resolve: (path: string) => `/api/v1/${path}`
};

/**
 * Get the full URL for an API endpoint
 * 
 * @param category - API category (e.g., 'ai', 'issues')
 * @param endpoint - Endpoint name within the category
 * @param pathParams - Path parameters to substitute
 * @returns Full URL for the endpoint
 */
export function resolveApiPath(category: string, endpoint: string, pathParams?: Record<string, string | number>): string {
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
  
  // Construct the path WITHOUT the baseUrl (axios instance already has it)
  let fullPath = '';
  
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
  params: Record<string, string | number | undefined>
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