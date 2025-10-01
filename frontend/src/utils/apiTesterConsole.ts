/**
 * API Tester for console usage
 * 
 * To use this in the browser console:
 * 1. Import this module: import { runTest } from './path/to/apiTesterConsole'
 * 2. Call runTest() to test all endpoints
 */

interface TestEndpointOptions {
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Test a single API endpoint using fetch
 */
async function testEndpoint(method: string, url: string, options: TestEndpointOptions = {}): Promise<void> {
  console.log(`Testing ${method} ${url}...`);
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    const status = response.status;
    const statusText = response.statusText;
    
    if (status >= 200 && status < 300) {
      console.log(`%c ${method} ${url} - Status: ${status} ${statusText}`, 'color: green');
    } else {
      console.log(`%c ${method} ${url} - Status: ${status} ${statusText}`, 'color: orange');
    }
    
    // Try to parse the response as JSON
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      console.log('Response:', json);
    } catch (e) {
      console.log('Response (text):', text);
    }
  } catch (error) {
    console.error(`%c ${method} ${url} - Error:`, 'color: red', error);
  }
}

/**
 * Run all API endpoint tests
 */
export async function runTest(apiUrl: string = 'http://localhost:8000'): Promise<void> {
  console.group('API Endpoint Tests');
  
  // Test root endpoint
  await testEndpoint('GET', `${apiUrl}/`);
  
  // Test health endpoint
  await testEndpoint('GET', `${apiUrl}/health`);
  
  // Test API version endpoint
  await testEndpoint('GET', `${apiUrl}/api/v1`);
  
  // Test analyzer endpoint (expected 404 since we need an event ID)
  await testEndpoint('GET', `${apiUrl}/api/v1/analyze-deadlock/test-event-id`);
  
  // Test enhanced analyzer endpoint
  await testEndpoint('GET', `${apiUrl}/api/v1/enhanced-analyzers/analyze-deadlock/test-event-id`);
  
  console.groupEnd();
  console.log('Test complete! Check the results above.');
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).apiTester = {
    runTest,
    testEndpoint
  };
  
  console.log(`
API Tester loaded! Run the tests by executing:
apiTester.runTest()

Or test a specific endpoint:
apiTester.testEndpoint('GET', 'http://localhost:8000/health')
  `);
}

export { testEndpoint };