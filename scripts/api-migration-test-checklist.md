# API Migration Test Checklist

Use this checklist to verify that the API consolidation hasn't broken any functionality.

## Build Verification

- [ ] Application builds without errors
- [ ] Type checking passes without errors
- [ ] No console errors related to API imports

## Core Functionality Tests

### Error Explanation

- [ ] AI explanation can be requested for errors
- [ ] Explanation is displayed correctly
- [ ] Error handling works when explanation fails

### Issue Management

- [ ] Issues list loads correctly
- [ ] Issue details can be viewed
- [ ] Issue status can be updated
- [ ] Issues can be assigned to users
- [ ] Issue comments can be added
- [ ] Issue tags can be updated

### Event Visualization

- [ ] Event details can be viewed
- [ ] Stack traces are displayed correctly
- [ ] Event timeline is functional
- [ ] User impact visualization works

### Deadlock Analysis

- [ ] Deadlock events are detected
- [ ] Deadlock visualization is displayed
- [ ] Table information is correct
- [ ] Recommendation panel shows suggestions

### Analytics Features

- [ ] Error frequency charts load
- [ ] Analytics filters work correctly
- [ ] Export functionality works

## Error Handling Tests

- [ ] Network errors are handled gracefully
- [ ] Authentication errors show appropriate messages
- [ ] Rate limiting is handled correctly

## Performance Tests

- [ ] Application load time is not degraded
- [ ] API responses are cached appropriately
- [ ] Request deduplication works correctly
- [ ] Retry logic works for flaky requests

## Component-Specific Tests

### ExplainError Component

- [ ] Component renders correctly
- [ ] Explanation can be requested
- [ ] Loading state is displayed
- [ ] Errors are handled properly

### EnhancedEventTable Component

- [ ] Table loads with correct data
- [ ] Filtering works correctly
- [ ] Pagination works
- [ ] Sorting works

### EnhancedEventDetail Component

- [ ] Component renders with event data
- [ ] Status updates work
- [ ] Related events are displayed
- [ ] User context is shown correctly

## Additional Checks

- [ ] Console is free of API-related errors or warnings
- [ ] Network tab shows expected API calls
- [ ] No duplicate API calls for the same resource
- [ ] Memory usage is stable (no memory leaks)

## Regression Tests

- [ ] Any features that previously used the JavaScript API modules continue to work correctly
- [ ] Edge cases (e.g., error scenarios, empty responses) are handled correctly

## Notes for Testers

- Record any issues found during testing
- Note any performance changes (positive or negative)
- Document any unexpected behavior for further investigation
