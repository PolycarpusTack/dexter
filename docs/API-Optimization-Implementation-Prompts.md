# API Optimization Implementation Prompts

This document contains carefully crafted prompts to implement API optimizations in Dexter. Each prompt is designed to make surgical changes without breaking existing functionality.

## Phase 1: Foundation Implementation

### Prompt 1.1: Create API Path Configuration System

```
I need to create a centralized API path configuration system for the Dexter project.

Requirements:
1. Create a new file at `backend/app/config/api_paths.py` that defines all API paths
2. Create a corresponding TypeScript file at `frontend/src/config/apiPaths.ts`
3. Create a path resolver utility that handles template substitution
4. Do NOT modify any existing API calls yet - just create the configuration system

The configuration should support:
- Path templates with {org} and {project} placeholders
- Mapping between frontend paths, backend paths, and Sentry API paths
- Environment-specific path overrides

Please implement this configuration system while maintaining all existing functionality.
```

### Prompt 1.2: Implement Error Handling Framework

```
I need to enhance error handling in the Dexter project without breaking existing error handling.

Requirements:
1. Create a new error handling utility at `frontend/src/utils/apiErrorHandler.ts`
2. Create a backend error middleware at `backend/app/middleware/error_handler.py`
3. Add error boundary components at `frontend/src/components/ErrorBoundary/`
4. Integrate with existing error handling in `utils/errorHandling.ts` by extending it

The error handling should:
- Categorize errors (network, auth, validation, server)
- Provide user-friendly error messages
- Log errors with context for debugging
- Support error recovery strategies
- Work alongside existing error handling

Do not remove or modify existing error handling - only enhance it.
```

### Prompt 1.3: Add Type Safety with OpenAPI

```
I need to generate TypeScript types from the Sentry API OpenAPI specification.

Requirements:
1. Create a script at `scripts/generate-api-types.js` that reads the `sentry-api.yaml`
2. Generate TypeScript interfaces at `frontend/src/types/api/`
3. Create Pydantic models at `backend/app/models/api/`
4. Add a npm script to package.json for type generation

The types should:
- Cover all Sentry API endpoints we're using
- Include request and response types
- Be backward compatible with existing types
- Not break any existing type definitions

Keep all existing types and only add new ones where needed.
```

## Phase 2: Core Features Implementation

### Prompt 2.1: Implement Issue Assignment

```
I need to implement issue assignment functionality in Dexter.

Context: The frontend already has the assignIssue function declared but the backend doesn't implement it.

Requirements:
1. Add the backend endpoint at `backend/app/routers/issues.py`:
   - Route: PUT /api/v1/issues/{issue_id}/assign
   - Use existing SentryApiClient to update issue
2. Add the method to `backend/app/services/sentry_client.py`
3. Update the frontend to properly call this endpoint
4. Add proper error handling and validation

Constraints:
- Maintain existing API patterns
- Use existing authentication and dependency injection
- Don't break existing issue update functionality
- Follow the same error handling patterns as other endpoints
```

### Prompt 2.2: Add Bulk Operations

```
I need to implement bulk operations for issues in Dexter.

Requirements:
1. Create a new backend endpoint at `backend/app/routers/issues.py`:
   - Route: POST /api/v1/issues/bulk
   - Support bulk status updates, assignments, and tagging
2. Add bulk operation methods to `SentryApiClient`
3. Create a BulkActionBar component at `frontend/src/components/EventTable/BulkActionBar.tsx`
4. Integrate with existing EventTable selection logic

The implementation should:
- Process operations in parallel when possible
- Provide progress feedback
- Handle partial failures gracefully
- Return detailed results for each operation

Maintain compatibility with existing single-item operations.
```

### Prompt 2.3: Implement Caching Layer

```
I need to add a caching layer to Dexter for better performance.

Requirements:
1. Create a cache service at `backend/app/services/cache_service.py`
2. Add Redis dependency to requirements.txt (optional)
3. Implement in-memory caching as fallback
4. Add cache decorators for frequently called endpoints
5. Create cache invalidation logic

Cache these endpoints:
- GET /api/v1/issues (5 minute TTL)
- GET /api/v1/issues/{id} (1 minute TTL)
- GET /api/v1/analytics/* (10 minute TTL)

Constraints:
- Cache should be transparent to existing code
- Support cache bypass with query parameter
- Include cache headers in responses
- Don't break existing functionality if cache fails
```

## Phase 3: Advanced Features Implementation

### Prompt 3.1: Add Alert Rules Management

```
I need to implement alert rule management in Dexter.

Requirements:
1. Create new router at `backend/app/routers/alerts.py` with endpoints:
   - GET /api/v1/projects/{project}/rules
   - POST /api/v1/projects/{project}/rules
   - PUT /api/v1/projects/{project}/rules/{rule_id}
   - DELETE /api/v1/projects/{project}/rules/{rule_id}
2. Add alert rule methods to SentryApiClient
3. Create frontend API client at `frontend/src/api/alertsApi.ts`
4. Create AlertRuleBuilder component at `frontend/src/components/AlertRules/`

The implementation should:
- Support both issue alerts and metric alerts
- Include a visual rule builder
- Validate rules before submission
- Show existing rules with edit capability

Use the Sentry API schema for alert rules exactly as specified.
```

### Prompt 3.2: Integrate Discover API

