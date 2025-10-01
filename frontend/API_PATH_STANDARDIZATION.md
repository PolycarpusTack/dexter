# API Path Standardization Guide

## Overview

As part of the Technical Debt Resolution (EPIC A), we have standardized all API path naming conventions across the Dexter codebase.

## Naming Convention Standards

### Backend (Python)
- **Standard**: `organization_slug`, `project_slug` (snake_case)
- **Examples**:
  ```python
  # Path parameters
  @router.get("/organizations/{organization_slug}/projects/{project_slug}/issues")
  
  # Function parameters
  async def get_issues(organization_slug: str, project_slug: str):
      pass
  ```

### Frontend (TypeScript)
- **Standard**: `organizationSlug`, `projectSlug` (camelCase)
- **Examples**:
  ```typescript
  // Interface definitions
  interface IssueParams {
    organizationSlug: string;
    projectSlug: string;
  }
  
  // Function calls
  api.issues.list({ organizationSlug, projectSlug });
  ```

### URL Templates
- **Standard**: `{organization_slug}`, `{project_slug}`
- **Examples**:
  ```
  /organizations/{organization_slug}/projects/{project_slug}/events
  /api/v1/organizations/{organization_slug}/issues
  ```

## Migration Summary

### Changes Applied

1. **Backend Changes**:
   - `organizationId` → `organization_slug`
   - `projectId` → `project_slug`
   - `organization_id` → `organization_slug` (in function params)
   - `project_id` → `project_slug` (in function params)

2. **Frontend Changes**:
   - `organizationID` → `organizationSlug`
   - `projectID` → `projectSlug`
   - `projectId` → `projectSlug`
   - `organization_id` → `organizationSlug`
   - `project_id` → `projectSlug`

3. **Store Changes**:
   - `projectId` → `projectSlugId` (in Zustand stores)
   - Updated all getters and setters accordingly

## Deprecation Notice

### Deprecated Patterns
The following patterns are now deprecated and should not be used:
- `organizationId`, `organizationID`
- `projectId`, `projectID`
- Mixed case conventions (e.g., `project_id` in TypeScript)

### Migration Path
If you have existing code using the old patterns:

1. **For API calls**: Update parameter names
   ```typescript
   // Old
   api.issues.list({ organizationId: 'my-org', projectId: 'my-project' });
   
   // New
   api.issues.list({ organizationSlug: 'my-org', projectSlug: 'my-project' });
   ```

2. **For TypeScript interfaces**: Update property names
   ```typescript
   // Old
   interface Event {
     projectID?: string;
   }
   
   // New
   interface Event {
     projectSlug?: string;
   }
   ```

3. **For store access**: Update property names
   ```typescript
   // Old
   const { projectId } = useAuthStore();
   
   // New
   const { projectSlugId } = useAuthStore();
   ```

## Affected Files

### Core API Files
- `/backend/app/config/providers/openai.py`
- `/backend/app/models/api/sentry.py`
- `/backend/app/models/api/sentry_generated.py`
- `/backend/app/routers/api/v1/events.py`
- `/backend/app/services/llm_providers.py`

### Frontend Types
- `/frontend/src/api/unified/interfaces.ts`
- `/frontend/src/api/unified/eventsApi.ts`
- `/frontend/src/types/events.ts`
- `/frontend/src/types/strict-types.ts`
- `/frontend/src/types/api/sentry-generated.ts`

### Components
- All EventTable components
- All DeadlockDisplay components
- AlertRules components
- Dashboard and test pages

### Stores
- `/frontend/src/store/appStore.ts`
- `/frontend/src/store/authStore.ts`
- `/frontend/src/store/index.ts`

## Testing

After migration, ensure:
1. All API endpoints are accessible
2. No TypeScript compilation errors
3. Component props are correctly typed
4. Store state management works correctly

## Tools

A migration script is available at:
```bash
python scripts/api-path-migration/migrate_api_paths.py
```

Run tests to verify migration:
```bash
python scripts/api-path-migration/test_migrate_api_paths.py
```