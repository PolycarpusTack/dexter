# Testing Guide for Dexter

This document describes the testing strategy and procedures for the Dexter project.

## Overview

Dexter uses a comprehensive testing approach that includes:

- Unit tests for individual components
- Integration tests for API interactions
- Performance benchmarks
- Frontend component tests
- End-to-end testing

## Test Structure

```
Dexter/
├── backend/
│   └── tests/
│       ├── routers/        # API endpoint tests
│       ├── services/       # Service layer tests
│       ├── integration/    # Integration tests
│       ├── benchmarks/     # Performance tests
│       └── mocks/          # Mock data and responses
│
└── frontend/
    ├── src/
    │   ├── components/__tests__/  # Component tests
    │   ├── api/__tests__/         # API client tests
    │   └── test/                  # Test utilities
    │       └── mocks/             # Mock handlers and data
    └── tests/
        └── utils/                 # Utility tests
```

## Running Tests

### Quick Start

```bash
# Run all tests
./run-tests.sh all

# Run specific test suites
./run-tests.sh backend      # Backend unit tests
./run-tests.sh frontend     # Frontend unit tests
./run-tests.sh integration  # Integration tests
./run-tests.sh benchmarks   # Performance benchmarks
```

### Windows

```powershell
# Run all tests
.\run-tests.ps1 all

# Run specific test suites
.\run-tests.ps1 backend      # Backend unit tests
.\run-tests.ps1 frontend     # Frontend unit tests
.\run-tests.ps1 integration  # Integration tests
.\run-tests.ps1 benchmarks   # Performance benchmarks
```

### Manual Testing

#### Backend Tests

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
pip install pytest pytest-cov pytest-asyncio

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/routers/test_events.py

# Run integration tests
pytest tests/integration/ -m integration

# Run performance benchmarks
pytest tests/benchmarks/ -m slow
```

#### Frontend Tests

```bash
cd frontend
npm install

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test -- EventTable.test.tsx
```

## Test Coverage

### Coverage Requirements

- Backend: 80% minimum coverage
- Frontend: 80% minimum coverage
- Critical paths: 90% minimum coverage

### Viewing Coverage Reports

After running tests with coverage:

- Backend: Open `backend/htmlcov/index.html`
- Frontend: Open `frontend/coverage/lcov-report/index.html`

## Writing Tests

### Backend Test Examples

```python
# Unit test example
@pytest.mark.asyncio
async def test_get_event_success(mock_sentry_service):
    mock_sentry_service.get_event.return_value = MOCK_EVENT
    
    response = client.get("/events/test-event-123")
    
    assert response.status_code == 200
    assert response.json()["id"] == "test-event-123"

# Integration test example
@pytest.mark.integration
@pytest.mark.asyncio
async def test_end_to_end_event_flow(setup_test_data):
    service = SentryService(...)
    
    events = await service.list_events()
    assert len(events) > 0
    
    event = await service.get_event(events[0]["id"])
    assert event["id"] == events[0]["id"]
```

### Frontend Test Examples

```typescript
// Component test example
it('renders event table with data', async () => {
  render(
    <TestWrapper>
      <EventTable />
    </TestWrapper>
  );

  await waitFor(() => {
    expect(screen.getByText('Error in production')).toBeInTheDocument();
  });
});

// API client test example
it('uses cache for GET requests', async () => {
  const cachedData = { id: 1, name: 'Cached' };
  (requestCache.get as any).mockReturnValue(cachedData);

  const result = await client.get('/test');

  expect(result).toEqual(cachedData);
  expect(requestCache.get).toHaveBeenCalled();
});
```

## Mock Data

### Using Mock Sentry Responses

```python
from tests.mocks.sentry_responses import (
    MOCK_EVENT,
    MOCK_ISSUE,
    get_mock_event,
    get_mock_issue
)

# Create custom mock data
mock_event = get_mock_event(event_id="custom-123", level="warning")
```

### Using Frontend Mock Handlers

```typescript
import { handlers, errorHandlers } from '@/test/mocks/handlers';
import { setupServer } from 'msw/node';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Performance Testing

### Backend Performance Tests

```python
@pytest.mark.slow
@pytest.mark.asyncio
async def test_cache_performance(self):
    # Test cache impact on response times
    no_cache_times = []
    cache_times = []
    
    # ... performance test implementation
    
    assert cache_avg < no_cache_avg * 0.5  # At least 50% improvement
```

### Frontend Performance Tests

```typescript
it('renders large datasets efficiently', async () => {
  const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
    ...mockEvents[0],
    id: `event-${i}`
  }));

  const startTime = performance.now();
  render(<EventTable data={largeDataset} />);
  const renderTime = performance.now() - startTime;
  
  expect(renderTime).toBeLessThan(1000); // Should render within 1 second
});
```

## Continuous Integration

Tests are automatically run on:

- Pull requests to main/develop branches
- Pushes to main/develop branches
- Nightly builds

See `.github/workflows/test.yml` for CI configuration.

## Debugging Tests

### Backend Test Debugging

```bash
# Run with verbose output
pytest -v -s

# Run with debugger
pytest --pdb

# Run specific test with debugging
pytest -v -s -k "test_get_event_success"
```

### Frontend Test Debugging

```bash
# Run with debugging
npm test -- --inspect

# Run specific test in debug mode
npm test -- --inspect EventTable.test.tsx

# Use VSCode debugger
# Add breakpoints and use "Debug Test" configuration
```

## Test Best Practices

1. **Keep tests focused**: Each test should verify one behavior
2. **Use descriptive names**: Test names should explain what is being tested
3. **Avoid test interdependence**: Tests should not rely on other tests
4. **Mock external dependencies**: Use mocks for Sentry API, database, etc.
5. **Test error cases**: Include tests for error scenarios
6. **Performance matters**: Include performance benchmarks for critical paths
7. **Clean up after tests**: Ensure tests don't leave side effects

## Troubleshooting

### Common Issues

**Redis not running**
```bash
# Start Redis
redis-server

# Or on Windows
redis-server.exe
```

**Python virtual environment issues**
```bash
# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Frontend dependency issues**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Test timeouts**
- Increase timeout in test configuration
- Check for async operations not being awaited
- Verify mock implementations

## Additional Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [MSW Documentation](https://mswjs.io/)
