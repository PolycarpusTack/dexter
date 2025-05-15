# EventTable Component

## Overview

The EventTable component displays a table of error events from Sentry with advanced filtering, visualization, and interaction capabilities. It serves as the primary interface for users to browse, analyze, and take action on error events.

## Component Type

- [x] UI Component
- [ ] Service Component
- [ ] Data Component 
- [ ] Integration Component
- [ ] Utility Component

## API and Props

### Props/Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `organizationSlug` | `string` | Yes | - | The Sentry organization slug |
| `projectSlug` | `string` | Yes | - | The Sentry project slug |
| `query` | `string` | No | `""` | Filter query string |
| `pageSize` | `number` | No | `25` | Number of items per page |
| `sortBy` | `string` | No | `"lastSeen"` | Field to sort by |
| `sortDirection` | `"asc" \| "desc"` | No | `"desc"` | Sort direction |
| `onEventSelect` | `(eventId: string) => void` | No | - | Callback when an event is selected |
| `showVisualization` | `boolean` | No | `true` | Whether to show visualization columns |
| `enableBulkActions` | `boolean` | No | `true` | Whether to enable bulk actions |
| `onBulkActionComplete` | `(result: BulkActionResult) => void` | No | - | Callback after bulk action completes |

### Events/Callbacks

| Name | Parameters | Description |
|------|------------|-------------|
| `onEventSelect` | `(eventId: string) => void` | Triggered when user selects an event |
| `onFilterChange` | `(filters: EventFilters) => void` | Triggered when filters are changed |
| `onSortChange` | `(sortBy: string, direction: "asc" \| "desc") => void` | Triggered when sort order changes |
| `onBulkActionComplete` | `(result: BulkActionResult) => void` | Triggered after bulk action completes |

## Architecture

The EventTable component follows a modular architecture:

```
EventTable/
├── EventTable.tsx                 # Base component
├── EnhancedEventTable.tsx         # Enhanced version with visualizations
├── EventRow.tsx                   # Individual row component
├── columns/                       # Column-specific components
│   ├── DeadlockColumn.tsx         # Deadlock indicator column
│   ├── ImpactCell.tsx             # User impact visualization
│   ├── SparklineCell.tsx          # Event frequency visualization
│   ├── SummaryCell.tsx            # Event summary with error details
│   └── index.ts                   # Column exports
├── filters/                       # Filtering components
│   ├── FilterControls.tsx         # Filter UI controls
│   ├── SmartSearch.tsx            # Advanced search component
│   └── index.ts                   # Filter exports
├── bulk-actions/                  # Bulk action components
│   ├── BulkActionBar.tsx          # UI for bulk actions
│   └── index.ts                   # Bulk action exports
├── useKeyboardNav.ts              # Keyboard navigation hook
├── useRowStyles.ts                # Row styling hook
└── types.ts                       # TypeScript interfaces
```

The component integrates with the unified API client architecture, specifically using the Events and Issues API modules.

## Features

- Interactive table of error events with sorting and filtering
- Visual data indicators (sparkline charts, impact visualization)
- Multi-select capabilities for bulk actions
- Advanced filtering with smart search
- Keyboard navigation support
- Error details with context
- Pagination and performance optimizations
- Accessibility features
- Integration with deadlock detection

## Implementation Details

### Key Classes/Modules

- `EnhancedEventTable`: Main component with all advanced features
- `EventTable`: Basic implementation for backward compatibility
- `EventRow`: Row component with selection and interaction
- `SparklineCell`: Visualization of event frequency over time
- `ImpactCell`: Visualization of user impact metrics
- `BulkActionBar`: Interface for bulk operations
- `FilterControls`: Search and filtering interface

### State Management

- Local component state using React hooks for UI state
- React Query for server state management
- Context API for shared state across nested components
- Memoization for derived state with useMemo
- Optimized rendering with useCallback

### Data Flow

1. The component fetches event data using the unified API client via React Query hooks
2. Events data is transformed and normalized for display
3. User interactions trigger state updates and potentially API calls
4. Visualizations request additional data on-demand
5. Bulk actions process multiple events and trigger callbacks

### Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| React | ^18.0.0 | UI framework |
| React Query | ^4.0.0 | Data fetching and caching |
| D3.js | ^7.0.0 | Visualization rendering |
| Unified API Client | Internal | API communication |
| Mantine UI | ^5.0.0 | UI components |

