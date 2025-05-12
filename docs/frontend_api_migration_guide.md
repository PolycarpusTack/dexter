# Frontend API Migration Guide

This guide outlines the process for migrating from the old frontend API client to the new unified API client system.

## Overview

The new API client system offers several advantages:

1. **Centralized Configuration**: All API paths are defined in a single configuration file
2. **Consistent Interface**: All API calls follow the same pattern
3. **Better Organization**: API endpoints are grouped by functional category
4. **Enhanced Error Handling**: Improved error handling and logging
5. **Type Safety**: Better documentation and type hints
6. **Maintainability**: Easier to add new endpoints or modify existing ones

## Migration Steps

### Step 1: Update Imports

Replace old API imports with the new unified API client:

**Before:**
```javascript
import { getProjectIssues, updateIssueStatus } from '../api/issuesApi';
```

**After:**
```javascript
import { issuesApi } from '../api/unified';
// OR
import api from '../api/unified';
```

### Step 2: Update API Calls

Replace direct API calls with the new unified API client methods:

**Before:**
```javascript
const fetchIssues = async () => {
  try {
    const result = await getProjectIssues('my-org', 'my-project', { status: 'unresolved' });
    setIssues(result.data);
  } catch (error) {
    console.error('Error fetching issues:', error);
  }
};
```

**After:**
```javascript
const fetchIssues = async () => {
  try {
    const result = await issuesApi.getProjectIssues('my-org', 'my-project', { status: 'unresolved' });
    // OR
    const result = await api.issues.getProjectIssues('my-org', 'my-project', { status: 'unresolved' });
    setIssues(result.data);
  } catch (error) {
    console.error('Error fetching issues:', error);
  }
};
```

### Step 3: Update React Query Hooks

If you're using React Query, update the query functions:

**Before:**
```javascript
const { data, isLoading } = useQuery(
  ['issues', orgSlug, projectSlug, statusFilter],
  () => fetchIssuesList({ organizationSlug: orgSlug, projectSlug, statusFilter })
);
```

**After:**
```javascript
const { data, isLoading } = useQuery(
  ['issues', orgSlug, projectSlug, statusFilter],
  () => issuesApi.fetchIssuesList({ organizationSlug: orgSlug, projectSlug, statusFilter })
);
```

## Available API Modules

The unified API client includes the following modules:

1. **issuesApi**: Methods for working with Sentry issues
   - `getProjectIssues`
   - `fetchIssuesList`
   - `getIssueDetails`
   - `updateIssueStatus`
   - `assignIssue`
   - `exportIssues`
   - `bulkUpdateIssues`

2. **eventsApi**: Methods for working with Sentry events
   - `getProjectEvents`
   - `getEventDetails`
   - `getIssueEvents`
   - `getIssueEvent`
   - `getLatestEventForIssue`
   - `getOldestEventForIssue`
   - `getTags`
   - `getTagValues`

3. **alertsApi**: Methods for working with Sentry alert rules
   - `listIssueAlertRules`
   - `getIssueAlertRule`
   - `createIssueAlertRule`
   - `updateIssueAlertRule`
   - `deleteIssueAlertRule`
   - `listMetricAlertRules`
   - `getMetricAlertRule`
   - `createMetricAlertRule`
   - `updateMetricAlertRule`
   - `deleteMetricAlertRule`

4. **analyzersApi**: Methods for analyzing Sentry events
   - `analyzeDeadlock`
   - `analyzeDeadlockEnhanced`
   - `getLockCompatibilityMatrix`

5. **discoverApi**: Methods for using Sentry's Discover API
   - `executeQuery`
   - `getSavedQueries`
   - `createSavedQuery`
   - `updateSavedQuery`
   - `deleteSavedQuery`

## Advanced Usage

### Direct Endpoint Calls

For advanced use cases, you can call any endpoint directly using the `callEndpoint` function:

```javascript
import api from '../api/unified';

const myCustomApiCall = async () => {
  return api.callEndpoint(
    'category',
    'endpoint',
    { path_param1: 'value1', path_param2: 'value2' },
    { query_param1: 'value1', query_param2: 'value2' },
    { data_field1: 'value1', data_field2: 'value2' }
  );
};
```

### Adding New Endpoints

To add a new endpoint:

1. Update the `apiConfig.js` file with the new endpoint definition
2. Add a new method to the appropriate API module
3. Use the new method in your components

Example:

```javascript
// In apiConfig.js
{
  new_category: {
    basePath: '/path/to/api',
    endpoints: {
      new_endpoint: {
        path: '/specific/endpoint',
        method: 'POST',
        description: 'Description of the endpoint'
      }
    }
  }
}

// In your API module
export const newApiMethod = async (param1, param2) => {
  return callEndpoint(
    'new_category',
    'new_endpoint',
    { param1, param2 }
  );
};
```

## Troubleshooting

If you encounter issues during migration:

1. **Check API Configuration**: Ensure the endpoint is correctly defined in `apiConfig.js`
2. **Check Parameters**: Ensure all required path parameters are provided
3. **Check Console Errors**: The new client includes detailed error logging
4. **Mock Mode**: In development, the client can return mock data if the API call fails

## Timeline

- **Now**: Begin migration of critical components
- **2 Weeks**: Complete migration of all components
- **1 Month**: Remove old API client code
