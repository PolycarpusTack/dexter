// File: src/api/index.ts

import apiClient, { createApiClient, EnhancedApiClient } from './apiClient';
import { API_BASE_URL, axiosConfig } from './config';
import * as aiApi from './aiApi';
import * as analyticsApi from './analyticsApi';
import * as deadlockApi from './deadlockApi';
import * as enhancedDeadlockApi from './enhancedDeadlockApi';
import * as errorAnalyticsApi from './errorAnalyticsApi';
import * as eventApi from './eventApi';
import * as eventsApi from './eventsApi';
import * as issuesApi from './issuesApi';
import * as modelApi from './modelApi';

// Re-export everything
export {
  apiClient,
  createApiClient,
  EnhancedApiClient,
  API_BASE_URL,
  axiosConfig,
  aiApi,
  analyticsApi,
  deadlockApi,
  enhancedDeadlockApi,
  errorAnalyticsApi,
  eventApi,
  eventsApi,
  issuesApi,
  modelApi
};

// Default export
export default {
  apiClient,
  createApiClient,
  API_BASE_URL,
  axiosConfig
};
