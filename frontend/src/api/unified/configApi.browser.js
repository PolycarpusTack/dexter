/**
 * Browser-compatible entry point for configApi
 */

// Import from the original module
import {
  configSchema,
  healthStatusSchema,
  getConfig,
  updateConfig,
  checkConfig,
  checkHealth
} from './configApi.js';

// Export all named exports
export {
  configSchema,
  healthStatusSchema,
  getConfig,
  updateConfig,
  checkConfig,
  checkHealth
};

// We can't use TypeScript's export type in a .js file, so we'll just
// re-export everything from the original module
// export type {
//   Config,
//   HealthStatus,
//   ConfigParams
// } from './configApi.js';

// Create and export a default object with all methods
const configApi = {
  getConfig,
  updateConfig,
  checkConfig,
  checkHealth
};

export default configApi;
