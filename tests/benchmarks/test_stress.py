"""
Stress tests for backend API performance.

These tests are designed to simulate high load on the API and monitor
metrics during stress conditions. The tests use concurrent requests
and measure response times, error rates, and resource usage.
"""
import time
import asyncio
import aiohttp
import pytest
import math
import random
import statistics
from typing import List, Dict, Any, Tuple
import psutil
import logging
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Base URL for API
BASE_URL = "http://localhost:8000"

@dataclass
class RequestStats:
    """Statistics for a set of API requests."""
    endpoint: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    status_codes: Dict[int, int]
    min_time: float
    max_time: float
    avg_time: float
    p50_time: float
    p90_time: float
    p99_time: float
    
    @classmethod
    def from_response_times(cls, endpoint: str, response_times: List[Tuple[float, int]]) -> 'RequestStats':
        """Create RequestStats from a list of response times and status codes."""
        if not response_times:
            return cls(
                endpoint=endpoint,
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                status_codes={},
                min_time=0,
                max_time=0,
                avg_time=0,
                p50_time=0,
                p90_time=0,
                p99_time=0
            )
            
        # Extract times and status codes
        times = [t for t, _ in response_times]
        status_codes = {}
        for _, status in response_times:
            status_codes[status] = status_codes.get(status, 0) + 1
            
        # Calculate statistics
        sorted_times = sorted(times)
        p50_idx = math.floor(len(sorted_times) * 0.5)
        p90_idx = math.floor(len(sorted_times) * 0.9)
        p99_idx = math.floor(len(sorted_times) * 0.99)
        
        successful = sum(1 for _, status in response_times if 200 <= status < 300)
        failed = sum(1 for _, status in response_times if status >= 400)
        
        return cls(
            endpoint=endpoint,
            total_requests=len(response_times),
            successful_requests=successful,
            failed_requests=failed,
            status_codes=status_codes,
            min_time=min(times),
            max_time=max(times),
            avg_time=sum(times) / len(times),
            p50_time=sorted_times[p50_idx],
            p90_time=sorted_times[p90_idx],
            p99_time=sorted_times[p99_idx]
        )
        
    def __str__(self) -> str:
        """String representation of request stats."""
        success_rate = (self.successful_requests / self.total_requests * 100) if self.total_requests > 0 else 0
        return (
            f"Endpoint: {self.endpoint}\n"
            f"Total: {self.total_requests}, Success: {self.successful_requests} ({success_rate:.1f}%), "
            f"Failed: {self.failed_requests}\n"
            f"Status Codes: {self.status_codes}\n"
            f"Response Times - Min: {self.min_time*1000:.1f}ms, Avg: {self.avg_time*1000:.1f}ms, "
            f"Max: {self.max_time*1000:.1f}ms\n"
            f"Percentiles - P50: {self.p50_time*1000:.1f}ms, P90: {self.p90_time*1000:.1f}ms, "
            f"P99: {self.p99_time*1000:.1f}ms"
        )

async def fetch_with_timeout(session: aiohttp.ClientSession, url: str, timeout: float = 10.0) -> Tuple[float, int]:
    """Fetch a URL with timeout and return response time and status code."""
    start_time = time.time()
    try:
        async with session.get(url, timeout=timeout) as response:
            # Wait for response body to ensure complete request timing
            await response.text()
            end_time = time.time()
            return (end_time - start_time, response.status)
    except asyncio.TimeoutError:
        end_time = time.time()
        logger.warning(f"Request to {url} timed out after {timeout} seconds")
        return (end_time - start_time, 408)  # 408 Request Timeout
    except aiohttp.ClientError as e:
        end_time = time.time()
        logger.warning(f"Error fetching {url}: {e}")
        return (end_time - start_time, 500)  # 500 Internal Server Error
    except Exception as e:
        end_time = time.time()
        logger.error(f"Unexpected error fetching {url}: {e}")
        return (end_time - start_time, 500)  # 500 Internal Server Error

async def stress_test_endpoint(endpoint: str, total_requests: int, concurrency: int) -> RequestStats:
    """Run a stress test on an endpoint with specified concurrency."""
    url = f"{BASE_URL}{endpoint}"
    
    connector = aiohttp.TCPConnector(limit=concurrency)
    async with aiohttp.ClientSession(connector=connector) as session:
        # Create tasks for concurrent requests
        tasks = []
        for _ in range(total_requests):
            tasks.append(fetch_with_timeout(session, url))
            
        # Execute tasks in batches to maintain concurrency
        results = []
        for i in range(0, len(tasks), concurrency):
            batch = tasks[i:i+concurrency]
            batch_results = await asyncio.gather(*batch)
            results.extend(batch_results)
            
            # Small delay between batches to avoid overwhelming the server
            if i + concurrency < len(tasks):
                await asyncio.sleep(0.01)
                
        return RequestStats.from_response_times(endpoint, results)

