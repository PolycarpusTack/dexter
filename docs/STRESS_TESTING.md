# Stress and Chaos Testing Guide

This document provides guidance for running stress and chaos tests against the Dexter application to evaluate its performance, resilience, and behavior under extreme conditions.

## Overview

The test suite includes:

1. **Stress Tests** - Evaluate system performance under high load
2. **Chaos Tests** - Evaluate system resilience under failure conditions
3. **Edge Case Tests** - Test behavior with unexpected inputs and conditions
4. **Monitoring Dashboard** - Visualize system behavior during testing

## Test Types

### Stress Tests

Stress tests simulate high load on the system to identify performance bottlenecks and capacity limits:

- **Endpoint Stress Tests** - Load test key API endpoints with high request volumes
- **Concurrency Tests** - Test behavior with many concurrent connections
- **Load Ramp-Up Tests** - Gradually increase load to find breaking points
- **Memory Leak Tests** - Detect memory leaks with extended test runs

### Chaos Tests

Chaos tests evaluate system resilience by simulating infrastructure failures:

- **CPU Pressure** - Test behavior under CPU saturation
- **Memory Pressure** - Test behavior when memory is constrained
- **Network Delays** - Test behavior with slow network responses
- **Error Injection** - Test error handling by simulating dependency failures
- **Request Spikes** - Test behavior with sudden traffic spikes

### Edge Case Tests

Edge case tests evaluate system behavior with unusual inputs and conditions:

- **Long-Running Requests** - Test behavior with very slow requests
- **Invalid Inputs** - Test behavior with malformed requests
- **Resource Exhaustion** - Test behavior when resources are depleted
- **Error Cascade** - Test behavior when multiple errors occur simultaneously

## Running Tests

### Prerequisites

- Running Dexter backend instance
- Python 3.10+ with required libraries
- Admin access (for some chaos tests)

### Installation

Install the required dependencies:

```bash
pip install pytest pytest-asyncio aiohttp psutil
```

### Running Stress Tests

```bash
# Run all stress tests
pytest tests/benchmarks/test_stress.py -v

# Run specific test
pytest tests/benchmarks/test_stress.py::test_endpoint_stress -v

# Run with higher verbosity
pytest tests/benchmarks/test_stress.py -vv
```

### Running Chaos Tests

```bash
# Run all chaos tests
pytest tests/benchmarks/test_chaos.py -v

# Run specific test
pytest tests/benchmarks/test_chaos.py::test_high_cpu_load -v
```

### Using the Test Dashboard

1. Start the monitoring stack:
   ```bash
   cd deploy
   ./start-dev-monitoring.sh
   ```

2. Access the test dashboard:
   - Open Grafana at http://localhost:3000
   - Navigate to the "Dexter Testing Dashboard"

3. Run tests while observing the dashboard

## Understanding Test Results

### Stress Test Metrics

- **Request Success Rate** - Percentage of successful requests
- **Response Time** - Min, max, average, and percentile response times
- **Throughput** - Requests per second
- **Resource Usage** - CPU, memory, and disk usage during tests

### Chaos Test Metrics

- **Recovery Time** - Time to recover from induced failures
- **Success Rate** - Success rate before, during, and after chaos
- **Error Rate** - Error rate during chaos events
- **Resource Usage** - Resource utilization during chaos events

## Key Performance Indicators (KPIs)

These are the key metrics to evaluate system performance:

1. **Availability KPIs**
   - Success rate > 99.9% under normal conditions
   - Success rate > 95% under moderate stress
   - Recovery time < 5 seconds after disruptions

2. **Performance KPIs**
   - P95 response time < 500ms for critical endpoints
   - P99 response time < 1000ms for critical endpoints
   - Throughput > 50 requests/second for critical endpoints

3. **Resource Utilization KPIs**
   - CPU usage < 80% under peak load
   - Memory growth < 10% after sustained load
   - No memory leaks after 10,000+ requests

## Common Issues and Solutions

### High Response Times

- **Symptom**: P95 response times > 1 second
- **Possible Causes**: 
  - Database queries not optimized
  - Synchronous operations blocking event loop
  - External service delays
- **Solutions**:
  - Add database indexes
  - Move slow operations to background tasks
  - Implement caching
  - Add timeouts for external calls

### Memory Leaks

- **Symptom**: Memory usage grows continuously
- **Possible Causes**:
  - Cache eviction not working
  - Unclosed connections or resources
  - Large objects held in memory
- **Solutions**:
  - Implement bounded cache with size limits
  - Ensure proper connection closing
  - Add memory profiling

### Low Throughput

- **Symptom**: Requests/second lower than expected
- **Possible Causes**:
  - Network configuration issues
  - Serialization bottlenecks
  - Insufficient worker processes
- **Solutions**:
  - Increase worker processes
  - Optimize serialization
  - Use connection pooling

## Custom Test Scenarios

### Creating New Stress Tests

To create a new stress test:

1. Define the target endpoint and load parameters
2. Use the `stress_test_endpoint` function in `test_stress.py`
3. Customize request patterns and assertions

Example:

```python
@pytest.mark.slow
async def test_custom_endpoint_stress():
    """Custom stress test for specific endpoint."""
    # Configuration
    total_requests = 200
    concurrency = 20
    
    # Run stress test
    stats = await stress_test_endpoint("/api/v1/custom", total_requests, concurrency)
    
    # Assertions
    assert stats.successful_requests / stats.total_requests > 0.95
    assert stats.p95_time < 0.5  # 500ms maximum
```

### Creating New Chaos Tests

To create a new chaos test:

1. Define a chaos function that induces the desired failure
2. Use the `run_chaos_test` function in `test_chaos.py`
3. Customize test parameters and assertions

Example:

```python
@pytest.mark.chaos
async def test_custom_chaos():
    """Custom chaos test."""
    async def custom_chaos_function():
        # Implement chaos behavior
        pass
    
    result = await run_chaos_test(
        test_name="Custom Chaos",
        endpoint="/api/v1/system/health",
        chaos_function=custom_chaos_function,
        chaos_duration=5.0
    )
    
    # Assertions
    assert result.success_rate_after > 90
    assert result.recovery_time_seconds < 3
```

## Continuous Integration

The stress and chaos tests can be integrated into your CI pipeline for automated performance testing:

1. **Nightly Runs**: Schedule stress tests to run nightly
2. **Pre-Release Tests**: Run chaos tests before releases
3. **Regression Detection**: Compare results against historical baselines

Example GitHub Actions workflow:

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 0 * * *'  # Run at midnight daily
  workflow_dispatch:     # Allow manual triggering

jobs:
  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements-dev.txt
      - name: Start application
        run: |
          # Start the application in test mode
          cd backend
          uvicorn app.main:app --port 8000 &
          sleep 5  # Wait for app to start
      - name: Run stress tests
        run: |
          pytest tests/benchmarks/test_stress.py -v
      - name: Run chaos tests
        run: |
          pytest tests/benchmarks/test_chaos.py -v
      - name: Store test results
        uses: actions/upload-artifact@v3
        with:
          name: performance-test-results
          path: performance-report.json
```

## Best Practices

1. **Isolate Test Environment**: Run tests in an isolated environment to avoid affecting production
2. **Start Small**: Begin with low load and gradually increase
3. **Monitor Everything**: Use the testing dashboard to observe all metrics
4. **Automate Testing**: Integrate tests into CI/CD pipelines
5. **Analyze Trends**: Track performance metrics over time
6. **Test Realistic Scenarios**: Model tests after real user behavior
7. **Test Recovery**: Verify the system can recover from failures
8. **Document Findings**: Keep a record of test results and issues