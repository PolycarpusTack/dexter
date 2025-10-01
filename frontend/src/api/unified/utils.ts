/**
 * Shared API utilities
 * 
 * This module contains utility functions that are used across multiple API modules
 * to avoid circular dependencies.
 */

import { HttpMethod, PathParams, QueryParams } from './types';
import apiConfig from './apiConfig';

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
export function getFullUrl(category: string, endpoint: string, pathParams?: Record<string, string | number>): string {
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

  // Start with the base URL and category base path
  let url = `${categoryConfig.base}${endpointConfig.path}`;

  // Substitute path parameters if provided
  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      const placeholder = `{${key}}`;
      if (url.includes(placeholder)) {
        url = url.replace(placeholder, String(value));
      }
    }
  }

  return url;
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
 * Resolve a path template with parameters
 * 
 * @param pathTemplate - Path template with placeholders
 * @param params - Parameters to substitute
 * @returns Resolved path
 */
export function resolvePath(pathTemplate: string, params?: PathParams): string {
  if (!params) {
    return pathTemplate;
  }

  let resolvedPath = pathTemplate;
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{${key}}`;
    resolvedPath = resolvedPath.replace(placeholder, String(value));
  }

  return resolvedPath;
}

/**
 * Validate required path parameters
 * 
 * @param pathTemplate - Path template
 * @param params - Provided parameters
 * @throws Error if required parameters are missing
 */
export function validateParams(pathTemplate: string, params?: PathParams): void {
  // Extract parameter names from path template
  const requiredParams = pathTemplate.match(/\{([^}]+)\}/g);
  
  if (!requiredParams) {
    return; // No parameters required
  }

  const paramNames = requiredParams.map(param => param.slice(1, -1)); // Remove { }
  
  if (!params) {
    throw new Error(`Missing required parameters: ${paramNames.join(', ')}`);
  }

  const missingParams = paramNames.filter(name => !(name in params));
  if (missingParams.length > 0) {
    throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
  }
}

/**
 * Build query string from parameters
 * 
 * @param params - Query parameters
 * @returns Query string (without leading ?)
 */
export function buildQueryString(params?: QueryParams): string {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }

  const searchParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Handle array parameters
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  }

  return searchParams.toString();
}

/**
 * Combine base URL with path and query parameters
 * 
 * @param baseUrl - Base URL
 * @param path - Path to append
 * @param queryParams - Query parameters
 * @returns Complete URL
 */
export function buildUrl(baseUrl: string, path: string, queryParams?: QueryParams): string {
  // Ensure base URL doesn't end with slash and path doesn't start with slash
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanPath = path.replace(/^\//, '');
  
  let url = `${cleanBaseUrl}/${cleanPath}`;
  
  const queryString = buildQueryString(queryParams);
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return url;
}

/**
 * Check if a URL is absolute
 * 
 * @param url - URL to check
 * @returns True if URL is absolute
 */
export function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

/**
 * Normalize URL path by removing double slashes and ensuring proper format
 * 
 * @param path - Path to normalize
 * @returns Normalized path
 */
export function normalizePath(path: string): string {
  return path
    .replace(/\/+/g, '/') // Replace multiple slashes with single slash
    .replace(/\/$/, '') // Remove trailing slash
    || '/'; // Ensure at least one slash for root
}

/**
 * Extract error message from various error formats
 * 
 * @param error - Error object
 * @returns Error message string
 */
export function extractErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unknown error occurred';
}

/**
 * Create a timeout promise
 * 
 * @param ms - Timeout in milliseconds
 * @returns Promise that rejects after timeout
 */
export function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}

/**
 * Add timeout to a promise
 * 
 * @param promise - Promise to add timeout to
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise with timeout
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    createTimeout(timeoutMs)
  ]);
}