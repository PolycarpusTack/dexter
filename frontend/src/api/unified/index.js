// Unified API client index

import apiClient from './apiClient';
import apiConfig from './apiConfig';
import { resolvePath, getFullUrl, getMethod } from './pathResolver.js';

// Import individual API modules
import issuesApi from './issuesApi';
import eventsApi from './eventsApi';
import alertsApi from './alertsApi';
import analyzersApi from './analyzersApi';
import discoverApi from './discoverApi';

// Export individual API modules
export {
  issuesApi,
  eventsApi,
  alertsApi,
  analyzersApi,
  discoverApi
};

// Export low-level utilities
export {
  apiClient,
  apiConfig,
  resolvePath,
  getFullUrl,
  getMethod
};

// Create a single unified API object
const api = {
  // Export client and utilities
  client: apiClient,
  config: apiConfig,
  resolvePath,
  getFullUrl,
  getMethod,
  
  // Export individual API modules
  issues: issuesApi,
  events: eventsApi,
  alerts: alertsApi,
  analyzers: analyzersApi,
  discover: discoverApi,
  
  // Function to call any endpoint directly
  callEndpoint: apiClient.callEndpoint
};

export default api;
