/**
 * Path resolver for the unified API client
 * 
 * This module provides utilities for resolving dynamic paths
 * with parameters and generating full URLs.
 */

/**
 * Validate required parameters
 * 
 * @param {Object} params Object containing parameters to validate
 * @param {Array<string>} required Array of required parameter names
 * @throws {Error} if any required parameter is missing
 */
export function validateParams(params, required) {
  if (!params) {
    throw new Error(`Missing required parameters: ${required.join(', ')}`);
  }
  
  const missing = required.filter(param => params[param] === undefined);
  
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }
}

/**
 * Get the HTTP method for an API endpoint
 * 
 * @param {string} category API category
 * @param {string} endpoint Endpoint name within the category
 * @returns {string} HTTP method (GET, POST, PUT, etc.)
 */
export function getMethod(category, endpoint) {
  // This would typically lookup the method from a configuration
  // For now, we'll use a basic implementation
  
  // Common patterns for REST APIs
  if (endpoint.includes('list') || endpoint.includes('get')) {
    return 'GET';
  } else if (endpoint.includes('create')) {
    return 'POST';
  } else if (endpoint.includes('update')) {
    return 'PUT';
  } else if (endpoint.includes('delete')) {
    return 'DELETE';
  } else if (endpoint.includes('patch')) {
    return 'PATCH';
  }
  
  // Default to GET
  return 'GET';
}

/**
 * Error thrown when path resolution fails
 */
export class PathResolutionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PathResolutionError';
  }
}

/**
 * Resolve a path template with parameters
 * 
 * @param {string} path Path template with parameters in {param} format
 * @param {Object} params Object with parameter values to substitute
 * @returns {string} Resolved path
 * @throws {PathResolutionError} if required parameters are missing
 * 
 * @example
 * resolvePath('/users/{id}/posts/{postId}', { id: '123', postId: '456' })
 * // returns '/users/123/posts/456'
 */
export function resolvePath(path, params) {
  if (!params) {
    // If there are no params and the path contains parameters, throw an error
    if (path.includes('{') && path.includes('}')) {
      throw new PathResolutionError(`Missing required path parameters for path: ${path}`);
    }
    return path;
  }

  // Find all parameters in the path
  const paramMatches = path.match(/{([^}]+)}/g);
  if (!paramMatches) {
    return path;
  }

  // Extract parameter names without the curly braces
  const requiredParams = paramMatches.map(match => match.slice(1, -1));
  
  // Check if all required parameters are provided
  const missingParams = requiredParams.filter(param => params[param] === undefined);
  if (missingParams.length > 0) {
    throw new PathResolutionError(
      `Missing required path parameters: ${missingParams.join(', ')} for path: ${path}`
    );
  }

  // Replace all parameters in the path
  let resolvedPath = path;
  for (const param of requiredParams) {
    resolvedPath = resolvedPath.replace(`{${param}}`, String(params[param]));
  }

  return resolvedPath;
}

/**
 * Get a full URL by combining baseUrl with a path
 * 
 * @param {string} baseUrl Base URL of the API
 * @param {string} path Path to append to the base URL
 * @returns {string} Full URL
 * 
 * @example
 * getFullUrl('https://api.example.com', '/users/123')
 * // returns 'https://api.example.com/users/123'
 */
export function getFullUrl(baseUrl, path) {
  // Ensure baseUrl doesn't end with a slash and path starts with a slash
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Build a query string from query parameters
 * 
 * @param {Object} params Query parameters object
 * @returns {string} URL-encoded query string (without leading ?)
 * 
 * @example
 * buildQueryString({ page: 1, limit: 10, search: 'test', filter: ['a', 'b'] })
 * // returns 'page=1&limit=10&search=test&filter=a&filter=b'
 */
export function buildQueryString(params) {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }

  const parts = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && item !== undefined) {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
        }
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }

  return parts.join('&');
}

// Default export with all functions
export default {
  resolvePath,
  getFullUrl,
  buildQueryString,
  PathResolutionError,
  getMethod,
  validateParams,
  // Add a resolve alias for resolvePath for backward compatibility
  resolve: resolvePath
};