import pytest
import asyncio
from typing import Dict, Any

from .test_harness import ApiTestHarness

@pytest.mark.asyncio
async def test_discover_query_endpoint(test_harness: ApiTestHarness):
    """Test the discover query endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="discover.query",
        method="POST",
        path_params={"org": "test-org"},
        request_body={
            "projects": ["test-project"],
            "fields": ["title", "count()"],
            "conditions": [
                ["error.type", "=", "TypeError"]
            ],
            "orderby": "-count()",
            "limit": 20
        }
    )
    assert result.success, f"API test failed: {result.error_message}"
    assert "data" in result.response, "Response missing data key"

@pytest.mark.asyncio
async def test_discover_saved_queries_endpoint(test_harness: ApiTestHarness):
    """Test the discover saved queries endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="discover.saved_queries",
        path_params={"org": "test-org"},
    )
    assert result.success, f"API test failed: {result.error_message}"
    assert "data" in result.response, "Response missing data key"

@pytest.mark.asyncio
async def test_discover_create_saved_query_endpoint(test_harness: ApiTestHarness):
    """Test the discover create saved query endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="discover.create_saved_query",
        method="POST",
        path_params={"org": "test-org"},
        request_body={
            "name": "Test Query",
            "projects": ["test-project"],
            "fields": ["title", "count()"],
            "conditions": [
                ["error.type", "=", "TypeError"]
            ],
            "orderby": "-count()",
        }
    )
    assert result.success, f"API test failed: {result.error_message}"

@pytest.mark.asyncio
async def test_discover_saved_query_detail_endpoint(test_harness: ApiTestHarness):
    """Test the discover saved query detail endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="discover.saved_query_detail",
        path_params={"org": "test-org", "id": "12345"},
    )
    assert result.success, f"API test failed: {result.error_message}"

@pytest.mark.asyncio
async def test_discover_delete_saved_query_endpoint(test_harness: ApiTestHarness):
    """Test the discover delete saved query endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="discover.delete_saved_query",
        method="DELETE",
        path_params={"org": "test-org", "id": "12345"},
    )
    assert result.success, f"API test failed: {result.error_message}"

if __name__ == "__main__":
    # Run the tests directly
    async def main():
        harness = ApiTestHarness()
        await test_discover_query_endpoint(harness)
        await test_discover_saved_queries_endpoint(harness)
        await test_discover_create_saved_query_endpoint(harness)
        await test_discover_saved_query_detail_endpoint(harness)
        await test_discover_delete_saved_query_endpoint(harness)
        print(harness.generate_report())
    
    asyncio.run(main())
