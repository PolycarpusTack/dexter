# Dexter Development Details: Deadlock Analyzer Modal

## Technical Implementation Details

This document provides detailed technical information about the PostgreSQL Deadlock Analyzer Modal implementation. It's intended for developers who will continue work on this feature to complete Phase 1 and Phase 2 requirements.

## Implementation Architecture

### Component Hierarchy

```
EnhancedEventTable
└── EventRow
    └── DeadlockColumn
        └── DeadlockModal
            ├── GraphView (ErrorBoundary)
            ├── TableInfo (ErrorBoundary)
            └── RecommendationPanel (ErrorBoundary)
```

### Data Flow

1. **Event Data Discovery**
   - `EnhancedEventTable` renders a list of events
   - `EventRow` handles rendering individual events
   - `DeadlockColumn` detects deadlock events (40P01 error code)

2. **Modal Display Flow**
   - User clicks "Analyze Deadlock" button in `DeadlockColumn`
   - `DeadlockModal` opens and fetches deadlock analysis via React Query
   - Modal renders appropriate tab based on user selection

3. **Visualization Rendering**
   - `GraphView` renders D3-based visualization of deadlock processes
   - `TableInfo` displays tabular data about locks and relations
   - `RecommendationPanel` shows AI-generated recommendations

4. **User Interaction Flow**
   - User actions (tab changes, toggles, exports) are logged via `useAuditLog`
   - Data mutations are wrapped in React Query mutations
   - UI state is managed with useState for component-specific state

### Custom Hooks

1. **useClipboard.js**
   ```javascript
   // Usage
   const { isCopied, copyToClipboard } = useClipboard();
   
   // Copying text
   copyToClipboard(text, {
     successMessage: 'Custom success message',
     errorMessage: 'Custom error message',
     successDuration: 3000,
     showNotification: true
   });
   ```

2. **useDataMasking.js**
   ```javascript
   // Usage
   const { isMasked, toggleMasking, maskText } = useDataMasking({
     defaultMasked: true,
     patterns: {
       // Add custom patterns
       creditCard: /\d{4}-\d{4}-\d{4}-\d{4}/g
     },
     replacements: {
       // Custom replacements
       creditCard: '[CARD REDACTED]'
     }
   });
   
   // Mask text
   const maskedText = maskText(originalText);
   ```

3. **useAuditLog.js**
   ```javascript
   // Usage
   const logEvent = useAuditLog('ComponentName');
   
   // Log an event
   logEvent('action_name', { 
     detail1: 'value1',
     detail2: 'value2'
   });
   ```

## Technical Implementation Notes

### TypeScript Conversion

While the current implementation uses JSDoc-style TypeScript annotations, full conversion to TypeScript is needed. Here's a template for converting components:

```typescript
// Before: DeadlockModal.jsx
// After: DeadlockModal.tsx

import React, { useState, useEffect } from 'react';
import { Modal, Tabs } from '@mantine/core';

// Define proper interfaces
interface DeadlockModalProps {
  eventId: string;
  eventDetails: Event;
  isOpen: boolean;
  onClose: () => void;
}

interface Event {
  id: string;
  message?: string;
  // Add other event properties
}

// Use the interface in the component definition
const DeadlockModal: React.FC<DeadlockModalProps> = ({
  eventId,
  eventDetails,
  isOpen,
  onClose
}) => {
  // Type state variables
  const [activeTab, setActiveTab] = useState<string>('graph');
  
  // Rest of the component
};

export default DeadlockModal;
```

### Backend Validation with Zod

To implement proper validation:

1. Create schema definitions:

```typescript
// schemas/deadlockSchemas.ts
import { z } from 'zod';

// Define process schema
export const ProcessSchema = z.object({
  pid: z.number(),
  applicationName: z.string(),
  databaseName: z.string(),
  query: z.string(),
  blockingPids: z.array(z.number()),
  waitEventType: z.string().optional(),
  waitEvent: z.string().optional(),
  tableName: z.string().optional(),
  relation: z.number().optional(),
  lockType: z.string().optional(),
  lockMode: z.string().optional()
});

// Define relation schema
export const RelationSchema = z.object({
  relationId: z.number(),
  schema: z.string(),
  name: z.string(),
  lockingProcesses: z.array(z.number())
});

// Define visualization data schema
export const VisualizationDataSchema = z.object({
  processes: z.array(ProcessSchema),
  relations: z.array(RelationSchema)
});

// Define metadata schema
export const MetadataSchema = z.object({
  execution_time_ms: z.number(),
  parser_version: z.string().optional(),
  cycles_found: z.number().optional()
});

// Define analysis schema
export const AnalysisSchema = z.object({
  timestamp: z.string(),
  metadata: MetadataSchema.optional(),
  visualization_data: VisualizationDataSchema,
  recommended_fix: z.string().optional()
});

// Define full response schema
export const DeadlockAnalysisResponseSchema = z.object({
  success: z.boolean(),
  analysis: AnalysisSchema
});

// Type for the validated response
export type DeadlockAnalysisResponse = z.infer<typeof DeadlockAnalysisResponseSchema>;
```

