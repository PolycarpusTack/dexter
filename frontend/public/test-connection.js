// Test script to run in browser console
// This will help debug CORS issues

(async function testBackendConnection() {
  const API_BASE_URL = 'http://localhost:8000/api/v1';
  
  console.log(`Testing connection to backend at: ${API_BASE_URL}`);
  
  // Test 1: Simple fetch
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    console.log('✅ Basic fetch successful:', await response.text());
  } catch (error) {
    console.error('❌ Basic fetch failed:', error);
  }
  
  // Test 2: Fetch with headers
  try {
    const response = await fetch(`${API_BASE_URL}/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    console.log('✅ Fetch with headers successful:', await response.json());
  } catch (error) {
    console.error('❌ Fetch with headers failed:', error);
  }
  
  // Test 3: OPTIONS request
  try {
    const response = await fetch(`${API_BASE_URL}/config`, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    console.log('✅ OPTIONS request successful');
    console.log('CORS headers:', {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
    });
  } catch (error) {
    console.error('❌ OPTIONS request failed:', error);
  }
})();