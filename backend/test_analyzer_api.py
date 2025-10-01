#!/usr/bin/env python3

"""
Test script for analyzer API endpoints.
"""

import asyncio
import httpx
from datetime import datetime


async def test_analyzer_api():
    """Test the analyzer API endpoints."""
    print("Testing Analyzer API Endpoints...")
    
    # Sample deadlock event
    deadlock_event = {
        "event_data": {
            "id": "api_test_123",
            "title": "deadlock detected",
            "message": """ERROR: deadlock detected
DETAIL: Process 12345 waits for ShareLock on relation users; blocked by process 12346.
Process 12346 waits for ShareLock on relation orders; blocked by process 12345.
Process 12345: UPDATE users SET last_active = NOW() WHERE id = 123;
Process 12346: UPDATE orders SET status = 'completed' WHERE user_id = 123;""",
            "platform": "python",
            "environment": "production",
            "timestamp": datetime.utcnow().isoformat()
        },
        "force_refresh": True
    }
    
    async with httpx.AsyncClient() as client:
        # Test 1: List analyzers
        print("\n1. Testing GET /api/v1/analyzers")
        try:
            response = await client.get("http://localhost:8000/api/v1/analyzers/")
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Total analyzers: {data.get('total_count', 0)}")
                for analyzer in data.get('analyzers', []):
                    print(f"   - {analyzer.get('name')} (v{analyzer.get('version')})")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 2: Get specific analyzer capabilities
        print("\n2. Testing GET /api/v1/analyzers/deadlock")
        try:
            response = await client.get("http://localhost:8000/api/v1/analyzers/deadlock")
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Name: {data.get('name')}")
                print(f"   Version: {data.get('version')}")
                print(f"   Platforms: {data.get('supported_platforms')}")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 3: Analyze event
        print("\n3. Testing POST /api/v1/analyzers/analyze")
        try:
            response = await client.post(
                "http://localhost:8000/api/v1/analyzers/analyze",
                json=deadlock_event
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Success: {data.get('success')}")
                print(f"   Event ID: {data.get('event_id')}")
                print(f"   Results: {len(data.get('results', []))}")
                for result in data.get('results', []):
                    print(f"   - {result.get('analyzer_type')}: confidence {result.get('confidence', 0):.2f}")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 4: Health check
        print("\n4. Testing GET /api/v1/analyzers/health")
        try:
            response = await client.get("http://localhost:8000/api/v1/analyzers/health")
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Healthy: {data.get('healthy')}")
                print(f"   Registry status: {data.get('registry_status', {}).get('healthy')}")
                print(f"   Orchestrator status: {data.get('orchestrator_status', {}).get('status')}")
        except Exception as e:
            print(f"   Error: {e}")


if __name__ == "__main__":
    print("Note: Make sure the backend is running on http://localhost:8000")
    print("You can start it with: python app/main.py")
    asyncio.run(test_analyzer_api())