2. Use in the component:

```typescript
import { DeadlockAnalysisResponseSchema } from '../schemas/deadlockSchemas';
import { useQuery } from '@tanstack/react-query';

// In the component
const { 
  data: deadlockData,
  isLoading,
  isError,
  error
} = useQuery({
  queryKey: ['deadlockAnalysis', uniqueId, useEnhancedAnalysis],
  queryFn: async () => {
    const response = await analyzeDeadlock(eventId, { 
      useEnhancedAnalysis,
      apiPath: useEnhancedAnalysis ? 'enhanced-analyzers' : 'analyzers'
    });
    
    // Validate the response
    try {
      return DeadlockAnalysisResponseSchema.parse(response);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      throw new Error('Invalid response format from server');
    }
  },
  enabled: !!uniqueId && isOpen,
  staleTime: 5 * 60 * 1000,
});
```

### Virtualized Lists Implementation

To implement virtualization for TableInfo:

```jsx
import { List as VirtualList } from 'react-virtuoso';

// Inside TableInfo component
const renderProcessList = () => {
  return (
    <VirtualList
      style={{ height: '400px' }}
      totalCount={data?.processes?.length || 0}
      itemContent={(index) => {
        const process = data.processes[index];
        return (
          <ProcessRow
            key={process.pid}
            process={process}
            isMasked={isMasked}
            maskText={maskText}
          />
        );
      }}
    />
  );
};
```

### Progressive Rendering for Large Graphs

To implement progressive rendering in EnhancedGraphView:

```jsx
const EnhancedGraphView = ({ data, isLoading }) => {
  const svgRef = useRef(null);
  const [renderedNodes, setRenderedNodes] = useState([]);
  const [renderedLinks, setRenderedLinks] = useState([]);
  
  useEffect(() => {
    if (!data || isLoading) return;
    
    const { processes, relations } = data;
    
    // Create nodes and links arrays
    const nodes = processes.map(p => ({ id: p.pid, ...p }));
    const links = [];
    
    // Build links array from blockingPids
    processes.forEach(process => {
      process.blockingPids.forEach(blockingPid => {
        links.push({
          source: process.pid,
          target: blockingPid,
          type: process.lockType || 'unknown'
        });
      });
    });
    
    // Progressive rendering for large graphs
    if (nodes.length > 50) {
      // Render in chunks of 25 nodes
      const renderChunk = (startIndex) => {
        const endIndex = Math.min(startIndex + 25, nodes.length);
        setRenderedNodes(nodes.slice(0, endIndex));
        
        // Filter links that involve only the rendered nodes
        const relevantLinks = links.filter(
          link => renderedNodes.some(n => n.id === link.source) && 
                 renderedNodes.some(n => n.id === link.target)
        );
        setRenderedLinks(relevantLinks);
        
        // Schedule next chunk if needed
        if (endIndex < nodes.length) {
          requestAnimationFrame(() => renderChunk(endIndex));
        }
      };
      
      // Start rendering chunks
      renderChunk(0);
    } else {
      // Small graph, render all at once
      setRenderedNodes(nodes);
      setRenderedLinks(links);
    }
  }, [data, isLoading]);
  
  // D3 visualization code using renderedNodes and renderedLinks
  // ...
};
```

### Render Optimization with React.memo and useCallback

```jsx
// Optimize child components with React.memo
const ProcessRow = React.memo(({ process, isMasked, maskText }) => {
  return (
    <tr>
      <td>{process.pid}</td>
      <td>{isMasked ? maskText(process.applicationName) : process.applicationName}</td>
      <td>{isMasked ? maskText(process.query) : process.query}</td>
    </tr>
  );
});

// Inside parent component
const TableInfo = ({ data, isLoading, isMasked }) => {
  // Use useCallback for functions passed to child components
  const handleRowClick = useCallback((process) => {
    console.log('Process clicked:', process.pid);
  }, []);
  
  // Use useMemo for derived calculations
  const sortedProcesses = useMemo(() => {
    if (!data?.processes) return [];
    return [...data.processes].sort((a, b) => a.pid - b.pid);
  }, [data?.processes]);
  
  return (
    <Table>
      <thead>{/* ... */}</thead>
      <tbody>
        {sortedProcesses.map(process => (
          <ProcessRow
            key={process.pid}
            process={process}
            isMasked={isMasked}
            maskText={maskText}
            onClick={handleRowClick}
          />
        ))}
      </tbody>
    </Table>
  );
};

// Export the component with memo if needed
export default React.memo(TableInfo);
```

### Cache Persistence with React Query

