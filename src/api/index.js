/**
 * API Module
 * 
 * This is the main entry point for Dexter's API integration.
 * It provides a unified interface for all API modules.
 */
import client from './client';
import * as config from './config';
import IssuesApi from './issues';
import EventsApi from './events';
import DiscoverApi from './discover';
import AlertRulesApi from './alertRules';

// Initialize API configuration
config.loadApiConfig();

// Define API interfaces
const api = {
  // Core API client
  client,
  
  // Configuration utilities
  config,
  
  // API modules
  issues: IssuesApi,
  events: EventsApi,
  discover: DiscoverApi,
  alertRules: AlertRulesApi,
  
  // Initialize function for applications
  async initialize() {
    try {
      await config.loadApiConfig();
      console.log('API configuration loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize API:', error);
      return false;
    }
  }
};

// Export the unified API
export default api;

// Also export individual modules for direct imports
export { client, config, IssuesApi, EventsApi, DiscoverApi, AlertRulesApi };
