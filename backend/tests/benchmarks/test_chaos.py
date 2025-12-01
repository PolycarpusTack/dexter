"""
Chaos testing for backend API resilience.

These tests simulate various failure scenarios and unexpected conditions
to evaluate the API's resilience and recovery capabilities.
"""
import time
import asyncio
import aiohttp
import pytest
import logging
import random
import psutil
import os
import signal
import subprocess
from typing import List, Dict, Any, Callable, Awaitable, Tuple, Optional
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Base URL for API
BASE_URL = "http://localhost:8000"

@dataclass
class ChaosTestResult:
    """Results of a chaos test."""
    test_name: str
    requests_before_chaos: int
    successful_before: int
    requests_during_chaos: int
    successful_during: int
    requests_after_recovery: int
    successful_after: int
    recovery_time_seconds: float
    
    @property
    def success_rate_before(self) -> float:
        """Calculate success rate before chaos."""
        if self.requests_before_chaos == 0:
            return 0.0
        return (self.successful_before / self.requests_before_chaos) * 100
    
    @property
    def success_rate_during(self) -> float:
        """Calculate success rate during chaos."""
        if self.requests_during_chaos == 0:
            return 0.0
        return (self.successful_during / self.requests_during_chaos) * 100
    
    @property
    def success_rate_after(self) -> float:
        """Calculate success rate after recovery."""
        if self.requests_after_recovery == 0:
            return 0.0
        return (self.successful_after / self.requests_after_recovery) * 100
    
    def __str__(self) -> str:
        """String representation of chaos test results."""
        return (
            f"Chaos Test: {self.test_name}\n"
            f"Before Chaos: {self.successful_before}/{self.requests_before_chaos} "
            f"({self.success_rate_before:.1f}% success)\n"
            f"During Chaos: {self.successful_during}/{self.requests_during_chaos} "
            f"({self.success_rate_during:.1f}% success)\n"
            f"After Recovery: {self.successful_after}/{self.requests_after_recovery} "
            f"({self.success_rate_after:.1f}% success)\n"
            f"Recovery Time: {self.recovery_time_seconds:.2f} seconds"
        )

async def make_request(session: aiohttp.ClientSession, url: str) -> bool:
    """Make a request and return True if successful (status code 2xx)."""
    try:
        async with session.get(url, timeout=5.0) as response:
            return 200 <= response.status < 300
    except (aiohttp.ClientError, asyncio.TimeoutError):
        return False

async def continuous_requests(
    url: str, 
    duration: float, 
    request_interval: float = 0.1,
    session: Optional[aiohttp.ClientSession] = None
) -> Tuple[int, int]:
    """Make continuous requests to a URL for a specified duration.
    
    Returns a tuple of (total_requests, successful_requests).
    """
    close_session = False
    if session is None:
        session = aiohttp.ClientSession()
        close_session = True
        
    start_time = time.time()
    end_time = start_time + duration
    
    total_requests = 0
    successful_requests = 0
    
    try:
        while time.time() < end_time:
            success = await make_request(session, url)
            total_requests += 1
            if success:
                successful_requests += 1
                
            # Wait for the next request interval
            await asyncio.sleep(request_interval)
            
        return (total_requests, successful_requests)
    finally:
        if close_session:
            await session.close()

async def wait_for_recovery(
    url: str, 
    timeout: float = 60.0,
    check_interval: float = 0.5,
    success_threshold: int = 3,
    session: Optional[aiohttp.ClientSession] = None
) -> float:
    """Wait for a service to recover, returning the recovery time in seconds.
    
    Returns -1.0 if the service did not recover within the timeout.
    """
    close_session = False
    if session is None:
        session = aiohttp.ClientSession()
        close_session = True
        
    start_time = time.time()
    end_time = start_time + timeout
    
    consecutive_successes = 0
    
    try:
        while time.time() < end_time:
            success = await make_request(session, url)
            if success:
                consecutive_successes += 1
                if consecutive_successes >= success_threshold:
                    return time.time() - start_time
            else:
                consecutive_successes = 0
                
            # Wait before checking again
            await asyncio.sleep(check_interval)
            
        return -1.0  # Did not recover within timeout
    finally:
        if close_session:
            await session.close()

