# API Client Consolidation Plan

## EPIC: Frontend API Client Consolidation

**Epic Description:** Standardize and unify our API client architecture to improve maintainability, type safety, and developer experience. This epic will consolidate multiple API client implementations into a single, unified approach based on TypeScript with strong typing and consistent patterns.

**Epic Goal:** Create a single, unified API client architecture that leverages TypeScript, path-based resolution, and consistent error handling patterns.

---

## Task 1: Core API Client Infrastructure

**Description:** Create the foundational infrastructure for the unified API client system.

### Subtasks:

#### 1.1: Unified Path Configuration
- Migrate JavaScript-based API configuration to TypeScript
- Consolidate path mapping configuration into a single system
- Implement comprehensive validation for API parameters
- Create centralized path resolution utilities

#### 1.2: Enhanced Base API Client
- Extend the EnhancedApiClient with path resolution capabilities
- Implement consistent error handling and logging
- Integrate performance optimizations (caching, deduplication, compression)
- Add comprehensive TypeScript interfaces and type definitions

#### 1.3: API Response Types
- Create TypeScript interfaces for all API responses
- Add Zod schemas for runtime validation
- Implement shared type utilities for common patterns
- Add documentation comments for intellisense support

---

## Task 2: API Module Migration

**Description:** Migrate each individual API module to the new unified architecture.

### Subtasks:

#### 2.1: Issues API
- Migrate `issuesApi.ts` to new architecture
- Implement proper typing for all parameters and responses
- Add error handling with context-specific information
- Write unit tests for the migrated module

#### 2.2: Events API
- Migrate `eventsApi.ts` to new architecture
- Implement proper typing for all parameters and responses
- Add error handling with context-specific information
- Write unit tests for the migrated module

#### 2.3: Analytics API
- Migrate `analyticsApi.ts` to new architecture
- Implement proper typing for all parameters and responses
- Add error handling with context-specific information
- Write unit tests for the migrated module

#### 2.4: AI/Model API
- Migrate `aiApi.ts` and `modelApi.ts` to new architecture
- Implement proper typing for all parameters and responses
- Add error handling with context-specific information
- Write unit tests for the migrated module

#### 2.5: Deadlock API
- Migrate `deadlockApi.ts` and `enhancedDeadlockApi.ts` to new architecture
- Implement proper typing for all parameters and responses
- Add error handling with context-specific information
- Write unit tests for the migrated module

#### 2.6: Discover API
- Migrate `discoverApi.ts` to new architecture
- Implement proper typing for all parameters and responses
- Add error handling with context-specific information
- Write unit tests for the migrated module

#### 2.7: Alerts API
- Migrate `alertsApi.ts` to new architecture
- Implement proper typing for all parameters and responses
- Add error handling with context-specific information
- Write unit tests for the migrated module

---

## Task 3: Component Integration

**Description:** Update component imports and usage to leverage the new unified API architecture.

### Subtasks:

#### 3.1: Update Import Statements
- Create script to identify components using old API modules
- Update import statements to use the new unified modules
- Ensure proper error handling on API calls
- Fix any type errors caused by the migration

#### 3.2: API Hook Updates
- Update custom hooks to use the new API clients
- Add proper error handling and loading states
- Ensure React Query configurations are consistent
- Update type definitions for hook parameters and returns

#### 3.3: Component Testing
- Test all components with updated API integrations
- Verify proper error handling and loading states
- Ensure data display is consistent with previous implementation
- Fix any integration issues discovered during testing

---

## Task 4: Testing and Documentation

**Description:** Create comprehensive testing and documentation for the unified API architecture.

### Subtasks:

#### 4.1: Unit Testing
- Create test framework for API clients
- Implement tests for path resolution
- Add tests for error handling scenarios
- Create mock handlers for API responses

#### 4.2: Integration Testing
- Create integration tests for full API flow
- Test with mock backend endpoints
- Verify proper error handling and retry logic
- Ensure caching and optimization features work correctly

#### 4.3: Documentation
- Create API client architecture documentation
- Add usage examples for common scenarios
- Document error handling patterns
- Create migration guide for developers

#### 4.4: Developer Tools
- Create utilities for API debugging
- Add developer console for API inspection
- Implement logging for development mode
- Create documentation for developer tools

---

## Task 5: Cleanup and Optimization

**Description:** Remove deprecated code and optimize the unified API architecture.

### Subtasks:

#### 5.1: Deprecated Code Removal
- Identify deprecated API clients and utilities
- Create removal plan with timeline
- Update any remaining consumers
- Remove deprecated code

#### 5.2: Performance Optimization
- Implement bundle size optimization
- Add tree-shaking capabilities to API modules
- Optimize API response handling
- Reduce unnecessary re-renders in components

#### 5.3: Final Verification
- Verify all components work with the new architecture
- Run performance benchmarks before/after
- Ensure proper error handling throughout
- Fix any remaining issues

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)
- Create unified path configuration system
- Implement enhanced base API client
- Develop API response types and validation

