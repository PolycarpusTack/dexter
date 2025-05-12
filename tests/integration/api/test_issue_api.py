import pytest
import asyncio
from typing import Dict, Any

from .test_harness import ApiTestHarness

@pytest.mark.asyncio
async def test_issue_list_endpoint(test_harness: ApiTestHarness):
    """Test the issue list endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="issues.list",
        path_params={"org": "test-org", "project": "test-project"},
        query_params={"status": "unresolved", "limit": 10}
    )
    assert result.success, f"API test failed: {result.error_message}"
    assert "data" in result.response, "Response missing data key"

@pytest.mark.asyncio
async def test_issue_detail_endpoint(test_harness: ApiTestHarness):
    """Test the issue detail endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="issues.detail",
        path_params={"org": "test-org", "id": "12345"},
    )
    assert result.success, f"API test failed: {result.error_message}"

@pytest.mark.asyncio
async def test_issue_update_endpoint(test_harness: ApiTestHarness):
    """Test the issue update endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="issues.update",
        method="PUT",
        path_params={"org": "test-org", "id": "12345"},
        request_body={"status": "resolved"}
    )
    assert result.success, f"API test failed: {result.error_message}"

@pytest.mark.asyncio
async def test_issue_delete_endpoint(test_harness: ApiTestHarness):
    """Test the issue delete endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="issues.delete",
        method="DELETE",
        path_params={"org": "test-org", "id": "12345"},
    )
    assert result.success, f"API test failed: {result.error_message}"

@pytest.mark.asyncio
async def test_bulk_update_endpoint(test_harness: ApiTestHarness):
    """Test the bulk update endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="issues.bulk_update",
        method="POST",
        path_params={"org": "test-org"},
        request_body={
            "issues": ["12345", "67890"],
            "status": "resolved"
        }
    )
    assert result.success, f"API test failed: {result.error_message}"

@pytest.mark.asyncio
async def test_issue_assignment_endpoint(test_harness: ApiTestHarness):
    """Test the issue assignment endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="issues.assign",
        method="PUT",
        path_params={"org": "test-org", "id": "12345"},
        request_body={"assignee": "user@example.com"}
    )
    assert result.success, f"API test failed: {result.error_message}"

if __name__ == "__main__":
    # Run the tests directly
    async def main():
        harness = ApiTestHarness()
        await test_issue_list_endpoint(harness)
        await test_issue_detail_endpoint(harness)
        await test_issue_update_endpoint(harness)
        await test_issue_delete_endpoint(harness)
        await test_bulk_update_endpoint(harness)
        await test_issue_assignment_endpoint(harness)
        print(harness.generate_report())
    
    asyncio.run(main())
