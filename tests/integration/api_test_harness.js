// API Integration Test Harness

import api from '../../frontend/src/api/unified';

// Test parameters
const TEST_CONFIG = {
  organizationSlug: 'test-org',
  projectSlug: 'test-project',
  issueId: 'test-issue-id',
  eventId: 'test-event-id',
  ruleId: 'test-rule-id',
  queryId: 'test-query-id'
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

/**
 * Run a single test
 * 
 * @param {string} name - Test name
 * @param {Function} testFn - Test function
 */
async function runTest(name, testFn) {
  console.log(`Running test: ${name}`);
  
  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, status: 'passed' });
    console.log(`✅ Test passed: ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
    console.error(`❌ Test failed: ${name}`);
    console.error(error);
  }
}

/**
 * Skip a test
 * 
 * @param {string} name - Test name
 * @param {string} reason - Reason for skipping
 */
function skipTest(name, reason) {
  console.log(`Skipping test: ${name} (${reason})`);
  results.skipped++;
  results.tests.push({ name, status: 'skipped', reason });
}

/**
 * Run all tests
 */
async function runAllTests() {
  // Issues API Tests
  await runTest('getProjectIssues', async () => {
    const response = await api.issues.getProjectIssues(
      TEST_CONFIG.organizationSlug,
      TEST_CONFIG.projectSlug,
      { status: 'unresolved' }
    );
    
    // Validate response
    if (!response || !response.data) {
      throw new Error('Invalid response from getProjectIssues');
    }
  });
  
  await runTest('getIssueDetails', async () => {
    const response = await api.issues.getIssueDetails(
      TEST_CONFIG.organizationSlug,
      TEST_CONFIG.issueId
    );
    
    // Validate response
    if (!response || !response.id) {
      throw new Error('Invalid response from getIssueDetails');
    }
  });
  
  skipTest('updateIssueStatus', 'Requires write access to the API');
  skipTest('assignIssue', 'Requires write access to the API');
  skipTest('exportIssues', 'Requires write access to the API');
  skipTest('bulkUpdateIssues', 'Requires write access to the API');
  
  // Events API Tests
  await runTest('getProjectEvents', async () => {
    const response = await api.events.getProjectEvents(
      TEST_CONFIG.organizationSlug,
      TEST_CONFIG.projectSlug
    );
    
    // Validate response
    if (!response || !response.data) {
      throw new Error('Invalid response from getProjectEvents');
    }
  });
  
  await runTest('getEventDetails', async () => {
    const response = await api.events.getEventDetails(
      TEST_CONFIG.organizationSlug,
      TEST_CONFIG.projectSlug,
      TEST_CONFIG.eventId
    );
    
    // Validate response
    if (!response || !response.id) {
      throw new Error('Invalid response from getEventDetails');
    }
  });
  
  await runTest('getIssueEvents', async () => {
    const response = await api.events.getIssueEvents(
      TEST_CONFIG.issueId
    );
    
    // Validate response
    if (!response || !response.data) {
      throw new Error('Invalid response from getIssueEvents');
    }
  });
  
  await runTest('getLatestEventForIssue', async () => {
    const response = await api.events.getLatestEventForIssue(
      TEST_CONFIG.issueId
    );
    
    // Validate response
    if (!response || !response.id) {
      throw new Error('Invalid response from getLatestEventForIssue');
    }
  });
  
  // Alerts API Tests
  await runTest('listIssueAlertRules', async () => {
    const response = await api.alerts.listIssueAlertRules(
      TEST_CONFIG.organizationSlug,
      TEST_CONFIG.projectSlug
    );
    
    // Validate response
    if (!response || !Array.isArray(response)) {
      throw new Error('Invalid response from listIssueAlertRules');
    }
  });
  
  skipTest('createIssueAlertRule', 'Requires write access to the API');
  skipTest('updateIssueAlertRule', 'Requires write access to the API');
  skipTest('deleteIssueAlertRule', 'Requires write access to the API');
  
  // Analyzers API Tests
  await runTest('analyzeDeadlock', async () => {
    const response = await api.analyzers.analyzeDeadlock(
      TEST_CONFIG.eventId
    );
    
    // Validate response
    if (!response || !response.analysis) {
      throw new Error('Invalid response from analyzeDeadlock');
    }
  });
  
  await runTest('getLockCompatibilityMatrix', async () => {
    const response = await api.analyzers.getLockCompatibilityMatrix();
    
    // Validate response
    if (!response || !response.matrix) {
      throw new Error('Invalid response from getLockCompatibilityMatrix');
    }
  });
  
  // Discover API Tests
  await runTest('executeQuery', async () => {
    const response = await api.discover.executeQuery(
      TEST_CONFIG.organizationSlug,
      { field: ['title', 'count()'] }
    );
    
    // Validate response
    if (!response || !response.data) {
      throw new Error('Invalid response from executeQuery');
    }
  });
  
  await runTest('getSavedQueries', async () => {
    const response = await api.discover.getSavedQueries(
      TEST_CONFIG.organizationSlug
    );
    
    // Validate response
    if (!response || !Array.isArray(response)) {
      throw new Error('Invalid response from getSavedQueries');
    }
  });
  
  skipTest('createSavedQuery', 'Requires write access to the API');
  skipTest('updateSavedQuery', 'Requires write access to the API');
  skipTest('deleteSavedQuery', 'Requires write access to the API');
  
  // Path Resolution Tests
  await runTest('resolvePath', () => {
    const path = api.resolvePath(
      'issues',
      'list',
      {
        organization_slug: TEST_CONFIG.organizationSlug,
        project_slug: TEST_CONFIG.projectSlug
      }
    );
    
    const expectedPath = `/organizations/${TEST_CONFIG.organizationSlug}/projects/${TEST_CONFIG.projectSlug}/issues`;
    
    if (path !== expectedPath) {
      throw new Error(`Path resolution failed: ${path} !== ${expectedPath}`);
    }
  });
  
  await runTest('getFullUrl', () => {
    const url = api.getFullUrl(
      'issues',
      'list',
      {
        organization_slug: TEST_CONFIG.organizationSlug,
        project_slug: TEST_CONFIG.projectSlug
      }
    );
    
    const expectedUrl = `${api.config.baseUrl}/organizations/${TEST_CONFIG.organizationSlug}/projects/${TEST_CONFIG.projectSlug}/issues`;
    
    if (url !== expectedUrl) {
      throw new Error(`URL resolution failed: ${url} !== ${expectedUrl}`);
    }
  });
  
  // Print summary
  console.log('\n--- Test Summary ---');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Total: ${results.passed + results.failed + results.skipped}`);
  
  return results;
}

// Run tests
runAllTests().then((results) => {
  // Export results for reporting
  console.log('Tests completed');
});
