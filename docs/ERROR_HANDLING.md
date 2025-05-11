# Enhanced Error Handling Framework

## Overview

The Enhanced Error Handling Framework provides a comprehensive solution for error management in the Dexter application. It works alongside the existing error handling system to provide additional features while maintaining backward compatibility.

## Architecture

### Frontend Error Handling

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Sources                             │
│  (API Calls, Component Errors, Network Issues, etc.)        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Error Capture Layer                            │
│  • Error Boundaries (React)                                  │
│  • Try/Catch blocks                                         │
│  • Promise rejection handlers                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Error Processing & Categorization                  │
│  • API Error Handler                                        │
│  • Error Categorization                                     │
│  • Context Enrichment                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Recovery Strategies                            │
│  • Network recovery (wait for connection)                   │
│  • Auth recovery (token refresh)                            │
│  • Retry mechanisms                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              User Notification & Logging                     │
│  • User-friendly error messages                             │
│  • Toast notifications                                      │
│  • Error logging                                            │
└─────────────────────────────────────────────────────────────┘
```

### Backend Error Handling

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Sources                             │
│  (API Endpoints, Database, External Services, etc.)         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Error Middleware                               │
│  • Catches all exceptions                                   │
│  • Standardizes error responses                             │
│  • Adds context information                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Error Processing & Categorization                  │
│  • Error categorization                                     │
│  • Status code determination                                │
│  • Error code assignment                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Response Formatting                            │
│  • Consistent error structure                               │
│  • User-friendly messages                                   │
│  • Debug information (dev only)                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Logging                                   │
│  • Error logging with context                               │
│  • Error metrics collection                                 │
│  • Error history tracking                                   │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. Error Categorization

Errors are automatically categorized into:
- **Network**: Connection issues, timeouts
- **Authentication**: 401/403 errors, token issues
- **Validation**: Input validation errors, 422 status
- **Server**: 500+ errors, internal server issues
- **Not Found**: 404 errors, missing resources
- **Permission**: Access denied, insufficient privileges
- **Unknown**: Uncategorized errors

### 2. Error Recovery Strategies

The framework includes automatic recovery for:
- Network connectivity issues (waits for connection)
- Authentication errors (token refresh attempts)
- Transient failures (exponential backoff retry)

### 3. Error Components

#### EnhancedErrorBoundary
```tsx
<EnhancedErrorBoundary
  fallback={<CustomErrorUI />}
  onError={(error, errorInfo) => console.log(error)}
  resetOnPropsChange
  resetKeys={['userId']}
>
  <YourComponent />
</EnhancedErrorBoundary>
```

#### ApiErrorBoundary
```tsx
<ApiErrorBoundary
  onRetry={() => refetchData()}
  fallback={<CustomApiErrorUI />}
>
  <DataDependentComponent />
</ApiErrorBoundary>
```

#### ErrorRecovery
```tsx
<ErrorRecovery
  error={error}
  onRecover={() => handleRecovery()}
  maxAttempts={3}
  backoffMs={1000}
/>
```

## Usage Examples

### Frontend Usage

#### Basic API Error Handling
```typescript
import { handleApiError, withApiErrorHandling } from '@/utils/apiErrorHandler';

// Wrap API calls
const fetchData = withApiErrorHandling(
  async () => {
    const response = await api.get('/data');
    return response.data;
  },
  {
    silent: false,
    userMessage: 'Failed to load data. Please try again.',
    retryable: true
  }
);

// Manual error handling
try {
  const data = await api.get('/data');
} catch (error) {
  await handleApiError(error, {
    context: { component: 'DataList' },
    userMessage: 'Unable to load data'
  });
}
```

#### Using Error Boundaries
```tsx
import { EnhancedErrorBoundary, ApiErrorBoundary } from '@/components/ErrorBoundary';

function MyApp() {
  return (
    <EnhancedErrorBoundary>
      <ApiErrorBoundary>
        <MyComponent />
      </ApiErrorBoundary>
    </EnhancedErrorBoundary>
  );
}
```

#### Custom Recovery Strategy
```typescript
import { registerErrorRecoveryStrategy } from '@/utils/apiErrorHandler';

