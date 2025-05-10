# Dexter - Immediate Action Plan

## Week 1: Fix Current Implementation Issues

### Day 1-2: API Path Standardization
1. **Update Frontend API Paths**
   ```typescript
   // src/api/config.ts
   export const API_CONFIG = {
     organizationSlug: process.env.VITE_SENTRY_ORG || 'default-org',
     projectSlug: process.env.VITE_SENTRY_PROJECT || 'default-project',
   };
   
   // src/api/issuesApi.ts
   const buildPath = (template: string) => {
     return template
       .replace('{org}', API_CONFIG.organizationSlug)
       .replace('{project}', API_CONFIG.projectSlug);
   };
   ```

2. **Fix Backend Route Consistency**
   ```python
   # backend/app/routers/issues.py
   @router.get("/issues", response_model=Dict[str, Any])
   async def list_issues(
       organization: str = Query(None),
       project: str = Query(None),
       # ... other params
   ):
       org_slug = organization or settings.organization_slug
       proj_slug = project or settings.project_slug
       # ...
   ```

### Day 3-4: Implement Missing Core Features
1. **Add Issue Assignment**
   ```python
   # backend/app/services/sentry_client.py
   async def assign_issue(self, issue_id: str, assignee: str):
       url = f"{self.base_url}/issues/{issue_id}/"
       data = {"assignedTo": assignee}
       response = await self.client.put(url, headers=self.headers, json=data)
       response.raise_for_status()
       return response.json()
   ```

2. **Fix Stats Endpoint**
   ```python
   # Verify this endpoint exists or use alternative
   async def get_issue_trends(self, issue_id: str, stat_period: str = "24h"):
       # Use /organizations/{org}/issues-stats/ instead
       pass
   ```

### Day 5: Error Handling & Validation
1. **Add Comprehensive Error Boundaries**
   ```typescript
   // src/components/ErrorBoundary.tsx
   export class ApiErrorBoundary extends React.Component {
     componentDidCatch(error, errorInfo) {
       if (error.response?.status === 401) {
         // Handle auth errors
       } else if (error.response?.status === 403) {
         // Handle permission errors
       }
     }
   }
   ```

2. **Implement Response Validation**
   ```python
   # backend/app/models/responses.py
   from pydantic import BaseModel
   
   class SentryIssueResponse(BaseModel):
       id: str
       title: str
       status: str
       # ... comprehensive model
   ```

## Week 2: Enhance Core Functionality

### Day 1-2: Bulk Operations
1. **Frontend Multi-Select**
   ```typescript
   // src/components/EventTable/BulkActions.tsx
   export const BulkActionBar: React.FC<Props> = ({ selectedIds }) => {
     const { bulkUpdateStatus } = useIssueActions();
     
     return (
       <div className="bulk-actions">
         <Button onClick={() => bulkUpdateStatus(selectedIds, 'resolved')}>
           Resolve Selected
         </Button>
       </div>
     );
   };
   ```

2. **Backend Bulk Endpoint**
   ```python
   @router.post("/issues/bulk-update")
   async def bulk_update_issues(
       issue_ids: List[str],
       update_data: Dict[str, Any],
       sentry_client: SentryApiClient = Depends(get_sentry_client)
   ):
       results = []
       for issue_id in issue_ids:
           result = await sentry_client.update_issue(issue_id, update_data)
           results.append(result)
       return {"updated": len(results), "results": results}
   ```

### Day 3-4: Advanced Filtering
1. **Query Builder Component**
   ```typescript
   // src/components/QueryBuilder/index.tsx
   export const QueryBuilder: React.FC = () => {
     const [filters, setFilters] = useState<Filter[]>([]);
     
     return (
       <div className="query-builder">
         {filters.map(filter => (
           <FilterRow key={filter.id} filter={filter} />
         ))}
         <Button onClick={addFilter}>Add Filter</Button>
       </div>
     );
   };
   ```

2. **Backend Query Parser**
   ```python
   # backend/app/utils/query_builder.py
   def build_sentry_query(filters: List[Dict]) -> str:
       query_parts = []
       for filter in filters:
           if filter['field'] == 'status':
               query_parts.append(f"is:{filter['value']}")
           elif filter['field'] == 'user':
               query_parts.append(f"user.email:{filter['value']}")
       return " ".join(query_parts)
   ```

### Day 5: Real-time Updates
1. **WebSocket Implementation**
   ```python
   # backend/app/routers/websocket.py
   @router.websocket("/ws/events")
   async def event_updates(websocket: WebSocket):
       await websocket.accept()
       try:
           while True:
               # Poll for new events
               events = await check_new_events()
               if events:
                   await websocket.send_json(events)
               await asyncio.sleep(5)
       except WebSocketDisconnect:
           pass
   ```