## Error Handling

The EventTable implements comprehensive error handling:

- Component-level error boundaries for isolated failures
- Graceful degradation when visualizations fail
- Error states for data loading failures
- Retry mechanisms for transient API errors
- Fallback UI for error conditions
- Detailed error reporting with context

## Accessibility

- Keyboard Navigation: Full arrow key navigation with selection via Enter
- Screen Reader Support: ARIA attributes for interactive elements and data
- Color Contrast: All visualizations have appropriate contrast ratios
- Focus Management: Visible focus indicators for keyboard users
- Semantic HTML: Proper HTML elements for table structure

## Configuration

```typescript
// Configuration example
{
  "columns": ["status", "error", "count", "users", "firstSeen", "lastSeen"],
  "defaultSortBy": "lastSeen",
  "defaultSortDirection": "desc",
  "pageSize": 25,
  "enableBulkActions": true,
  "enableKeyboardNavigation": true,
  "enableVisualization": true
}
```

## Usage Examples

### Basic Usage

```tsx
import { EventTable } from '../components/EventTable';

// Basic usage
<EventTable 
  organizationSlug="my-org" 
  projectSlug="my-project"
  onEventSelect={(eventId) => navigate(`/events/${eventId}`)}
/>
```

### Advanced Usage

```tsx
import { EnhancedEventTable } from '../components/EventTable';

// Advanced usage with all features
<EnhancedEventTable 
  organizationSlug="my-org" 
  projectSlug="my-project"
  query="is:unresolved"
  pageSize={50}
  sortBy="users"
  sortDirection="desc"
  showVisualization={true}
  enableBulkActions={true}
  onEventSelect={(eventId) => navigate(`/events/${eventId}`)}
  onBulkActionComplete={(result) => {
    showNotification({
      title: 'Bulk Action Complete',
      message: `Processed ${result.successCount} events successfully`
    });
  }}
/>
```

## Performance Considerations

- Virtualized rendering for handling large datasets
- Memoization of expensive calculations and renders
- Optimized re-rendering with React.memo
- Lazy loading of visualization components
- Efficient data fetching with React Query caching
- Debounced search inputs
- Pagination to limit data size

## Testing

### Unit Tests

```bash
# Run component unit tests
npm test -- EventTable.test.tsx
```

### Integration Tests

```bash
# Run integration tests
npm test -- --testPathPattern=integration
```

Tests cover component rendering, interaction, data fetching, and error states.

## Implementation Status

| Feature | Status | Progress |
|---------|--------|----------|
| Core functionality | ✅ Complete | 100% |
| Visual indicators | ✅ Complete | 100% |
| Multi-select | ✅ Complete | 100% |
| Keyboard navigation | ✅ Complete | 100% |
| Bulk actions | ✅ Complete | 100% |
| Performance optimizations | ✅ Complete | 100% |
| Accessibility | ✅ Complete | 100% |
| API migration | ✅ Complete | 100% |
| Documentation | ✅ Complete | 100% |

## Known Issues

- Sparkline charts may display incorrectly when browser zoom is not 100%
- Occasional flickering when rapidly switching between pages
- Complex search queries with many terms may cause performance degradation

## Related Components

- `EventDetail`: Displays detailed information about a selected event
- `DeadlockDisplay`: Shows deadlock analysis for applicable events
- `ExplainError`: Provides AI-powered error explanations
- `FilterBar`: Global filtering component that can interact with EventTable

## Future Improvements

- Smart grouping algorithm for automatically grouping similar issues
- AI-generated summaries for concise problem statements
- Priority scoring combining frequency and impact
- Regression markers for issues that have regressed
- Timeline view with deployment markers
- Collaborative features (comments, @mentions)
- Enhanced export options for reporting

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-02-01 | Initial implementation | Dev Team |
| 1.1.0 | 2025-03-15 | Added visualization features | Dev Team |
| 2.0.0 | 2025-04-10 | Migrated to unified API client | Dev Team |
| 2.1.0 | 2025-05-01 | Added bulk actions | Dev Team |
| 2.2.0 | 2025-05-12 | Enhanced keyboard navigation | Dev Team |

## Last Updated

May 2025 by Dexter Team