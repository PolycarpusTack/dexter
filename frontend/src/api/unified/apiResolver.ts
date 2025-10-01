/**
 * API URL resolution utilities
 * 
 * This module provides functions to resolve API URLs based on the API configuration
 */

// Re-export utilities from the shared utils module to maintain backward compatibility
export {
  pathResolver,
  getFullUrl,
  getMethod,
  resolvePath,
  buildQueryString,
  buildUrl,
  isAbsoluteUrl,
  normalizePath,
  extractErrorMessage,
  withTimeout
} from './utils';

// Export the validateParams helper from pathResolver (category/endpoint-aware)
export { validateParams } from './pathResolver';
