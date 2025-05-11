# Issue Assignment API

This document describes how to use the issue assignment functionality in Dexter.

## Overview

The issue assignment feature allows you to assign Sentry issues to specific users. The assignment is performed through the Sentry API and is reflected both in Dexter and in the Sentry interface.

## Endpoint

### Assign Issue

Assigns a Sentry issue to a specific user.

```
PUT /api/v1/issues/{issue_id}/assign
```

#### Parameters

- `issue_id` (path parameter): The ID of the issue to assign

#### Request Body

```json
{
  "assignee": "user@example.com"  // User ID or email of the assignee
}
```

To unassign an issue, pass an empty string:
```json
{
  "assignee": ""
}
```

#### Response

Success (200 OK):
```json
{
  "id": "1234567",
  "assignee": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "assignedBy": "current_user",
  "dateAssigned": "2023-07-05T14:32:00Z"
}
```

Error responses:
- 400 Bad Request: Invalid assignee
- 404 Not Found: Issue not found
- 422 Unprocessable Entity: Validation error (missing assignee field)
- 500 Internal Server Error: Unexpected server error

## Frontend Usage

### Using the API Client

```typescript
import { assignIssue } from '../api/issuesApi';

// Assign issue
try {
  const result = await assignIssue('issue-id', 'user@example.com');
  console.log('Issue assigned:', result);
} catch (error) {
  console.error('Failed to assign issue:', error);
}

// Unassign issue
try {
  const result = await assignIssue('issue-id', '');
  console.log('Issue unassigned');
} catch (error) {
  console.error('Failed to unassign issue:', error);
}
```

### Using the Issue Actions Hook

```typescript
import useIssueActions from '../hooks/useIssueActions';

const MyComponent = () => {
  const { assignTo, isAssigning } = useIssueActions();
  
  const handleAssign = async () => {
    try {
      await assignTo('issue-id', 'user@example.com');
      // Success notification is handled by the hook
    } catch (error) {
      // Error notification is handled by the hook
    }
  };
  
  return (
    <Button 
      onClick={handleAssign} 
      loading={isAssigning}
    >
      Assign Issue
    </Button>
  );
};
```

## Backend Implementation

The backend implementation follows these steps:

1. Receives the assignment request
2. Validates the request body
3. Calls the Sentry API to perform the assignment
4. Returns the updated issue information

### Error Handling

The backend properly handles various error scenarios:
- Validates that the assignee field is present
- Handles Sentry API errors (404, 400, etc.)
- Provides meaningful error messages

## Testing

To test the issue assignment functionality:

1. **Unit Tests**: Run the backend tests:
   ```bash
   cd backend
   pytest tests/test_issue_assignment.py
   ```

2. **Manual Testing**: Use the TestAssignIssue component in the frontend:
   ```tsx
   import TestAssignIssue from './components/TestAssignIssue';
   
   // Include in your test page
   <TestAssignIssue />
   ```

3. **API Testing**: Use a tool like curl or Postman:
   ```bash
   curl -X PUT http://localhost:8000/api/v1/issues/1234567/assign \
     -H "Content-Type: application/json" \
     -d '{"assignee": "user@example.com"}'
   ```

## Notes

- The assignee can be specified as either a user ID or email address
- The Sentry API may have rate limits that affect this endpoint
- Assignment changes are immediately reflected in the Sentry UI
- The response includes information about who performed the assignment and when