registerErrorRecoveryStrategy('custom', {
  shouldAttempt: (error) => error.code === 'CUSTOM_ERROR',
  execute: async (error) => {
    // Custom recovery logic
    await doSomethingSpecial();
  },
  maxAttempts: 2
});
```

### Backend Usage

#### Creating Custom Errors
```python
from app.middleware.error_handler import create_api_error, ErrorCategory, ErrorCode

# Custom API error
raise create_api_error(
    message="Resource not available",
    status_code=503,
    error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
    category=ErrorCategory.SERVER,
    details={"service": "external-api"},
    retryable=True
)

# Use predefined error creators
raise not_found_error("User", user_id)
raise validation_error("email", "Invalid email format")
raise permission_error("delete", "resource")
```

#### Error Responses
All errors return a consistent JSON structure:
```json
{
  "error": {
    "message": "User-friendly error message",
    "code": "error_code",
    "category": "error_category",
    "timestamp": "2024-01-01T00:00:00Z",
    "request_id": "unique-request-id",
    "path": "/api/endpoint",
    "method": "GET",
    "details": {
      "additional": "context"
    }
  }
}
```

## Integration with Existing System

The enhanced error handling works alongside the existing system by:

1. **Extending existing functions**: The `enhancedErrorHandling.ts` file wraps existing error handling functions
2. **Preserving existing interfaces**: All existing error handling APIs remain unchanged
3. **Adding new capabilities**: New features are additive, not replacements

```typescript
// Using enhanced error handling with existing code
import { enhancedErrorHandling } from '@/utils/errorHandling/enhancedErrorHandling';

// Works just like the original, but with enhanced features
const handleError = enhancedErrorHandling.createErrorHandler({
  component: 'MyComponent'
});
```

## Configuration

### Frontend Configuration
```typescript
// Error handler configuration
const errorHandler = ApiErrorHandler.getInstance();

// Register custom recovery strategies
errorHandler.registerRecoveryStrategy('custom', {
  shouldAttempt: (error) => /* logic */,
  execute: async (error) => /* recovery logic */
});

// Configure error logging
Logger.setLogLevel('warn');
Logger.enableErrorReporting(true);
```

### Backend Configuration
```python
# In main.py
app = FastAPI(debug=settings.DEBUG)

# Error handling middleware is automatically configured
# Custom error handlers can be added:
@app.exception_handler(CustomException)
async def custom_exception_handler(request, exc):
    return await error_handler.handle_error(request, exc)
```

## Best Practices

1. **Use Error Boundaries**: Wrap components that might throw errors
2. **Provide Context**: Always add context when handling errors
3. **User-Friendly Messages**: Ensure error messages are helpful to users
4. **Log Everything**: Errors should always be logged for debugging
5. **Implement Recovery**: Add recovery strategies for common errors
6. **Test Error Scenarios**: Write tests for error conditions

## Monitoring and Debugging

### Error Logs
Access error logs through:
- Frontend: `Logger.getLogs()` or `Logger.downloadLogs()`
- Backend: `/api/v1/errors` endpoint

### Error Metrics
Track error patterns:
```typescript
// Frontend
const errorsByCategory = getErrorsByCategory('network');
const recentErrors = getRecentErrors(10);

// Backend
GET /api/v1/errors?category=network&limit=50
```

## Migration Guide

To migrate to the enhanced error handling:

1. **No Breaking Changes**: Existing error handling continues to work
2. **Gradual Adoption**: Add enhanced features as needed
3. **Update Imports**: Use enhanced versions for new features

```typescript
// Old way (still works)
import { createErrorHandler } from '@/utils/errorHandling';

// New way (enhanced features)
import { enhancedErrorHandling } from '@/utils/errorHandling/enhancedErrorHandling';
const handler = enhancedErrorHandling.createErrorHandler();
```

## Future Enhancements

1. **Error Analytics**: Track error patterns and trends
2. **Smart Recovery**: ML-based error recovery suggestions
3. **Error Reporting**: Integration with error tracking services
4. **Performance Impact**: Monitor error handling overhead
5. **A/B Testing**: Test different error UI approaches