async def run_chaos_test(
    test_name: str,
    endpoint: str,
    chaos_function: Callable[[], Awaitable[None]],
    before_duration: float = 5.0,
    chaos_duration: float = 10.0,
    after_duration: float = 5.0,
    recovery_timeout: float = 60.0
) -> ChaosTestResult:
    """Run a chaos test with a specified chaos function.
    
    The test consists of three phases:
    1. Before: Establish baseline performance
    2. During: Apply chaos and observe behavior
    3. After: Verify recovery
    """
    url = f"{BASE_URL}{endpoint}"
    
    logger.info(f"Starting chaos test: {test_name}")
    
    async with aiohttp.ClientSession() as session:
        # Phase 1: Before chaos
        logger.info(f"Phase 1: Before chaos ({before_duration}s)")
        before_total, before_success = await continuous_requests(
            url, before_duration, session=session
        )
        
        # Phase 2: During chaos
        logger.info(f"Phase 2: During chaos ({chaos_duration}s)")
        
        # Start continuous requests in background
        during_requests_task = asyncio.create_task(
            continuous_requests(url, chaos_duration, session=session)
        )
        
        # Apply chaos
        await chaos_function()
        
        # Wait for requests to complete
        during_total, during_success = await during_requests_task
        
        # Phase 3: Wait for recovery
        logger.info(f"Phase 3: Waiting for recovery (max {recovery_timeout}s)")
        recovery_time = await wait_for_recovery(
            url, timeout=recovery_timeout, session=session
        )
        
        # Phase 4: After recovery
        if recovery_time >= 0:
            logger.info(f"Service recovered after {recovery_time:.2f}s")
            logger.info(f"Phase 4: After recovery ({after_duration}s)")
            after_total, after_success = await continuous_requests(
                url, after_duration, session=session
            )
        else:
            logger.warning(f"Service did not recover within {recovery_timeout}s")
            after_total, after_success = (0, 0)
            recovery_time = recovery_timeout  # Use timeout as recovery time
        
        # Return test results
        result = ChaosTestResult(
            test_name=test_name,
            requests_before_chaos=before_total,
            successful_before=before_success,
            requests_during_chaos=during_total,
            successful_during=during_success,
            requests_after_recovery=after_total,
            successful_after=after_success,
            recovery_time_seconds=recovery_time
        )
        
        logger.info(f"Chaos test completed: {test_name}")
        logger.info(str(result))
        
        return result

@pytest.mark.chaos
async def test_high_cpu_load():
    """Test API resilience under high CPU load."""
    async def create_cpu_load():
        """Create high CPU load for a short period."""
        # Start 2 CPU-intensive processes
        processes = []
        for _ in range(2):
            cmd = "yes > /dev/null"  # Simple CPU-intensive process
            process = subprocess.Popen(cmd, shell=True)
            processes.append(process)
            
        # Let them run for 8 seconds
        await asyncio.sleep(8)
        
        # Terminate processes
        for process in processes:
            process.terminate()
            
        # Wait for processes to terminate
        for process in processes:
            process.wait()
    
    result = await run_chaos_test(
        test_name="High CPU Load",
        endpoint="/api/v1/system/health",
        chaos_function=create_cpu_load,
        chaos_duration=10.0
    )
    
    # Assertions to validate test results
    assert result.success_rate_before > 95, "Baseline success rate should be high"
    # During high CPU, some degradation is expected but service should still work
    assert result.success_rate_during > 50, "Service should remain functional under CPU load"
    assert result.success_rate_after > 95, "Service should fully recover after CPU load"
    assert result.recovery_time_seconds < 5, "Recovery should be quick after CPU load"

@pytest.mark.chaos
async def test_memory_pressure():
    """Test API resilience under memory pressure."""
    async def create_memory_pressure():
        """Create memory pressure for a short period."""
        # Allocate a large amount of memory quickly then release it
        large_data = []
        # Try to use up to 70% of available memory
        target_bytes = psutil.virtual_memory().available * 0.7
        chunk_size = 1024 * 1024 * 10  # 10MB chunks
        
        try:
            allocated = 0
            while allocated < target_bytes:
                # Allocate a chunk of memory
                large_data.append(bytearray(chunk_size))
                allocated += chunk_size
                
                # Sleep a tiny bit to allow other processes to run
                await asyncio.sleep(0.01)
                
            # Hold the memory for a few seconds
            logger.info(f"Allocated {allocated / (1024*1024):.1f} MB of memory")
            await asyncio.sleep(5)
        finally:
            # Release memory
            large_data.clear()
            import gc
            gc.collect()
    
    result = await run_chaos_test(
        test_name="Memory Pressure",
        endpoint="/api/v1/system/health",
        chaos_function=create_memory_pressure,
        chaos_duration=8.0
    )
    
    # Assertions to validate test results
    assert result.success_rate_before > 95, "Baseline success rate should be high"
    # Under memory pressure, expect some performance degradation
    assert result.success_rate_during > 20, "Service should remain partially functional under memory pressure"
    assert result.success_rate_after > 90, "Service should recover after memory pressure"
    assert result.recovery_time_seconds < 10, "Recovery should be reasonably quick after memory pressure"

