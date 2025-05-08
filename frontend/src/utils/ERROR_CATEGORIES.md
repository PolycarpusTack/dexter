# Dexter Error Categories Reference

This document provides a detailed reference for all error categories used in the Dexter application.

## Overview

Dexter uses a structured approach to error categorization to:

1. Provide consistent error handling across the application
2. Enable accurate error reporting and analytics
3. Support automatic retry policies for specific error types
4. Help developers troubleshoot issues more efficiently

## Error Category Taxonomy

### Network Errors

| Category | Description | Retryable | Examples |
|----------|-------------|-----------|----------|
| `network` | General network connectivity issues | Yes | Network disconnection, server unreachable |
| `timeout` | Request timeout errors | Yes | Request exceeded time limit, connection timed out |

### API Errors

| Category | Description | Retryable | Examples |
|----------|-------------|-----------|----------|
| `client_error` | HTTP 4xx client errors | No* | Bad request (400), unauthorized (401), forbidden (403), not found (404) |
| `server_error` | HTTP 5xx server errors | Yes | Internal server error (500), bad gateway (502), service unavailable (503) |

*Exception: 429 (Too Many Requests) errors are retryable with appropriate backoff

### JavaScript Errors

| Category | Description | Retryable | Examples |
|----------|-------------|-----------|----------|
| `type_error` | JavaScript type errors | No | Accessing property of undefined, invalid operand types |
| `syntax_error` | JavaScript syntax errors | No | Invalid JavaScript syntax, unexpected token |
| `reference_error` | JavaScript reference errors | No | Using undefined variable or function |
| `range_error` | Out-of-range values | No | Invalid array length, invalid numeric range |
| `uri_error` | Invalid URI handling | No | Invalid URL encoding or decoding |

### Application-Specific Errors

| Category | Description | Retryable | Examples |
|----------|-------------|-----------|----------|
| `validation_error` | Input validation failures | No | Invalid form data, missing required fields |
| `auth_error` | Authentication and authorization errors | No | Invalid credentials, expired token, insufficient permissions |
| `data_error` | Data-related errors | Sometimes | Invalid data format, corrupted data |
| `config_error` | Configuration errors | No | Missing configuration, invalid configuration |

### Resource Errors

| Category | Description | Retryable | Examples |
|----------|-------------|-----------|----------|
| `memory_error` | Memory-related issues | No | Out of memory, excessive memory usage |
| `storage_error` | Storage-related issues | Sometimes | Local storage quota exceeded, IndexedDB error |
| `quota_error` | Resource quota issues | Yes (with delay) | API rate limits, subscription limits |

### Unclassified Errors

| Category | Description | Retryable | Examples |
|----------|-------------|-----------|----------|
| `unknown` | Unclassified errors | No | Errors that don't fit into other categories |
| `external` | Errors from external services | Depends | Third-party API failures, external widget errors |

## Error Severity Levels

Each error can be assigned a severity level:

| Severity | Description | Examples |
|----------|-------------|----------|
| `critical` | System is unusable, immediate attention required | Database connection failure, authentication service down |
| `high` | Major functionality is affected | Main features unusable, significant data issues |
| `medium` | Important functionality is affected but system is operational | Non-critical feature unavailable, performance degradation |
| `low` | Minor issues that don't affect core functionality | UI glitches, non-essential feature issues |
| `info` | Informational issues, not errors | Deprecation notices, optional feature unavailable |

## Error Properties

Enhanced errors in Dexter include the following properties:

```typescript
interface EnhancedError extends Error {
  // Error classification
  category: ErrorCategory;
  severity?: ErrorSeverity;
  
  // Error recovery
  retryable: boolean;
  retryCount?: number;
  
  // Additional context
  metadata?: Record<string, unknown>;
  originalError?: Error | null;
}
```

## Using Error Categories

### In Code

```typescript
// Creating an error with category
const error = ErrorFactory.create(originalError, {
  category: 'client_error',
  metadata: { operationId: '12345' }
});

// Checking error category
if (error.category === 'network' || error.category === 'timeout') {
  // Handle network-related errors
}

// Creating specific error types
const networkError = ErrorFactory.createNetworkError('Connection failed');
const apiError = ErrorFactory.createApiError('Resource not found', 404);
```

### For Analytics

Error categories are used for analytics and dashboards:

