# Cleanup Candidates for Dexter Codebase

This document lists files and directories that are candidates for cleanup in the Dexter codebase. These files appear to be duplicates, backups, or obsolete versions that could be safely removed to improve codebase maintainability.

## Frontend Cleanup Candidates

### API Archive Directories
- `/frontend/src/api/archive-to-delete/` (entire directory)
- `/frontend/src/api/archived/` (entire directory)

### Legacy JS Files in Unified API
- `/frontend/src/api/unified/alertsApi.js` (TypeScript version exists)
- `/frontend/src/api/unified/analyzersApi.js` (TypeScript version exists)
- `/frontend/src/api/unified/apiClient.js` (TypeScript version exists)
- `/frontend/src/api/unified/apiConfig.js` (TypeScript version exists)
- `/frontend/src/api/unified/configApi.browser.js` (TypeScript version exists)
- `/frontend/src/api/unified/discoverApi.js` (TypeScript version exists)
- `/frontend/src/api/unified/eventsApi.js` (TypeScript version exists)
- `/frontend/src/api/unified/index.js` (TypeScript version exists)
- `/frontend/src/api/unified/issuesApi.js` (TypeScript version exists)
- `/frontend/src/api/unified/pathResolver.js` (TypeScript version exists)

### Unused/Deprecated API Files
- `/frontend/src/api/compat.ts`
- `/frontend/src/api/config.ts`
- `/frontend/src/api/configApi.d.ts`
- `/frontend/src/api/enhancedApiClient.ts` (superseded by unified version)
- `/frontend/src/api/unified/configApiMock.ts`

### Component Duplicates
- `/frontend/src/components/ModelSelector/EnhancedModelSelector.tsx` (superseded by UnifiedModelSelector)
- `/frontend/src/components/ModelSelector/ModelSelector.tsx` (superseded by UnifiedModelSelector)
- `/frontend/src/components/archive-to-delete/` (entire directory)
- `/frontend/src/components/archive-to-delete/ModelSelector.jsx`
- `/frontend/src/components/archive-to-delete/DeadlockDisplay.jsx`
- `/frontend/src/components/archive-to-delete/DashboardPage.jsx`
- `/frontend/src/components/archive-to-delete/EnhancedEventTable.jsx`

### Backup Files
- `/frontend/src/components/Settings/SettingsInput-backup.tsx`
- `/frontend/_cleanup_backup/` (entire directory)

### Legacy Hook Files
- `/frontend/src/hooks/archive-to-delete/useEventFrequency.js`
- `/frontend/src/hooks/archive-to-delete/useIssueImpact.js`

### Archived Types
- `/frontend/src/types/archive-to-delete/` (if this directory exists)

## Backend Cleanup Candidates

### Multiple Main Application Files
The presence of multiple main application files suggests different versions or configurations that could be consolidated:
- `/backend/app/main_debug.py`
- `/backend/app/main_debug_shim.py`
- `/backend/app/main_enhanced.py`
- `/backend/app/main_enhanced_shim.py`
- `/backend/app/main_minimal.py`
- `/backend/app/main_minimal_shim.py`
- `/backend/app/main_new.py`
- `/backend/app/main_simplified.py`
- `/backend/app/main_simplified_shim.py`
- `/backend/app/minimal.py`

### Duplicate Utility Scripts
- `/backend/fix_dependencies.py`
- `/backend/fix_dependencies2.py`
- `/backend/fix_pydantic_compatibility.py`
- `/backend/fix_pydantic_settings.py`
- `/backend/fix_pydantic_settings_direct.py`

### Multiple Cleanup Scripts
- `/backend/clean_code.py`
- `/backend/comprehensive_cleanup.py`
- `/backend/simple_cleanup.py`
- `/backend/find_unused_imports.py`

### Temporary Files
- `/backend/temp_pytest.ini`

## Project Root Cleanup Candidates

### Duplicate Documentation
Consider consolidating these documentation files:
- `FIXES-SUMMARY.md`
- `FIXES_SUMMARY.md` (same name but different case)
- Multiple documentation files that might be consolidated

### Multiple Setup/Fix Scripts
- `cleanup-project.sh`
- `cleanup.sh`
- `cleanup_phase2.sh`
- `check-backend-health.bat`
- `setup_clean_environment.bat`
- `setup_project.bat`

## Important Notes

Before deleting any files:
1. **Check for references** - Make sure the files aren't imported or used elsewhere
2. **Version control** - Ensure your changes are committed to a new branch so you can revert if needed
3. **Test after removal** - Run the application and tests after cleanup to verify functionality
4. **Document changes** - Update documentation to reflect the cleanup

Recommend performing cleanup in small, focused batches rather than all at once to minimize potential impacts.