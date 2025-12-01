# API Integration Test Plan

This document outlines the plan for testing the integration between the frontend unified API client and the backend API path resolution system.

## Test Objectives

1. Verify that the frontend API client can successfully communicate with the backend
2. Ensure that path resolution works correctly for all API endpoints
3. Verify that error handling functions correctly
4. Validate that all required functionality is supported by the unified API client

## Test Environment Setup

1. **Backend Setup**:
   - Run the backend server with the new API path configuration system
   - Ensure the backend is configured to accept cross-origin requests from the frontend

2. **Frontend Setup**:
   - Configure the frontend to point to the test backend server
   - Use the unified API client for all API calls

## Test Categories

### 1. Path Resolution Tests

- **Objective**: Verify that paths are correctly resolved for all API endpoints
- **Method**: Use a test harness to generate paths for all defined endpoints with various parameter combinations
- **Success Criteria**: All paths match the expected format and can be used to make successful API calls

### 2. API Endpoint Tests

#### 2.1 Issues API

- Test `getProjectIssues` with various filter combinations
- Test `getIssueDetails` for specific issues
- Test `updateIssueStatus` with different status values
- Test `assignIssue` with various assignee values
- Test `exportIssues` with different format options
- Test `bulkUpdateIssues` with multiple issues

#### 2.2 Events API

- Test `getProjectEvents` with various filter combinations
- Test `getEventDetails` for specific events
- Test `getIssueEvents` for specific issues
- Test `getLatestEventForIssue` for specific issues
- Test `getTags` and `getTagValues` functionality

#### 2.3 Alerts API

- Test `listIssueAlertRules` for specific projects
- Test `getIssueAlertRule` for specific rules
- Test CRUD operations for alert rules

#### 2.4 Analyzers API

- Test `analyzeDeadlock` with sample event data
- Test `analyzeDeadlockEnhanced` with sample event data
- Test `getLockCompatibilityMatrix` functionality

#### 2.5 Discover API

- Test `executeQuery` with various query parameters
- Test `getSavedQueries` functionality
- Test CRUD operations for saved queries

### 3. Error Handling Tests

- Test invalid path parameters
- Test missing required parameters
- Test server errors (4xx and 5xx responses)
- Test network failures
- Test timeout handling

### 4. Performance Tests

- Measure response times for common API calls
- Test caching functionality
- Test concurrent API calls

## Test Execution Plan

1. **Manual Testing**:
   - Create a test harness to manually test each API endpoint
   - Document test cases and results
   - Prioritize core functionality (issues and events)

2. **Automated Testing**:
   - Create Jest tests for each API module
   - Use MSW (Mock Service Worker) to mock API responses
   - Create end-to-end tests using Cypress for critical flows

## Test Report Template

For each API endpoint, record:

1. **Endpoint**: Category and name
2. **Parameters**: Test values used
3. **Expected Result**: Expected response structure
4. **Actual Result**: Actual response received
5. **Status**: Pass/Fail
6. **Notes**: Any observations or issues

## Regression Testing

After successful migration, the following regression tests should be performed:

1. Test all major UI workflows that involve API calls
2. Verify that data is correctly displayed in the UI
3. Ensure that error handling behaves as expected from a user perspective

## Test Schedule

- **Week 1**: Setup test environment and create test plans
- **Week 2**: Execute manual tests for core endpoints
- **Week 3**: Implement automated tests and run regression tests
- **Week 4**: Address any issues and repeat tests as needed
