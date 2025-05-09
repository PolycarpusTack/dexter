// frontend/src/utils/apiTesterConsole.js

/**
 * API Tester for console usage
 * 
 * To use this in the browser console:
 * 1. Copy this entire file
 * 2. Paste it into the browser console and run it
 * 3. Call runTest() to test all endpoints
 */

function runTest() {
  const apiUrl = 'http://localhost:8000';
  
  console.group('API Endpoint Tests');
  
  // Test root endpoint
  testEndpoint('GET', `${apiUrl}/`);
  
  // Test health endpoint
  testEndpoint('GET', `${apiUrl}/health`);
  
  // Test API version endpoint
  testEndpoint('GET', `${apiUrl}/api/v1`);
  
  // Test analyzer endpoint (expected 404 since we need an event ID)
  testEndpoint('GET', `${apiUrl}/api/v1/analyze-deadlock/test-event-id`);
  
  // Test enhanced analyzer endpoint
  testEndpoint('GET', `${apiUrl}/api/v1/enhanced-analyzers/analyze-deadlock/test-event-id`);
  
  console.groupEnd();
  console.log('Test complete! Check the results above.');
}

/**
 * Test a single API endpoint using fetch
 */
function testEndpoint(method, url) {
  console.log(`Testing ${method} ${url}...`);
  
  fetch(url, {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    const status = response.status;
    const statusText = response.statusText;
    
    if (status >= 200 && status < 300) {
      console.log(`%c✓ ${method} ${url} - Status: ${status} ${statusText}`, 'color: green');
    } else {
      console.log(`%c✗ ${method} ${url} - Status: ${status} ${statusText}`, 'color: orange');
    }
    
    // Try to parse the response as JSON
    response.text().then(text => {
      try {
        const json = JSON.parse(text);
        console.log('Response:', json);
      } catch (e) {
        console.log('Response (text):', text);
      }
    });
    
    return response;
  })
  .catch(error => {
    console.error(`%c✗ ${method} ${url} - Error:`, 'color: red', error);
  });
}

// Provide instructions when the file is loaded
console.log(`
API Tester loaded! Run the tests by executing:
runTest()
`);
