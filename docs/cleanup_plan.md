# API Migration Cleanup Plan

This document outlines the steps required to complete the API migration cleanup process. Once all tests have passed successfully, these cleanup steps should be executed to remove deprecated code and finalize the migration.

## Backend Cleanup Tasks

### 1. Remove Deprecated API Client Files

- [ ] `app/services/old_sentry_client.py` - Replace with the new SentryApiClient
- [ ] `app/services/legacy_api.py` - Functionality now provided by ApiConfigService

### 2. Remove Hardcoded API Path Constants

- [ ] `app/constants/api_paths.py` - All paths now defined in YAML config
- [ ] `app/config/endpoints.py` - API endpoint constants now in YAML config

### 3. Clean Legacy Router Implementations

- [ ] Update routers to remove deprecated path resolution:
  - [ ] `app/routers/issues.py`
  - [ ] `app/routers/events.py`
  - [ ] `app/routers/projects.py`
  - [ ] `app/routers/organizations.py`

### 4. Remove Backward Compatibility Layers

- [ ] `app/compatibility/api_bridge.py` - Migration now complete
- [ ] `app/utils/legacy_path_resolver.py` - No longer needed

## Frontend Cleanup Tasks

### 1. Remove Deprecated API Service Files

- [ ] `src/services/sentryApi.js` - Old API service implementation
- [ ] `src/services/apiClient.js` - Replaced by new modular structure
- [ ] `src/constants/apiPaths.js` - Paths now defined in shared config

### 2. Clean Component API Calls

Update the following components to use the new API client structure:

- [ ] `src/components/EventTable/index.jsx`
- [ ] `src/components/EventDetail/index.jsx`
- [ ] `src/components/DeadlockDisplay/index.jsx`
- [ ] `src/components/ExplainError/index.jsx`

### 3. Remove Backward Compatibility Utilities

- [ ] `src/utils/apiCompat.js` - Migration now complete
- [ ] `src/utils/legacyPathResolver.js` - No longer needed

## Configuration Cleanup

- [ ] Remove duplicate path definitions in both YAML and code
- [ ] Consolidate all API path configurations into standard location
- [ ] Update environment-specific configurations to use new format

## Testing Artifacts

- [ ] Archive test reports for reference
- [ ] Update CI configuration to use new test harness
- [ ] Remove testing scripts for deprecated API implementations

## Documentation Updates

- [ ] Update API integration documentation with new patterns
- [ ] Create developer reference for the new API structure
- [ ] Archive migration guides and plans after completion

## Migration Verification

Before completing the cleanup, verify the following:

1. Run the full test suite with the `run_integration_tests.py` script
2. Manually verify key API endpoints in the development environment
3. Check for any runtime errors or warnings related to API paths
4. Validate frontend functionality with the backend API

## Cleanup Execution Plan

The cleanup should be executed in the following order:

1. Start with the backend code cleanup (Items 1-2)
2. Update configuration files and remove duplicates
3. Test thoroughly at this stage
4. Continue with frontend cleanup (Items 1-2)
5. Test again after frontend cleanup
6. Complete remaining backend cleanup (Items 3-4)
7. Complete remaining frontend cleanup (Item 3)
8. Final testing pass
9. Update documentation

## Rollback Plan

If issues are encountered during cleanup:

1. Identify at which stage the issue occurred
2. Revert the specific commits related to that stage
3. Re-enable compatibility layers as needed
4. Fix identified issues incrementally
5. Resume cleanup with smaller, more focused changes

## Timeline

| Phase | Description | Estimated Duration |
|-------|-------------|-------------------|
| 1 | Backend Initial Cleanup (Items 1-2) | 1 day |
| 2 | Configuration Consolidation | 0.5 day |
| 3 | Frontend Initial Cleanup (Items 1-2) | 1 day |
| 4 | Complete Backend Cleanup (Items 3-4) | 1 day |
| 5 | Complete Frontend Cleanup (Item 3) | 0.5 day |
| 6 | Documentation & Verification | 1 day |

Total estimated time: **5 days**

## Conclusion

This cleanup plan provides a structured approach to finalize the API migration, removing all deprecated code and ensuring the application is using only the new API infrastructure. By following this plan, we'll maintain a clean codebase while minimizing the risk of runtime issues.