def monitor_system_resources() -> Dict[str, float]:
    """Monitor system resource usage."""
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return {
        'cpu_percent': cpu_percent,
        'memory_percent': memory.percent,
        'disk_percent': disk.percent,
        'memory_used_mb': memory.used / (1024 * 1024),
        'memory_available_mb': memory.available / (1024 * 1024),
    }

@pytest.mark.slow
@pytest.mark.parametrize("endpoint", [
    "/api/v1/events",
    "/api/v1/issues",
    "/api/v1/system/health",
    "/metrics",
    "/health",
])
async def test_endpoint_stress(endpoint: str):
    """Stress test various endpoints under load."""
    # Configuration
    total_requests = 100
    concurrency = 10
    
    # Run stress test
    logger.info(f"Starting stress test for {endpoint} with {total_requests} requests, {concurrency} concurrent")
    
    # Measure system resources before test
    before_resources = monitor_system_resources()
    logger.info(f"Resources before test: {before_resources}")
    
    # Run the stress test
    stats = await stress_test_endpoint(endpoint, total_requests, concurrency)
    
    # Measure system resources after test
    after_resources = monitor_system_resources()
    logger.info(f"Resources after test: {after_resources}")
    
    # Calculate resource changes
    resource_changes = {
        'cpu_percent_change': after_resources['cpu_percent'] - before_resources['cpu_percent'],
        'memory_percent_change': after_resources['memory_percent'] - before_resources['memory_percent'],
        'memory_used_change_mb': after_resources['memory_used_mb'] - before_resources['memory_used_mb'],
    }
    
    # Log results
    logger.info(f"Stress test results for {endpoint}:")
    logger.info(str(stats))
    logger.info(f"Resource changes: {resource_changes}")
    
    # Assertions for basic validation
    assert stats.total_requests == total_requests, f"Expected {total_requests} requests, got {stats.total_requests}"
    assert stats.failed_requests < total_requests * 0.1, f"Too many failed requests: {stats.failed_requests}"
    assert stats.p99_time < 10.0, f"P99 response time too high: {stats.p99_time*1000:.1f}ms"
    
    # Assert resource usage didn't spike too much
    assert resource_changes['cpu_percent_change'] < 50, f"CPU usage increased by {resource_changes['cpu_percent_change']}%"
    assert resource_changes['memory_percent_change'] < 20, f"Memory usage increased by {resource_changes['memory_percent_change']}%"

@pytest.mark.slow
async def test_edge_case_long_running_request():
    """Test behavior with a long-running request."""
    # This test simulates a long-running request to see how the system handles it
    endpoint = "/api/v1/system/metrics/cpu?period=24h"  # A potentially long-running query
    timeout = 30.0  # Long timeout
    
    connector = aiohttp.TCPConnector(limit=5)
    async with aiohttp.ClientSession(connector=connector) as session:
        # Start a long-running request
        long_task = asyncio.create_task(fetch_with_timeout(session, f"{BASE_URL}{endpoint}", timeout))
        
        # Start a bunch of normal requests while the long one is running
        normal_tasks = []
        for i in range(20):
            normal_endpoint = "/api/v1/system/health"
            normal_tasks.append(fetch_with_timeout(session, f"{BASE_URL}{normal_endpoint}"))
            await asyncio.sleep(0.1)  # Small delay between requests
            
        # Wait for all tasks to complete
        normal_results = await asyncio.gather(*normal_tasks)
        long_result = await long_task
        
        # Analyze results
        normal_stats = RequestStats.from_response_times("/api/v1/system/health", normal_results)
        
        # Log results
        logger.info(f"Long-running request result: {long_result}")
        logger.info(f"Normal requests while long request was running:")
        logger.info(str(normal_stats))
        
        # Assert that normal requests were not blocked by the long-running one
        assert normal_stats.p90_time < 1.0, f"Normal requests were too slow: P90 = {normal_stats.p90_time*1000:.1f}ms"
        assert normal_stats.failed_requests == 0, f"Normal requests failed during long-running request"

