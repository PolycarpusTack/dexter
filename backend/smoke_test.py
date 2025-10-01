#!/usr/bin/env python3
"""
Simple smoke test for critical Dexter backend routes.
Run this after starting the backend to verify basic functionality.
"""

import httpx
import sys
import time
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8000"
TIMEOUT = 10.0

# Test endpoints
SMOKE_TESTS = [
    {
        "name": "Health Check",
        "method": "GET",
        "endpoint": "/health",
        "expected_status": 200,
        "critical": True
    },
    {
        "name": "API Documentation",
        "method": "GET",
        "endpoint": "/docs",
        "expected_status": 200,
        "critical": True
    },
    {
        "name": "OpenAPI Schema",
        "method": "GET",
        "endpoint": "/openapi.json",
        "expected_status": 200,
        "critical": False
    },
    {
        "name": "Config Status",
        "method": "GET",
        "endpoint": "/api/v1/config/status",
        "expected_status": [200, 500],  # 500 is OK if Sentry not configured
        "critical": False
    },
    {
        "name": "AI Models List",
        "method": "GET",
        "endpoint": "/api/v1/ai/models",
        "expected_status": [200, 500],  # 500 is OK if Ollama not running
        "critical": False
    },
    {
        "name": "Enhanced AI Models List",
        "method": "GET",
        "endpoint": "/api/v1/ai-enhanced/models",
        "expected_status": [200, 500],  # 500 is OK if Ollama not running
        "critical": False
    }
]


def run_smoke_test(test: Dict[str, Any], client: httpx.Client) -> bool:
    """Run a single smoke test."""
    try:
        print(f"  Testing {test['name']}...", end=" ", flush=True)

        response = client.request(
            method=test["method"],
            url=f"{BASE_URL}{test['endpoint']}",
            timeout=TIMEOUT
        )

        expected = test["expected_status"]
        if isinstance(expected, list):
            success = response.status_code in expected
        else:
            success = response.status_code == expected

        if success:
            print(f"✅ {response.status_code}")
            return True
        else:
            print(f"❌ {response.status_code} (expected {expected})")
            if test.get("critical", False):
                print(f"    Response: {response.text[:200]}")
            return False

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def main():
    """Run all smoke tests."""
    print("🔥 Running Dexter Backend Smoke Tests")
    print(f"Target: {BASE_URL}")
    print("=" * 50)

    # Check if backend is running
    try:
        with httpx.Client() as client:
            response = client.get(f"{BASE_URL}/health", timeout=5.0)
    except Exception:
        print("❌ Backend is not responding. Make sure it's running on port 8000.")
        print("   Start with: cd backend && poetry run uvicorn app.main:app --reload")
        sys.exit(1)

    # Run tests
    passed = 0
    failed = 0
    critical_failed = 0

    with httpx.Client() as client:
        for test in SMOKE_TESTS:
            if run_smoke_test(test, client):
                passed += 1
            else:
                failed += 1
                if test.get("critical", False):
                    critical_failed += 1

    # Results
    print("=" * 50)
    print(f"Results: {passed} passed, {failed} failed")

    if critical_failed > 0:
        print(f"❌ {critical_failed} critical tests failed!")
        sys.exit(1)
    elif failed > 0:
        print(f"⚠️  {failed} non-critical tests failed (this may be expected)")
        print("   Non-critical failures are often due to missing Sentry/Ollama configuration")
        sys.exit(0)
    else:
        print("✅ All tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()