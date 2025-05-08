# Dexter Error Handling Guide

This guide provides best practices and patterns for error handling in the Dexter application.

## Table of Contents

1. [Introduction](#introduction)
2. [Error Categories](#error-categories)
3. [Error Handling Utilities](#error-handling-utilities)
4. [API Error Handling](#api-error-handling)
5. [UI Component Error Handling](#ui-component-error-handling)
6. [Error Reporting](#error-reporting)
7. [Testing Error Scenarios](#testing-error-scenarios)

## Introduction

Robust error handling is essential for a good user experience and for debugging issues in production. The Dexter application implements a comprehensive error handling system with the following features:

- Structured error objects with additional context
- Error categorization for easier debugging
- Automatic retry mechanism for transient failures
- Error reporting to Sentry
- UI components for consistent error presentation
- Error simulation utilities for testing

## Error Categories

Dexter categorizes errors into the following types:

| Category | Description | Example | Retryable |
|----------|-------------|---------|-----------|
| `network` | Connection-related errors | Unable to reach the API server | Yes |
| `timeout` | Request timeout errors | Request took too long to complete | Yes |
| `client_error` | HTTP 4xx errors | Resource not found (404) | No* |
| `server_error` | HTTP 5xx errors | Internal server error (500) | Yes |
| `type_error` | JavaScript type errors | Accessing property of undefined | No |
| `syntax_error` | JavaScript syntax errors | Invalid JavaScript syntax | No |
| `reference_error` | JavaScript reference errors | Using undefined variable | No |
| `unknown` | Uncategorized errors | Other errors | No |

*Exception: 429 (Too Many Requests) errors are retryable

## Error Handling Utilities

### `errorHandling.ts`

This module provides core utilities for error handling:

```typescript
// Format error messages consistently
const message = formatErrorMessage(error);

// Show error notification to the user
showErrorNotification({
  title: 'Operation Failed',
  error,
  onRetry: () => retryOperation(),
});

// Create reusable error handler
const handleError = createErrorHandler('API Error');
```

### `errorFactory.ts`

This module provides structured error objects:

```typescript
// Create enhanced error with additional context
const enhancedError = ErrorFactory.create(error, {
  category: 'client_error',
  metadata: {
    operationId: '12345',
    component: 'UserProfile'
  }
});

// Create specific error types
const networkError = ErrorFactory.createNetworkError('Connection failed');
const apiError = ErrorFactory.createApiError('Resource not found', 404, { detail: 'User does not exist' });
```

### `retryManager.ts`

This module provides automatic retry capabilities:

```typescript
// Retry a function with exponential backoff
const result = await retryManager.execute(
  () => fetchData(),
  {
    maxRetries: 3,
    initialDelay: 500
  }
);

// Wrap API function with retry capability
const fetchWithRetry = retryManager.wrapApiFunction(fetchData);
```

## API Error Handling

Use the `apiClient` module for all API calls, which includes built-in error handling and retry capabilities:

```typescript
// GET request with automatic retry
const data = await apiClient.get<UserData>('/users/123');

// POST request with custom retry config
const response = await apiClient.post<CreateUserResponse>(
  '/users',
  userData,
  { headers: { 'X-Custom-Header': 'value' } },
  { maxRetries: 2 }
);
```

When implementing a new API client module:

1. Use the `apiClient` module for all requests
2. Wrap errors with `ErrorFactory.create`
3. Add meaningful metadata to errors
4. Use the `handleError` utility to show notifications

Example:

```typescript
// in userApi.ts
export const getUser = async (userId: string): Promise<User> => {
  try {
    return await apiClient.get<User>(`/users/${userId}`);
  } catch (error) {
    // Use our error handler
    handleUserError(error);
    
    // Convert the error to an EnhancedError and rethrow
    throw ErrorFactory.create(error, {
      category: 'client_error',
      metadata: {
        userId
      }
    });
  }
};
```

## UI Component Error Handling

### Error Boundaries

Use error boundaries to catch and handle React rendering errors:

```jsx
// Simple usage
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary
  fallback={<CustomErrorComponent />}
  showDetails={false}
>
  <MyComponent />
</ErrorBoundary>
```

### Higher-Order Components

Use the provided HOCs to add error handling to components:

```jsx
// Wrap component with error boundary
export default withErrorBoundary(MyComponent, {
  name: 'MyComponentErrorBoundary',
  showDetails: false
});

// Handle data fetching states
export default withDataFetching(MyComponent, {
  isEmpty: (data) => !data || data.length === 0,
  loadingProps: {
    loadingMessage: 'Loading users...'
  }
});
```

### Refreshable Container

Use the `RefreshableContainer` component for consistent error handling and refresh capability:

```jsx
<RefreshableContainer
  title="User Information"
  onRefresh={reloadUserData}
  refreshOnMount
>
  <UserProfile data={userData} />
</RefreshableContainer>
```

## Error Reporting

Dexter uses Sentry for error reporting. The `errorTracking.ts` module provides utilities for initializing and using Sentry:

```typescript
// Initialize error tracking
initErrorTracking({
  environment: 'production',
  release: '1.2.0'
});

// Log error to Sentry
logErrorToService(error, {
  source: 'UserProfile',
  userId: '12345',
  operation: 'saveSettings'
});
```

Error reports include:

- Error category and message
- Component stack trace
- User and session information
- Custom context and tags

## Testing Error Scenarios

Use the `errorSimulation.ts` module to test error handling:

```typescript
// Simulate different error types
const networkError = simulateNetworkError();
const timeoutError = simulateTimeoutError();
const apiError = simulateApiError(404, { detail: 'Not found' });
const validationError = simulateValidationError({
  username: 'Username is required',
  email: 'Invalid email format'
});

// Simulate intermittent failures
const unreliableFunction = createIntermittentFailure(
  fetchData,
  'Connection failed',
  30 // 30% failure rate
);

// Simulate throttling
const throttledFunction = createThrottledFunction(
  fetchData,
  5, // 5 calls allowed
  60000 // Reset after 1 minute
);
```

When writing tests:

1. Test both success and error paths
2. Verify that error messages are displayed correctly
3. Test retry logic
4. Verify that errors are reported to Sentry
5. Test error boundary fallbacks

## Examples

### Basic API Call with Error Handling

```typescript
const fetchUserData = async (userId: string) => {
  try {
    return await apiClient.get<User>(`/users/${userId}`);
  } catch (error) {
    // Show error notification
    showErrorNotification({
      title: 'User Data Error',
      error,
      onRetry: () => fetchUserData(userId)
    });
    
    // Rethrow enhanced error
    throw ErrorFactory.create(error, {
      metadata: { userId }
    });
  }
};
```

### React Query with Error Handling

```tsx
const UserProfile = ({ userId }) => {
  const queryClient = useQueryClient();
  const { data, error, isLoading, refetch } = useQuery(
    ['user', userId],
    () => userApi.getUser(userId),
    {
      onError: (error) => {
        // Error is already handled by the API function
        console.error('User query error:', error);
      }
    }
  );
  
  if (isLoading) return <Loading message="Loading user profile..." />;
  
  if (error) {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={refetch} 
      />
    );
  }
  
  return <UserInfo user={data} />;
};

// Or use the HOC
const EnhancedUserProfile = withDataFetching(UserInfo, {
  isEmpty: (data) => !data || Object.keys(data).length === 0,
  loadingProps: {
    loadingMessage: 'Loading user profile...'
  }
});

// Usage
const UserProfileContainer = ({ userId }) => {
  const queryResult = useQuery(['user', userId], () => userApi.getUser(userId));
  
  return <EnhancedUserProfile queryResult={queryResult} />;
};
```

### Form Submission with Error Handling

```tsx
const UserForm = () => {
  const [errors, setErrors] = useState({});
  const form = useForm({
    initialValues: { username: '', email: '' }
  });
  
  const handleSubmit = async (values) => {
    try {
      await userApi.createUser(values);
      showSuccessNotification({
        title: 'Success',
        message: 'User created successfully'
      });
    } catch (error) {
      // Handle validation errors
      if (error.response?.status === 422) {
        handleFormErrors(error, setErrors);
        return;
      }
      
      // Handle other errors
      showErrorNotification({
        title: 'Create User Failed',
        error
      });
    }
  };
  
  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput
        label="Username"
        {...form.getInputProps('username')}
        error={errors.username}
      />
      <TextInput
        label="Email"
        {...form.getInputProps('email')}
        error={errors.email}
      />
      <Button type="submit">Create User</Button>
    </form>
  );
};
```