@pytest.mark.chaos
async def test_concurrent_requests_spike():
    """Test API resilience under a spike of concurrent requests."""
    async def create_request_spike():
        """Create a spike of concurrent requests."""
        url = f"{BASE_URL}/api/v1/system/health"
        
        # Create many concurrent requests
        async with aiohttp.ClientSession() as session:
            tasks = []
            for _ in range(100):  # 100 concurrent requests
                tasks.append(make_request(session, url))
                
            # Execute all requests concurrently
            await asyncio.gather(*tasks)
    
    result = await run_chaos_test(
        test_name="Concurrent Requests Spike",
        endpoint="/api/v1/system/resources",  # Use a different endpoint for testing
        chaos_function=create_request_spike,
        chaos_duration=5.0
    )
    
    # Assertions to validate test results
    assert result.success_rate_before > 95, "Baseline success rate should be high"
    # During request spike, expect some performance impact
    assert result.success_rate_during > 80, "Service should handle concurrent request spike"
    assert result.success_rate_after > 95, "Service should recover fully after request spike"
    assert result.recovery_time_seconds < 3, "Recovery should be very quick after request spike"

@pytest.mark.chaos
async def test_error_injection():
    """Test API error handling by injecting errors in dependent services."""
    # This is a mock test that simulates errors in dependencies
    # In a real implementation, you would have a way to inject actual errors
    
    # For now, we'll simulate errors by making requests to non-existent endpoints
    # that will trigger error handling in the API
    
    async def inject_errors():
        """Inject errors by making requests to trigger error handlers."""
        # Make a series of requests to invalid endpoints or with invalid parameters
        async with aiohttp.ClientSession() as session:
            error_endpoints = [
                "/api/v1/non_existent",
                "/api/v1/system/metrics/invalid_metric",
                "/api/v1/events?invalid=parameter&broken=true",
                "/api/v1/system/health?trigger_error=true"
            ]
            
            tasks = []
            for endpoint in error_endpoints:
                url = f"{BASE_URL}{endpoint}"
                tasks.append(session.get(url, timeout=1.0))
                
            # Execute all requests concurrently, ignoring exceptions
            for task in asyncio.as_completed(tasks):
                try:
                    await task
                except (aiohttp.ClientError, asyncio.TimeoutError):
                    pass
    
    result = await run_chaos_test(
        test_name="Error Injection",
        endpoint="/api/v1/system/health",  # Test normal endpoint behavior
        chaos_function=inject_errors,
        chaos_duration=3.0
    )
    
    # Assertions to validate test results
    assert result.success_rate_before > 95, "Baseline success rate should be high"
    # Valid endpoints should still work during error injection
    assert result.success_rate_during > 90, "Valid endpoints should work during error injection"
    assert result.success_rate_after > 95, "Service should recover fully after error injection"
    assert result.recovery_time_seconds < 2, "Recovery should be immediate after error injection"

@pytest.mark.chaos
async def test_network_delay():
    """Test API resilience with network delays."""
    # This test requires the ability to add network delays to API calls
    # We'll simulate this by introducing delays in our client code
    
    normal_make_request = make_request  # Store the original function
    
    async def delayed_make_request(session: aiohttp.ClientSession, url: str) -> bool:
        """Simulate network delay by sleeping before making the request."""
        # Add random delay between 100-500ms
        delay = random.uniform(0.1, 0.5)
        await asyncio.sleep(delay)
        return await normal_make_request(session, url)
    
    async def introduce_network_delay():
        """Introduce network delay by patching the make_request function."""
        global make_request
        make_request = delayed_make_request
        
        # Keep the delay active for 5 seconds
        await asyncio.sleep(5)
        
        # Restore normal function
        make_request = normal_make_request
    
    try:
        result = await run_chaos_test(
            test_name="Network Delay",
            endpoint="/api/v1/system/health",
            chaos_function=introduce_network_delay,
            chaos_duration=8.0
        )
        
        # Assertions to validate test results
        assert result.success_rate_before > 95, "Baseline success rate should be high"
        # With network delays, requests should still succeed but fewer will complete during the test window
        assert result.success_rate_during > 90, "Requests should succeed despite network delays"
        assert result.requests_during_chaos < result.requests_before_chaos, "Fewer requests should complete during delays"
        assert result.success_rate_after > 95, "Service should recover fully after network delays"
        assert result.recovery_time_seconds < 2, "Recovery should be immediate after network delays"
    finally:
        # Ensure we restore the original function
        make_request = normal_make_request

if __name__ == "__main__":
    # Allow running tests individually for debugging
    import sys
    
    if len(sys.argv) > 1:
        test_name = sys.argv[1]
        
        async def run_test():
            if test_name == "cpu":
                await test_high_cpu_load()
            elif test_name == "memory":
                await test_memory_pressure()
            elif test_name == "spike":
                await test_concurrent_requests_spike()
            elif test_name == "error":
                await test_error_injection()
            elif test_name == "network":
                await test_network_delay()
            else:
                print(f"Unknown test: {test_name}")
                print("Available tests: cpu, memory, spike, error, network")
                
        asyncio.run(run_test())
    else:
        print("Please specify a test to run:")
        print("  python test_chaos.py cpu - Test high CPU load")
        print("  python test_chaos.py memory - Test memory pressure")
        print("  python test_chaos.py spike - Test concurrent request spike")
        print("  python test_chaos.py error - Test error injection")
        print("  python test_chaos.py network - Test network delays")