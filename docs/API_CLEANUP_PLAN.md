# API Migration Cleanup Plan

This document outlines the plan for removing deprecated code after completing the migration to the unified API path configuration system.

## Overview

The API migration involved creating a new unified system for API path resolution and configuration. The old system was maintained during the migration with a compatibility layer to ensure a smooth transition. Now that the migration is complete, we can remove the deprecated code.

## Cleanup Tasks

### 1. Backend Cleanup

#### 1.1 Remove Deprecated Files

- [ ] `backend/app/config/api_paths.py` - The old API path configuration
- [ ] `backend/app/utils/old_path_resolver.py` - Any old path resolver implementations

#### 1.2 Remove Compatibility Layers

- [ ] Remove `legacy_resolve_path` function from `backend/app/utils/path_resolver.py`
- [ ] Remove deprecated path resolution methods from any services that still have them

#### 1.3 Update Tests

- [ ] Remove tests for the deprecated systems
- [ ] Ensure all tests are using the new unified API path configuration

### 2. Frontend Cleanup

#### 2.1 Remove Old API Client Files

- [ ] `frontend/src/api/issuesApi.js` - Old issues API client
- [ ] `frontend/src/api/eventsApi.js` - Old events API client
- [ ] `frontend/src/api/deadlockApi.js` - Old deadlock API client
- [ ] `frontend/src/api/enhancedDeadlockApi.js` - Old enhanced deadlock API client
- [ ] `frontend/src/api/alertsApi.js` - Old alerts API client
- [ ] `frontend/src/api/configApi.js` - Old config API client
- [ ] `frontend/src/api/analyticsApi.js` - Old analytics API client
- [ ] `frontend/src/api/exportApi.js` - Old export API client
- [ ] `frontend/src/api/modelApi.js` - Old model API client
- [ ] `frontend/src/api/aiApi.js` - Old AI API client

#### 2.2 Update Imports

- [ ] Update any remaining imports in components to use the new unified API client
- [ ] Remove any imports of the old API clients

### 3. Documentation Updates

#### 3.1 Remove Migration Guides

- [ ] Archive migration guides as they are no longer needed
- [ ] Update README to reflect the new API system

#### 3.2 Update API Documentation

- [ ] Ensure all API endpoints are documented in a consistent format
- [ ] Update any references to the old API system in documentation

## Implementation Plan

### Phase 1: Verification (Week 1)

1. Verify that all components are using the new unified API system
2. Run integration tests to ensure everything is working correctly
3. Monitor for any uses of deprecated functionality

### Phase 2: Removal (Week 2)

1. Remove deprecated files and functionality
2. Update tests to remove references to deprecated functionality
3. Run all tests to ensure nothing is broken

### Phase 3: Documentation (Week 3)

1. Update documentation to reflect the new API system
2. Archive migration guides
3. Create new documentation for the unified API system

## Checklist for Each Component

For each component that used the old API system, verify:

- [ ] All API calls use the new unified API client
- [ ] No imports of the old API clients
- [ ] All tests use the new unified API client

## Risk Mitigation

1. **Create Backups**: Before removing any files, create backups in case we need to restore
2. **Staged Removal**: Remove files in stages, testing after each stage
3. **Monitoring**: Monitor for errors after removal to catch any missed dependencies

## Success Criteria

The cleanup is successful when:

1. All deprecated code has been removed
2. All tests pass
3. The application functions correctly
4. Documentation is up to date
5. No references to the old API system remain
