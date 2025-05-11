# Bulk Operations API

This document describes how to use the bulk operations functionality in Dexter.

## Overview

The bulk operations feature allows you to perform multiple operations on issues simultaneously. This includes bulk status updates, assignments, and tagging. Operations are processed in parallel when possible, with detailed feedback on successes and failures.

## Endpoint

### Bulk Operations

Perform multiple operations on issues in a single request.

```
POST /api/v1/issues/bulk
```

#### Request Body

Array of operations, where each operation includes:

```json
[
  {
    "issue_id": "issue123",
    "operation_type": "status", // "status" | "assign" | "tag"
    "data": {
      // Operation-specific data
    }
  }
]
```

#### Operation Types

##### Status Update
```json
{
  "issue_id": "issue123",
  "operation_type": "status",
  "data": {
    "status": "resolved" // "resolved" | "unresolved" | "ignored"
  }
}
```

##### Assignment
```json
{
  "issue_id": "issue123",
  "operation_type": "assign",
  "data": {
    "assignee": "user@example.com" // User ID or email
  }
}
```

##### Tagging
```json
{
  "issue_id": "issue123",
  "operation_type": "tag",
  "data": {
    "tags": ["bug", "critical"] // Array of tags to add
  }
}
```

#### Response

Success (200 OK):
```json
{
  "total": 3,
  "succeeded": 2,
  "failed": 1,
  "results": [
    {
      "issue_id": "issue123",
      "success": true,
      "operation_type": "status",
      "result": {
        "id": "issue123",
        "status": "resolved"
      }
    },
    {
      "issue_id": "issue456",
      "success": true,
      "operation_type": "assign",
      "result": {
        "id": "issue456",
        "assignee": {
          "email": "user@example.com"
        }
      }
    }
  ],
  "errors": [
    {
      "issue_id": "issue789",
      "success": false,
      "error": "Issue not found"
    }
  ]
}
```

## Frontend Usage

### Using the Bulk Operations Hook

```typescript
import useBulkOperations from '../hooks/useBulkOperations';

const MyComponent = () => {
  const { 
    performBulkOperations,
    bulkUpdateStatus,
    bulkAssign,
    bulkAddTags,
    isProcessing,
    progress 
  } = useBulkOperations();
  
  // Update status for multiple issues
  const handleBulkStatus = async () => {
    const issueIds = ['issue1', 'issue2', 'issue3'];
    const result = await bulkUpdateStatus(issueIds, 'resolved');
    console.log(`Updated ${result.succeeded} issues`);
  };
  
  // Assign multiple issues
  const handleBulkAssign = async () => {
    const issueIds = ['issue1', 'issue2'];
    const result = await bulkAssign(issueIds, 'user@example.com');
    console.log(`Assigned ${result.succeeded} issues`);
  };
  
  // Add tags to multiple issues
  const handleBulkTag = async () => {
    const issueIds = ['issue1', 'issue2'];
    const result = await bulkAddTags(issueIds, ['bug', 'critical']);
    console.log(`Tagged ${result.succeeded} issues`);
  };
  
  // Mixed operations
  const handleMixedOperations = async () => {
    const operations = [
      {
        issue_id: 'issue1',
        operation_type: 'status',
        data: { status: 'resolved' }
      },
      {
        issue_id: 'issue2',
        operation_type: 'assign',
        data: { assignee: 'user@example.com' }
      },
      {
        issue_id: 'issue3',
        operation_type: 'tag',
        data: { tags: ['bug'] }
      }
    ];
    
    const result = await performBulkOperations(operations);
    console.log(`Processed ${result.succeeded} operations`);
  };
  
  // Progress tracking
  if (isProcessing) {
    console.log(`Progress: ${progress.processed}/${progress.total}`);
  }
};
```

### Using the BulkActionBar Component

The BulkActionBar component is integrated with the EventTable to provide a user-friendly interface for bulk operations:

```typescript
import BulkActionBar from './EventTable/BulkActionBar';

const EventTable = () => {
  const [selectedEvents, setSelectedEvents] = useState<EventType[]>([]);
  
  const handleClearSelection = () => {
    setSelectedEvents([]);
  };
  
  return (
    <>
      {/* Your event table here */}
      
      <BulkActionBar
        selectedEvents={selectedEvents}
        onClearSelection={handleClearSelection}
        visible={selectedEvents.length > 0}
      />
    </>
  );
};
```

## Features

### Parallel Processing
Operations are processed in parallel for better performance. The backend handles all operations concurrently and returns comprehensive results.

### Progress Tracking
The hook provides real-time progress information:
- `total`: Total number of operations
- `processed`: Number of operations completed
- `succeeded`: Number of successful operations
- `failed`: Number of failed operations

### Error Handling
- Individual operation failures don't stop other operations
- Detailed error information is provided for each failed operation
- Partial success is supported and reported

### User Feedback
- Real-time progress display
- Success/failure notifications
- Detailed results for debugging

## Implementation Details

### Backend
- Uses async/gather to process operations concurrently
- Validates each operation independently
- Returns detailed results for each operation

### Frontend
- React Query for state management
- Progress tracking with state updates
- Automatic query invalidation after operations

## Testing

To test bulk operations:

1. **Unit Tests**: Run the backend tests:
   ```bash
   cd backend
   pytest tests/test_bulk_operations.py
   ```

2. **Manual Testing**: Use the TestBulkOperations component:
   ```tsx
   import TestBulkOperations from './components/TestBulkOperations';
   
   // Include in your test page
   <TestBulkOperations />
   ```

3. **API Testing**: Use curl or Postman:
   ```bash
   curl -X POST http://localhost:8000/api/v1/issues/bulk \
     -H "Content-Type: application/json" \
     -d '[
       {
         "issue_id": "issue1",
         "operation_type": "status",
         "data": {"status": "resolved"}
       }
     ]'
   ```

## Best Practices

1. **Batch Size**: Keep batch sizes reasonable (< 100 operations) to avoid timeouts
2. **Error Handling**: Always check the errors array in the response
3. **Progress Feedback**: Show progress for operations that take time
4. **Validation**: Validate operations before sending to avoid unnecessary failures
5. **Query Invalidation**: Ensure related queries are invalidated after bulk operations

## Limitations

- Operations are limited by Sentry API rate limits
- Very large batches may timeout
- Some operations may not be supported by all Sentry installations
