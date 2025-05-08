# Error Categories Reference Guide

This document provides a comprehensive reference of error categories used in the Dexter application. Each category represents a specific type of error with recommended handling strategies.

## Core Error Categories

### network

Errors related to network connectivity issues.

- **Description**: Occurs when the application cannot establish a connection to an API or service due to network issues.
- **Examples**: Connection timeout, DNS resolution failure, offline mode.
- **Default Retryable**: Yes
- **Impact Level**: Medium
- **Handling Strategy**: Implement automatic retries with increasing delay. Show network status indicator.

### timeout

Errors that occur when a request exceeds its time limit.

- **Description**: Occurs when a request takes longer than the specified timeout duration.
- **Examples**: API request timeout, database query timeout.
- **Default Retryable**: Yes
- **Impact Level**: Medium
- **Handling Strategy**: Implement automatic retries with increased timeout. Consider breaking operations into smaller chunks.

### client_error

Errors caused by invalid client requests.

- **Description**: Occurs when the client sends a request that the server cannot fulfill due to client-side issues.
- **Examples**: 400 Bad Request, 404 Not Found, 422 Unprocessable Entity.
- **Default Retryable**: No
- **Impact Level**: Medium
- **Handling Strategy**: Show detailed error message to the user. Provide guidance on how to fix the issue.

### server_error

Errors caused by server-side issues.

- **Description**: Occurs when the server encounters an unexpected condition.
- **Examples**: 500 Internal Server Error, 503 Service Unavailable.
- **Default Retryable**: Yes
- **Impact Level**: High
- **Handling Strategy**: Implement automatic retries with backoff. Alert engineering team.

### validation_error

Errors related to validation failures.

- **Description**: Occurs when input validation fails.
- **Examples**: Invalid email format, required field missing, value out of range.
- **Default Retryable**: No
- **Impact Level**: Medium
- **Handling Strategy**: Show field-specific error messages. Highlight problematic fields.

### auth_error

Errors related to authentication and authorization.

- **Description**: Occurs when a user lacks necessary permissions or authentication fails.
- **Examples**: 401 Unauthorized, 403 Forbidden, invalid token.
- **Default Retryable**: No
- **Impact Level**: High
- **Handling Strategy**: Redirect to login page or show permission error. Refresh token if applicable.

### parsing_error

Errors related to data parsing failures.

- **Description**: Occurs when the application fails to parse or transform data.
- **Examples**: JSON parse error, data format mismatch.
- **Default Retryable**: No
- **Impact Level**: Medium
- **Handling Strategy**: Log detailed parsing information. Provide fallback data if possible.

### unknown

Errors that don't fit into other categories.

- **Description**: Default category for unspecified errors.
- **Examples**: Uncaught exceptions, unexpected errors.
- **Default Retryable**: No
- **Impact Level**: Medium
- **Handling Strategy**: Log detailed error information. Show generic error message.

## Application-Specific Categories

### sentry_api_error

Errors related to Sentry API integration.

- **Description**: Occurs when interacting with the Sentry API.
- **Examples**: API rate limit exceeded, invalid organization slug.
- **Default Retryable**: Depends on status code
- **Impact Level**: Medium to High
- **Handling Strategy**: Implement automatic retries for rate limits. Show specific error messages for known issues.

### llm_api_error

Errors related to language model API integration.

- **Description**: Occurs when interacting with Ollama or other LLM APIs.
- **Examples**: Model not available, generation error, token limit exceeded.
- **Default Retryable**: Yes
- **Impact Level**: Medium
- **Handling Strategy**: Implement automatic retries. Provide simpler fallback when LLM is unavailable.

### deadlock_parsing_error

Errors related to PostgreSQL deadlock analysis.

- **Description**: Occurs when deadlock parsing or analysis fails.
- **Examples**: Invalid deadlock format, incomplete deadlock information.
- **Default Retryable**: No
- **Impact Level**: Medium
- **Handling Strategy**: Show detailed parsing errors. Offer manual analysis option.

### data_error

Errors related to data manipulation or storage.

- **Description**: Occurs when data operations fail.
- **Examples**: LocalStorage full, IndexedDB error.
- **Default Retryable**: No
- **Impact Level**: Medium
- **Handling Strategy**: Show data-specific error messages. Offer data cleanup options.

### render_error

Errors related to UI rendering.

- **Description**: Occurs when a component fails to render.
- **Examples**: Invalid props, missing required data.
- **Default Retryable**: No
- **Impact Level**: Medium
- **Handling Strategy**: Use error boundaries. Show component-specific fallbacks.

### file_error

Errors related to file operations.

- **Description**: Occurs when file operations fail.
- **Examples**: File not found, invalid file format, file too large.
- **Default Retryable**: No
- **Impact Level**: Medium
- **Handling Strategy**: Show file-specific error messages. Provide file requirements guidance.

## Extending Error Categories

To extend error categories, follow these steps:

1. **Define Category**: Add the new category to the `ErrorCategory` type in `errorHandling.ts`.
2. **Update Categorization Logic**: Enhance the `categorizeError` function to identify the new category.
3. **Document Handling**: Update this reference guide with details about the new category.
4. **Implement Handlers**: Create appropriate error handlers for the new category.

Example extension:

```typescript
// In errorHandling.ts
export type ErrorCategory = 
  | 'network'
  | 'timeout'
  // ... existing categories
  | 'my_new_category'; // Add new category

// Update categorization logic
export function categorizeError(error: unknown): ErrorCategory {
  // ... existing categorization logic
  
  // Add new category detection
  if (isMyNewCategoryError(error)) {
    return 'my_new_category';
  }
  
  return 'unknown';
}

// Helper function to detect the new category
function isMyNewCategoryError(error: unknown): boolean {
  // Implement detection logic
  return false;
}
```

## Best Practices

1. **Be Specific**: Choose the most specific category that applies to an error.
2. **Add Context**: Include additional metadata to provide context for the error category.
3. **Consider Impact**: Set appropriate impact levels based on the error's effect on users.
4. **Consistent Handling**: Handle similar categories consistently throughout the application.
5. **User-Friendly Messages**: Translate technical error categories into user-friendly messages.

## Category Impact Levels

Each error category has a default impact level, which determines how the error is presented and prioritized:

- **High Impact**: Errors that directly affect user workflow and require immediate attention.
- **Medium Impact**: Errors that degrade functionality but don't completely block the user.
- **Low Impact**: Minor errors that have minimal impact on user experience.

## Category Retryability

Each error category has a default retryability flag, which determines whether automatic retry should be attempted:

- **Retryable**: Errors that might resolve themselves if retried (e.g., network issues).
- **Non-Retryable**: Errors that won't resolve without changes (e.g., validation errors).

Override these defaults when necessary based on specific error contexts.
