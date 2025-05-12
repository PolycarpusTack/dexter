# Dexter API Usage Guide

This guide provides developers with practical examples of how to use the new Dexter API structure in both backend and frontend code.

## Frontend Usage

### Basic API Usage

The new API structure provides a clean and consistent way to interact with Sentry data. Here's how to use it in your React components:

```jsx
import React, { useEffect, useState } from 'react';
import { IssuesApi } from '../api';

const IssuesList = ({ organization, project }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true);
        const response = await IssuesApi.getIssues(organization, project, { 
          status: 'unresolved',
          limit: 25
        });
        setIssues(response.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, [organization, project]);

  if (loading) return <div>Loading issues...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Issues</h2>
      <ul>
        {issues.map(issue => (
          <li key={issue.id}>{issue.title}</li>
        ))}
      </ul>
    </div>
  );
};
```

### Using React Hooks

The new hooks make it even easier to work with the API:

```jsx
import React from 'react';
import { useIssues, useResolveIssue } from '../hooks';

const IssuesListWithHooks = ({ organization, project }) => {
  // Fetch issues with the hook
  const { 
    data: issuesData, 
    isLoading, 
    error, 
    refetch 
  } = useIssues(organization, project, { 
    filters: { status: 'unresolved' } 
  });

  // Mutation for resolving issues
  const { 
    mutate: resolveIssue, 
    isLoading: isResolving 
  } = useResolveIssue();

  // Handle resolve click
  const handleResolve = (issueId) => {
    resolveIssue({ 
      org: organization, 
      issueId, 
      resolution: 'fixed' 
    }, {
      onSuccess: () => {
        // Show success notification
        console.log('Issue resolved successfully');
      }
    });
  };

  if (isLoading) return <div>Loading issues...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const issues = issuesData?.data || [];

  return (
    <div>
      <h2>Issues</h2>
      <button onClick={() => refetch()}>Refresh</button>
      <ul>
        {issues.map(issue => (
          <li key={issue.id}>
            {issue.title}
            <button 
              onClick={() => handleResolve(issue.id)}
              disabled={isResolving}
            >
              Resolve
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### Advanced Hooks Usage

Combining multiple hooks for complex scenarios:

```jsx
import React, { useState } from 'react';
import { useIssueDetails, useIssueEvents, useEventDetails } from '../hooks';

