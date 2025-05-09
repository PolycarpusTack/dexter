/**
 * API Configuration
 * 
 * Central configuration for API endpoints and settings.
 * Environment-specific values are set based on the current environment.
 */

// Base configuration
const API_CONFIG = {
  // Base API URL - uses environment variables when available
  baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api',
  
  // WebSocket URL for real-time updates
  websocketUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws',
  
  // API Token for authentication
  apiToken: process.env.REACT_APP_API_TOKEN || '',
  
  // Default timeout for API requests (in milliseconds)
  timeout: 30000,
  
  // Default headers for API requests
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Retry configuration
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
  },
  
  // Cache configuration
  cache: {
    // Default cache time in milliseconds (5 minutes)
    defaultStaleTime: 5 * 60 * 1000,
    
    // Cache time for static data (1 hour)
    staticDataStaleTime: 60 * 60 * 1000,
  },
  
  // Feature flags
  features: {
    enableRealTimeUpdates: true,
    enableBulkActions: true,
    enableAdvancedFiltering: true,
  }
};

export { API_CONFIG };
export default API_CONFIG;