```javascript
// In main app initialization
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      retry: 1
    },
  },
});

const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage
});

// In App component
return (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister: localStoragePersister }}
  >
    {/* App content */}
  </PersistQueryClientProvider>
);
```

## Testing Strategy

### Unit Tests for Hooks

```javascript
// useClipboard.test.js
import { renderHook, act } from '@testing-library/react-hooks';
import { useClipboard } from '../hooks/useClipboard';

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn()
  }
});

describe('useClipboard hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should copy text to clipboard', async () => {
    navigator.clipboard.writeText.mockResolvedValueOnce();
    
    const { result } = renderHook(() => useClipboard());
    
    await act(async () => {
      const success = await result.current.copyToClipboard('test text');
      expect(success).toBe(true);
    });
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
    expect(result.current.isCopied).toBe(true);
    
    // Wait for reset timeout
    jest.advanceTimersByTime(2000);
    expect(result.current.isCopied).toBe(false);
  });
  
  // Additional tests for error cases, etc.
});
```

### Component Tests

```javascript
// DeadlockModal.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeadlockModal from '../components/DeadlockDisplay/DeadlockModal';
import { sampleDeadlockEvent, mockDeadlockApi } from '../utils/deadlockMockData';

// Mock deadlock API
jest.mock('../api/enhancedDeadlockApi');

describe('DeadlockModal', () => {
  let queryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    mockDeadlockApi();
  });
  
  test('renders modal with tabs', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DeadlockModal
          eventId={sampleDeadlockEvent.id}
          eventDetails={sampleDeadlockEvent}
          isOpen={true}
          onClose={() => {}}
        />
      </QueryClientProvider>
    );
    
    // Check for modal title
    expect(screen.getByText(/PostgreSQL Deadlock Analysis/i)).toBeInTheDocument();
    
    // Check for tabs
    expect(screen.getByText(/Graph View/i)).toBeInTheDocument();
    expect(screen.getByText(/Lock Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommendations/i)).toBeInTheDocument();
    
    // Wait for data loading
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Test tab switching
    fireEvent.click(screen.getByText(/Lock Details/i));
    expect(screen.getByText(/Process ID/i)).toBeInTheDocument();
    
    // More assertions for specific tab content
  });
  
  // Additional tests for various features
});
```

## Performance Benchmarking

To measure the performance impact of optimizations:

```javascript
// Add to EnhancedGraphView for measuring render performance
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.time('graph-render');
    // Rest of the effect code
    
    // At the end of the effect
    console.timeEnd('graph-render');
  }
}, [data]);

// Add to TableInfo for measuring virtualization impact
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const startTime = performance.now();
    
    // After rendering completes
    const endTime = performance.now();
    console.log(`Table render time: ${endTime - startTime}ms`, {
      rows: data?.processes?.length || 0,
      virtualized: true // change to false for comparison
    });
  }
}, [data]);
```

## Known Issues and Limitations

1. **D3 Integration Complexity**
   - The D3 force simulation can be computationally expensive
   - Needs proper cleanup on unmount to prevent memory leaks
   - Consider using React-friendly D3 wrappers like `react-d3-graph`

2. **Large Dataset Handling**
   - Current implementation may struggle with deadlocks involving 100+ processes
   - Virtualization needed for table views
   - Progressive rendering needed for graph visualization

3. **TypeScript Integration**
   - Current pseudo-TypeScript approach is inconsistent
   - Need formal TypeScript conversion with proper type checking

4. **API Contract Stability**
   - Backend response validation not implemented
   - Different parser versions may return incompatible data structures

## Next Developer Handoff Guide

To continue development on this feature:

1. **Environment Setup**
   - Clone the repository and install dependencies
   - Ensure you have Node.js 16+ and npm/yarn

2. **First Tasks to Complete**
   - Review the PROJECT-STATUS-UPDATE.md file
   - Start with the TypeScript migration for one component
   - Set up zod and implement validation for one API response
   - Test the current implementation with sample data

3. **Component Overview**
   - `DeadlockModal.jsx` - Main modal component
   - `DeadlockColumn.jsx` - Table column for events
   - `EventRow.jsx` - Event row component
   - Custom hooks in the hooks directory

4. **Key Files to Understand**
   - `api/enhancedDeadlockApi.js` - API client for deadlock analysis
   - `utils/deadlockMockData.js` - Mock data for testing
   - `components/DeadlockDisplay/*` - All visualization components

5. **Testing the Implementation**
   - Run the application in development mode
   - Navigate to the EventsPage
   - Use mock data from `deadlockMockData.js` for testing

## Conclusion

This implementation provides a solid foundation for the Deadlock Analyzer Modal feature. To fully complete Phase 1 and Phase 2 requirements, focus on TypeScript migration, backend validation, virtualization, and performance optimizations as outlined in this document.

The modal-based approach significantly enhances the user experience by providing focused analysis capabilities with more screen real estate. The underlying component architecture is modular and follows React best practices, making it maintainable and extensible for future enhancements.