### Phase 2: Migration (Weeks 2-3)
- Migrate one API module at a time
- Test thoroughly after each migration
- Update components that use each module
- Fix any issues before moving to the next module

### Phase 3: Integration (Week 4)
- Complete component integration
- Update all import statements
- Verify proper error handling
- Test all components with the new API

### Phase 4: Polish (Week 5)
- Finalize documentation
- Remove deprecated code
- Optimize performance
- Conduct final verification

## Success Criteria

1. All API modules migrated to the unified architecture
2. All components updated to use the new API clients
3. Comprehensive type safety throughout the API layer
4. Consistent error handling and logging
5. Improved developer experience with better intellisense
6. Reduced bundle size through better tree-shaking
7. Complete documentation and developer tools

## Risk Mitigation

1. **Component Breakage**
   - Implement one module at a time
   - Create extensive tests before migration
   - Use feature flags for gradual rollout

2. **Performance Regression**
   - Benchmark before and after each migration
   - Implement performance monitoring
   - Optimize critical paths first

3. **Developer Adoption**
   - Create comprehensive documentation
   - Provide migration templates and examples
   - Conduct knowledge sharing sessions

4. **Type Definition Complexity**
   - Start with simple types and gradually refine
   - Use utility types to reduce duplication
   - Create shared type libraries for common patterns

## Appendix: Technical Details

### API Client Class Hierarchy

```typescript
// Base API Client
class EnhancedApiClient {
  // Core HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  
  // Utility methods
  getAxiosInstance(): AxiosInstance;
  invalidateCache(urlPattern: string | RegExp): void;
  clearCache(): void;
  getCacheStats(): CacheStats;
  updateOptimizations(options: OptimizationOptions): void;
}

// Path-Aware API Client
class PathAwareApiClient extends EnhancedApiClient {
  // Path-based methods
  async callEndpoint<T>(
    endpointName: string,
    params?: Record<string, any>,
    data?: any,
    options?: ApiCallOptions
  ): Promise<T>;
  
  // Endpoint information
  getEndpointInfo(endpointName: string): EndpointInfo | null;
  listEndpoints(): string[];
  getCachedEndpoints(): EndpointInfo[];
}
```

### Path Configuration

```typescript
// Path Configuration
interface ApiEndpoint {
  name: string;
  frontendPath: string;
  backendPath: string;
  sentryPath: string;
  method: HttpMethod;
  pathParams: string[];
  queryParams: string[];
  requiresAuth: boolean;
  cacheTTL?: number;
  description: string;
}

// Path Manager
class ApiPathManager {
  getEndpoint(name: string): ApiEndpointConfig | undefined;
  resolveFrontendPath(name: string, params: Record<string, string>): string;
  resolveBackendPath(name: string, params: Record<string, string>): string;
  resolveSentryPath(name: string, params: Record<string, string>): string;
  listEndpoints(): string[];
  getEndpointsByMethod(method: HttpMethod): ApiEndpointConfig[];
  getCachedEndpoints(): ApiEndpointConfig[];
  validateParams(name: string, params: Record<string, any>): ValidationResult;
}
```

### API Module Structure

```typescript
// API Module Structure
import { enhancedApiClient } from './enhancedApiClient';
import { ErrorHandler, createErrorHandler } from '../utils/errorHandling';

// API-specific error handler
const handleApiError = createErrorHandler('Module Name Error', {
  context: { apiModule: 'moduleName' }
});

// Type definitions
export interface ResponseType {
  // Type definition
}

export interface RequestParams {
  // Type definition
}

// API methods
export const apiMethod = async (
  params: RequestParams
): Promise<ResponseType> => {
  try {
    return await enhancedApiClient.callEndpoint<ResponseType>(
      'endpointName',
      params
    );
  } catch (error) {
    handleApiError(error, {
      operation: 'apiMethod',
      ...params
    });
    throw error;
  }
};

// Default export
export default {
  apiMethod
};
```

### Error Handling

```typescript
// Error Handling Pattern
try {
  // API call
  return await enhancedApiClient.callEndpoint<ResponseType>(
    'endpointName',
    params
  );
} catch (error) {
  // Add context to the error
  handleApiError(error, {
    operation: 'methodName',
    ...contextData
  });
  
  // Rethrow for component handling
  throw error;
}
```

### Response Validation

```typescript
// Response Validation with Zod
import { z } from 'zod';

// Define schema
const responseSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
  items: z.array(z.object({
    id: z.string(),
    value: z.number()
  }))
});

// Type inference
type ResponseType = z.infer<typeof responseSchema>;

// Validation in API method
export const apiMethod = async (params: RequestParams): Promise<ResponseType> => {
  try {
    const response = await enhancedApiClient.callEndpoint(
      'endpointName',
      params
    );
    
    // Validate response
    const validated = responseSchema.parse(response);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation error
      handleApiError(new Error('Invalid API response format'), {
        operation: 'apiMethod',
        validationErrors: error.errors,
        ...params
      });
    } else {
      // Handle other errors
      handleApiError(error, {
        operation: 'apiMethod',
        ...params
      });
    }
    throw error;
  }
};
```