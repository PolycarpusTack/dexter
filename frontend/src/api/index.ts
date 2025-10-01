/**
 * Central API Export
 * 
 * This file provides a single entry point for all API functionality.
 * All components should import from this file or from api/unified.
 * 
 * Migration complete - using only unified API.
 */

// Direct re-export to avoid any circular dependency issues
export {
  api,
  apiClient,
  hooks,
  utils,
  apiConfig
} from './unified';

// Re-export all types and other exports
export * from './unified';