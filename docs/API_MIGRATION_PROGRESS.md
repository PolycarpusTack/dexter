# API Path Configuration Migration Progress

This document tracks the progress of migrating from the old API path configuration system to the new unified system.

## Core Components Updated

### 1. SentryApiClient (Completed)

The SentryApiClient has been fully migrated to use the new path resolution system with `get_full_url()`. All methods used by routers have been implemented to ensure backward compatibility:

- **Core methods**:
  - get_issues
  - get_issue
  - update_issue
  - bulk_update_issues
  - get_issue_events
  - get_event
  - get_latest_event

- **Router-compatible methods**:
  - list_project_issues
  - get_issue_details
  - update_issue_status
  - assign_issue
  - add_issue_tags
  - get_event_details
  - list_issue_events
  - get_issue_event

### 2. Path Resolver Tests (Completed)

Tests for path resolution have been updated to use the new system. Test coverage includes:

- Basic path resolution
- Full URL generation
- Error handling for missing parameters
- Legacy compatibility layer

### 3. YAML Configuration (Completed)

The following API endpoint configurations have been implemented:

- Issues API endpoints
- Events API endpoints
- Projects API endpoints

## Components to Update

### 1. Routers

The following routers still need to be reviewed:

- [x] Issues router - Fully migrated with SentryApiClient methods
- [x] Events router - Fully migrated with SentryApiClient methods
- [x] AI router - No Sentry API usage, migration complete
- [x] Alerts router - Fully migrated with SentryApiClient methods
- [x] Analyzers router - Fully migrated with SentryApiClient methods
- [x] Config router - No Sentry API usage, migration complete
- [x] Discover router - Fully migrated with SentryApiClient methods
- [x] Enhanced analyzers router - Fully migrated with SentryApiClient methods
- [x] Enhanced issues router - Fully migrated with EnhancedSentryClient
- [x] Websocket router - No Sentry API usage, migration complete

### 2. Frontend API Client

The frontend API client code needs to be updated to use the new path resolution system:

- [ ] Review and update frontend API client code

## Remaining Tasks

1. ✅ Update remaining routers to use the SentryApiClient methods that leverage the new path resolution system
2. ✅ Add any missing endpoint definitions to the YAML configuration files
3. [ ] Update the frontend API client to use the new path resolution system
4. [ ] Add integration tests to verify functionality end-to-end
5. [ ] Remove deprecated code after full migration

## Completed Tasks

1. ✅ Created unified API path configuration system with YAML-based configs
2. ✅ Implemented a robust path resolution mechanism with parameter validation
3. ✅ Added backward compatibility layer for smooth transition
4. ✅ Updated SentryApiClient to use the new path resolution system
5. ✅ Updated path resolver tests to use the new system
6. ✅ Migrated all router methods
7. ✅ Created comprehensive endpoint definitions for all API categories
8. ✅ Created detailed migration documentation
9. ✅ Enhanced and migrated EnhancedSentryClient to use new path resolution system

## Timeline

- **Phase 1**: Core components migration - COMPLETED
- **Phase 2**: Router updates - COMPLETED
- **Phase 3**: Frontend updates - IN PROGRESS
- **Phase 4**: Testing and validation - PENDING
- **Phase 5**: Cleanup and removal of deprecated code - PENDING
