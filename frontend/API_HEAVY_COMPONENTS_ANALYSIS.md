# API-Heavy Components Analysis

## Overview
This document identifies and analyzes React components in the Dexter frontend that make heavy use of API calls through React Query and the unified API client.

## Components with Heavy API Usage

### 1. **EventTable Components**
Located in: `/frontend/src/components/EventTable/`

#### EnhancedEventTable.tsx
- **API Usage**: Very Heavy
- **React Query Hooks**: 
  - `useQuery` for fetching issues/events
  - Auto-refresh capability (30-second intervals)
- **API Endpoints Used**:
  - `api.events.getIssues()` - Main data fetching
- **Key Features**:
  - Pagination support
  - Filtering and sorting
  - Bulk operations
  - Real-time updates with WebSocket integration
  - Keyboard navigation

#### EventTable.tsx
- **API Usage**: Heavy
- Similar functionality to EnhancedEventTable but with simpler implementation

### 2. **DeadlockDisplay Components**
Located in: `/frontend/src/components/DeadlockDisplay/`

#### EnhancedDeadlockDisplay.tsx
- **API Usage**: Heavy
- **React Query Hooks**:
  - `useQuery` for deadlock analysis
- **API Endpoints Used**:
  - `api.analyzers.analyzeDeadlock()` - Deadlock analysis
  - `api.analyzers.exportDeadlockSVG()` - SVG export
- **Key Features**:
  - Enhanced vs standard analysis toggle
  - 5-minute cache (staleTime)
  - Conditional API calls based on event type

#### DeadlockModal.tsx
- **API Usage**: Moderate
- Similar to EnhancedDeadlockDisplay but in modal form

### 3. **Discover Components**
Located in: `/frontend/src/components/Discover/`

#### DiscoverPage.tsx
- **API Usage**: Heavy
- **React Query Hooks**:
  - `useMutation` for query execution
- **API Endpoints Used**:
  - `api.discover.query()` - Execute discover queries
- **Key Features**:
  - Dynamic query building
  - Result visualization
  - Query history and saved queries

#### ResultTable.tsx & QueryBuilder.tsx
- Support components for DiscoverPage with moderate API usage

### 4. **ExplainError Components**
Located in: `/frontend/src/components/ExplainError/`

#### ExplainError.tsx
- **API Usage**: Heavy
- **Custom Hooks**:
  - `useExplainError()` mutation hook
- **API Endpoints Used**:
  - AI-powered error explanation
- **Key Features**:
  - Prompt engineering integration
  - Model selection
  - Retry mechanisms
  - Context-aware explanations

### 5. **Modal Components with Heavy API Usage**

#### MemoryLeakModal.tsx
Located in: `/frontend/src/components/MemoryLeakModal/`
- **API Usage**: Heavy
- **Custom Hooks**:
  - `useMemoryLeakAnalysis()`
  - `useExportMemoryLeakSVG()`
- **API Endpoints Used**:
  - Memory leak analysis
  - SVG export functionality

#### N1QueryModal.tsx
Located in: `/frontend/src/components/N1QueryModal/`
- **API Usage**: Heavy
- **Custom Hooks**:
  - `useN1QueryAnalysis()`
  - `useExportN1QuerySVG()`
- **API Endpoints Used**:
  - N+1 query analysis
  - SVG export functionality

### 6. **Model and Settings Components**

#### UnifiedModelSelector.tsx
Located in: `/frontend/src/components/ModelSelector/`
- **API Usage**: Heavy
- **Custom Hooks**:
  - `useAi.useOllamaModels()` - 30-second refresh interval
  - `useAi.usePullModel()` - Model downloading
  - `useAi.useSetActiveModel()` - Model selection
- **Key Features**:
  - Real-time model status updates
  - Download progress tracking
  - Model filtering and search

#### AIModelSettings.tsx
Located in: `/frontend/src/components/Settings/`
- **API Usage**: Moderate to Heavy
- Integrates with ModelSelector
- Provider configuration management

### 7. **Other API-Heavy Components**

#### AIMetricsDashboard.tsx
- **API Usage**: Heavy
- Performance metrics and model comparison

#### AlertRules.tsx & AlertRuleBuilder.tsx
- **API Usage**: Moderate to Heavy
- Alert rule management and configuration

#### SystemStatus.tsx
- **API Usage**: Heavy
- System health monitoring
- Real-time status updates

## Key Patterns Observed

### 1. **React Query Integration**
- Most components use `@tanstack/react-query` for data fetching
- Common patterns:
  - `useQuery` for data fetching with caching
  - `useMutation` for data modifications
  - Proper error handling with `isError` and `error` states
  - Loading states with `isLoading`

### 2. **Unified API Client Usage**
- Import pattern: `import { api } from '../../api/unified'`
- Custom hooks: `import { hooks } from '../../api/unified'`
- Direct hook imports to avoid destructuring issues

### 3. **Caching Strategies**
- StaleTime configurations (e.g., 5 minutes for deadlock analysis)
- Auto-refresh intervals (e.g., 30 seconds for models, events)
- Conditional fetching with `enabled` option

### 4. **Error Handling**
- Consistent error notification patterns
- Retry mechanisms for failed requests
- Fallback UI states

### 5. **Performance Optimizations**
- Request deduplication
- Bounded caching
- Lazy loading with conditional API calls
- Pagination for large datasets

## Recommendations

1. **Consider implementing a global loading state** for components making multiple API calls
2. **Standardize cache invalidation patterns** across components
3. **Create reusable query key factories** for consistent cache management
4. **Implement optimistic updates** for better UX in mutation-heavy components
5. **Add request batching** for components making multiple related API calls

## Components Requiring Special Attention

1. **EnhancedEventTable** - Critical for performance due to frequent updates and large datasets
2. **UnifiedModelSelector** - Manages real-time model status with frequent polling
3. **DiscoverPage** - Handles complex queries that could be resource-intensive
4. **DeadlockDisplay/MemoryLeakModal/N1QueryModal** - Heavy analysis operations that should be carefully managed