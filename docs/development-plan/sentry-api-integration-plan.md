# Dexter - Sentry API Integration Development Plan

## Overview
This document outlines a comprehensive development plan to ensure Dexter utilizes the full scope of the Sentry API and verifies proper frontend > backend > Sentry API integration.

## Current State Analysis

### Frontend → Backend → Sentry API Flow
Currently implemented flows:
1. **Issues Flow**: `issuesApi.ts` → `/api/v1/issues/*` → `sentry_client.list_project_issues()`
2. **Events Flow**: `eventsApi.ts` → `/api/v1/events/*` → `sentry_client.get_event_details()`
3. **Analytics Flow**: `analyticsApi.ts` → `/api/v1/analytics/*` → `sentry_client.get_issue_stats()`

### Current Sentry API Coverage
- ✅ Basic issue operations (list, get, update status)
- ✅ Event retrieval and analysis
- ✅ Basic statistics
- ❌ Alert rules
- ❌ Discover/Advanced querying
- ❌ Releases & Deployments
- ❌ Team & Organization management
- ❌ Integrations

## Development Plan

### Phase 1: Complete Core Functionality (2-3 weeks)
**Goal**: Ensure all basic error monitoring features work properly

#### 1.1 Fix Current Implementation Issues
- [ ] Verify `/issues/{issue_id}/stats/` endpoint exists in Sentry API
- [ ] Fix API path prefixes (`/api/0/` consistency)
- [ ] Implement proper error boundaries and fallbacks
- [ ] Add comprehensive API response validation

#### 1.2 Complete Missing Basic Features
- [ ] Implement bulk issue operations
  - Frontend: Add multi-select UI in `EventTable`
  - Backend: Add `/api/v1/issues/bulk` endpoint
  - Sentry: Use batch operations API
- [ ] Add issue assignment functionality
  - Frontend: Add assignee dropdown
  - Backend: Add assignment endpoint
  - Sentry: Use `/issues/{id}/` PUT with assignee
- [ ] Implement issue search/filtering
  - Frontend: Enhance search bar with advanced filters
  - Backend: Add query builder
  - Sentry: Use query parameters properly

### Phase 2: Alert Rules Integration (2 weeks)
**Goal**: Enable users to create and manage alert rules from Dexter

#### 2.1 Issue Alert Rules
```typescript
// Frontend: src/api/alertsApi.ts
export const createIssueAlertRule = async (rule: IssueAlertRule) => { ... }
export const listIssueAlertRules = async (projectId: string) => { ... }
```

```python
# Backend: app/routers/alerts.py
@router.post("/projects/{project_slug}/rules")
async def create_issue_alert_rule(...)
```

#### 2.2 Metric Alert Rules
- [ ] Implement metric alert creation UI
- [ ] Add backend endpoints for metric alerts
- [ ] Connect to Sentry metric alert API

### Phase 3: Discover API Integration (3 weeks)
**Goal**: Provide advanced querying capabilities

#### 3.1 Query Builder UI
- [ ] Create visual query builder component
- [ ] Implement saved queries
- [ ] Add export functionality

#### 3.2 Backend Query Processing
```python
# Backend: app/routers/discover.py
@router.post("/organizations/{org_slug}/discover")
async def discover_query(query: DiscoverQuery):
    # Transform query to Sentry format
    # Execute via Sentry API
    # Return formatted results
```

### Phase 4: Release Management (2 weeks)
**Goal**: Track errors by release and deployment

#### 4.1 Release Tracking
- [ ] Display release information in issue list
- [ ] Show deployment timeline
- [ ] Correlate errors with releases

#### 4.2 Release Creation
```typescript
// Frontend: src/api/releasesApi.ts
export const createRelease = async (release: ReleaseData) => { ... }
export const associateCommits = async (version: string, commits: Commit[]) => { ... }
```

### Phase 5: Advanced Features (4 weeks)
**Goal**: Implement sophisticated monitoring features

#### 5.1 Session Replay Integration
- [ ] Add replay viewer component
- [ ] Implement replay search/filtering
- [ ] Correlate replays with errors

#### 5.2 Performance Monitoring
- [ ] Add transaction tracing UI
- [ ] Implement performance metrics dashboard
- [ ] Create performance alert rules

#### 5.3 Team Collaboration
- [ ] Add user/team management
- [ ] Implement issue assignment by team
- [ ] Create team dashboards

## Implementation Guidelines

### Frontend Implementation Pattern
```typescript
// src/api/[feature]Api.ts
import apiClient from './apiClient';

export interface [Feature]Data { ... }

export const fetch[Feature] = async (params: [Feature]Params) => {
  try {
    return await apiClient.get(`/[feature]`, { params });
  } catch (error) {
    handle[Feature]Error(error);
    throw error;
  }
};
```

### Backend Implementation Pattern
```python
# app/routers/[feature].py
from fastapi import APIRouter, Depends
from ..services.sentry_client import SentryApiClient

router = APIRouter()

@router.get("/[feature]")
async def get_[feature](
    sentry_client: SentryApiClient = Depends(get_sentry_client)
):
    return await sentry_client.[sentry_method]()
```

### Sentry Client Extension Pattern
```python
# app/services/sentry_client.py
class SentryApiClient:
    async def [new_method](self, **params):
        url = f"{self.base_url}/[endpoint]/"
        response = await self.client.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()
```

## API Verification Checklist

### For Each New Feature:
1. **Frontend**:
   - [ ] API client method exists
   - [ ] TypeScript interfaces are defined
   - [ ] Error handling is implemented
   - [ ] Loading states are managed

2. **Backend**:
   - [ ] Router endpoint exists
   - [ ] Proper authentication/authorization
   - [ ] Request validation (Pydantic models)
   - [ ] Error handling middleware

3. **Sentry Integration**:
   - [ ] Correct Sentry API endpoint used
   - [ ] API parameters are properly mapped
   - [ ] Response is correctly transformed
   - [ ] Error responses are handled

## Testing Strategy

### API Integration Tests
```python
# tests/integration/test_sentry_integration.py
async def test_[feature]_flow():
    # Test frontend → backend → Sentry flow
    # Verify data transformations
    # Check error handling
```

### Mock API Responses
```typescript
// src/api/mockData.ts
export const mock[Feature]Response = {
  // Mock Sentry API response structure
};
```

## Monitoring & Observability

### API Call Tracking
- Implement request/response logging
- Track API call latency
- Monitor error rates
- Set up alerts for API failures

### Performance Metrics
- Frontend render times
- API response times
- Data processing duration
- Memory usage patterns

## Documentation Requirements

### API Documentation
- OpenAPI/Swagger for all endpoints
- Request/response examples
- Error code documentation
- Rate limiting information

### Developer Guides
- How to add new Sentry API integration
- Frontend component patterns
- Backend service patterns
- Testing guidelines

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | 2-3 weeks | Core functionality complete |
| Phase 2 | 2 weeks | Alert rules integration |
| Phase 3 | 3 weeks | Discover API integration |
| Phase 4 | 2 weeks | Release management |
| Phase 5 | 4 weeks | Advanced features |

**Total Duration**: 13-14 weeks

## Success Criteria

1. All Sentry API endpoints utilized appropriately
2. Consistent frontend → backend → Sentry data flow
3. Comprehensive error handling at all levels
4. Performance within acceptable thresholds
5. Complete feature parity with Sentry UI plus Dexter enhancements
6. Thorough documentation and testing coverage
