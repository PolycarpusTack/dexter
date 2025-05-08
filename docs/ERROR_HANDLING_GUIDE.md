# Error Handling Quick-Start Guide

This guide provides practical examples for implementing error handling in the Dexter application using the enhanced error handling system.

## Basic Concepts

- **Enhanced Errors**: All errors are enhanced with additional context (category, retryable flag, metadata)
- **Error Categories**: Errors are categorized for consistent handling (network, client_error, server_error, etc.)
- **Automatic Retries**: Transient errors can be automatically retried with configurable strategies
- **Error Boundaries**: UI components can be wrapped with error boundaries to prevent cascading failures
- **Error Analytics**: Errors are tracked and analyzed for patterns and impact

## Common Error Handling Patterns

### 1. API Request Error Handling

Use the enhanced API client for automatic error handling:

```typescript
import { apiClient } from '../api/apiClient';

// Basic usage - errors are automatically enhanced
try {
  const data = await apiClient.get('/endpoint');
  return data;
} catch (error) {
  // Error is already enhanced with category, retryable flag, etc.
  console.error('Operation failed:', error.message);
  throw error; // Re-throw for upstream handling
}

// Custom error handling with context
try {
  const data = await apiClient.post('/endpoint', payload);
  return data;
} catch (error) {
  // Use recordAndNotifyError to show notification and track in analytics
  recordAndNotifyError(error, {
    source: 'ComponentName',
    operation: 'createResource'
  });
  
  // Return fallback data
  return { success: false, error: error.message };
}
```

### 2. React Component Error Handling

Use error boundaries to prevent UI crashes:

```tsx
import { withErrorBoundary } from '../utils/errorHandling';

// Wrap component with error boundary
const SafeComponent = withErrorBoundary(
  ({ data }) => {
    // Component that might throw errors
    return <div>{data.map(item => <Item key={item.id} {...item} />)}</div>;
  },
  {
    name: 'ItemListComponent',
    fallback: ({ error, resetError }) => (
      <div>
        <p>Failed to display items: {error.message}</p>
        <button onClick={resetError}>Try Again</button>
      </div>
    )
  }
);

// Use in your application
function App() {
  return (
    <div>
      <Header />
      <SafeComponent data={items} />
      <Footer />
    </div>
  );
}
```

### 3. Data Fetching with Error States

Use the data fetching HOC for loading/error/empty states:

```tsx
import { withDataFetching } from '../utils/errorHandling';

// Component that expects data
const UserProfile = ({ user }) => (
  <div>
    <h2>{user.name}</h2>
    <p>{user.email}</p>
  </div>
);

// Enhanced component with data fetching states
const UserProfileWithData = withDataFetching(UserProfile, {
  loadingComponent: <p>Loading user profile...</p>,
  errorComponent: ({ error, retry }) => (
    <div>
      <p>Failed to load profile: {error.message}</p>
      <button onClick={retry}>Retry</button>
    </div>
  ),
  emptyComponent: <p>No user profile found.</p>
});

// Use in your application
function App() {
  const { data, isLoading, error, isEmpty } = useQuery(['user', userId], fetchUser);
  
  return (
    <div>
      <UserProfileWithData
        data={data}
        isLoading={isLoading}
        error={error}
        isEmpty={isEmpty}
        retry={() => refetch()}
      />
    </div>
  );
}
```

### 4. Refreshable Containers

Use refreshable containers for content that might fail:

```tsx
import { RefreshableContainer } from '../components/ErrorHandling';

function DataView() {
  const { data, isLoading, error, refetch } = useQuery(['data'], fetchData);
  
  if (isLoading) return <Loader />;
  
  return (
    <RefreshableContainer
      title="Data View"
      error={error}
      onRefresh={refetch}
      showRefreshButton
      isLoading={isLoading}
    >
      {data ? (
        <DataTable data={data} />
      ) : (
        <EmptyState message="No data available" />
      )}
    </RefreshableContainer>
  );
}
```

### 5. Error Hooks in Functional Components

Use the error hook for functional components:

```tsx
import { useErrorHandler } from '../utils/errorHandling';

function DataForm() {
  const { handleError } = useErrorHandler({
    source: 'DataForm',
    showNotification: true
  });
  
  const handleSubmit = async (data) => {
    try {
      await submitData(data);
    } catch (error) {
      // Will show notification and track in analytics
      handleError(error, { operation: 'submitData' });
      return false;
    }
    return true;
  };
  
  return (
    <form onSubmit={handleFormSubmit}>
      {/* Form fields */}
      <button type="submit">Submit</button>
    </form>
  );
}
```

### 6. Custom Error Categories

