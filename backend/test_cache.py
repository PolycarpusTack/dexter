"""
Simple test script to verify caching functionality
"""
import asyncio
import httpx
import time
from app.services.cache_service import CacheService, cached
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

# Initialize cache service
cache_service = CacheService()
app.state.cache = cache_service

@app.get("/test")
@cached(ttl=5, prefix="test_endpoint")
async def test_endpoint(request: Request):
    # Simulate expensive operation
    await asyncio.sleep(1)
    return JSONResponse(content={"timestamp": time.time(), "message": "Hello from cache test"})

async def test_cache():
    # Test in-memory cache directly
    print("Testing cache service...")
    
    # Set a value
    await cache_service.set("test_key", {"data": "test_value"}, ttl=60)
    
    # Get the value
    result = await cache_service.get("test_key")
    print(f"Retrieved from cache: {result}")
    
    # Test cache expiration
    await cache_service.set("expire_key", "will expire", ttl=2)
    print("Set value with 2 second TTL")
    
    await asyncio.sleep(3)
    expired_result = await cache_service.get("expire_key")
    print(f"After expiration: {expired_result}")
    
    # Test pattern clearing
    await cache_service.set("test:1", "value1", ttl=60)
    await cache_service.set("test:2", "value2", ttl=60)
    await cache_service.set("other:1", "value3", ttl=60)
    
    print("Set multiple keys")
    await cache_service.clear_pattern("test:*")
    
    test1 = await cache_service.get("test:1")
    other1 = await cache_service.get("other:1")
    print(f"After pattern clear - test:1: {test1}, other:1: {other1}")

    print("\nTesting with FastAPI endpoint...")
    
    # Start the app in background
    import uvicorn
    from threading import Thread
    
    def run_server():
        uvicorn.run(app, host="127.0.0.1", port=8001, log_level="error")
    
    server_thread = Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Give server time to start
    await asyncio.sleep(2)
    
    # Test the cached endpoint
    async with httpx.AsyncClient() as client:
        # First request - should be slow
        start_time = time.time()
        response1 = await client.get("http://127.0.0.1:8001/test")
        duration1 = time.time() - start_time
        print(f"First request duration: {duration1:.2f}s")
        print(f"Response headers: {response1.headers}")
        print(f"X-Cache: {response1.headers.get('X-Cache', 'Not found')}")
        
        # Second request - should be fast (cached)
        start_time = time.time()
        response2 = await client.get("http://127.0.0.1:8001/test")
        duration2 = time.time() - start_time
        print(f"Second request duration: {duration2:.2f}s")
        print(f"X-Cache: {response2.headers.get('X-Cache', 'Not found')}")
        
        # Third request with cache bypass
        start_time = time.time()
        response3 = await client.get("http://127.0.0.1:8001/test?no_cache=true")
        duration3 = time.time() - start_time
        print(f"Third request (bypass) duration: {duration3:.2f}s")
        print(f"X-Cache: {response3.headers.get('X-Cache', 'Not found')}")

if __name__ == "__main__":
    asyncio.run(test_cache())
