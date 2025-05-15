# API Client Migration Master Guide

This document provides a comprehensive guide for migrating from the old API client architecture to the new unified API client in the Dexter application.

## Table of Contents

1. [Overview](#overview)
2. [Migration Philosophy](#migration-philosophy)
3. [Unified API Client Architecture](#unified-api-client-architecture)
4. [Migration Workflow](#migration-workflow)
5. [Component-Specific Guides](#component-specific-guides)
6. [Common Challenges and Solutions](#common-challenges-and-solutions)
7. [Testing and Validation](#testing-and-validation)
8. [Rollout Strategy](#rollout-strategy)
9. [Migration Checklist](#migration-checklist)

## Overview

The Dexter application is transitioning from a collection of independent API clients to a unified API client architecture. This migration aims to:

- Improve code maintainability and consistency
- Enhance type safety and error handling
- Implement modern data fetching patterns
- Reduce code duplication
- Facilitate testing and future enhancements

The new architecture follows a layered approach with domain-specific API modules, a robust core client, and React hooks for integration with components.

## Migration Philosophy

### Incremental Approach

The migration follows an incremental approach, focusing on component-by-component migration rather than a complete overhaul. This strategy allows for:

- Reduced risk of regressions
- Continuous delivery of features
- Progressive validation of the new architecture
- Flexibility to adjust the approach based on feedback

### Compatibility Layer

To facilitate a smooth transition, a compatibility layer (`/frontend/src/api/compat.ts`) provides backward compatibility for components that have not yet been migrated. This layer:

- Maintains the old API signatures
- Translates old API calls to new API calls
- Preserves existing behavior
- Allows for gradual migration

## Unified API Client Architecture

The new API client architecture consists of the following layers:

```
┌─────────────────┐
│  React Hooks    │
└────────┬────────┘
         │
┌────────▼────────┐
│  API Modules    │
└────────┬────────┘
         │
┌────────▼────────┐
│ Enhanced Client │
└────────┬────────┘
         │
┌────────▼────────┐
│  Path Resolver  │
└────────┬────────┘
         │
┌────────▼────────┐
│ API Config      │
└─────────────────┘
```

### Core Components

1. **API Config**: Defines API endpoints, methods, and paths (`apiConfig.ts`)
2. **Path Resolver**: Resolves dynamic paths with parameter substitution (`pathResolver.ts`)
3. **Enhanced Client**: Handles HTTP requests with error handling, caching, and retries (`enhancedApiClient.ts`)
4. **API Modules**: Domain-specific API methods (e.g., `issuesApi.ts`, `eventsApi.ts`)
5. **React Hooks**: Component-friendly data fetching hooks (e.g., `useIssues.ts`, `useEvents.ts`)

### Key Features

- **Type Safety**: TypeScript interfaces and Zod validation schemas
- **Error Handling**: Structured error categorization and context-aware handling
- **Caching**: Request caching with TTL and conditional requests
- **Deduplication**: Prevention of duplicate in-flight requests
- **Retries**: Automatic retries with exponential backoff for transient errors
- **Data Transformation**: Normalization and validation of API responses

## Migration Workflow

Follow these steps to migrate a component to the new API client:

### 1. Analyze the Component

- Identify all API calls within the component
- Determine which API modules are required
- Understand the current error handling approach
- Check for custom data transformations

### 2. Create/Update API Modules

- Ensure necessary API modules exist for the component's needs
- Add any missing endpoints to `apiConfig.ts`
- Implement domain-specific methods with proper validation

### 3. Update Component Imports

- Replace imports from old API modules with unified API imports
- Import types from the unified API

### 4. Convert API Calls

- Replace direct client calls with API module methods
- Update parameter names to match the new API conventions
- Implement proper error handling using the unified approach

### 5. Consider React Query Integration

- Evaluate if the component would benefit from React Query hooks
- Convert manual state management to use query hooks if appropriate

### 6. Test the Migration

- Verify functionality with manual testing
- Run TypeScript validation
- Check for edge cases and error scenarios

## Component-Specific Guides

For detailed migration instructions for specific components, refer to the following guides:

- [DeadlockDisplay Migration Guide](./README-Deadlock-Analyzer.md)
- [EventTable Migration Guide](./API_MIGRATION_GUIDE_EVENTTABLE.md)
- [ExplainError Migration Guide](./API_MIGRATION_GUIDE_EXPLAINERROR.md)
- [ModelSelector Migration Guide](./API_MIGRATION_GUIDE_MODELSELECTOR.md)

## Common Challenges and Solutions

### 1. Parameter Naming Differences

**Challenge**: The old and new APIs may use different parameter names for the same concept.

**Solution**: Use the compatibility layer or update parameter names:

```typescript
// Old
const data = await fetchIssues({
  orgSlug: organization,
  projectId: project
});

// New
const data = await api.issues.getIssues({
  organizationSlug: organization,
  projectSlug: project
});
```

### 2. Response Structure Changes

**Challenge**: The structure of API responses may differ between old and new APIs.

**Solution**: Transform data structures as needed:

```typescript
// Old
const { items: events } = await fetchEvents();

// New
const { items: events } = await api.events.getEvents();
// Or if structure changed
const response = await api.events.getEvents();
const events = response.events || response.items || [];
```

### 3. Error Handling Migration

**Challenge**: Error handling patterns may need to be updated.

**Solution**: Use the new error handling utilities:

```typescript
// Old
try {
  const data = await fetchIssues();
  return data;
} catch (error) {
  console.error("Failed to fetch issues:", error);
  showErrorToast("Could not load issues");
  throw error;
}

// New
import { utils } from '../../api/unified';

const handleError = utils.createErrorHandler({
  module: 'IssuesComponent',
  showNotifications: true
});

try {
  const data = await api.issues.getIssues({
    organizationSlug,
    projectSlug
  });
  return data;
} catch (error) {
  handleError(error, {
    operation: 'fetchIssues',
    context: { organizationSlug, projectSlug }
  });
  throw error;
}
```

### 4. Custom Data Transformations

**Challenge**: Components may rely on specific data transformations.

**Solution**: Apply transformations as needed:

```typescript
// Old
const events = await fetchEvents();
const formattedEvents = events.map(formatEvent);

// New
const { items: events } = await api.events.getEvents();
const formattedEvents = events.map(formatEvent);
```

## Testing and Validation

### TypeScript Validation

Run TypeScript validation to catch type errors:

```bash
npm run typecheck
```

### Unit Tests

Update existing unit tests to use the new API:

```typescript
// Old
jest.mock('../../api/eventsApi', () => ({
  fetchEvents: jest.fn()
}));
import { fetchEvents } from '../../api/eventsApi';

// New
jest.mock('../../api/unified', () => ({
  api: {
    events: {
      getEvents: jest.fn()
    }
  }
}));
import { api } from '../../api/unified';
```

### Integration Tests

Update integration tests to use the new API client and validate end-to-end behavior.

## Rollout Strategy

### Phase 1: Infrastructure and Core Components

1. Implement unified API client architecture
2. Create compatibility layer
3. Document migration approach
4. Migrate shared utilities and hooks

### Phase 2: Component Migration

1. Migrate components in order of priority:
   - High-impact components (DeadlockDisplay, EventTable)
   - Medium-impact components (ExplainError, ModelSelector)
   - Low-impact components (Settings, auxiliary views)

2. For each component:
   - Update imports
   - Convert API calls
   - Update error handling
   - Test functionality

### Phase 3: Cleanup and Optimization

1. Remove compatibility layer
2. Delete obsolete files
3. Update documentation
4. Optimize performance

## Migration Checklist

Use this checklist to track migration progress:

- [ ] Set up unified API architecture
  - [ ] Create API config
  - [ ] Implement enhanced API client
  - [ ] Create path resolver
  - [ ] Set up error handling utilities

- [ ] Create domain-specific API modules
  - [ ] Issues API
  - [ ] Events API
  - [ ] Discover API
  - [ ] AI/Models API
  - [ ] Analyzers API
  - [ ] Alerts API

- [ ] Create React Query hooks
  - [ ] Issues hooks
  - [ ] Events hooks
  - [ ] Discover hooks
  - [ ] AI/Models hooks
  - [ ] Analyzers hooks
  - [ ] Alerts hooks

- [ ] Migrate components
  - [ ] DeadlockDisplay components
  - [ ] EventTable components
  - [ ] ExplainError components
  - [ ] ModelSelector components
  - [ ] Settings components
  - [ ] Other components

- [ ] Validate migrations
  - [ ] Run TypeScript validation
  - [ ] Update and run tests
  - [ ] Manual testing of all components

- [ ] Cleanup
  - [ ] Remove obsolete files
  - [ ] Remove compatibility layer
  - [ ] Update documentation

## Conclusion

By following this master guide and the component-specific migration guides, you can successfully transition the Dexter application to the new unified API client architecture. This migration will result in a more maintainable, type-safe, and robust application with consistent error handling and data fetching patterns.

## References

- [API Client Documentation](./API_CLIENT_DOCUMENTATION.md)
- [DeadlockDisplay Migration Guide](./README-Deadlock-Analyzer.md)
- [EventTable Migration Guide](./API_MIGRATION_GUIDE_EVENTTABLE.md)
- [ExplainError Migration Guide](./API_MIGRATION_GUIDE_EXPLAINERROR.md)
- [ModelSelector Migration Guide](./API_MIGRATION_GUIDE_MODELSELECTOR.md)