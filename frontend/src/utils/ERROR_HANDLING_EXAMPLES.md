# Dexter Error Handling Examples

This document provides practical examples of error handling patterns in the Dexter application.

## Table of Contents

1. [API Client Usage Examples](#api-client-usage-examples)
2. [React Component Error Handling](#react-component-error-handling)
3. [Form Validation Error Handling](#form-validation-error-handling)
4. [Async Function Error Handling](#async-function-error-handling)
5. [Error Boundary Usage](#error-boundary-usage)
6. [Retry Strategies](#retry-strategies)
7. [Error Reporting Patterns](#error-reporting-patterns)
8. [Testing Error Scenarios](#testing-error-scenarios)

## API Client Usage Examples

### Basic API Request

```typescript
import { apiClient } from '../api/apiClient';
import { showErrorNotification } from '../utils/errorHandling';

// Simple GET request with error handling
async function fetchUserProfile(userId: string) {
  try {
    // apiClient has built-in retry for network errors and server errors
    return await apiClient.get<UserProfile>(`/users/${userId}`);
  } catch (error) {
    // Show error notification to the user
    showErrorNotification({
      title: 'Failed to load user profile',
      error,
      onRetry: () => fetchUserProfile(userId) // Provide retry function
    });
    
    // Re-throw the error for the caller to handle
    throw error;
  }
}

// POST request with custom configuration
async function createUser(userData: UserData) {
  try {
    return await apiClient.post<User>(
      '/users',
      userData,
      {}, // Axios config options (headers, etc.)
      {
        maxRetries: 2, // Custom retry options
        initialDelay: 1000
      }
    );
  } catch (error) {
    showErrorNotification({
      title: 'Failed to create user',
      error
    });
    throw error;
  }
}
```

### Dealing with Expected Error Responses

```typescript
import { apiClient } from '../api/apiClient';
import { showErrorNotification } from '../utils/errorHandling';
import ErrorFactory from '../utils/errorFactory';

async function authenticateUser(credentials: Credentials) {
  try {
    return await apiClient.post<AuthResponse>('/auth/login', credentials);
  } catch (error) {
    // Check for specific error conditions
    if (error.response?.status === 401) {
      // Handle invalid credentials specifically
      showErrorNotification({
        title: 'Authentication Failed',
        message: 'Invalid username or password',
        error
      });
      
      // Create a more specific error
      throw ErrorFactory.create(error, {
        category: 'auth_error',
        metadata: {
          username: credentials.username,
          attemptTime: new Date().toISOString()
        }
      });
    }
    
    // Handle other errors
    showErrorNotification({
      title: 'Authentication Error',
      error
    });
    throw error;
  }
}
```

### Modifying Multiple API Endpoints

```typescript
// userApi.ts
import { apiClient } from './apiClient';
import ErrorFactory from '../utils/errorFactory';
import { createErrorHandler } from '../utils/errorHandling';

// Create a shared error handler for user API endpoints
const handleUserApiError = createErrorHandler('User API Error');

export const getUser = async (userId: string) => {
  try {
    return await apiClient.get<User>(`/users/${userId}`);
  } catch (error) {
    // Log and notify about the error
    handleUserApiError(error);
    
    // Enhance and rethrow
    throw ErrorFactory.create(error, {
      metadata: { userId, operation: 'getUser' }
    });
  }
};

export const updateUser = async (userId: string, userData: Partial<User>) => {
  try {
    return await apiClient.put<User>(`/users/${userId}`, userData);
  } catch (error) {
    // Log and notify about the error
    handleUserApiError(error);
    
    // Enhance and rethrow
    throw ErrorFactory.create(error, {
      metadata: { userId, operation: 'updateUser', updatedFields: Object.keys(userData) }
    });
  }
};
```

## React Component Error Handling

### Function Component with Try/Catch

```tsx
import React, { useState, useEffect } from 'react';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { userApi } from '../../api/userApi';
import { LoadingSpinner, ErrorDisplay } from '../UI';

const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use the error handler hook
  const handleError = useErrorHandler('User Profile Error');
  
  const loadUser = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const userData = await userApi.getUser(userId);
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load user'));
      handleError(err); // This logs to Sentry and shows a notification
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadUser();
  }, [userId]);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadUser} />;
  if (!user) return <div>No user data found</div>;
  
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      {/* More user data */}
    </div>
  );
};

// Wrap with error boundary for additional protection
export default withErrorBoundary(UserProfile, {
  name: 'UserProfileErrorBoundary'
});
```

### Using Higher-Order Components

```tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../../api/userApi';
import { withDataFetching } from '../ErrorHandling/withDataFetching';

// Simple presentational component that expects data
const UserInfo: React.FC<{ data: User }> = ({ data }) => (
  <div>
    <h2>{data.name}</h2>
    <p>{data.email}</p>
    {/* More user data */}
  </div>
);

// Enhanced component with data fetching, loading, error states
const EnhancedUserInfo = withDataFetching<User>(UserInfo, {
  isEmpty: (data) => !data || Object.keys(data).length === 0,
  loadingProps: {
    loadingMessage: 'Loading user profile...',
    skeletonRows: 4
  },
  errorProps: {
    errorMessage: 'Could not load user profile'
  },
  emptyProps: {
    emptyMessage: 'No user data available'
  }
});

// Container component that manages data fetching
const UserProfileContainer: React.FC<{ userId: string }> = ({ userId }) => {
  // TanStack Query handles caching, stale data, and refetching
  const queryResult = useQuery(
    ['user', userId],
    () => userApi.getUser(userId),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry client errors except for 429
        if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
          return false;
        }
        return failureCount < 3;
      }
    }
  );
  
  return <EnhancedUserInfo queryResult={queryResult} />;
};

export default UserProfileContainer;
```

### Using RefreshableContainer

```tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../../api/userApi';
import { RefreshableContainer } from '../ErrorHandling/RefreshableContainer';
import { UserInfoCard } from '../User/UserInfoCard';

const UserDashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const { data, refetch, isLoading, error } = useQuery(
    ['user', userId],
    () => userApi.getUser(userId)
  );
  
  return (
    <RefreshableContainer
      title="User Profile"
      onRefresh={refetch}
      refreshOnMount
    >
      {isLoading ? (
        <div>Loading...</div>
      ) : error ? (
        <div>Error: {error.message}</div>
      ) : data ? (
        <UserInfoCard user={data} />
      ) : (
        <div>No user data available</div>
      )}
    </RefreshableContainer>
  );
};

export default UserDashboard;
```

## Form Validation Error Handling

### Basic Form with Validation Errors

```tsx
import React, { useState } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, Button, Group, Box } from '@mantine/core';
import { userApi } from '../../api/userApi';
import { showSuccessNotification, handleFormErrors } from '../../utils/errorHandling';

const UserForm: React.FC = () => {
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  
  const form = useForm({
    initialValues: {
      username: '',
      email: '',
      password: ''
    },
    validate: {
      username: (value) => (!value ? 'Username is required' : null),
      email: (value) => (!/^\S+@\S+$/.test(value) ? 'Invalid email' : null),
      password: (value) => (value.length < 8 ? 'Password must be at least 8 characters' : null)
    }
  });
  
  const handleSubmit = async (values: typeof form.values) => {
    try {
      // Clear previous server errors
      setServerErrors({});
      
      // Submit the form
      await userApi.createUser(values);
      
      // Show success notification
      showSuccessNotification({
        title: 'User Created',
        message: 'User has been created successfully'
      });
      
      // Reset the form
      form.reset();
    } catch (error) {
      // Handle form validation errors from the server
      handleFormErrors(error, setServerErrors);
    }
  };
  
  return (
    <Box mx="auto" p="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          label="Username"
          {...form.getInputProps('username')}
          error={form.errors.username || serverErrors.username}
          mb="md"
        />
        
        <TextInput
          label="Email"
          {...form.getInputProps('email')}
          error={form.errors.email || serverErrors.email}
          mb="md"
        />
        
        <TextInput
          label="Password"
          type="password"
          {...form.getInputProps('password')}
          error={form.errors.password || serverErrors.password}
          mb="md"
        />
        
        {/* Display general form error if any */}
        {serverErrors.general && (
          <Alert color="red" mb="md">
            {serverErrors.general}
          </Alert>
        )}
        
        <Group position="right">
          <Button type="submit">Create User</Button>
        </Group>
      </form>
    </Box>
  );
};

export default UserForm;
```

### Complex Form with Advanced Error Handling

```tsx
import React, { useState } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, Button, Group, Box, Alert, Tabs } from '@mantine/core';
import { userApi } from '../../api/userApi';
import { showSuccessNotification, showErrorNotification } from '../../utils/errorHandling';
import ErrorFactory from '../../utils/errorFactory';

const UserRegistrationForm: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  
  const form = useForm({
    initialValues: {
      // Basic info
      username: '',
      email: '',
      password: '',
      
      // Profile info
      fullName: '',
      bio: '',
      
      // Preferences
      receiveEmails: true,
      theme: 'light'
    },
    validate: {
      username: (value) => (!value ? 'Username is required' : null),
      email: (value) => (!/^\S+@\S+$/.test(value) ? 'Invalid email' : null),
      password: (value) => (value.length < 8 ? 'Password must be at least 8 characters' : null)
    }
  });
  
  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    setServerErrors({});
    
    try {
      // Step 1: Validate user doesn't exist
      try {
        await userApi.checkUserExists(values.username, values.email);
      } catch (error) {
        // Process validation errors
        if (error.response?.status === 422) {
          const data = error.response.data;
          const errors: Record<string, string> = {};
          
          if (data.username) errors.username = data.username;
          if (data.email) errors.email = data.email;
          
          setServerErrors(errors);
          setActiveTab('basic'); // Switch to the tab with errors
          
          // Create enhanced error
          throw ErrorFactory.create(error, {
            category: 'validation_error',
            metadata: {
              fields: Object.keys(errors),
              formStep: 'userCheck'
            }
          });
        }
        throw error; // Re-throw other errors
      }
      
      // Step 2: Create the user
      await userApi.createUser(values);
      
      // Show success notification
      showSuccessNotification({
        title: 'Registration Complete',
        message: 'Your account has been created successfully',
        onAction: () => window.location.href = '/login',
        actionLabel: 'Go to Login'
      });
      
      // Reset the form
      form.reset();
    } catch (error) {
      // Don't show notification for validation errors (already handled)
      if (error.category !== 'validation_error') {
        showErrorNotification({
          title: 'Registration Failed',
          error,
          message: 'We could not complete your registration. Please try again.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Box mx="auto" p="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Tabs value={activeTab} onTabChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="basic">Basic Info</Tabs.Tab>
            <Tabs.Tab value="profile">Profile</Tabs.Tab>
            <Tabs.Tab value="preferences">Preferences</Tabs.Tab>
          </Tabs.List>
          
          <Tabs.Panel value="basic" p="xs">
            <TextInput
              label="Username"
              {...form.getInputProps('username')}
              error={form.errors.username || serverErrors.username}
              mb="md"
            />
            
            <TextInput
              label="Email"
              {...form.getInputProps('email')}
              error={form.errors.email || serverErrors.email}
              mb="md"
            />
            
            <TextInput
              label="Password"
              type="password"
              {...form.getInputProps('password')}
              error={form.errors.password || serverErrors.password}
              mb="md"
            />
          </Tabs.Panel>
          
          <Tabs.Panel value="profile" p="xs">
            {/* Profile fields */}
          </Tabs.Panel>
          
          <Tabs.Panel value="preferences" p="xs">
            {/* Preference fields */}
          </Tabs.Panel>
        </Tabs>
        
        {/* Display general form error if any */}
        {serverErrors.general && (
          <Alert color="red" mb="md">
            {serverErrors.general}
          </Alert>
        )}
        
        <Group position="right" mt="md">
          {activeTab !== 'basic' && (
            <Button 
              variant="outline" 
              onClick={() => setActiveTab(activeTab === 'profile' ? 'basic' : 'profile')}
            >
              Back
            </Button>
          )}
          
          {activeTab !== 'preferences' ? (
            <Button 
              onClick={() => {
                // Validate current tab fields before proceeding
                const fieldErrors = activeTab === 'basic' 
                  ? form.validateField('username') || form.validateField('email') || form.validateField('password')
                  : null;
                
                if (!fieldErrors) {
                  setActiveTab(activeTab === 'basic' ? 'profile' : 'preferences');
                }
              }}
            >
              Next
            </Button>
          ) : (
            <Button type="submit" loading={isSubmitting}>
              Complete Registration
            </Button>
          )}
        </Group>
      </form>
    </Box>
  );
};

export default UserRegistrationForm;
```

## Async Function Error Handling

### Simple Async Function

```typescript
import { showErrorNotification } from '../utils/errorHandling';
import ErrorFactory from '../utils/errorFactory';

async function fetchData(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    // Log and notify
    console.error('Fetch error:', error);
    
    showErrorNotification({
      title: 'Data Fetch Error',
      error,
      onRetry: () => fetchData(url)
    });
    
    // Enhance and rethrow
    throw ErrorFactory.create(error, {
      category: 'network',
      metadata: { url }
    });
  }
}
```

### Multiple Sequential Async Operations

```typescript
import { showErrorNotification } from '../utils/errorHandling';
import ErrorFactory from '../utils/errorFactory';

async function processUserData(userId: string): Promise<ProcessedData> {
  try {
    // Step 1: Fetch user data
    const userData = await userApi.getUser(userId);
    
    // Step 2: Fetch user's posts
    const userPosts = await postsApi.getUserPosts(userId);
    
    // Step 3: Process the data
    const processedData = await dataProcessor.process(userData, userPosts);
    
    return processedData;
  } catch (error) {
    // Determine which operation failed
    let operationName = 'unknown';
    let enhancedCategory = 'unknown';
    
    if (error.metadata?.operation === 'getUser') {
      operationName = 'Fetching user data';
      enhancedCategory = 'user_api_error';
    } else if (error.metadata?.operation === 'getUserPosts') {
      operationName = 'Fetching user posts';
      enhancedCategory = 'posts_api_error';
    } else if (error.metadata?.operation === 'processData') {
      operationName = 'Processing data';
      enhancedCategory = 'processing_error';
    }
    
    // Show appropriate error notification
    showErrorNotification({
      title: `${operationName} failed`,
      error,
      onRetry: () => processUserData(userId)
    });
    
    // Enhance the error with operation context
    throw ErrorFactory.create(error, {
      category: enhancedCategory,
      metadata: {
        userId,
        operation: 'processUserData',
        subOperation: operationName
      }
    });
  }
}
```

### Parallel Async Operations

```typescript
import { showErrorNotification } from '../utils/errorHandling';
import ErrorFactory from '../utils/errorFactory';

async function loadDashboardData(userId: string): Promise<DashboardData> {
  try {
    // Run multiple API calls in parallel
    const [userData, userStats, notifications] = await Promise.all([
      userApi.getUser(userId),
      statsApi.getUserStats(userId),
      notificationApi.getUserNotifications(userId)
    ]);
    
    // Combine the results
    return {
      user: userData,
      stats: userStats,
      notifications
    };
  } catch (error) {
    // Determine which promise failed
    let failedOperation = 'Unknown operation';
    
    if (error.metadata?.operation === 'getUser') {
      failedOperation = 'User profile';
    } else if (error.metadata?.operation === 'getUserStats') {
      failedOperation = 'User statistics';
    } else if (error.metadata?.operation === 'getUserNotifications') {
      failedOperation = 'Notifications';
    }
    
    showErrorNotification({
      title: 'Dashboard Load Error',
      message: `Failed to load dashboard data: ${failedOperation} could not be retrieved.`,
      error,
      onRetry: () => loadDashboardData(userId)
    });
    
    // Enhance and rethrow
    throw ErrorFactory.create(error, {
      metadata: {
        userId,
        operation: 'loadDashboardData',
        failedOperation
      }
    });
  }
}
```

## Error Boundary Usage

### Basic Error Boundary

```tsx
import React from 'react';
import { ErrorBoundary } from '../../components/ErrorHandling/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <MainLayout />
    </ErrorBoundary>
  );
};

export default App;
```

### Nested Error Boundaries

```tsx
import React from 'react';
import { ErrorBoundary } from '../../components/ErrorHandling/ErrorBoundary';

const Dashboard: React.FC = () => {
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* App-wide error boundary */}
      <ErrorBoundary>
        <div className="dashboard-layout">
          {/* Sidebar with its own error boundary */}
          <ErrorBoundary
            name="SidebarErrorBoundary"
            fallback={<div className="sidebar-fallback">Sidebar unavailable</div>}
          >
            <Sidebar />
          </ErrorBoundary>
          
          <div className="main-content">
            {/* Each widget has its own error boundary */}
            <ErrorBoundary
              name="StatsWidgetErrorBoundary"
              fallback={<div className="widget-fallback">Stats unavailable</div>}
            >
              <StatsWidget />
            </ErrorBoundary>
            
            <ErrorBoundary
              name="ChartWidgetErrorBoundary"
              fallback={<div className="widget-fallback">Chart unavailable</div>}
            >
              <ChartWidget />
            </ErrorBoundary>
            
            <ErrorBoundary
              name="ActivityWidgetErrorBoundary"
              fallback={<div className="widget-fallback">Activity feed unavailable</div>}
            >
              <ActivityWidget />
            </ErrorBoundary>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default Dashboard;
```

### Error Boundary with Custom Fallback

```tsx
import React from 'react';
import { ErrorBoundary } from '../../components/ErrorHandling/ErrorBoundary';
import { Button, Text, Group, Stack, Icon } from '@mantine/core';
import { IconRefresh, IconBug, IconAlertCircle } from '@tabler/icons-react';

// Custom fallback component
const CustomErrorFallback: React.FC<{
  error: Error;
  errorInfo: React.ErrorInfo;
  reset: () => void;
  errorId: string;
}> = ({ error, errorInfo, reset, errorId }) => {
  const isNetworkError = error.message.includes('network') || error.message.includes('connection');
  
  return (
    <Stack p="md" spacing="md" align="center">
      <Icon
        component={isNetworkError ? IconWifiOff : IconBug}
        size={48}
        color="red"
      />
      
      <Text size="xl" weight={700}>
        {isNetworkError ? 'Connection Error' : 'Something went wrong'}
      </Text>
      
      <Text size="md">
        {isNetworkError
          ? 'We could not connect to the server. Please check your internet connection.'
          : 'An unexpected error occurred while loading this component.'}
      </Text>
      
      <Text size="sm" color="dimmed">
        Error ID: {errorId}
      </Text>
      
      <Group>
        <Button
          leftIcon={<IconRefresh size={16} />}
          onClick={reset}
          color="blue"
        >
          Try Again
        </Button>
        
        <Button
          variant="outline"
          leftIcon={<IconAlertCircle size={16} />}
          component="a"
          href={`/support?errorId=${errorId}`}
        >
          Get Help
        </Button>
      </Group>
    </Stack>
  );
};

const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  return (
    <ErrorBoundary
      name="UserProfileErrorBoundary"
      fallback={CustomErrorFallback}
    >
      <UserProfileContent userId={userId} />
    </ErrorBoundary>
  );
};

export default UserProfile;
```

## Retry Strategies

### Basic Retry

```typescript
import retryManager from '../utils/retryManager';

async function fetchWithRetry(url: string) {
  return retryManager.execute(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return response.json();
    },
    {
      maxRetries: 3,
      initialDelay: 1000
    }
  );
}
```

### Conditional Retry Based on Error Type

```typescript
import retryManager from '../utils/retryManager';
import ErrorFactory from '../utils/errorFactory';

async function authenticateWithRetry(credentials: Credentials) {
  return retryManager.execute(
    async () => {
      try {
        return await authApi.login(credentials);
      } catch (error) {
        // Don't retry authentication failures (invalid credentials)
        if (error.response?.status === 401) {
          throw ErrorFactory.create(error, {
            category: 'auth_error',
            retryable: false // Explicitly mark as non-retryable
          });
        }
        
        // Rethrow other errors (will be retried based on type)
        throw error;
      }
    },
    {
      // Custom retry check function
      retryableCheck: (error) => {
        // Never retry auth errors
        if (error.category === 'auth_error') return false;
        
        // Always retry network errors
        if (error.category === 'network' || error.category === 'timeout') return true;
        
        // Retry server errors
        if (error.response?.status >= 500) return true;
        
        // Default to non-retryable
        return false;
      }
    }
  );
}
```

### Retry with Exponential Backoff and Jitter

```typescript
import { RetryManager } from '../utils/retryManager';

// Create custom retry manager with specific configuration
const customRetryManager = new RetryManager({
  maxRetries: 5,
  initialDelay: 200,   // Start with 200ms delay
  maxDelay: 30000,     // Cap at 30 seconds
  backoffFactor: 2.5,  // Aggressive backoff
  jitter: true         // Add randomness to prevent thundering herd
});

async function uploadFileWithRetry(file: File) {
  return customRetryManager.execute(
    async () => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      return response.json();
    }
  );
}
```

### Retry with Circuit Breaker

```typescript
// Simple circuit breaker implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private open = false;
  
  constructor(
    private threshold = 5,
    private resetTimeoutMs = 60000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.open) {
      const now = Date.now();
      const timeElapsed = now - this.lastFailureTime;
      
      // If enough time has passed, allow a test request
      if (timeElapsed > this.resetTimeoutMs) {
        this.open = false;
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      // Reset failures on success
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      // Open the circuit if threshold is reached
      if (this.failures >= this.threshold) {
        this.open = true;
      }
      
      throw error;
    }
  }
}

// Combine circuit breaker with retry
const circuitBreaker = new CircuitBreaker(5, 60000);
const retryWithCircuitBreaker = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await circuitBreaker.execute(() => {
      return retryManager.execute(fn, {
        maxRetries: 3
      });
    });
  } catch (error) {
    if (error.message === 'Circuit breaker is open') {
      // Handle circuit open state
      showErrorNotification({
        title: 'Service Unavailable',
        message: 'The service is currently unavailable. Please try again later.'
      });
    }
    throw error;
  }
};
```

## Error Reporting Patterns

### Basic Error Reporting

```typescript
import { logErrorToService } from '../utils/errorTracking';

try {
  // Some operation that might fail
  await riskyOperation();
} catch (error) {
  // Log to error tracking service
  logErrorToService(error, {
    source: 'risky_operation',
    additionalContext: {
      user: currentUser.id
    }
  });
  
  // Handle the error (show notification, etc.)
}
```

### Structured Error Reporting

```typescript
import { logErrorToService } from '../utils/errorTracking';
import ErrorFactory from '../utils/errorFactory';

try {
  await processPayment(paymentDetails);
} catch (error) {
  // Create enhanced error with structured metadata
  const enhancedError = ErrorFactory.create(error, {
    category: 'payment_error',
    metadata: {
      paymentMethod: paymentDetails.method,
      amount: paymentDetails.amount,
      currency: paymentDetails.currency,
      operation: 'processPayment'
    }
  });
  
  // Log the enhanced error
  logErrorToService(enhancedError);
  
  // Handle the error
  showErrorNotification({
    title: 'Payment Failed',
    error: enhancedError
  });
}
```

### Breadcrumb Tracking

```typescript
import * as Sentry from '@sentry/react';

function complexOperation() {
  try {
    // Add breadcrumb for the operation start
    Sentry.addBreadcrumb({
      category: 'operation',
      message: 'Starting complex operation',
      level: 'info'
    });
    
    // Step 1
    const result1 = step1();
    Sentry.addBreadcrumb({
      category: 'operation',
      message: 'Step 1 completed',
      data: { result: typeof result1 },
      level: 'info'
    });
    
    // Step 2
    const result2 = step2(result1);
    Sentry.addBreadcrumb({
      category: 'operation',
      message: 'Step 2 completed',
      data: { result: typeof result2 },
      level: 'info'
    });
    
    // Step 3 (might fail)
    try {
      const result3 = step3(result2);
      Sentry.addBreadcrumb({
        category: 'operation',
        message: 'Step 3 completed',
        level: 'info'
      });
      
      return result3;
    } catch (error) {
      Sentry.addBreadcrumb({
        category: 'operation',
        message: 'Step 3 failed',
        data: { error: error.message },
        level: 'error'
      });
      throw error;
    }
  } catch (error) {
    // Capture exception with breadcrumbs
    Sentry.captureException(error);
    throw error;
  }
}
```

## Testing Error Scenarios

### Testing API Error Handling

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { showErrorNotification } from '../utils/errorHandling';
import { userApi } from '../api/userApi';
import { simulateApiError } from '../utils/errorSimulation';

// Mock dependencies
vi.mock('../utils/errorHandling', () => ({
  showErrorNotification: vi.fn()
}));

vi.mock('../api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

describe('userApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('getUser', () => {
    it('should handle 404 errors correctly', async () => {
      // Simulate a 404 API error
      const error = simulateApiError(404, { detail: 'User not found' });
      apiClient.get.mockRejectedValueOnce(error);
      
      // Call the function and expect it to throw
      await expect(userApi.getUser('123')).rejects.toThrow();
      
      // Verify error notification was shown
      expect(showErrorNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'User API Error',
          error: expect.any(Object)
        })
      );
    });
    
    it('should handle network errors correctly', async () => {
      // Simulate a network error
      const error = simulateNetworkError('Connection failed');
      apiClient.get.mockRejectedValueOnce(error);
      
      // Call the function and expect it to throw
      await expect(userApi.getUser('123')).rejects.toThrow();
      
      // Verify error notification was shown
      expect(showErrorNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'User API Error',
          error: expect.any(Object),
          onRetry: expect.any(Function) // Should have retry function
        })
      );
    });
  });
});
```

### Testing Component Error Handling

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { userApi } from '../../api/userApi';
import UserProfile from './UserProfile';
import { simulateApiError, simulateNetworkError } from '../../utils/errorSimulation';

// Mock API functions
vi.mock('../../api/userApi', () => ({
  userApi: {
    getUser: vi.fn()
  }
}));

describe('UserProfile', () => {
  // Create a new Query Client for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false // Disable retries for testing
      }
    }
  });
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders loading state initially', () => {
    // Mock the API call to never resolve during this test
    userApi.getUser.mockImplementation(() => new Promise(() => {}));
    
    render(
      <QueryClientProvider client={queryClient}>
        <UserProfile userId="123" />
      </QueryClientProvider>
    );
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
  
  it('renders error state when API fails with 404', async () => {
    // Mock the API call to fail with 404
    userApi.getUser.mockRejectedValueOnce(
      simulateApiError(404, { detail: 'User not found' })
    );
    
    render(
      <QueryClientProvider client={queryClient}>
        <UserProfile userId="123" />
      </QueryClientProvider>
    );
    
    // Wait for error state to render
    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
    
    // Verify retry button is present
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
  
  it('renders network error state appropriately', async () => {
    // Mock the API call to fail with network error
    userApi.getUser.mockRejectedValueOnce(
      simulateNetworkError('Failed to fetch')
    );
    
    render(
      <QueryClientProvider client={queryClient}>
        <UserProfile userId="123" />
      </QueryClientProvider>
    );
    
    // Wait for error state to render
    await waitFor(() => {
      expect(screen.getByText(/connection/i)).toBeInTheDocument();
    });
  });
});
```

### Testing Retry Logic

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RetryManager } from '../utils/retryManager';
import { simulateNetworkError } from '../utils/errorSimulation';

describe('RetryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Use fake timers to control setTimeout
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('should retry the specified number of times', async () => {
    const mockFn = vi.fn();
    const error = simulateNetworkError('Connection failed');
    
    // First 3 calls fail, 4th succeeds
    mockFn
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');
    
    const retryManager = new RetryManager({
      maxRetries: 3,
      initialDelay: 100,
      jitter: false // Disable jitter for predictable tests
    });
    
    const promise = retryManager.execute(mockFn);
    
    // First call happens immediately
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    // Advance timer to trigger first retry
    await vi.advanceTimersByTimeAsync(100);
    expect(mockFn).toHaveBeenCalledTimes(2);
    
    // Advance timer to trigger second retry
    await vi.advanceTimersByTimeAsync(200); // 100ms * 2^1
    expect(mockFn).toHaveBeenCalledTimes(3);
    
    // Advance timer to trigger third retry
    await vi.advanceTimersByTimeAsync(400); // 100ms * 2^2
    expect(mockFn).toHaveBeenCalledTimes(4);
    
    // Verify final result
    const result = await promise;
    expect(result).toBe('success');
  });
  
  it('should stop retrying after maxRetries and throw enhanced error', async () => {
    const mockFn = vi.fn();
    const error = simulateNetworkError('Connection failed');
    
    // All calls fail
    mockFn.mockRejectedValue(error);
    
    const retryManager = new RetryManager({
      maxRetries: 2,
      initialDelay: 100,
      jitter: false
    });
    
    const promise = retryManager.execute(mockFn);
    
    // Advance timers for all retries
    await vi.advanceTimersByTimeAsync(100); // First retry
    await vi.advanceTimersByTimeAsync(200); // Second retry
    
    // Verify the function was called 3 times (initial + 2 retries)
    expect(mockFn).toHaveBeenCalledTimes(3);
    
    // Verify the error is enhanced and contains retry information
    await expect(promise).rejects.toMatchObject({
      message: 'Connection failed',
      retryCount: 2,
      metadata: expect.objectContaining({
        retryAttempts: 2,
        maxRetries: 2
      })
    });
  });
});
```
