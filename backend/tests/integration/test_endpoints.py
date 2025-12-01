#!/usr/bin/env python3
"""Test script to check if backend endpoints are responding."""
import asyncio
import httpx
import logging
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_endpoints():
    """Test various backend endpoints."""
    base_url = "http://localhost:8000"
    headers = {
        "Origin": "http://localhost:5175",
        "Content-Type": "application/json"
    }
    
    endpoints_to_test = [
        # Basic health checks
        ("GET", "/", "Root endpoint"),
        ("GET", "/health", "Health check"),
        
        # Config endpoints  
        ("GET", "/api/v1/config/config", "Config endpoint"),
        ("GET", "/api/v1/config/status", "Config status"),
        
        # AI endpoints
        ("GET", "/api/v1/ai/models", "AI models list"),
        
        # Debug endpoint
        ("GET", "/api/v1/debug/routes", "Debug routes"),
    ]
    
    async with httpx.AsyncClient() as client:
        for method, path, description in endpoints_to_test:
            url = f"{base_url}{path}"
            logger.info(f"\nTesting {description}: {method} {url}")
            
            try:
                if method == "GET":
                    response = await client.get(url, headers=headers)
                else:
                    response = await client.request(method, url, headers=headers)
                    
                logger.info(f"Status: {response.status_code}")
                
                if response.status_code < 400:
                    try:
                        data = response.json()
                        logger.info(f"Response: {json.dumps(data, indent=2)[:200]}...")
                    except:
                        logger.info(f"Response: {response.text[:200]}...")
                else:
                    logger.error(f"Error: {response.text}")
                    
            except Exception as e:
                logger.error(f"Failed: {str(e)}")

if __name__ == "__main__":
    logger.info("Starting endpoint tests...")
    logger.info("Make sure the backend is running on http://localhost:8000")
    asyncio.run(test_endpoints())