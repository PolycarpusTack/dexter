/**
 * API Connection Test Utility
 * 
 * This helper provides functions to test and diagnose API connection issues.
 */

import axios from 'axios';
import apiConfig from './apiConfig';

/**
 * Test connection to the backend API
 * @returns Promise with connection test results
 */
export const testApiConnection = async () => {
  const baseUrl = apiConfig.baseUrl;
  console.log('Testing API connection to:', baseUrl);
  
  const results = {
    baseUrl,
    reachable: false,
    error: null as string | null,
    statusEndpoint: false,
    configEndpoint: false,
    eventsEndpoint: false,
    sentryEndpoint: false,
    responseDetails: null as any,
    sentryDetails: null as any,
    sentryError: null as string | null
  };
  
  try {
    // Test base connectivity with a HEAD request
    const headResponse = await axios.head(baseUrl, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    
    results.reachable = headResponse.status < 500; // Any response below 500 means server is reachable
    results.responseDetails = {
      status: headResponse.status,
      headers: headResponse.headers
    };
    
    // Test specific endpoints
    try {
      const statusResponse = await axios.get(`${baseUrl}/status`, { 
        timeout: 5000,
        validateStatus: () => true
      });
      results.statusEndpoint = statusResponse.status < 400;
    } catch (e) {
      results.statusEndpoint = false;
    }
    
    try {
      const configResponse = await axios.get(`${baseUrl}/config`, { 
        timeout: 5000,
        validateStatus: () => true
      });
      results.configEndpoint = configResponse.status < 400;
    } catch (e) {
      results.configEndpoint = false;
    }
    
    // Test Sentry health check endpoint
    try {
      const sentryResponse = await axios.get(`${baseUrl}/system/sentry/health`, { 
        timeout: 10000,
        validateStatus: () => true
      });
      results.sentryEndpoint = sentryResponse.status < 400;
      results.sentryDetails = sentryResponse.data;
    } catch (e) {
      results.sentryEndpoint = false;
      results.sentryError = e.message;
    }
    
    try {
      const eventsResponse = await axios.get(`${baseUrl}/events`, { 
        timeout: 5000,
        validateStatus: () => true
      });
      results.eventsEndpoint = eventsResponse.status < 400;
    } catch (e) {
      results.eventsEndpoint = false;
    }
    
  } catch (error: any) {
    results.reachable = false;
    results.error = error.message || 'Unknown error connecting to API';
    
    // Provide more specific error diagnostics
    if (error.code === 'ECONNREFUSED') {
      results.error = `Connection refused: Is the backend server running at ${baseUrl}?`;
    } else if (error.code === 'ECONNABORTED') {
      results.error = `Connection timed out: The backend server at ${baseUrl} is not responding`;
    } else if (error.code === 'ERR_BAD_REQUEST') {
      results.error = `Bad request: The server at ${baseUrl} is reachable but returned an error`;
      results.reachable = true; // Server is technically reachable if it returned a response
    }
  }
  
  return results;
};

export default {
  testApiConnection
};