Create and use custom error categories:

```typescript
import ErrorFactory from '../utils/errorHandling/errorFactory';

// Create error with custom category
const validationError = ErrorFactory.create(originalError, {
  category: 'validation_error',
  metadata: {
    fields: ['email', 'password'],
    details: { email: 'Invalid email format' }
  }
});

// Handle specific error categories
try {
  await performOperation();
} catch (error) {
  if (error.category === 'validation_error') {
    // Handle validation errors
    showFieldErrors(error.metadata.details);
  } else if (error.category === 'auth_error') {
    // Handle authentication errors
    redirectToLogin();
  } else {
    // Handle other errors
    showGenericError(error);
  }
}
```

## Advanced Patterns

### 1. Retry Strategies

Configure custom retry strategies:

```typescript
import retryManager from '../utils/errorHandling/retryManager';

// Execute with custom retry strategy
const result = await retryManager.execute(
  async () => await fetchData(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    backoffFactor: 2,
    jitter: true,
    retryableCheck: (error) => {
      // Custom retry condition
      return error.status >= 500 || error.code === 'ETIMEDOUT';
    }
  }
);

// Create wrapped function with retry
const fetchWithRetry = retryManager.wrapApiFunction(fetchData, {
  maxRetries: 3,
  initialDelay: 1000
});

// Use wrapped function
const data = await fetchWithRetry(id);
```

### 2. Error Analytics Integration

Track and analyze errors:

```typescript
import errorAnalytics from '../services/errorAnalyticsService';
import { withErrorAnalytics } from '../utils/errorHandling';

// Record an error manually
errorAnalytics.recordError(error, {
  source: 'PaymentProcessor',
  userId: currentUser.id,
  metadata: { orderId: order.id }
});

// Execute function with error analytics
const result = await withErrorAnalytics(
  async () => await processPayment(orderId),
  {
    source: 'PaymentProcessor',
    userId: currentUser.id,
    metadata: { orderId }
  }
);

// Get error statistics
const errorsByCategory = errorAnalytics.getErrorCountByCategory();
const errorsByImpact = errorAnalytics.getErrorCountByImpact();
```

### 3. Creating Custom Error Components

Create reusable error handling components:

```tsx
import { useErrorHandler } from '../utils/errorHandling';
import { RefreshableContainer } from '../components/ErrorHandling';

// Custom error-aware component
function ErrorAwareForm({ onSubmit, children }) {
  const [error, setError] = useState(null);
  const { handleError } = useErrorHandler({ source: 'ErrorAwareForm' });
  
  const handleSubmitWithErrorHandling = async (data) => {
    try {
      setError(null);
      await onSubmit(data);
    } catch (error) {
      setError(error);
      handleError(error, { operation: 'formSubmit' });
      return false;
    }
    return true;
  };
  
  return (
    <RefreshableContainer
      error={error}
      onRefresh={() => setError(null)}
      showRefreshButton={!!error}
    >
      {children(handleSubmitWithErrorHandling)}
    </RefreshableContainer>
  );
}

// Usage
function App() {
  return (
    <ErrorAwareForm onSubmit={submitData}>
      {(submit) => (
        <form onSubmit={(e) => {
          e.preventDefault();
          submit(formData);
        }}>
          {/* Form fields */}
          <button type="submit">Submit</button>
        </form>
      )}
    </ErrorAwareForm>
  );
}
```

## Best Practices

1. **Be Consistent**: Use the same error handling patterns throughout the application
2. **Add Context**: Always include relevant context when handling errors
3. **Use Appropriate Categories**: Choose the most specific error category
4. **Provide Fallbacks**: Always provide fallback content or actions when errors occur
5. **User-Friendly Messages**: Translate technical errors into user-friendly messages
6. **Track Critical Errors**: Ensure critical errors are tracked in analytics
7. **Test Error Paths**: Write tests for error scenarios, not just success paths

## Common Pitfalls

1. **Swallowing Errors**: Catching errors without proper handling or logging
2. **Generic Error Messages**: Showing technical error messages to users
3. **Missing Error Boundaries**: Not protecting critical UI components
4. **Incomplete Context**: Not providing enough context for troubleshooting
5. **Inconsistent Handling**: Using different patterns across the application
6. **Excessive Retries**: Retrying non-retryable errors or with inappropriate strategies
7. **Missing Fallbacks**: Not providing alternative content when errors occur

## Further Resources

- [Error Handling Implementation Guide](./ERROR_HANDLING_IMPLEMENTATION.md)
- [Error Categories Reference](./ERROR_CATEGORIES.md)
- [Error Handling Examples](./ERROR_HANDLING_EXAMPLES.md)
