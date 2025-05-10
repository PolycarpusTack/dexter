# Dexter API Implementation Verification

## Current Frontend → Backend → Sentry API Mapping

### 1. Issues API Flow

#### Frontend (`issuesApi.ts`):
```typescript
fetchIssues() → GET /api/v1/issues
fetchIssue() → GET /api/v1/issue/{issueId}
updateIssueStatus() → PUT /api/v1/issue/{issueId}/status
```

#### Backend (`issues.py`):
```python
GET /organizations/{org}/projects/{project}/issues → sentry_client.list_project_issues()
GET /organizations/{org}/issues/{issue_id} → sentry_client.get_issue_details()
PUT /issues/{issue_id}/status → sentry_client.update_issue_status()
```

#### Sentry API:
- ✅ `/projects/{org}/{project}/issues/` - Working
- ✅ `/issues/{issue_id}/` - Working
- ✅ `/issues/{issue_id}/` (PUT) - Working

**Status**: ✅ Properly implemented, but path inconsistency needs fixing

### 2. Events API Flow

#### Frontend (`eventsApi.ts`):
```typescript
fetchEventDetails() → GET /api/v1/event/{eventId}
fetchIssueEvents() → GET /api/v1/issue/{issueId}/events
fetchLatestEvent() → GET /api/v1/issue/{issueId}/events (with limit=1)
```

#### Backend (`events.py`):
```python
GET /organizations/{org}/projects/{project}/events/{event_id} → sentry_client.get_event_details()
GET /organizations/{org}/issues/{issue_id}/events → sentry_client.list_issue_events()
GET /organizations/{org}/issues/{issue_id}/events/{event_id} → sentry_client.get_issue_event()
```

#### Sentry API:
- ✅ `/projects/{org}/{project}/events/{event_id}/` - Working
- ✅ `/issues/{issue_id}/events/` - Working
- ✅ `/issues/{issue_id}/events/latest/` - Working

**Status**: ✅ Properly implemented

### 3. Analytics API Flow

#### Frontend (`analyticsApi.ts`):
```typescript
getIssueImpact() → GET /api/v1/analytics/issues/{issueId}/impact
getIssueFrequency() → GET /api/v1/analytics/issues/{issueId}/frequency
getIssueTags() → GET /api/v1/analytics/issues/{issueId}/tags
```

#### Backend (`analytics.py`):
```python
GET /analytics/issues/{issue_id}/impact → sentry_client.get_issue_details() + get_issue_stats()
GET /analytics/issues/{issue_id}/frequency → sentry_client.get_issue_stats()
GET /analytics/issues/{issue_id}/tags → sentry_client.get_issue_details()
```

#### Sentry API:
- ✅ `/issues/{issue_id}/` - Working
- ⚠️ `/issues/{issue_id}/stats/` - Not in OpenAPI spec but used

**Status**: ⚠️ Works but stats endpoint needs verification

### 4. Deadlock Analysis Flow

#### Frontend (`deadlockApi.ts`):
```typescript
analyzeDeadlock() → POST /api/v1/deadlock/analyze
```

#### Backend (`analyzers.py`):
```python
POST /deadlock/analyze → sentry_client.get_event_details() + parse_postgresql_deadlock()
```

**Status**: ✅ Working with custom parsing logic

## Missing API Implementations

### Frontend Declared but Not Implemented:
1. `assignIssue()` - No backend endpoint
2. `addIssueComment()` - No backend endpoint
3. `addIssueTags()` - No backend endpoint
4. `mergeIssues()` - No backend endpoint

### Backend Available but Not Used:
1. Export functionality - Backend exists, frontend doesn't use it
2. Bulk operations - Partially implemented

## API Path Inconsistencies

1. **Frontend → Backend mismatch**:
   - Frontend: `/api/v1/issue/{id}`
   - Backend: `/api/v1/organizations/{org}/issues/{id}`

2. **Backend → Sentry mismatch**:
   - Backend adds `/api/0/` prefix
   - Configuration handles this, but should be consistent

## Recommendations for Immediate Fixes

### 1. Standardize API Paths
```typescript
// Frontend: Update apiClient.ts base paths
const API_PATHS = {
  issues: '/organizations/{org}/projects/{project}/issues',
  issue: '/organizations/{org}/issues/{id}',
  events: '/organizations/{org}/projects/{project}/events'
};
```

### 2. Implement Missing Endpoints
```python
# Backend: Add missing issue operations
@router.put("/organizations/{org}/issues/{issue_id}/assign")
async def assign_issue(issue_id: str, assignee: str):
    return await sentry_client.update_issue(issue_id, {"assignedTo": assignee})

@router.post("/organizations/{org}/issues/{issue_id}/comments")
async def add_comment(issue_id: str, comment: CommentData):
    # Sentry doesn't have comments API - implement alternative
    pass
```

### 3. Add Configuration Management
```typescript
// Frontend: Add config management
export const getOrgAndProject = () => {
  const stored = localStorage.getItem('dexterConfig');
  if (stored) {
    const config = JSON.parse(stored);
    return {
      organization: config.sentryOrganization,
      project: config.sentryProject
    };
  }
  return null;
};
```

### 4. Error Handling Improvements
```typescript
// Frontend: Enhance error handling
export const handleApiError = (error: any, context: string) => {
  if (error.response?.status === 404) {
    notifyError(`${context}: Resource not found`);
  } else if (error.response?.status === 403) {
    notifyError(`${context}: Permission denied`);
  } else {
    notifyError(`${context}: ${error.message}`);
  }
};
```

## API Testing Checklist

For each API endpoint:
- [ ] Frontend function exists and is typed
- [ ] Backend endpoint exists with proper validation
- [ ] Sentry client method exists
- [ ] Error handling is implemented at all levels
- [ ] Loading states are managed in frontend
- [ ] API response is properly transformed
- [ ] Documentation is complete

## Priority Implementation Order

1. **High Priority** (Week 1):
   - Fix API path inconsistencies
   - Implement missing issue operations
   - Verify stats endpoint with Sentry

2. **Medium Priority** (Week 2):
   - Add bulk operations
   - Implement export functionality in frontend
   - Add proper configuration management

3. **Low Priority** (Week 3+):
   - Add advanced filtering
   - Implement caching strategies
   - Add request/response interceptors
