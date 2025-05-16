#!/usr/bin/env python3
"""
Check available backend endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_endpoint(path):
    """Test if an endpoint exists and what it returns"""
    url = f"{BASE_URL}{path}"
    print(f"\nTesting: {url}")
    
    try:
        response = requests.get(url, timeout=5)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("Response:", json.dumps(response.json(), indent=2))
        else:
            print("Response:", response.text)
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")

# Test various endpoints
endpoints = [
    "/",
    "/health",
    "/api/v1/config",
    "/api/v1/ai/models",
    "/api/v1/config/status",
    "/api/v1/events",
    "/api/v1/issues",
    "/api/models",  # Maybe it's mounted here?
    "/ai/models",   # Or here?
]

for endpoint in endpoints:
    test_endpoint(endpoint)