@pytest.mark.slow
async def test_error_handling_under_load():
    """Test error handling under load with invalid requests."""
    # Create a mix of valid and invalid endpoints
    endpoints = [
        "/api/v1/system/health",  # Valid
        "/api/v1/non_existent",   # Invalid - 404
        "/api/v1/system/metrics/invalid",  # Invalid parameter
        "/api/v1/system/health",  # Valid
        "/api/v1/events?invalid=param"  # Valid endpoint, invalid parameter
    ]
    
    # Configure test
    requests_per_endpoint = 20
    concurrency = 10
    
    # Run requests to all endpoints concurrently
    connector = aiohttp.TCPConnector(limit=concurrency)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = []
        for endpoint in endpoints:
            for _ in range(requests_per_endpoint):
                tasks.append(fetch_with_timeout(session, f"{BASE_URL}{endpoint}"))
                
        # Execute all requests
        all_results = await asyncio.gather(*tasks)
        
        # Group results by endpoint
        endpoint_results = {endpoint: [] for endpoint in endpoints}
        for i, result in enumerate(all_results):
            endpoint_idx = i // requests_per_endpoint
            endpoint_results[endpoints[endpoint_idx]].append(result)
            
        # Calculate stats for each endpoint
        stats_by_endpoint = {
            endpoint: RequestStats.from_response_times(endpoint, results) 
            for endpoint, results in endpoint_results.items()
        }
        
        # Log results
        for endpoint, stats in stats_by_endpoint.items():
            logger.info(f"Results for {endpoint}:")
            logger.info(str(stats))
            
        # Check valid endpoints still work under load
        valid_endpoint = "/api/v1/system/health"
        assert stats_by_endpoint[valid_endpoint].successful_requests == requests_per_endpoint, \
            f"Valid endpoint {valid_endpoint} had failed requests under load"
            
        # Check error responses are consistent
        not_found_endpoint = "/api/v1/non_existent"
        assert 404 in stats_by_endpoint[not_found_endpoint].status_codes, \
            f"Not found endpoint {not_found_endpoint} didn't return 404 status codes"
            
        # No request should have taken more than 10 seconds
        for stats in stats_by_endpoint.values():
            assert stats.max_time < 10.0, f"Some requests took too long: {stats.max_time*1000:.1f}ms"

@pytest.mark.slow
async def test_memory_leak_check():
    """Test for potential memory leaks by running many requests and checking memory usage."""
    endpoint = "/api/v1/system/health"  # Use a lightweight endpoint
    iterations = 5
    requests_per_iteration = 100
    concurrency = 20
    
    # Track memory usage over time
    memory_usage = []
    
    # Run multiple iterations
    for i in range(iterations):
        logger.info(f"Starting iteration {i+1}/{iterations}")
        
        # Measure memory before
        memory_before = psutil.virtual_memory().used / (1024 * 1024)  # MB
        memory_usage.append(memory_before)
        logger.info(f"Memory before iteration {i+1}: {memory_before:.2f} MB")
        
        # Run a batch of requests
        stats = await stress_test_endpoint(endpoint, requests_per_iteration, concurrency)
        logger.info(f"Iteration {i+1} stats: {stats.successful_requests} successful, "
                   f"{stats.failed_requests} failed, avg time: {stats.avg_time*1000:.1f}ms")
        
        # Measure memory after
        memory_after = psutil.virtual_memory().used / (1024 * 1024)  # MB
        logger.info(f"Memory after iteration {i+1}: {memory_after:.2f} MB "
                   f"(change: {memory_after - memory_before:.2f} MB)")
        
        # Force garbage collection to minimize external factors
        import gc
        gc.collect()
        
        # Add a small delay between iterations
        await asyncio.sleep(1)
    
    # Analyze memory usage pattern
    memory_changes = [memory_usage[i+1] - memory_usage[i] for i in range(len(memory_usage)-1)]
    avg_change = sum(memory_changes) / len(memory_changes)
    
    logger.info(f"Memory usage over time (MB): {memory_usage}")
    logger.info(f"Memory changes between iterations (MB): {memory_changes}")
    logger.info(f"Average memory change per iteration: {avg_change:.2f} MB")
    
    # Check if there's a consistent memory increase that might indicate a leak
    # We allow some increase due to normal caching and other factors
    assert avg_change < 10.0, f"Possible memory leak detected, average increase of {avg_change:.2f} MB per iteration"

if __name__ == "__main__":
    # Allow running tests individually for debugging
    import sys
    
    if len(sys.argv) > 1:
        test_name = sys.argv[1]
        
        async def run_test():
            if test_name == "stress":
                for endpoint in ["/api/v1/events", "/api/v1/system/health", "/metrics"]:
                    await test_endpoint_stress(endpoint)
            elif test_name == "edge":
                await test_edge_case_long_running_request()
            elif test_name == "error":
                await test_error_handling_under_load()
            elif test_name == "memory":
                await test_memory_leak_check()
            else:
                print(f"Unknown test: {test_name}")
                print("Available tests: stress, edge, error, memory")
                
        asyncio.run(run_test())
    else:
        print("Please specify a test to run:")
        print("  python test_stress.py stress - Run endpoint stress tests")
        print("  python test_stress.py edge - Test long-running requests")
        print("  python test_stress.py error - Test error handling under load")
        print("  python test_stress.py memory - Check for memory leaks")