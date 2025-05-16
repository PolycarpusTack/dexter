#!/usr/bin/env python3
"""Debug script to test API routes directly"""

import requests
import json

BASE_URL = "http://localhost:8000"
HEADERS = {
    "Origin": "http://localhost:5175",
    "Content-Type": "application/json"
}

def test_route(path, method="GET"):
    """Test a single route"""
    url = f"{BASE_URL}{path}"
    print(f"\n[{method}] {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=HEADERS, timeout=5)
        elif method == "OPTIONS":
            response = requests.options(url, headers=HEADERS, timeout=5)
        else:
            response = requests.request(method, url, headers=HEADERS, timeout=5)
        
        print(f"Status: {response.status_code}")
        if response.status_code < 500:
            try:
                print(f"Response: {json.dumps(response.json(), indent=2)[:500]}...")
            except:
                print(f"Response (text): {response.text[:500]}...")
    except Exception as e:
        print(f"Error: {e}")

# Test all routes
print("Testing backend routes...")

# Core routes
test_route("/")
test_route("/health")
test_route("/api/v1/debug/routes")  # Our new debug route

# API routes
test_route("/api/v1/config")
test_route("/api/v1/config/")  # With trailing slash
test_route("/api/v1/config/status")
test_route("/api/v1/ai/models")
test_route("/api/v1/ai/models/")  # With trailing slash

# Test OPTIONS for CORS
test_route("/api/v1/config", "OPTIONS")
test_route("/api/v1/ai/models", "OPTIONS")

print("\nDone!")