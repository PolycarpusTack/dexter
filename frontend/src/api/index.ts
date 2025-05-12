// File: src/api/index.ts

/**
 * Consolidated API module exports
 * All API modules have been migrated to TypeScript
 */

// Core API client and configuration
import apiClient, { 
  createApiClient, 
  EnhancedApiClient,
  uncachedClient,
  persistentClient
} from './apiClient';
import { 
  API_BASE_URL, 
  axiosConfig,
  DEFAULT_TIMEOUT,
  EXTENDED_TIMEOUT,
  LLM_TIMEOUT
} from './config';

// API modules
import * as aiApi from './aiApi';
import * as analyticsApi from './analyticsApi';
import * as deadlockApi from './deadlockApi';
import * as enhancedDeadlockApi from './enhancedDeadlockApi';
import * as errorAnalyticsApi from './errorAnalyticsApi';
import * as eventApi from './eventApi';
import * as eventsApi from './eventsApi';
import * as issuesApi from './issuesApi';
import * as modelApi from './modelApi';
import * as discoverApi from './discoverApi';
import * as alertsApi from './alertsApi';

// Re-export everything
export {
  // Core API infrastructure
  apiClient,
  createApiClient,
  EnhancedApiClient,
  uncachedClient,
  persistentClient,
  
  // Configuration
  API_BASE_URL,
  axiosConfig,
  DEFAULT_TIMEOUT,
  EXTENDED_TIMEOUT,
  LLM_TIMEOUT,
  
  // API modules
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

// Default export - consider using named exports instead for better tree-shaking
export default {
  apiClient,
  createApiClient,
  API_BASE_URL,
  axiosConfig
};
