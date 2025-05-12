import pytest
import asyncio
from typing import Dict, Any

from .test_harness import ApiTestHarness

@pytest.mark.asyncio
async def test_alert_rules_list_endpoint(test_harness: ApiTestHarness):
    """Test the alert rules list endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="alert_rules.list",
        path_params={"org": "test-org", "project": "test-project"},
    )
    assert result.success, f"API test failed: {result.error_message}"
    assert "data" in result.response, "Response missing data key"

@pytest.mark.asyncio
async def test_alert_rule_detail_endpoint(test_harness: ApiTestHarness):
    """Test the alert rule detail endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="alert_rules.detail",
        path_params={"org": "test-org", "project": "test-project", "id": "12345"},
    )
    assert result.success, f"API test failed: {result.error_message}"

@pytest.mark.asyncio
async def test_create_alert_rule_endpoint(test_harness: ApiTestHarness):
    """Test the create alert rule endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="alert_rules.create",
        method="POST",
        path_params={"org": "test-org", "project": "test-project"},
        request_body={
            "name": "Test Alert Rule",
            "conditions": [
                {
                    "type": "event",
                    "attribute": "error.type",
                    "operator": "equals",
                    "value": "TypeError"
                }
            ],
            "actions": [
                {
                    "type": "email",
                    "recipients": ["test@example.com"]
                }
            ],
            "frequency": 15
        }
    )
    assert result.success, f"API test failed: {result.error_message}"

@pytest.mark.asyncio
async def test_update_alert_rule_endpoint(test_harness: ApiTestHarness):
    """Test the update alert rule endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="alert_rules.update",
        method="PUT",
        path_params={"org": "test-org", "project": "test-project", "id": "12345"},
        request_body={
            "name": "Updated Alert Rule",
            "actions": [
                {
                    "type": "email",
                    "recipients": ["updated@example.com"]
                }
            ],
        }
    )
    assert result.success, f"API test failed: {result.error_message}"

@pytest.mark.asyncio
async def test_delete_alert_rule_endpoint(test_harness: ApiTestHarness):
    """Test the delete alert rule endpoint"""
    result = await test_harness.test_endpoint(
        endpoint_key="alert_rules.delete",
        method="DELETE",
        path_params={"org": "test-org", "project": "test-project", "id": "12345"},
    )
    assert result.success, f"API test failed: {result.error_message}"

if __name__ == "__main__":
    # Run the tests directly
    async def main():
        harness = ApiTestHarness()
        await test_alert_rules_list_endpoint(harness)
        await test_alert_rule_detail_endpoint(harness)
        await test_create_alert_rule_endpoint(harness)
        await test_update_alert_rule_endpoint(harness)
        await test_delete_alert_rule_endpoint(harness)
        print(harness.generate_report())
    
    asyncio.run(main())
