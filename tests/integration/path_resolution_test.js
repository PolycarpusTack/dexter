// Path Resolution Integration Test

import apiConfig from '../../frontend/src/api/unified/apiConfig';
import { resolvePath, getFullUrl } from '../../frontend/src/api/unified/pathResolver';

// Test all path resolutions to ensure they work correctly
function testAllPathResolutions() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test parameters for different entity types
  const testParams = {
    organization_slug: 'test-org',
    project_slug: 'test-project',
    issue_id: 'test-issue-id',
    event_id: 'test-event-id',
    rule_id: 'test-rule-id',
    query_id: 'test-query-id',
    key: 'test-key',
    sentry_base_url: 'https://sentry.example.com'
  };
  
  // Test each category and endpoint in the configuration
  Object.entries(apiConfig.categories).forEach(([categoryName, category]) => {
    Object.entries(category.endpoints).forEach(([endpointName, endpoint]) => {
      const testName = `${categoryName}.${endpointName}`;
      
      try {
        // Get required parameters for this endpoint
        const requiredParams = getRequiredParams(category.basePath, endpoint.path);
        
        // Prepare parameters for this test
        const params = {};
        requiredParams.forEach(param => {
          if (testParams[param]) {
            params[param] = testParams[param];
          } else {
            throw new Error(`Missing test parameter: ${param}`);
          }
        });
        
        // Test path resolution
        const path = resolvePath(categoryName, endpointName, params);
        
        // Test full URL resolution
        const url = getFullUrl(categoryName, endpointName, params);
        
        // Record success
        results.passed++;
        results.tests.push({
          name: testName,
          status: 'passed',
          path,
          url
        });
      } catch (error) {
        // Record failure
        results.failed++;
        results.tests.push({
          name: testName,
          status: 'failed',
          error: error.message
        });
      }
    });
  });
  
  // Print summary
  console.log('\n--- Path Resolution Test Summary ---');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);
  
  // Print details of failed tests
  if (results.failed > 0) {
    console.log('\n--- Failed Tests ---');
    results.tests
      .filter(test => test.status === 'failed')
      .forEach(test => {
        console.log(`${test.name}: ${test.error}`);
      });
  }
  
  return results;
}

/**
 * Extract required parameters from path templates
 * 
 * @param {string} basePath - Base path template
 * @param {string} endpointPath - Endpoint path template
 * @returns {Array} - Array of required parameter names
 */
function getRequiredParams(basePath, endpointPath) {
  const params = new Set();
  
  // Extract parameters from base path
  if (basePath) {
    extractParamsFromTemplate(basePath).forEach(param => params.add(param));
  }
  
  // Extract parameters from endpoint path
  extractParamsFromTemplate(endpointPath).forEach(param => params.add(param));
  
  return Array.from(params);
}

/**
 * Extract parameters from a path template
 * 
 * @param {string} template - Path template
 * @returns {Array} - Array of parameter names
 */
function extractParamsFromTemplate(template) {
  const paramRegex = /{([^}]+)}/g;
  const params = [];
  let match;
  
  while ((match = paramRegex.exec(template)) !== null) {
    params.push(match[1]);
  }
  
  return params;
}

/**
 * Test path resolution for a specific endpoint
 * 
 * @param {string} category - Category name
 * @param {string} endpoint - Endpoint name
 * @param {Object} params - Path parameters
 */
function testPathResolution(category, endpoint, params) {
  console.log(`Testing path resolution for ${category}.${endpoint}`);
  
  try {
    // Test path resolution
    const path = resolvePath(category, endpoint, params);
    console.log(`  Path: ${path}`);
    
    // Test full URL resolution
    const url = getFullUrl(category, endpoint, params);
    console.log(`  URL: ${url}`);
    
    console.log('  ✅ Test passed');
    return true;
  } catch (error) {
    console.error(`  ❌ Test failed: ${error.message}`);
    return false;
  }
}

// Run tests
if (require.main === module) {
  testAllPathResolutions();
}

// Export for use in other tests
export {
  testAllPathResolutions,
  testPathResolution,
  getRequiredParams
};