```
I need to integrate Sentry's Discover API into Dexter.

Requirements:
1. Create a discover router at `backend/app/routers/discover.py`
2. Add discover query methods to SentryApiClient
3. Create a query builder UI at `frontend/src/components/Discover/QueryBuilder.tsx`
4. Add visualization components for discover results

Features to implement:
- Natural language query conversion
- Visual query builder
- Result table with sorting/filtering
- Chart visualizations (line, bar, area)
- Query saving and sharing

Ensure the implementation:
- Handles large result sets with pagination
- Supports all Sentry query syntax
- Provides helpful error messages for invalid queries
```

### Prompt 3.3: Add WebSocket Support

```
I need to add real-time updates to Dexter using WebSockets.

Requirements:
1. Create WebSocket endpoint at `backend/app/routers/websocket.py`
2. Add WebSocket manager at `backend/app/services/websocket_manager.py`
3. Create WebSocket client at `frontend/src/services/websocket.ts`
4. Add real-time update hooks at `frontend/src/hooks/useRealtimeUpdates.ts`

Real-time features:
- New issue notifications
- Issue status updates
- Alert triggers
- User presence (optional)

Implementation constraints:
- Graceful fallback if WebSocket fails
- Automatic reconnection logic
- Don't break existing polling mechanisms
- Support multiple concurrent connections
```

## Phase 4: Performance & Testing

### Prompt 4.1: Add Request Optimization

```
I need to optimize API requests in Dexter to improve performance.

Requirements:
1. Create request batcher at `frontend/src/utils/requestBatcher.ts`
2. Add request deduplication at `frontend/src/utils/requestDeduplicator.ts`
3. Implement request caching at `frontend/src/utils/requestCache.ts`
4. Add request interceptors to apiClient.ts

Optimizations:
- Batch multiple requests to same endpoint
- Deduplicate identical concurrent requests
- Cache GET requests with smart invalidation
- Add request/response compression

Maintain backward compatibility with existing API calls.
```

### Prompt 4.2: Implement Comprehensive Testing

```
I need to add comprehensive tests for the API optimization changes.

Requirements:
1. Add unit tests for new API endpoints in `backend/tests/routers/`
2. Add integration tests in `backend/tests/integration/`
3. Add frontend component tests in `frontend/src/components/__tests__/`
4. Add API client tests in `frontend/src/api/__tests__/`

Test coverage should include:
- Happy path scenarios
- Error handling
- Edge cases
- Performance benchmarks
- Mock Sentry API responses

Ensure tests:
- Run in CI/CD pipeline
- Use consistent mocking strategies
- Don't depend on external services
- Cover both new and existing functionality
```

### Prompt 4.3: Add Monitoring and Metrics

```
I need to add monitoring and metrics to track API performance.

Requirements:
1. Add metrics collection at `backend/app/services/metrics_service.py`
2. Create performance monitoring at `frontend/src/utils/performanceMonitor.ts`
3. Add API analytics dashboard at `frontend/src/pages/Admin/ApiAnalytics.tsx`
4. Integrate with existing logging

Metrics to track:
- API response times
- Error rates by endpoint
- Cache hit rates
- Request volumes
- User activity patterns

Implementation should:
- Use Prometheus format for metrics
- Support custom dashboards
- Include alerting thresholds
- Not impact application performance
```

## Implementation Guidelines

### For Each Prompt:

1. **Before Implementation**:
   - Review existing code in the specified areas
   - Identify integration points
   - Plan for backward compatibility

2. **During Implementation**:
   - Follow existing code patterns
   - Maintain consistent naming conventions
   - Add comprehensive comments
   - Include TypeScript types/Python type hints

3. **After Implementation**:
   - Run existing tests to ensure no regression
   - Add new tests for new functionality
   - Update documentation
   - Test with existing UI workflows

### Best Practices:

1. **Code Organization**:
   ```
   frontend/
     src/
       api/          # API client methods
       components/   # React components  
       hooks/        # Custom React hooks
       services/     # Business logic
       utils/        # Utility functions
   
   backend/
     app/
       routers/      # API endpoints
       services/     # Business logic
       models/       # Data models
       utils/        # Utility functions
   ```

2. **Naming Conventions**:
   - Frontend: camelCase for functions, PascalCase for components
   - Backend: snake_case for functions and variables
   - API endpoints: kebab-case for URLs

3. **Error Handling**:
   - Always provide user-friendly error messages
   - Log detailed errors for debugging
   - Use consistent error response format

4. **Documentation**:
   - Add JSDoc comments for TypeScript
   - Add docstrings for Python
   - Update API documentation for new endpoints

### Validation Checklist:

After implementing each prompt, verify:
- [ ] Existing functionality still works
- [ ] New functionality integrates seamlessly
- [ ] Error handling is comprehensive
- [ ] Performance is acceptable
- [ ] Code follows project conventions
- [ ] Tests pass and coverage is adequate
- [ ] Documentation is updated

## Prompt Usage Instructions

1. Use each prompt in sequence, completing one before moving to the next
2. Always specify the file paths exactly as shown
3. Test the implementation after each prompt
4. If a prompt results in breaking changes, ask for a fix before proceeding
5. Keep track of completed prompts to avoid duplication

## Emergency Rollback Prompt

If any implementation causes critical issues:

```
I need to rollback the last changes made to Dexter.

The issue is: [describe the problem]

Please:
1. Identify what was changed in the last implementation
2. Provide code to safely rollback these changes
3. Ensure existing functionality is restored
4. Suggest a fix for the issue before re-implementation
```

This document ensures that the API optimization can be implemented incrementally and safely, with clear boundaries for each change and comprehensive testing at each step.
