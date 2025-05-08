# Error Handling Examples

This document provides practical, ready-to-use examples of common error handling scenarios in the Dexter application.

## Table of Contents

1. [API Error Handling](#api-error-handling)
2. [React Component Error Handling](#react-component-error-handling)
3. [Form Validation Errors](#form-validation-errors)
4. [Authentication Errors](#authentication-errors)
5. [Network Error Recovery](#network-error-recovery)
6. [Data Loading Errors](#data-loading-errors)
7. [Error Dashboard Usage](#error-dashboard-usage)

## API Error Handling

### Example 1: Basic API Error Handling

```typescript
import { apiClient } from '../api/apiClient';
import { showErrorNotification } from '../utils/errorHandling';

async function fetchUserData(userId) {
  try {
    return await apiClient.get(`/users/${userId}`);
  } catch (error) {
    // Error is already enhanced with category, retryable flag, etc.
    showErrorNotification({
      title: 'Failed to Load User',
      message: error.message
    });
    
    // Log for debugging
    console.error('Failed to fetch user data:', error);
    
    // Return null to indicate failure
    return null;
  }
}
```

### Example 2: API Error Handling with Retry

```typescript
import { apiClient } from '../api/apiClient';
import retryManager from '../utils/errorHandling/retryManager';
import { recordAndNotifyError } from '../utils/errorHandling';

async function submitOrder(orderData) {
  try {
    // Use retry manager for important operations
    return await retryManager.execute(
      async () => await apiClient.post('/orders', orderData),
      {
        maxRetries: 3,
        initialDelay: 1000,
        // Only retry server errors and network errors
        retryableCheck: (error) => 
          error.category === 'server_error' || 
          error.category === 'network'
      }
    );
  } catch (error) {
    // Record error and show notification
    recordAndNotifyError(error, {
      source: 'OrderSubmission',
      operation: 'submitOrder',
      metadata: { orderId: orderData.id }
    });
    
    // Re-throw for upstream handling
    throw error;
  }
}
```

### Example 3: Custom Error Handler

```typescript
import { createErrorHandler, ErrorFactory } from '../utils/errorHandling';

// Create a reusable error handler
const handlePaymentError = createErrorHandler('Payment Error', {
  context: {
    service: 'PaymentService'
  },
  showNotification: true,
  logToConsole: true,
  logToSentry: true
});

async function processPayment(paymentData) {
  try {
    const response = await apiClient.post('/payments', paymentData);
    return response;
  } catch (error) {
    // Use custom error handler
    handlePaymentError(error);
    
    // Create enhanced error with specific category
    throw ErrorFactory.create(error, {
      category: 'payment_error',
      metadata: { 
        paymentMethod: paymentData.method,
        amount: paymentData.amount
      }
    });
  }
}
```

## React Component Error Handling

### Example 1: Basic Error Boundary

```tsx
import { withErrorBoundary } from '../utils/errorHandling';
import { ErrorFallback } from '../components/ErrorHandling';

// Component that might throw errors
function UserProfile({ user }) {
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <div>{user.settings.theme}</div> {/* Might throw if settings is null */}
    </div>
  );
}

// Wrap with error boundary
const SafeUserProfile = withErrorBoundary(UserProfile, {
  name: 'UserProfile',
  fallback: ErrorFallback, // Use default fallback
  onError: (error) => {
    console.error('UserProfile error:', error);
  }
});

// Usage
function App() {
  return (
    <div>
      <SafeUserProfile user={user} />
    </div>
  );
}
```

### Example 2: Custom Error Fallback

```tsx
import { withErrorBoundary } from '../utils/errorHandling';

// Component with custom error fallback
const DataGrid = withErrorBoundary(
  ({ data }) => {
    // Component implementation
    return <table>{/* ... */}</table>;
  },
  {
    name: 'DataGrid',
    fallback: ({ error, resetError, componentProps }) => (
      <div className="error-container">
        <h3>Data Grid Error</h3>
        <p>Failed to display data: {error.message}</p>
        <button onClick={resetError}>
          Try Again
        </button>
        <button onClick={() => {
          // Reload data and reset error
          componentProps.onRefresh?.();
          resetError();
        }}>
          Reload Data
        </button>
      </div>
    )
  }
);
```

### Example 3: Error Handling in Hooks

```tsx
import { useErrorHandler } from '../utils/errorHandling';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const { handleError, clearError, error } = useErrorHandler({
    source: 'UserManagement',
    showNotification: true
  });
  
  const loadUsers = async () => {
    try {
      clearError();
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      handleError(err, { operation: 'loadUsers' });
    }
  };
  
  const deleteUser = async (userId) => {
    try {
      clearError();
      await apiClient.delete(`/users/${userId}`);
      // Refresh list
      loadUsers();
    } catch (err) {
      handleError(err, { 
        operation: 'deleteUser',
        metadata: { userId }
      });
      return false;
    }
    return true;
  };
  
  // Component rendering...
}
```

## Form Validation Errors

### Example 1: Form Validation with Error Handling

```tsx
import { useForm } from 'react-hook-form';
import { ErrorFactory, useErrorHandler } from '../utils/errorHandling';

function RegistrationForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { handleError } = useErrorHandler({ source: 'RegistrationForm' });
  
  const onSubmit = async (data) => {
    try {
      // Submit form data
      await apiClient.post('/users/register', data);
      
      // Success handling
      showSuccessNotification({
        title: 'Registration Successful',
        message: 'Your account has been created.'
      });
      
      // Redirect or other success action
    } catch (error) {
      // Check for validation errors from API
      if (error.category === 'validation_error' && error.metadata?.fields) {
        // Set errors for specific fields
        const fieldErrors = error.metadata.fields;
        
        for (const [field, message] of Object.entries(fieldErrors)) {
          setError(field, { type: 'server', message });
        }
      } else {
        // Handle other errors
        handleError(error, { operation: 'register' });
      }
      return false;
    }
    return true;
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Example 2: Field-Level Error Handling

```tsx
import { FormField } from '../components/Form';
import { ErrorFactory } from '../utils/errorHandling';

function PaymentForm() {
  const [fieldErrors, setFieldErrors] = useState({});
  
  const validateCardNumber = (cardNumber) => {
    // Card validation logic
    if (!cardNumber.match(/^\d{16}$/)) {
      return 'Card number must be 16 digits';
    }
    return null;
  };
  
  const handleSubmit = async (data) => {
    // Validate all fields
    const errors = {};
    
    const cardNumberError = validateCardNumber(data.cardNumber);
    if (cardNumberError) {
      errors.cardNumber = cardNumberError;
    }
    
    // More validation...
    
    // If there are errors, show them and stop
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      
      // Create and track validation error
      const validationError = ErrorFactory.create('Validation failed', {
        category: 'validation_error',
        metadata: { fields: errors }
      });
      
      errorAnalytics.recordError(validationError, {
        source: 'PaymentForm'
      });
      
      return false;
    }
    
    // Clear errors and submit
    setFieldErrors({});
    
    // Submit form...
  };
  
  return (
    <form onSubmit={handleFormSubmit}>
      <FormField
        label="Card Number"
        error={fieldErrors.cardNumber}
        /* Other props */
      />
      {/* More fields */}
    </form>
  );
}
```

## Authentication Errors

### Example 1: Handling Token Expiration

```typescript
import { ErrorFactory, recordAndNotifyError } from '../utils/errorHandling';
import authService from '../services/authService';

// API client interceptor
apiClient.getAxiosInstance().interceptors.response.use(
  (response) => response,
  async (error) => {
    // Check if error is due to expired token
    if (error.response?.status === 401 && 
        error.response?.data?.code === 'token_expired') {
      
      try {
        // Try to refresh token
        await authService.refreshToken();
        
        // Retry the original request
        const originalRequest = error.config;
        return apiClient.getAxiosInstance().request(originalRequest);
      } catch (refreshError) {
        // Token refresh failed, force logout
        recordAndNotifyError(
          ErrorFactory.create(refreshError, {
            category: 'auth_error',
            metadata: { reason: 'refresh_failed' }
          }),
          { source: 'AuthInterceptor' }
        );
        
        authService.logout();
        window.location.href = '/login?expired=true';
        
        // Reject with original error
        return Promise.reject(error);
      }
    }
    
    // For other errors, just reject
    return Promise.reject(error);
  }
);
```

### Example 2: Authentication Error Boundary

```tsx
import { withErrorBoundary } from '../utils/errorHandling';
import authService from '../services/authService';

// Authentication error boundary
function AuthErrorFallback({ error, resetError }) {
  const isAuthError = error.category === 'auth_error';
  
  if (!isAuthError) {
    // For non-auth errors, show generic fallback
    return (
      <div>
        <h3>Something went wrong</h3>
        <p>{error.message}</p>
        <button onClick={resetError}>Try Again</button>
      </div>
    );
  }
  
  return (
    <div>
      <h3>Authentication Error</h3>
      <p>Your session has expired or you don't have permission.</p>
      <button onClick={() => {
        authService.logout();
        window.location.href = '/login';
      }}>
        Log In Again
      </button>
    </div>
  );
}

// Wrap the entire authenticated section
const AuthenticatedApp = withErrorBoundary(
  ({ children }) => children,
  {
    name: 'AuthenticatedApp',
    fallback: AuthErrorFallback
  }
);

// Usage
function App() {
  return (
    <div>
      <Header />
      <AuthenticatedApp>
        <Dashboard />
      </AuthenticatedApp>
    </div>
  );
}
```

## Network Error Recovery

### Example 1: Offline Detection and Recovery

```tsx
import { useEffect, useState } from 'react';
import { recordAndNotifyError } from '../utils/errorHandling';

function NetworkAwareComponent() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState([]);
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      // Retry pending operations
      pendingOperations.forEach(operation => {
        operation.retry()
          .then(operation.onSuccess)
          .catch(operation.onError)
          .finally(() => {
            // Remove from pending operations
            setPendingOperations(prev => 
              prev.filter(op => op.id !== operation.id)
            );
          });
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      
      // Show notification
      showInfoNotification({
        title: 'You are offline',
        message: 'Operations will be resumed when connection is restored.'
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingOperations]);
  
  // Function to perform network operation with offline handling
  const performOperation = async (operationFn, options = {}) => {
    try {
      return await operationFn();
    } catch (error) {
      // Check if it's a network error
      if (error.category === 'network' && !navigator.onLine) {
        // Add to pending operations
        const operationId = Date.now().toString();
        
        setPendingOperations(prev => [
          ...prev,
          {
            id: operationId,
            retry: operationFn,
            onSuccess: options.onSuccess || (() => {}),
            onError: options.onError || (() => {}),
            timestamp: Date.now()
          }
        ]);
        
        // Show notification
        showInfoNotification({
          title: 'Operation Queued',
          message: 'This action will be completed when you are back online.'
        });
        
        return { queued: true, operationId };
      }
      
      // For other errors, record and re-throw
      recordAndNotifyError(error, {
        source: options.source || 'NetworkOperation'
      });
      throw error;
    }
  };
  
  // Component rendering...
  return (
    <div>
      {!isOnline && (
        <div className="offline-indicator">
          You are currently offline. Some features may be unavailable.
        </div>
      )}
      
      {pendingOperations.length > 0 && (
        <div className="pending-operations-indicator">
          {pendingOperations.length} operations pending...
        </div>
      )}
      
      {/* Component content */}
    </div>
  );
}
```

### Example 2: Network Error Retry Button

```tsx
import { useCallback, useState } from 'react';
import { RefreshableContainer } from '../components/ErrorHandling';

function DataComponent({ dataId }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.get(`/data/${dataId}`);
      setData(result);
    } catch (error) {
      setError(error);
      // Record error analytics
      errorAnalytics.recordError(error, {
        source: 'DataComponent',
        operation: 'fetchData',
        metadata: { dataId }
      });
    } finally {
      setIsLoading(false);
    }
  }, [dataId]);
  
  // Load data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return (
    <RefreshableContainer
      title="Data View"
      error={error}
      onRefresh={fetchData}
      isLoading={isLoading}
      showRefreshButton
    >
      {data ? (
        <div className="data-content">
          {/* Render data */}
        </div>
      ) : (
        <div className="no-data">No data available</div>
      )}
    </RefreshableContainer>
  );
}
```

## Data Loading Errors

### Example 1: Data Fetching with React Query

```tsx
import { useQuery } from '@tanstack/react-query';
import { withDataFetching } from '../utils/errorHandling';
import { recordAndNotifyError } from '../utils/errorHandling';

// Fetch function with error handling
const fetchIssues = async () => {
  try {
    return await apiClient.get('/issues');
  } catch (error) {
    // Record error
    recordAndNotifyError(error, {
      source: 'IssuesList',
      operation: 'fetchIssues'
    });
    throw error;
  }
};

// Component that expects data
function IssuesList({ issues }) {
  return (
    <div>
      <h2>Issues</h2>
      <ul>
        {issues.map(issue => (
          <li key={issue.id}>{issue.title}</li>
        ))}
      </ul>
    </div>
  );
}

// Enhanced component with data fetching
const IssuesListWithData = () => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery(['issues'], fetchIssues);
  
  // Use HOC for handling loading/error/empty states
  const EnhancedIssuesList = withDataFetching(IssuesList, {
    loadingComponent: <p>Loading issues...</p>,
    errorComponent: ({ error, retry }) => (
      <div>
        <p>Failed to load issues: {error.message}</p>
        <button onClick={retry}>Retry</button>
      </div>
    ),
    emptyComponent: <p>No issues found.</p>
  });
  
  return (
    <EnhancedIssuesList
      issues={data || []}
      isLoading={isLoading}
      error={error}
      isEmpty={!data || data.length === 0}
      retry={refetch}
    />
  );
};
```

### Example 2: Pagination Error Handling

```tsx
import { useState } from 'react';
import { useErrorHandler } from '../utils/errorHandling';

function PaginatedData() {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { error, handleError, clearError } = useErrorHandler({
    source: 'PaginatedData'
  });
  
  const fetchPage = async (pageNum) => {
    setIsLoading(true);
    clearError();
    
    try {
      const result = await apiClient.get('/data', {
        params: { page: pageNum, limit: 10 }
      });
      
      setData(result.data);
      setPage(pageNum);
    } catch (error) {
      handleError(error, {
        operation: 'fetchPage',
        metadata: { page: pageNum }
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      {/* Data display */}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Error display */}
      {error && (
        <div className="error-message">
          <p>{error.message}</p>
          <button onClick={() => fetchPage(page)}>
            Retry
          </button>
        </div>
      )}
      
      {/* Pagination controls */}
      <div className="pagination">
        <button
          disabled={page === 1 || isLoading}
          onClick={() => fetchPage(page - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={isLoading}
          onClick={() => fetchPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

## Error Dashboard Usage

### Example 1: Adding Component to Application

```tsx
import { ErrorDashboard } from '../components/Monitoring';
import { withErrorBoundary } from '../utils/errorHandling';

// Wrap dashboard with error boundary
const SafeErrorDashboard = withErrorBoundary(ErrorDashboard, {
  name: 'ErrorDashboard',
  showDetails: false
});

// Admin route component
function AdminRoutes() {
  return (
    <Routes>
      <Route path="/dashboard" element={<AdminDashboard />} />
      <Route path="/users" element={<UserManagement />} />
      <Route path="/errors" element={<SafeErrorDashboard />} />
    </Routes>
  );
}
```

### Example 2: Custom Error Analytics Integration

```tsx
// In your main App component
import errorAnalytics from '../services/errorAnalyticsService';

function App() {
  // Set up global error handler
  useEffect(() => {
    const handleGlobalError = (event) => {
      // Record unhandled error
      errorAnalytics.recordError(event.error || new Error(event.message), {
        source: 'window.onerror',
        url: window.location.href
      });
      
      // Prevent default handling
      event.preventDefault();
    };
    
    // Listen for unhandled errors
    window.addEventListener('error', handleGlobalError);
    
    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      errorAnalytics.recordError(event.reason, {
        source: 'unhandledrejection',
        url: window.location.href
      });
      
      // Prevent default handling
      event.preventDefault();
    });
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, []);
  
  // Rest of App component...
}
```

### Example 3: Error Reporting Button

```tsx
import errorAnalytics from '../services/errorAnalyticsService';

function ErrorReportingButton() {
  const [isOpen, setIsOpen] = useState(false);
  
  const reportError = (formData) => {
    // Create custom error report
    const reportData = {
      message: formData.description,
      category: 'user_reported',
      source: formData.source,
      metadata: {
        userEmail: formData.email,
        steps: formData.steps,
        browser: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    };
    
    // Record in analytics
    errorAnalytics.recordError(
      new Error(formData.description),
      reportData
    );
    
    // Close form
    setIsOpen(false);
    
    // Show confirmation
    showSuccessNotification({
      title: 'Error Reported',
      message: 'Thank you for your feedback!'
    });
  };
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Report Issue
      </button>
      
      {isOpen && (
        <Modal
          title="Report an Issue"
          onClose={() => setIsOpen(false)}
        >
          <ErrorReportForm onSubmit={reportError} />
        </Modal>
      )}
    </>
  );
}
```

These examples demonstrate the versatility and power of the enhanced error handling system in Dexter. By following these patterns, you can ensure consistent, user-friendly error handling throughout the application.
