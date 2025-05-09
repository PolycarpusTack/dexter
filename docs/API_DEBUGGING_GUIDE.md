# API Debugging Guide

## Recent Changes - Fixing 405 Method Not Allowed Error

A recurring HTTP 405 (Method Not Allowed) error was identified when the application attempted to analyze PostgreSQL deadlocks. The issue was caused by a mismatch between the API paths used in the frontend and the actual endpoint paths defined in the backend.

### Changes Made

1. **Fixed API path construction in enhancedDeadlockApi.ts**:
   - Updated the endpoint paths to match exactly what's defined in the backend
   - Removed the manual prefix construction since the apiClient already has the correct base URL
   - Modified function signatures to remove unnecessary parameters
   - Added detailed console logging to help identify similar issues in the future
   - Updated all API functions to use the correct paths

2. **Added API debugging utilities**:
   - Added new `apiDebugHelper.ts` with functions for detailed API error logging
   - Implemented `logApiError` for comprehensive error reporting
   - Added `testApiEndpoints` utility to verify endpoint accessibility

3. **Updated DeadlockModal component**:
   - Removed unnecessary `apiPath` parameter when calling the analyzeDeadlock function

4. **Fixed Versioning Mismatch**:
   - The backend uses `/api/v1/...` for all endpoints
   - The apiClient is already configured with this base URL
   - Removed redundant path construction that caused the mismatch

### Testing Your Changes

After implementing these changes, you should check if the deadlock analyzer works correctly:

1. Select an event with a PostgreSQL deadlock
2. Open the deadlock analysis modal
3. Verify that no 405 errors appear in the console
4. Check that the deadlock visualization loads properly

If you experience other API-related issues, use the debugging utilities to gather more information:

```typescript
import { logApiError, testApiEndpoints } from '../utils/apiDebugHelper';
import { apiClient } from '../api/apiClient';

// Log a detailed API error
try {
  // API call that might fail
} catch (error) {
  logApiError(error, { context: 'your-operation' });
}

// Test if endpoints are accessible
testApiEndpoints(apiClient);
```

## Common API Issues & Solutions

### HTTP 405 Method Not Allowed

This error occurs when the HTTP method (GET, POST, PUT, etc.) used in the request doesn't match what the server endpoint supports.

**Causes:**
- Using the wrong HTTP method (e.g., using GET when the endpoint expects POST)
- Path mismatch - hitting the wrong endpoint entirely
- API version mismatch (using `/api/` when the server expects `/api/v1/`)
- Middleware blocking the request method

**Solutions:**
- Verify the backend code to see which methods are accepted by each endpoint
- Ensure URL paths in frontend exactly match those defined in the backend
- Check for any middleware that might be restricting HTTP methods
- Confirm the API prefix in `config.js` matches what's expected by the backend

### HTTP 404 Not Found

This error occurs when the requested endpoint doesn't exist.

**Solutions:**
- Double-check the URL path for typos
- Verify that the endpoint is properly registered in the backend
- Check if the API base URL is correctly configured

### HTTP 401 Unauthorized / 403 Forbidden

These errors occur when authentication/authorization fails.

**Solutions:**
- Check if the API requires authentication
- Verify that auth tokens are being sent correctly
- Check user permissions for the specific operation

### CORS Issues

Cross-Origin Resource Sharing errors typically appear as network errors without a status code.

**Solutions:**
- Verify that the backend has CORS configured to allow requests from your frontend
- Check for missing headers like 'Access-Control-Allow-Origin'
- For development, ensure your frontend and backend URLs match what's allowed in CORS configuration

## Advanced Debugging Techniques

### Network Monitoring

Use your browser's Developer Tools (Network tab) to inspect:
- The exact request being sent (URL, method, headers, body)
- The response received (status code, headers, body)
- Timing information

### Backend Logs

When API issues occur, check the backend logs for additional context:
- Look for any error messages related to the failing request
- Check for validation errors or exceptions
- Verify that the request is reaching the backend at all

### API Testing Tools

Consider using dedicated API testing tools for complex issues:
- Postman or Insomnia to manually test endpoints
- cURL commands for command-line testing
- Use the provided `testApiEndpoints` utility in the browser console

## Adding New API Endpoints

When adding new API endpoints, follow these best practices to avoid similar issues:

1. Define a clear naming convention for endpoints
2. Document the endpoint path, method, and parameters
3. Update frontend API client functions to exactly match backend definitions
4. Add comprehensive error handling and logging
5. Test the endpoint with various scenarios before integration

## Specific Path Structure for Dexter

The Dexter API follows this path structure:
- Base URL: `http://localhost:8000` (in development)
- API Prefix: `/api/v1`
- Complete URL example: `http://localhost:8000/api/v1/enhanced-analyzers/analyze-deadlock/{event_id}`

When making API calls in the frontend:
- The `apiClient` already has the base URL and API prefix configured 
- Just use the route path directly, e.g.: `/enhanced-analyzers/analyze-deadlock/${eventId}`
