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
} from './configApi';

// Export all named exports
export {
  configSchema,
  healthStatusSchema,
  getConfig,
  updateConfig,
  checkConfig,
  checkHealth
};

// Export the types properly using TypeScript
export type {
  Config,
  HealthStatus,
  ConfigParams
} from './configApi';

// Create and export a default object with all methods
const configApi = {
  getConfig,
  updateConfig,
  checkConfig,
  checkHealth
};

export default configApi;
