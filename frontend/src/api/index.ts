/**
 * API Client Exports
 * 
 * This file re-exports the unified API client and provides backward compatibility
 * with the old API client during the migration period.
 */

// Export everything from the unified API
export * from './unified';

// Export the compatibility layer for backward compatibility
export * from './compat';

// For backwards compatibility, maintain old exports
import { apiClient as oldApiClient } from './compat';
import {
  apiClient as unifiedApiClient,
  api,
  hooks,
  utils
} from './unified';

// Export the old API modules for backwards compatibility
// These should be gradually removed as components are migrated
import * as aiApi from './archived/aiApi'; // Archived - use unified API instead
import * as analyticsApi from './archived/analyticsApi'; // Archived - use unified API instead
import * as deadlockApi from './archived/deadlockApi'; // Archived - use unified API instead
import * as enhancedDeadlockApi from './archived/enhancedDeadlockApi'; // Archived - use unified API instead
import * as errorAnalyticsApi from './archived/errorAnalyticsApi'; // Archived - use unified API instead
import * as eventApi from './archived/eventApi'; // Archived - use unified API instead
import * as eventsApi from './archived/eventsApi'; // Archived - use unified API instead
import * as issuesApi from './archived/issuesApi'; // Archived - use unified API instead
import * as modelApi from './archived/modelApi'; // Archived - use unified API instead
import * as discoverApi from './archived/discoverApi'; // Archived - use unified API instead
import * as alertsApi from './archived/alertsApi'; // Archived - use unified API instead

// Re-export old API modules for backwards compatibility
export {
  aiApi,
  analyticsApi,
  deadlockApi,
  enhancedDeadlockApi,
  errorAnalyticsApi,
  eventApi,
  eventsApi,
  issuesApi,
  modelApi,
  discoverApi,
  alertsApi
};

// Default export - provide both old and new API
export default {
  // New unified API
  api,
  hooks,
  utils,
  apiClient: unifiedApiClient,
  
  // Backwards compatibility
  oldApiClient
};