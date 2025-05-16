#!/usr/bin/env python3
"""Test script to verify all API endpoints are working correctly."""
import requests
import json
import sys

def test_endpoints():
    """Test all API endpoints."""
    base_url = "http://localhost:8000"
    headers = {
        "Origin": "http://localhost:5175",
        "Content-Type": "application/json"
    }
    
    endpoints = [
        ("/health", "Health Check"),
        ("/api/v1/config/config", "Config Endpoint"),
        ("/api/v1/config/status", "Config Status"),
        ("/api/v1/ai/models", "AI Models"),
        ("/api/v1/debug/routes", "Debug Routes"),
    ]
    
    print("Testing Dexter API Endpoints")
    print("=" * 40)
    
    all_passed = True
    
    for endpoint, description in endpoints:
        url = f"{base_url}{endpoint}"
        print(f"\n{description} ({endpoint}):")
        print("-" * 30)
        
        try:
            response = requests.get(url, headers=headers, timeout=5)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)[:200]}...")
                print("✅ PASSED")
            else:
                print(f"Error: {response.text[:200]}...")
                print("❌ FAILED")
                all_passed = False
                
        except requests.exceptions.ConnectionError:
            print("❌ FAILED - Could not connect to backend")
            print("Make sure the backend is running on http://localhost:8000")
            all_passed = False
        except Exception as e:
            print(f"❌ FAILED - {str(e)}")
            all_passed = False
    
    print("\n" + "=" * 40)
    if all_passed:
        print("✅ All endpoints passed!")
        return 0
    else:
        print("❌ Some endpoints failed")
        return 1

if __name__ == "__main__":
    sys.exit(test_endpoints())