- Grouping similar errors for trend analysis
- Identifying problematic areas of the application
- Tracking error rates by category
- Prioritizing error resolution based on frequency and impact

## Automatic Categorization

The `categorizeError` function automatically categorizes errors based on their properties:

```typescript
const category = categorizeError(error);
```

This function detects:

- Axios error responses and status codes
- Network and timeout error codes
- JavaScript error types
- Custom application error types

## Recommended Actions by Category

| Category | Recommended User Action | Recommended Developer Action |
|----------|-------------------------|------------------------------|
| `network` | Check internet connection, try again later | Check API availability, implement robust offline handling |
| `timeout` | Try again, check internet speed | Review timeout settings, optimize API response times |
| `client_error` | Check input values, verify permissions | Review input validation, improve error messages |
| `server_error` | Try again later | Investigate server logs, fix backend issues |
| `validation_error` | Correct input values | Improve validation UI, clearer instructions |
| `auth_error` | Re-authenticate, check credentials | Review auth flow, improve token refresh |
| `quota_error` | Try again later, upgrade plan | Implement rate limiting, optimize resource usage |

## Error Category Decision Tree

Use this decision tree to determine the appropriate error category:

1. Is it a network connectivity issue?
   - Yes: Is it specifically a timeout?
     - Yes: `timeout`
     - No: `network`
   - No: Continue

2. Is it an HTTP response error?
   - Yes: What's the status code?
     - 4xx: `client_error`
     - 5xx: `server_error`
   - No: Continue

3. Is it a JavaScript built-in error?
   - Yes: What type?
     - TypeError: `type_error`
     - SyntaxError: `syntax_error`
     - ReferenceError: `reference_error`
     - RangeError: `range_error`
     - URIError: `uri_error`
   - No: Continue

4. Is it related to application-specific concerns?
   - Yes: What area?
     - Form validation: `validation_error`
     - Authentication/Authorization: `auth_error`
     - Data handling: `data_error`
     - Configuration: `config_error`
   - No: Continue

5. Is it related to resource limits?
   - Yes: What resource?
     - Memory: `memory_error`
     - Storage: `storage_error`
     - API quotas/limits: `quota_error`
   - No: Continue

6. Is it from an external service?
   - Yes: `external`
   - No: `unknown`

## Integration with Sentry

Error categories are sent to Sentry as tags to enable filtering and analysis:

```typescript
// This happens automatically in logErrorToService
Sentry.setTag('error.category', error.category);
```

Use Sentry to:

- Filter errors by category
- Set up alerts for specific error categories
- Track error rates and trends by category
- Prioritize error resolution based on impact and frequency

## Best Practices

1. **Use specific error categories**: Choose the most specific category that applies to the error.

2. **Include meaningful metadata**: Add context that will help with debugging.

3. **Preserve original errors**: Keep the original error when wrapping with EnhancedError.

4. **Don't mix concerns**: Use different error categories for different concerns, even if they're related.

5. **Be consistent**: Use the same categories across the application for similar errors.

6. **Document custom categories**: Add any custom categories to this document.

## Application-Specific Error Categories

In addition to the standard categories, Dexter defines the following application-specific error categories:

### Sentry Integration Errors

| Category | Description | Examples |
|----------|-------------|----------|
| `sentry_api_error` | Errors when communicating with Sentry API | Authentication failure, resource not found |
| `sentry_data_error` | Errors when processing Sentry data | Invalid event format, missing required fields |

### LLM Integration Errors

| Category | Description | Examples |
|----------|-------------|----------|
| `llm_api_error` | Errors when communicating with LLM service | Ollama service unavailable, response timeout |
| `llm_parsing_error` | Errors when parsing LLM responses | Invalid JSON response, unexpected format |

### Dead Lock Analysis Errors

| Category | Description | Examples |
|----------|-------------|----------|
| `deadlock_parsing_error` | Errors when parsing deadlock information | Invalid deadlock format, missing context |
| `deadlock_visualization_error` | Errors when visualizing deadlocks | Rendering failure, complex graph structure |

## Extending Error Categories

When adding new error categories:

1. Define the category in `errorHandling.ts` by extending the `ErrorCategory` type
2. Add the category to this documentation
3. Update the `categorizeError` function to detect the new category
4. Implement appropriate handling for the new category