## Week 3: Add Alert Rules

### Day 1-3: Issue Alert Rules
1. **Frontend Alert Rule Builder**
   ```typescript
   // src/components/AlertRules/IssueAlertBuilder.tsx
   export const IssueAlertBuilder: React.FC = () => {
     const [conditions, setConditions] = useState<Condition[]>([]);
     const [actions, setActions] = useState<Action[]>([]);
     
     return (
       <div>
         <ConditionBuilder conditions={conditions} onChange={setConditions} />
         <ActionBuilder actions={actions} onChange={setActions} />
       </div>
     );
   };
   ```

2. **Backend Alert Rule Management**
   ```python
   @router.post("/projects/{project_slug}/rules")
   async def create_alert_rule(
       project_slug: str,
       rule_data: AlertRuleCreate,
       sentry_client: SentryApiClient = Depends(get_sentry_client)
   ):
       return await sentry_client.create_alert_rule(project_slug, rule_data)
   ```

### Day 4-5: Metric Alert Rules
1. **Metric Alert UI**
   ```typescript
   // src/components/AlertRules/MetricAlertBuilder.tsx
   export const MetricAlertBuilder: React.FC = () => {
     return (
       <div>
         <MetricSelector />
         <ThresholdConfig />
         <TimeWindowSelector />
         <ActionConfig />
       </div>
     );
   };
   ```

## Week 4: Discover API Integration

### Day 1-3: Basic Discover Query
1. **Frontend Query Interface**
   ```typescript
   // src/components/Discover/QueryEditor.tsx
   export const QueryEditor: React.FC = () => {
     const [query, setQuery] = useState('');
     const { data, loading } = useDiscoverQuery(query);
     
     return (
       <div>
         <TextArea value={query} onChange={setQuery} />
         <ResultsTable data={data} loading={loading} />
       </div>
     );
   };
   ```

2. **Backend Discover Endpoint**
   ```python
   @router.post("/organizations/{org_slug}/discover")
   async def discover_query(
       org_slug: str,
       query: DiscoverQuery,
       sentry_client: SentryApiClient = Depends(get_sentry_client)
   ):
       return await sentry_client.discover_query(org_slug, query)
   ```

### Day 4-5: Query Visualization
1. **Chart Components**
   ```typescript
   // src/components/Discover/Charts.tsx
   export const DiscoverChart: React.FC<Props> = ({ data, type }) => {
     switch (type) {
       case 'line':
         return <LineChart data={data} />;
       case 'bar':
         return <BarChart data={data} />;
       default:
         return <TableView data={data} />;
     }
   };
   ```

## Success Metrics

### Week 1 Goals
- [ ] All API paths are consistent
- [ ] Core missing features implemented
- [ ] Error handling is comprehensive
- [ ] Basic tests are passing

### Week 2 Goals
- [ ] Bulk operations working
- [ ] Advanced filtering implemented
- [ ] Real-time updates functional
- [ ] UI is responsive and intuitive

### Week 3 Goals
- [ ] Alert rules can be created/managed
- [ ] Both issue and metric alerts work
- [ ] Integration with Sentry is seamless
- [ ] Documentation is updated

### Week 4 Goals
- [ ] Discover API is integrated
- [ ] Basic querying works
- [ ] Results can be visualized
- [ ] Performance is acceptable

## Testing Strategy

### Unit Tests
```typescript
// src/api/__tests__/issuesApi.test.ts
describe('Issues API', () => {
  it('should fetch issues with proper params', async () => {
    const mockResponse = { data: [...] };
    apiClient.get.mockResolvedValue(mockResponse);
    
    const result = await fetchIssues({ status: 'unresolved' });
    
    expect(apiClient.get).toHaveBeenCalledWith('/issues', {
      params: { status: 'unresolved' }
    });
    expect(result).toEqual(mockResponse);
  });
});
```

### Integration Tests
```python
# tests/integration/test_issue_flow.py
async def test_issue_list_to_detail_flow():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Test listing issues
        response = await client.get("/api/v1/issues")
        assert response.status_code == 200
        
        # Test getting specific issue
        issue_id = response.json()["data"][0]["id"]
        detail_response = await client.get(f"/api/v1/issues/{issue_id}")
        assert detail_response.status_code == 200
```

## Documentation Updates

### API Documentation
- Update OpenAPI specs
- Add request/response examples
- Document error codes
- Include rate limiting info

### Developer Guide
- How to add new Sentry endpoints
- Frontend component patterns
- Backend service patterns
- Testing requirements

This immediate action plan provides a structured approach to improving Dexter's Sentry API integration over the next 4 weeks.