const IssueDetailsWithEvents = ({ organization, issueId }) => {
  const [selectedEventId, setSelectedEventId] = useState(null);
  
  // Fetch issue details
  const { 
    data: issueData, 
    isLoading: isLoadingIssue 
  } = useIssueDetails(organization, issueId);
  
  // Fetch issue events
  const { 
    data: eventsData, 
    isLoading: isLoadingEvents 
  } = useIssueEvents(organization, issueId, {
    filters: { limit: 10 }
  });
  
  // Fetch selected event details
  const {
    data: eventDetailsData,
    isLoading: isLoadingEventDetails
  } = useEventDetails(
    organization, 
    issueData?.project, 
    selectedEventId,
    { enabled: !!selectedEventId } // Only fetch when an event is selected
  );
  
  // Handle event selection
  const selectEvent = (eventId) => {
    setSelectedEventId(eventId);
  };
  
  if (isLoadingIssue) return <div>Loading issue details...</div>;
  
  const issue = issueData || {};
  const events = eventsData?.data || [];
  const eventDetails = eventDetailsData || {};
  
  return (
    <div>
      <h2>{issue.title}</h2>
      <p>Status: {issue.status}</p>
      
      <h3>Events</h3>
      {isLoadingEvents ? (
        <div>Loading events...</div>
      ) : (
        <ul>
          {events.map(event => (
            <li key={event.id}>
              <button onClick={() => selectEvent(event.id)}>
                {event.id} - {new Date(event.timestamp).toLocaleString()}
              </button>
            </li>
          ))}
        </ul>
      )}
      
      {selectedEventId && (
        <div>
          <h3>Event Details</h3>
          {isLoadingEventDetails ? (
            <div>Loading event details...</div>
          ) : (
            <pre>{JSON.stringify(eventDetails, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
};
```

### Using Discover API

Here's how to use the Discover API for custom queries:

```jsx
import React, { useState } from 'react';
import { useDiscoverQuery } from '../hooks';

const DiscoverQueryComponent = ({ organization }) => {
  const [queryParams, setQueryParams] = useState({
    projects: [],
    fields: ['title', 'count()'],
    conditions: [
      ['error.type', '=', 'TypeError']
    ],
    orderby: '-count()',
    limit: 20
  });
  
  const {
    data: queryResults,
    isLoading,
    error,
    refetch
  } = useDiscoverQuery(organization, queryParams);
  
  const updateCondition = (index, field, value) => {
    const newConditions = [...queryParams.conditions];
    newConditions[index][1] = field;
    newConditions[index][2] = value;
    
    setQueryParams({
      ...queryParams,
      conditions: newConditions
    });
  };
  
  const handleRefresh = () => {
    refetch();
  };
  
  if (isLoading) return <div>Loading results...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  const results = queryResults?.data || [];
  
  return (
    <div>
      <h2>Discover Query</h2>
      
      <div>
        <h3>Conditions</h3>
        {queryParams.conditions.map((condition, index) => (
          <div key={index}>
            <select 
              value={condition[0]} 
              onChange={(e) => updateCondition(index, 0, e.target.value)}
            >
              <option value="error.type">Error Type</option>
              <option value="user.email">User Email</option>
              <option value="browser.name">Browser</option>
            </select>
            
            <select 
              value={condition[1]} 
              onChange={(e) => updateCondition(index, 1, e.target.value)}
            >
              <option value="=">equals</option>
              <option value="!=">not equals</option>
              <option value="LIKE">contains</option>
            </select>
            
            <input 
              value={condition[2]} 
              onChange={(e) => updateCondition(index, 2, e.target.value)}
            />
          </div>
        ))}
      </div>
      
      <button onClick={handleRefresh}>Run Query</button>
      
      <h3>Results</h3>
      <table>
        <thead>
          <tr>
            {queryParams.fields.map(field => (
              <th key={field}>{field}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {queryParams.fields.map(field => (
                <td key={field}>{row[field]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### Using Alert Rules API

Example of working with alert rules:

```jsx
import React from 'react';
import { useAlertRules, useCreateThresholdAlert } from '../hooks';

const AlertRulesComponent = ({ organization, project }) => {
  const {
    data: alertRulesData,
    isLoading,
    error,
    refetch
  } = useAlertRules(organization, project);
  
  const {
    mutate: createThresholdAlert,
    isLoading: isCreating
  } = useCreateThresholdAlert();
  
  const handleCreateAlert = () => {
    createThresholdAlert({
      org: organization,
      project,
      options: {
        name: 'High Error Volume Alert',
        metric: 'count()',
        threshold: 100,
        operator: 'greater',
        timeWindow: 60, // minutes
        actions: [
          { type: 'email', recipients: ['team@example.com'] }
        ]
      }
    }, {
      onSuccess: () => {
        refetch();
        // Show success notification
        console.log('Alert created successfully');
      }
    });
  };
  
  if (isLoading) return <div>Loading alert rules...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  const alertRules = alertRulesData?.data || [];
  
  return (
    <div>
      <h2>Alert Rules</h2>
      
      <button 
        onClick={handleCreateAlert}
        disabled={isCreating}
      >
        Create Threshold Alert
      </button>
      
      <h3>Existing Rules</h3>
      <ul>
        {alertRules.map(rule => (
          <li key={rule.id}>
            <strong>{rule.name}</strong>
            <div>
              Conditions: {rule.conditions.map(c => 
                `${c.attribute} ${c.operator} ${c.value}`
              ).join(', ')}
            </div>
            <div>
              Actions: {rule.actions.map(a => a.type).join(', ')}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

## Backend Usage

### Using the API Configuration Service

```python
from app.services.api_config_service import ApiConfigService

# Create configuration service
api_config = ApiConfigService()

# Resolve a path with parameters
issues_path = api_config.resolve_path("issues.list", {
    "org": "my-organization",
    "project": "my-project"
})

# Get Sentry API path
sentry_path = api_config.resolve_sentry_path("issues.list", {
    "org": "my-organization",
    "project": "my-project"
})
```

### Using the Sentry API Client

```python
from app.services.sentry_api_client import SentryApiClient

# Create client instance
sentry_client = SentryApiClient()

# Get issues
issues = await sentry_client.get_issues("my-organization", "my-project", status="unresolved")

# Get issue details
issue = await sentry_client.get_issue("my-organization", "issue-id")

# Update issue
updated_issue = await sentry_client.update_issue("my-organization", "issue-id", {
    "status": "resolved",
    "resolution": "fixed"
})
```

### Using the Service Facade

```python
from app.services.sentry_service_facade import SentryServiceFacade
from app.services.cache_service import CacheService

# Create services
cache_service = CacheService()
sentry_client = SentryApiClient()
service = SentryServiceFacade(sentry_client, cache_service)

# Get issue with context (combines multiple API calls with caching)
issue_data = await service.get_issue_with_context("my-organization", "issue-id")

# Get bulk updated issues (efficient batch operation)
updated_issues = await service.bulk_update_issues("my-organization", [
    "issue-1", "issue-2", "issue-3"
], {
    "status": "resolved"
})
```

### Implementing a FastAPI Endpoint

```python
from fastapi import APIRouter, Depends, HTTPException
from app.services.api_config_service import ApiConfigService
from app.services.sentry_service_facade import SentryServiceFacade

router = APIRouter()
api_config = ApiConfigService()

@router.get("/organizations/{org}/issues")
async def get_issues(
    org: str, 
    project: str = None,
    status: str = None,
    limit: int = 100,
    service: SentryServiceFacade = Depends(get_service)
):
    """Get issues for an organization or project."""
    try:
        if project:
            # Use project-specific endpoint
            return await service.get_project_issues(org, project, {
                "status": status,
                "limit": limit
            })
        else:
            # Use organization-wide endpoint
            return await service.get_organization_issues(org, {
                "status": status,
                "limit": limit
            })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Common Patterns

### Error Handling

```javascript
// Frontend error handling
try {
  const response = await IssuesApi.getIssues(org, project);
  setIssues(response.data);
} catch (error) {
  // ApiError with detailed information
  console.error(`API error (${error.status}): ${error.message}`);
  
  if (error.status === 401) {
    // Handle authentication error
    redirectToLogin();
  } else if (error.status === 403) {
    // Handle permission error
    showPermissionError();
  } else {
    // Handle other errors
    showErrorNotification(error.message);
  }
}
```

```python
# Backend error handling
try:
    response = await sentry_client.get_issues(org, project)
    return response
except ApiError as e:
    if e.status_code == 401:
        # Handle authentication error
        raise HTTPException(status_code=401, detail="Authentication required")
    elif e.status_code == 403:
        # Handle permission error
        raise HTTPException(status_code=403, detail="Permission denied")
    else:
        # Handle other errors
        logger.error(f"API error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch issues")
```

### Caching Strategies

```javascript
// Frontend caching with React Query
const { data, isLoading } = useQuery(
  ['issues', org, project, filters],
  () => IssuesApi.getIssues(org, project, filters),
  {
    staleTime: 60000, // 1 minute
    cacheTime: 300000, // 5 minutes
    refetchOnWindowFocus: true,
    onError: (error) => {
      console.error('Failed to fetch issues:', error);
    }
  }
);
```

```python
# Backend caching
async def get_issues(org, project, params):
    cache_key = f"issues:{org}:{project}:{json.dumps(params)}"
    
    # Try to get from cache
    cached = await cache_service.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Fetch from API
    response = await sentry_client.get_issues(org, project, **params)
    
    # Store in cache
    ttl = 300  # 5 minutes
    await cache_service.set(cache_key, json.dumps(response), ttl)
    
    return response
```

### Batch Operations

```javascript
// Frontend batch operations
const updateMultipleIssues = async (issueIds, status) => {
  try {
    const response = await IssuesApi.bulkUpdate(org, issueIds, {
      status
    });
    
    // Update the UI
    refreshIssuesList();
    
    return response;
  } catch (error) {
    console.error('Failed to update issues:', error);
    throw error;
  }
};
```

```python
# Backend batch operations
async def bulk_update_issues(org, issue_ids, data):
    try:
        # Create batch request
        batch_data = {
            "issues": issue_ids,
            **data
        }
        
        # Make API call
        response = await sentry_client.post(
            f"/api/0/organizations/{org}/issues/",
            batch_data
        )
        
        return response
    except Exception as e:
        logger.error(f"Failed to bulk update issues: {str(e)}")
        raise
```

## Migration Tips

When migrating from the old API structure to the new one, follow these guidelines:

1. **Incremental Migration**: Update one component at a time to use the new API structure.
2. **Use Feature Flags**: Wrap new API usage in feature flags for easy rollback.
3. **Add Monitoring**: Add logging to track API performance and errors during migration.
4. **Test Thoroughly**: Create tests for each migrated component.

**Old vs. New Pattern Example:**

```javascript
// OLD PATTERN
import { sentryApi } from '../services/sentryApi';

const fetchIssues = async () => {
  try {
    const response = await sentryApi.get(`/projects/${org}/${project}/issues/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching issues:', error);
    throw error;
  }
};

// NEW PATTERN
import { IssuesApi } from '../api';

const fetchIssues = async () => {
  try {
    const response = await IssuesApi.getIssues(org, project);
    return response.data;
  } catch (error) {
    console.error('Error fetching issues:', error);
    throw error;
  }
};
```

```python
# OLD PATTERN
async def get_issues(org, project):
    url = f"/api/0/projects/{org}/{project}/issues/"
    return await sentry_client.get(url)

# NEW PATTERN
async def get_issues(org, project):
    sentry_path = api_config.resolve_sentry_path("issues.list", {
        "org": org,
        "project": project
    })
    return await sentry_client.get(sentry_path)
```

## Conclusion

This guide demonstrates how to use the new Dexter API structure effectively in both frontend and backend code. By following these patterns, you can ensure consistent, maintainable, and reliable API interactions throughout the application.

For more detailed information, refer to the [API Reference](./api_reference.md) documentation.
