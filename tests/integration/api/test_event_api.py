import pytest
import asyncio
from typing import Dict, Any

from .test_harness import ApiTestHarness

@pytest.mark.asyncio
async def test_event_list_endpoint(test_harness: ApiTestHarness):
    """Test the event list endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="events.list",
        path_params={"org": "test-org", "project": "test-project"},
        query_params={"limit": 10}
    )
    assert result.success, f"API test failed: {result.error_message}"
    assert "data" in result.response, "Response missing data key"

@pytest.mark.asyncio
async def test_event_detail_endpoint(test_harness: ApiTestHarness):
    """Test the event detail endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="events.detail",
        path_params={"org": "test-org", "project": "test-project", "id": "12345"},
    )
    assert result.success, f"API test failed: {result.error_message}"

@pytest.mark.asyncio
async def test_issue_events_endpoint(test_harness: ApiTestHarness):
    """Test the issue events endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="events.issue_events",
        path_params={"org": "test-org", "issue_id": "12345"},
        query_params={"limit": 10}
    )
    assert result.success, f"API test failed: {result.error_message}"
    assert "data" in result.response, "Response missing data key"

@pytest.mark.asyncio
async def test_latest_event_endpoint(test_harness: ApiTestHarness):
    """Test the latest event endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="events.latest",
        path_params={"org": "test-org", "issue_id": "12345"},
    )
    assert result.success, f"API test failed: {result.error_message}"

@pytest.mark.asyncio
async def test_event_tag_values_endpoint(test_harness: ApiTestHarness):
    """Test the event tag values endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="events.tag_values",
        path_params={"org": "test-org", "project": "test-project", "key": "browser"},
    )
    assert result.success, f"API test failed: {result.error_message}"
    assert "data" in result.response, "Response missing data key"

if __name__ == "__main__":
    # Run the tests directly
    async def main():
        harness = ApiTestHarness()
        await test_event_list_endpoint(harness)
        await test_event_detail_endpoint(harness)
        await test_issue_events_endpoint(harness)
        await test_latest_event_endpoint(harness)
        await test_event_tag_values_endpoint(harness)
        print(harness.generate_report())
    
    asyncio.run(main())
