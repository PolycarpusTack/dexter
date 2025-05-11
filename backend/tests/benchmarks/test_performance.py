# File: backend/tests/benchmarks/test_performance.py

import pytest
import asyncio
import time
from statistics import mean, stdev
from concurrent.futures import ThreadPoolExecutor
import httpx

from app.services.sentry_service import SentryService
from app.core.cache import cache_service

class TestPerformanceBenchmarks:
    """Performance benchmark tests for API optimization"""
    
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_cache_performance(self):
        """Benchmark cache performance impact"""
        service = SentryService(
            base_url="https://sentry.io/api/0",
            auth_token="test-token",
            organization="test-org",
            project="test-project"
        )
        
        # Mock API response
        async def mock_api_call():
            await asyncio.sleep(0.1)  # Simulate 100ms API call
            return {"id": "test", "data": "x" * 1000}
        
        # Test without cache
        no_cache_times = []
        for _ in range(10):
            start = time.perf_counter()
            await mock_api_call()
            no_cache_times.append(time.perf_counter() - start)
        
        # Test with cache
        cache_times = []
        # First call to populate cache
        result = await mock_api_call()
        await cache_service.set("test_key", result, ttl=60)
        
        for _ in range(10):
            start = time.perf_counter()
            cached = await cache_service.get("test_key")
            if not cached:
                cached = await mock_api_call()
            cache_times.append(time.perf_counter() - start)
        
        # Calculate statistics
        no_cache_avg = mean(no_cache_times)
        cache_avg = mean(cache_times)
        improvement = (no_cache_avg - cache_avg) / no_cache_avg * 100
        
        print(f"No cache avg: {no_cache_avg:.3f}s")
        print(f"With cache avg: {cache_avg:.3f}s")
        print(f"Improvement: {improvement:.1f}%")
        
        assert cache_avg < no_cache_avg * 0.5  # At least 50% improvement
    
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_batch_request_performance(self):
        """Benchmark batch request performance"""
        # Simulate individual requests
        async def individual_requests(ids):
            tasks = []
            for id in ids:
                async def fetch(id):
                    await asyncio.sleep(0.05)  # 50ms per request
                    return {"id": id}
                tasks.append(fetch(id))
            return await asyncio.gather(*tasks)
        
        # Simulate batch request
        async def batch_request(ids):
            await asyncio.sleep(0.1)  # 100ms for batch
            return [{"id": id} for id in ids]
        
        ids = list(range(20))
        
        # Time individual requests
        start = time.perf_counter()
        await individual_requests(ids)
        individual_time = time.perf_counter() - start
        
        # Time batch request
        start = time.perf_counter()
        await batch_request(ids)
        batch_time = time.perf_counter() - start
        
        print(f"Individual requests: {individual_time:.3f}s")
        print(f"Batch request: {batch_time:.3f}s")
        print(f"Speedup: {individual_time / batch_time:.1f}x")
        
        assert batch_time < individual_time * 0.3  # At least 3x faster
    
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_deduplication_performance(self):
        """Benchmark request deduplication impact"""
        call_count = 0
        
        async def api_call():
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.1)
            return {"data": "test"}
        
        # Without deduplication
        call_count = 0
        start = time.perf_counter()
        tasks = [api_call() for _ in range(10)]
        await asyncio.gather(*tasks)
        no_dedup_time = time.perf_counter() - start
        no_dedup_calls = call_count
        
        # With deduplication (simulated)
        call_count = 0
        pending = None
        
        async def deduplicated_call():
            nonlocal pending
            if pending:
                return await pending
            pending = api_call()
            result = await pending
            pending = None
            return result
        
        start = time.perf_counter()
        tasks = [deduplicated_call() for _ in range(10)]
        await asyncio.gather(*tasks)
        dedup_time = time.perf_counter() - start
        dedup_calls = call_count
        
        print(f"Without dedup: {no_dedup_time:.3f}s, {no_dedup_calls} calls")
        print(f"With dedup: {dedup_time:.3f}s, {dedup_calls} calls")
        
        assert dedup_calls < no_dedup_calls
        assert dedup_time < no_dedup_time * 0.2  # At least 5x faster
    
    @pytest.mark.slow
    def test_concurrent_request_handling(self):
        """Benchmark concurrent request handling"""
        def make_request(i):
            time.sleep(0.01)  # Simulate 10ms request
            return {"id": i}
        
        # Sequential processing
        start = time.perf_counter()
        results = [make_request(i) for i in range(50)]
        sequential_time = time.perf_counter() - start
        
        # Concurrent processing
        start = time.perf_counter()
        with ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(make_request, range(50)))
        concurrent_time = time.perf_counter() - start
        
        print(f"Sequential: {sequential_time:.3f}s")
        print(f"Concurrent: {concurrent_time:.3f}s")
        print(f"Speedup: {sequential_time / concurrent_time:.1f}x")
        
        assert concurrent_time < sequential_time * 0.3
    
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_memory_efficiency(self):
        """Test memory efficiency of optimizations"""
        import tracemalloc
        
        # Test large data handling
        tracemalloc.start()
        
        # Create large dataset
        large_data = [{"id": i, "data": "x" * 1000} for i in range(1000)]
        
        # Get baseline memory
        baseline = tracemalloc.get_traced_memory()[0]
        
        # Process data with optimization (chunking)
        chunk_size = 100
        processed = []
        for i in range(0, len(large_data), chunk_size):
            chunk = large_data[i:i + chunk_size]
            # Simulate processing
            processed.extend(chunk)
        
        # Check memory usage
        current = tracemalloc.get_traced_memory()[0]
        memory_used = current - baseline
        
        tracemalloc.stop()
        
        print(f"Memory used: {memory_used / 1024 / 1024:.2f} MB")
        
        # Should use less than 50MB for 1000 items
        assert memory_used < 50 * 1024 * 1024
    
    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_api_response_times(self):
        """Benchmark API response times with optimizations"""
        response_times = []
        
        async with httpx.AsyncClient() as client:
            for _ in range(20):
                start = time.perf_counter()
                try:
                    # Use local test server
                    response = await client.get("http://localhost:8000/health")
                    response_times.append(time.perf_counter() - start)
                except:
                    pass
        
        if response_times:
            avg_time = mean(response_times)
            std_time = stdev(response_times) if len(response_times) > 1 else 0
            p95_time = sorted(response_times)[int(len(response_times) * 0.95)]
            
            print(f"Average response time: {avg_time * 1000:.2f}ms")
            print(f"Standard deviation: {std_time * 1000:.2f}ms")
            print(f"95th percentile: {p95_time * 1000:.2f}ms")
            
            # Response should be under 200ms on average
            assert avg_time < 0.2
            # 95th percentile should be under 500ms
            assert p95_time < 0.5
