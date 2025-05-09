// frontend/src/utils/apiDebugHelper.ts

/**
 * Utility functions for debugging API issues
 */

/**
 * Log detailed information about an API error
 * 
 * @param error The error object from the API call
 * @param context Additional context about the call
 */
export function logApiError(error: any, context: object = {}): void {
  console.group('API Error Details');
  
  // Basic error info
  console.log('Error type:', error?.name || 'Unknown');
  console.log('Message:', error?.message || 'No message');
  console.log('Context:', context);
  
  // Request details if available
  if (error?.config) {
    console.group('Request Details');
    console.log('URL:', error.config.url);
    console.log('Method:', error.config.method?.toUpperCase());
    console.log('Headers:', error.config.headers);
    
    if (error.config.data) {
      try {
        // Try to parse the data as JSON
        const data = typeof error.config.data === 'string' 
          ? JSON.parse(error.config.data) 
          : error.config.data;
        console.log('Request data:', data);
      } catch (e) {
        console.log('Request data (unparsed):', error.config.data);
      }
    }
    
    console.groupEnd();
  }
  
  // Response details if available
  if (error?.response) {
    console.group('Response Details');
    console.log('Status:', error.response.status);
    console.log('Status text:', error.response.statusText);
    console.log('Headers:', error.response.headers);
    console.log('Data:', error.response.data);
    console.groupEnd();
  }
  
  // Stack trace if available
  if (error?.stack) {
    console.group('Stack Trace');
    console.log(error.stack);
    console.groupEnd();
  }
  
  console.groupEnd();
}

/**
 * Test API endpoints to verify routing is working correctly
 * 
 * @param apiClient The API client to use
 * @param eventId A sample event ID for testing
 */
export async function testApiEndpoints(apiClient: any, eventId: string = 'test-event-id') {
  console.group('API Endpoint Test Results');
  
  try {
    // Test root endpoint
    await testEndpoint(apiClient, 'GET', '/');
    
    // Test health endpoint
    await testEndpoint(apiClient, 'GET', '/health');
    
    // Test analyzer endpoint
    await testEndpoint(apiClient, 'GET', `/analyze-deadlock/${eventId}`);
    
    // Test enhanced analyzer endpoint
    await testEndpoint(apiClient, 'GET', `/enhanced-analyzers/analyze-deadlock/${eventId}`);
    
  } catch (error) {
    console.error('Error during API endpoint tests:', error);
  }
  
  console.groupEnd();
}

/**
 * Test a single API endpoint
 */
async function testEndpoint(apiClient: any, method: string, path: string) {
  try {
    console.log(`Testing ${method} ${path}...`);
    const response = await apiClient.getAxiosInstance().request({
      method,
      url: path,
      validateStatus: () => true // Don't throw error for any status code
    });
    
    console.log(`${method} ${path} - Status: ${response.status} ${response.statusText}`);
    console.log('Headers:', response.headers);
    return response;
  } catch (error) {
    console.error(`Error testing ${method} ${path}:`, error);
    return null;
  }
}

export default {
  logApiError,
  testApiEndpoints
};
