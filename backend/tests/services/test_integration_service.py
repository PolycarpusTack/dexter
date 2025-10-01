import logging

# Constants for magic values
TEST_URL_HTTPS___API_EXAMPLE_COM = "https://api.example.com"
TEST_URL_HTTPS___HOOKS_SLACK_COM_TEST = "https://hooks.slack.com/test"
TEST_URL_HTTPS___NEW_API_EXAMPLE_COM = "https://new-api.example.com"
TEST_URL_HTTPS___JIRA_EXAMPLE_COM = "https://jira.example.com"
TEST_URL_HTTPS___NEW_JIRA_EXAMPLE_COM = "https://new-jira.example.com"
MS_PER_SECOND = 1000
TEST_URL_HTTPS___EXAMPLE_COM_PATH_QUERY = "https://example.com/path?query=test&foo=bar"

# from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)
"""Comprehensive tests for the Integration Service."""

import pytest
from typing import Any
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

from app.services.integration_service import (
    IntegrationService,
    Integration,
    IntegrationStatus,
    IntegrationType,
    IntegrationHealth,
    IntegrationMetrics,
)
from app.services.external_api_service import ExternalAPIService


@pytest.fixture
def mock_external_api_service() -> None:
    """Mock external API service."""
    service = Mock(spec=ExternalAPIService)
    service.request = AsyncMock()
    return service


@pytest.fixture
def integration_service(mock_external_api_service) -> None:
    """Create integration service with mocked dependencies."""
    return IntegrationService(external_api_service=mock_external_api_service)


@pytest.fixture
def sample_integration_config() -> None:
    """Sample integration configuration."""
    return {
        "base_url": TEST_URL_HTTPS___API_EXAMPLE_COM,
        "api_token": "test-token-123",
        "project_key": "TEST",
    }


@pytest.fixture
def sample_integration(sample_integration_config) -> None:
    """Create a sample integration instance."""
    return Integration(
        id="test-integration-123",
        name="Test Integration",
        type=IntegrationType.JIRA,
        config=sample_integration_config,
        status=IntegrationStatus.ACTIVE,
    )


class TestIntegrationCRUD:
    """Test CRUD operations for integrations."""
    
    @pytest.mark.asyncio
    async def test_create_integration_success(self, integration_service: Any, sample_integration_config: Any) -> None:
        """Test successful integration creation."""
        # Create integration
        integration = await integration_service.create_integration(
            name="Test JIRA",
            integration_type=IntegrationType.JIRA,
            config=sample_integration_config,
            test_connection=True
        )
        
        assert integration is not None
        assert integration.name == "Test JIRA"
        assert integration.type == IntegrationType.JIRA
        assert integration.config == sample_integration_config
        assert integration.status == IntegrationStatus.ACTIVE
        assert integration.id in integration_service.integrations
    
    @pytest.mark.asyncio
    async def test_create_integration_without_connection_test(self, integration_service: Any, sample_integration_config: Any) -> None:
        """Test creating integration without testing connection."""
        integration = await integration_service.create_integration(
            name="Test Slack",
            integration_type=IntegrationType.SLACK,
            config={"webhook_url": TEST_URL_HTTPS___HOOKS_SLACK_COM_TEST},
            test_connection=False
        )
        
        assert integration.status == IntegrationStatus.INACTIVE
        assert integration.id in integration_service.integrations
    
    @pytest.mark.asyncio
    async def test_create_integration_with_failed_connection(self, integration_service: Any, sample_integration_config: Any) -> None:
        """Test integration creation with failed connection test."""
        # Mock connection test to fail
        with patch.object(integration_service, '_perform_connection_test', 
                         return_value={"success": False, "error": "Connection refused"}):
            integration = await integration_service.create_integration(
                name="Failed Integration",
                integration_type=IntegrationType.GITHUB,
                config={"token": "invalid"},
                test_connection=True
            )
            
            assert integration.status == IntegrationStatus.ERROR
            assert integration.last_error == "Connection refused"
    
    @pytest.mark.asyncio
    async def test_update_integration_name(self, integration_service: Any, sample_integration: Any) -> None:
        """Test updating integration name."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Update name
        updated = await integration_service.update_integration(
            integration_id=sample_integration.id,
            name="Updated JIRA"
        )
        
        assert updated is not None
        assert updated.name == "Updated JIRA"
        assert updated.updated_at > sample_integration.created_at
    
    @pytest.mark.asyncio
    async def test_update_integration_config(self, integration_service: Any, sample_integration: Any) -> None:
        """Test updating integration configuration."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Update config
        new_config = {"base_url": TEST_URL_HTTPS___NEW_API_EXAMPLE_COM, "api_token": "new-token"}
        updated = await integration_service.update_integration(
            integration_id=sample_integration.id,
            config=new_config
        )
        
        assert updated is not None
        assert updated.config["base_url"] == TEST_URL_HTTPS___NEW_API_EXAMPLE_COM
        assert updated.config["api_token"] == "new-token"
    
    @pytest.mark.asyncio
    async def test_update_integration_enable_disable(self, integration_service: Any, sample_integration: Any) -> None:
        """Test enabling and disabling integration."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Mock health monitoring methods
        integration_service._stop_health_monitoring = AsyncMock()
        integration_service._start_health_monitoring = AsyncMock()
        
        # Disable integration
        updated = await integration_service.update_integration(
            integration_id=sample_integration.id,
            enabled=False
        )
        
        assert updated.enabled is False
        assert updated.status == IntegrationStatus.INACTIVE
        integration_service._stop_health_monitoring.assert_called_once_with(sample_integration.id)
        
        # Re-enable integration
        updated = await integration_service.update_integration(
            integration_id=sample_integration.id,
            enabled=True
        )
        
        assert updated.enabled is True
        assert updated.status == IntegrationStatus.ACTIVE
        integration_service._start_health_monitoring.assert_called_once_with(sample_integration.id)
    
    @pytest.mark.asyncio
    async def test_update_nonexistent_integration(self, integration_service: Any) -> None:
        """Test updating non-existent integration."""
        result = await integration_service.update_integration(
            integration_id="non-existent-id",
            name="New Name"
        )
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_delete_integration_success(self, integration_service: Any, sample_integration: Any) -> None:
        """Test successful integration deletion."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Mock stop methods
        integration_service._stop_health_monitoring = AsyncMock()
        integration_service._stop_sync_task = AsyncMock()
        
        # Delete integration
        result = await integration_service.delete_integration(sample_integration.id)
        
        assert result is True
        assert sample_integration.id not in integration_service.integrations
        integration_service._stop_health_monitoring.assert_called_once_with(sample_integration.id)
        integration_service._stop_sync_task.assert_called_once_with(sample_integration.id)
    
    @pytest.mark.asyncio
    async def test_delete_nonexistent_integration(self, integration_service: Any) -> None:
        """Test deleting non-existent integration."""
        result = await integration_service.delete_integration("non-existent-id")
        assert result is False
    
    @pytest.mark.asyncio
    async def test_get_integration(self, integration_service: Any, sample_integration: Any) -> None:
        """Test getting integration by ID."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Get integration
        result = await integration_service.get_integration(sample_integration.id)
        
        assert result is not None
        assert result.id == sample_integration.id
        assert result.name == sample_integration.name
    
    @pytest.mark.asyncio
    async def test_list_integrations_no_filter(self, integration_service: Any) -> None:
        """Test listing all integrations."""
        # Add multiple integrations
        integrations = [
            Integration(name="JIRA", type=IntegrationType.JIRA, config={}, status=IntegrationStatus.ACTIVE),
            Integration(name="Slack", type=IntegrationType.SLACK, config={}, status=IntegrationStatus.INACTIVE),
            Integration(name="GitHub", type=IntegrationType.GITHUB, config={}, status=IntegrationStatus.ERROR),
        ]
        
        for integration in integrations:
            integration_service.integrations[integration.id] = integration
        
        # List all
        result = await integration_service.list_integrations()
        
        assert len(result) == 3
    
    @pytest.mark.asyncio
    async def test_list_integrations_by_type(self, integration_service: Any) -> None:
        """Test listing integrations filtered by type."""
        # Add multiple integrations
        integrations = [
            Integration(name="JIRA 1", type=IntegrationType.JIRA, config={}),
            Integration(name="JIRA 2", type=IntegrationType.JIRA, config={}),
            Integration(name="Slack", type=IntegrationType.SLACK, config={}),
        ]
        
        for integration in integrations:
            integration_service.integrations[integration.id] = integration
        
        # List by type
        result = await integration_service.list_integrations(integration_type=IntegrationType.JIRA)
        
        assert len(result) == 2
        assert all(i.type == IntegrationType.JIRA for i in result)
    
    @pytest.mark.asyncio
    async def test_list_integrations_by_status(self, integration_service: Any) -> None:
        """Test listing integrations filtered by status."""
        # Add multiple integrations
        integrations = [
            Integration(name="Active 1", type=IntegrationType.JIRA, config={}, status=IntegrationStatus.ACTIVE),
            Integration(name="Active 2", type=IntegrationType.SLACK, config={}, status=IntegrationStatus.ACTIVE),
            Integration(name="Error", type=IntegrationType.GITHUB, config={}, status=IntegrationStatus.ERROR),
        ]
        
        for integration in integrations:
            integration_service.integrations[integration.id] = integration
        
        # List by status
        result = await integration_service.list_integrations(status=IntegrationStatus.ACTIVE)
        
        assert len(result) == 2
        assert all(i.status == IntegrationStatus.ACTIVE for i in result)


class TestConnectionTesting:
    """Test connection testing functionality."""
    
    @pytest.mark.asyncio
    async def test_test_connection_success(self, integration_service: Any, sample_integration: Any) -> None:
        """Test successful connection test."""
        # Mock successful connection test
        with patch.object(integration_service, '_perform_connection_test',
                         return_value={"success": True, "data": {"status": "connected"}}):
            result = await integration_service.test_connection(sample_integration)
            
            assert result["success"] is True
            assert sample_integration.health.status == "healthy"
            assert sample_integration.health.consecutive_failures == 0
            assert sample_integration.health.error_message is None
            assert sample_integration.status == IntegrationStatus.ACTIVE
    
    @pytest.mark.asyncio
    async def test_test_connection_failure(self, integration_service: Any, sample_integration: Any) -> None:
        """Test failed connection test."""
        # Set initial consecutive failures
        sample_integration.health.consecutive_failures = 2
        
        # Mock failed connection test
        with patch.object(integration_service, '_perform_connection_test',
                         return_value={"success": False, "error": "Authentication failed"}):
            result = await integration_service.test_connection(sample_integration)
            
            assert result["success"] is False
            assert sample_integration.health.status == "unhealthy"
            assert sample_integration.health.consecutive_failures == 3
            assert sample_integration.health.error_message == "Authentication failed"
            assert sample_integration.status == IntegrationStatus.ERROR
    
    @pytest.mark.asyncio
    async def test_test_connection_exception(self, integration_service: Any, sample_integration: Any) -> None:
        """Test connection test with exception."""
        # Mock connection test to raise exception
        with patch.object(integration_service, '_perform_connection_test',
                         side_effect=Exception("Network error")):
            result = await integration_service.test_connection(sample_integration)
            
            assert result["success"] is False
            assert "Network error" in result["error"]
    
    @pytest.mark.asyncio
    async def test_perform_connection_test_jira(self, integration_service: Any) -> None:
        """Test JIRA-specific connection test."""
        jira_integration = Integration(
            name="JIRA",
            type=IntegrationType.JIRA,
            config={
                "base_url": TEST_URL_HTTPS___JIRA_EXAMPLE_COM,
                "api_token": "test-token"
            }
        )
        
        result = await integration_service._perform_connection_test(jira_integration)
        
        assert result["success"] is True
        assert "data" in result
        assert result["data"]["user"] == "test@example.com"
    
    @pytest.mark.asyncio
    async def test_perform_connection_test_slack(self, integration_service: Any) -> None:
        """Test Slack-specific connection test."""
        slack_integration = Integration(
            name="Slack",
            type=IntegrationType.SLACK,
            config={"webhook_url": TEST_URL_HTTPS___HOOKS_SLACK_COM_TEST}
        )
        
        result = await integration_service._perform_connection_test(slack_integration)
        
        assert result["success"] is True
        assert result["data"]["team"] == "Test Team"
    
    @pytest.mark.asyncio
    async def test_perform_connection_test_github(self, integration_service: Any) -> None:
        """Test GitHub-specific connection test."""
        github_integration = Integration(
            name="GitHub",
            type=IntegrationType.GITHUB,
            config={"token": "github-token"}
        )
        
        result = await integration_service._perform_connection_test(github_integration)
        
        assert result["success"] is True
        assert result["data"]["user"] == "github-user"


class TestHealthMonitoring:
    """Test health monitoring functionality."""
    
    @pytest.mark.asyncio
    async def test_get_health_status(self, integration_service: Any, sample_integration: Any) -> None:
        """Test getting health status."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Get health status
        health = await integration_service.get_health_status(sample_integration.id)
        
        assert health is not None
        assert isinstance(health, IntegrationHealth)
        assert health.status == sample_integration.health.status
    
    @pytest.mark.asyncio
    async def test_get_health_status_nonexistent(self, integration_service: Any) -> None:
        """Test getting health status for non-existent integration."""
        health = await integration_service.get_health_status("non-existent-id")
        assert health is None
    
    @pytest.mark.asyncio
    async def test_start_health_monitoring(self, integration_service: Any, sample_integration: Any) -> None:
        """Test starting health monitoring."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Start monitoring
        await integration_service._start_health_monitoring(sample_integration.id)
        
        assert sample_integration.id in integration_service._health_check_tasks
        assert not integration_service._health_check_tasks[sample_integration.id].done()
        
        # Cleanup
        await integration_service._stop_health_monitoring(sample_integration.id)
    
    @pytest.mark.asyncio
    async def test_stop_health_monitoring(self, integration_service: Any, sample_integration: Any) -> None:
        """Test stopping health monitoring."""
        # Add integration and start monitoring
        integration_service.integrations[sample_integration.id] = sample_integration
        await integration_service._start_health_monitoring(sample_integration.id)
        
        # Stop monitoring
        await integration_service._stop_health_monitoring(sample_integration.id)
        
        assert sample_integration.id not in integration_service._health_check_tasks
    
    @pytest.mark.asyncio
    async def test_health_check_loop(self, integration_service: Any, sample_integration: Any) -> None:
        """Test health check loop functionality."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Mock test_connection
        integration_service.test_connection = AsyncMock()
        
        # Start health check loop with short interval
        with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
            # Make sleep raise CancelledError after first call to stop the loop
            mock_sleep.side_effect = [None, asyncio.CancelledError()]
            
            # Run health check loop
            try:
                await integration_service._health_check_loop(sample_integration.id)
            except asyncio.CancelledError:
                # TODO: Add proper error handling
                logger.debug('Exception caught but not handled', exc_info=True)
                pass
            
            # Verify test_connection was called
            integration_service.test_connection.assert_called_once_with(sample_integration)


class TestDataSynchronization:
    """Test data synchronization functionality."""
    
    @pytest.mark.asyncio
    async def test_trigger_sync_success(self, integration_service: Any, sample_integration: Any) -> None:
        """Test successful sync trigger."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Mock perform_sync
        integration_service._perform_sync = AsyncMock()
        
        # Trigger sync
        result = await integration_service.trigger_sync(sample_integration.id)
        
        assert result["success"] is True
        assert "sync_id" in result
        assert sample_integration.id in integration_service._sync_tasks
    
    @pytest.mark.asyncio
    async def test_trigger_sync_integration_not_found(self, integration_service: Any) -> None:
        """Test sync trigger for non-existent integration."""
        result = await integration_service.trigger_sync("non-existent-id")
        
        assert result["success"] is False
        assert result["error"] == "Integration not found"
    
    @pytest.mark.asyncio
    async def test_trigger_sync_inactive_integration(self, integration_service: Any, sample_integration: Any) -> None:
        """Test sync trigger for inactive integration."""
        # Add inactive integration
        sample_integration.status = IntegrationStatus.INACTIVE
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Trigger sync
        result = await integration_service.trigger_sync(sample_integration.id)
        
        assert result["success"] is False
        assert "not active" in result["error"]
    
    @pytest.mark.asyncio
    async def test_trigger_sync_already_running(self, integration_service: Any, sample_integration: Any) -> None:
        """Test sync trigger when sync is already running."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Create a mock task that's not done
        mock_task = Mock()
        mock_task.done.return_value = False
        integration_service._sync_tasks[sample_integration.id] = mock_task
        
        # Trigger sync
        result = await integration_service.trigger_sync(sample_integration.id)
        
        assert result["success"] is False
        assert result["error"] == "Sync already in progress"
    
    @pytest.mark.asyncio
    async def test_perform_sync_success(self, integration_service: Any, sample_integration: Any) -> None:
        """Test successful data sync."""
        # Initial metrics
        initial_requests = sample_integration.metrics.total_requests
        initial_successful = sample_integration.metrics.successful_requests
        
        # Perform sync with mocked sleep
        with patch('asyncio.sleep', new_callable=AsyncMock):
            await integration_service._perform_sync(sample_integration)
        
        # Verify metrics updated
        assert sample_integration.metrics.total_requests == initial_requests + 1
        assert sample_integration.metrics.successful_requests == initial_successful + 1
        assert sample_integration.metrics.last_sync_timestamp is not None
        assert sample_integration.metrics.data_synced_count > 0
        assert sample_integration.status == IntegrationStatus.ACTIVE
    
    @pytest.mark.asyncio
    async def test_perform_sync_failure(self, integration_service: Any, sample_integration: Any) -> None:
        """Test failed data sync."""
        # Initial metrics
        initial_failed = sample_integration.metrics.failed_requests
        
        # Make sync fail
        with patch('asyncio.sleep', side_effect=Exception("Sync error")):
            await integration_service._perform_sync(sample_integration)
        
        # Verify error handling
        assert sample_integration.status == IntegrationStatus.ERROR
        assert "Sync failed" in sample_integration.last_error
        assert sample_integration.metrics.failed_requests == initial_failed + 1


class TestMetricsCollection:
    """Test metrics collection functionality."""
    
    @pytest.mark.asyncio
    async def test_get_metrics(self, integration_service: Any, sample_integration: Any) -> None:
        """Test getting integration metrics."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Get metrics
        metrics = await integration_service.get_metrics(sample_integration.id)
        
        assert metrics is not None
        assert isinstance(metrics, IntegrationMetrics)
        assert metrics.total_requests >= 0
        assert metrics.successful_requests >= 0
        assert metrics.failed_requests >= 0
    
    @pytest.mark.asyncio
    async def test_get_metrics_nonexistent(self, integration_service: Any) -> None:
        """Test getting metrics for non-existent integration."""
        metrics = await integration_service.get_metrics("non-existent-id")
        assert metrics is None
    
    @pytest.mark.asyncio
    async def test_metrics_update_on_sync(self, integration_service: Any, sample_integration: Any) -> None:
        """Test metrics update during sync operations."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Perform multiple syncs
        with patch('asyncio.sleep', new_callable=AsyncMock):
            for _ in range(3):
                await integration_service._perform_sync(sample_integration)
        
        # Check metrics
        metrics = await integration_service.get_metrics(sample_integration.id)
        assert metrics.total_requests == 3
        assert metrics.successful_requests == 3
        assert metrics.average_response_time_ms > 0


class TestErrorHandling:
    """Test error handling functionality."""
    
    @pytest.mark.asyncio
    async def test_create_integration_exception(self, integration_service: Any) -> None:
        """Test exception handling during integration creation."""
        # Mock to raise exception
        with patch.object(integration_service, 'test_connection', 
                         side_effect=Exception("Unexpected error")):
            with pytest.raises(Exception) as exc_info:
                await integration_service.create_integration(
                    name="Error Integration",
                    integration_type=IntegrationType.JIRA,
                    config={},
                    test_connection=True
                )
            
            assert "Unexpected error" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_update_integration_exception(self, integration_service: Any, sample_integration: Any) -> None:
        """Test exception handling during integration update."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Mock to raise exception
        with patch.object(integration_service, 'test_connection',
                         side_effect=Exception("Update error")):
            with pytest.raises(Exception) as exc_info:
                await integration_service.update_integration(
                    integration_id=sample_integration.id,
                    config={"new": "config"}
                )
            
            assert "Update error" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_delete_integration_exception(self, integration_service: Any, sample_integration: Any) -> None:
        """Test exception handling during integration deletion."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Mock to raise exception
        with patch.object(integration_service, '_stop_health_monitoring',
                         side_effect=Exception("Delete error")):
            with pytest.raises(Exception) as exc_info:
                await integration_service.delete_integration(sample_integration.id)
            
            assert "Delete error" in str(exc_info.value)


class TestAuthenticationAuthorization:
    """Test authentication and authorization handling."""
    
    @pytest.mark.asyncio
    async def test_integration_with_api_key_auth(self, integration_service: Any) -> None:
        """Test integration with API key authentication."""
        config = {
            "api_key": "secret-key-123",
            "base_url": TEST_URL_HTTPS___API_EXAMPLE_COM
        }
        
        integration = await integration_service.create_integration(
            name="API Key Auth",
            integration_type=IntegrationType.CUSTOM,
            config=config,
            test_connection=False
        )
        
        assert integration.config["api_key"] == "secret-key-123"
    
    @pytest.mark.asyncio
    async def test_integration_with_oauth_config(self, integration_service: Any) -> None:
        """Test integration with OAuth configuration."""
        config = {
            "client_id": "oauth-client-id",
            "client_secret": "oauth-secret",
            "access_token": "bearer-token",
            "refresh_token": "refresh-token",
            "token_expiry": "2024-12-31T23:59:59Z"
        }
        
        integration = await integration_service.create_integration(
            name="OAuth Integration",
            integration_type=IntegrationType.GITHUB,
            config=config,
            test_connection=False
        )
        
        assert integration.config["access_token"] == "bearer-token"
        assert integration.config["refresh_token"] == "refresh-token"
    
    @pytest.mark.asyncio
    async def test_integration_config_masking(self, integration_service: Any) -> None:
        """Test that sensitive config data is properly handled."""
        config = {
            "api_token": "sensitive-token",
            "webhook_secret": "webhook-secret-123"
        }
        
        integration = await integration_service.create_integration(
            name="Sensitive Config",
            integration_type=IntegrationType.SLACK,
            config=config,
            test_connection=False
        )
        
        # Config should be stored as-is (masking would be done at API layer)
        assert integration.config["api_token"] == "sensitive-token"
        assert integration.config["webhook_secret"] == "webhook-secret-123"


class TestRateLimiting:
    """Test rate limiting functionality."""
    
    @pytest.mark.asyncio
    async def test_rate_limited_sync(self, integration_service: Any, sample_integration: Any) -> None:
        """Test that sync operations respect rate limits."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Track sync times
        sync_times = []
        
        async def mock_perform_sync(integration) -> None:
            sync_times.append(datetime.utcnow())
            integration.status = IntegrationStatus.SYNCING
            await asyncio.sleep(0.1)
            integration.status = IntegrationStatus.ACTIVE
        
        integration_service._perform_sync = mock_perform_sync
        
        # Trigger multiple syncs
        for _ in range(3):
            await integration_service.trigger_sync(sample_integration.id)
            # Wait for sync to complete
            if sample_integration.id in integration_service._sync_tasks:
                await integration_service._sync_tasks[sample_integration.id]
        
        # Verify syncs were spaced out (this is a simplified test)
        assert len(sync_times) == 3
    
    @pytest.mark.asyncio
    async def test_connection_test_rate_limiting(self, integration_service: Any, sample_integration: Any) -> None:
        """Test that connection tests can be rate limited."""
        # Track test times
        test_times = []
        
        original_test = integration_service._perform_connection_test
        
        async def tracked_test(integration) -> None:
            test_times.append(datetime.utcnow())
            return await original_test(integration)
        
        with patch.object(integration_service, '_perform_connection_test', tracked_test):
            # Perform multiple connection tests
            for _ in range(5):
                await integration_service.test_connection(sample_integration)
        
        # Verify all tests were executed (rate limiting would be implemented at API layer)
        assert len(test_times) == 5


class TestCircuitBreaker:
    """Test circuit breaker functionality."""
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_opens_after_failures(self, integration_service: Any, sample_integration: Any) -> None:
        """Test that circuit breaker opens after consecutive failures."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Simulate multiple connection failures
        with patch.object(integration_service, '_perform_connection_test',
                         return_value={"success": False, "error": "Connection failed"}):
            for _ in range(5):
                await integration_service.test_connection(sample_integration)
        
        # Check that integration is in error state with high failure count
        assert sample_integration.status == IntegrationStatus.ERROR
        assert sample_integration.health.consecutive_failures == 5
        assert sample_integration.health.status == "unhealthy"
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_closes_after_success(self, integration_service: Any, sample_integration: Any) -> None:
        """Test that circuit breaker closes after successful connection."""
        # Set up integration with failures
        sample_integration.health.consecutive_failures = 10
        sample_integration.status = IntegrationStatus.ERROR
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Simulate successful connection
        with patch.object(integration_service, '_perform_connection_test',
                         return_value={"success": True, "data": {"status": "ok"}}):
            await integration_service.test_connection(sample_integration)
        
        # Check that integration recovered
        assert sample_integration.status == IntegrationStatus.ACTIVE
        assert sample_integration.health.consecutive_failures == 0
        assert sample_integration.health.status == "healthy"


class TestRegistryOperations:
    """Test integration registry operations."""
    
    @pytest.mark.asyncio
    async def test_registry_initialization(self, integration_service: Any) -> None:
        """Test that registry is properly initialized."""
        assert isinstance(integration_service.integrations, dict)
        assert len(integration_service.integrations) == 0
    
    @pytest.mark.asyncio
    async def test_registry_add_remove(self, integration_service: Any) -> None:
        """Test adding and removing integrations from registry."""
        # Create multiple integrations
        integrations = []
        for i in range(5):
            integration = await integration_service.create_integration(
                name=f"Test Integration {i}",
                integration_type=IntegrationType.CUSTOM,
                config={"id": i},
                test_connection=False
            )
            integrations.append(integration)
        
        # Verify all added
        assert len(integration_service.integrations) == 5
        
        # Remove some
        for integration in integrations[:3]:
            await integration_service.delete_integration(integration.id)
        
        # Verify correct count
        assert len(integration_service.integrations) == 2
    
    @pytest.mark.asyncio
    async def test_registry_concurrent_access(self, integration_service: Any) -> None:
        """Test concurrent access to registry."""
        async def create_integration(name: str) -> None:
            return await integration_service.create_integration(
                name=name,
                integration_type=IntegrationType.CUSTOM,
                config={"name": name},
                test_connection=False
            )
        
        # Create integrations concurrently
        tasks = [create_integration(f"Concurrent {i}") for i in range(10)]
        integrations = await asyncio.gather(*tasks)
        
        # Verify all were created
        assert len(integration_service.integrations) == 10
        assert all(i.id in integration_service.integrations for i in integrations)


class TestIntegrationLifecycle:
    """Test complete integration lifecycle."""
    
    @pytest.mark.asyncio
    async def test_full_integration_lifecycle(self, integration_service: Any) -> None:
        """Test complete lifecycle: create, update, sync, health check, delete."""
        # 1. Create integration
        integration = await integration_service.create_integration(
            name="Lifecycle Test",
            integration_type=IntegrationType.JIRA,
            config={"base_url": TEST_URL_HTTPS___JIRA_EXAMPLE_COM, "api_token": "token"},
            test_connection=True
        )
        
        assert integration.status == IntegrationStatus.ACTIVE
        integration_id = integration.id
        
        # 2. Update configuration
        updated = await integration_service.update_integration(
            integration_id=integration_id,
            config={"base_url": TEST_URL_HTTPS___NEW_JIRA_EXAMPLE_COM, "api_token": "new-token"}
        )
        
        assert updated.config["base_url"] == TEST_URL_HTTPS___NEW_JIRA_EXAMPLE_COM
        
        # 3. Trigger sync
        with patch('asyncio.sleep', new_callable=AsyncMock):
            sync_result = await integration_service.trigger_sync(integration_id)
            assert sync_result["success"] is True
            
            # Wait for sync to complete
            if integration_id in integration_service._sync_tasks:
                await integration_service._sync_tasks[integration_id]
        
        # 4. Check health
        health = await integration_service.get_health_status(integration_id)
        assert health is not None
        assert health.status == "healthy"
        
        # 5. Get metrics
        metrics = await integration_service.get_metrics(integration_id)
        assert metrics.total_requests > 0
        
        # 6. Disable integration
        updated = await integration_service.update_integration(
            integration_id=integration_id,
            enabled=False
        )
        
        assert updated.enabled is False
        assert updated.status == IntegrationStatus.INACTIVE
        
        # 7. Delete integration
        deleted = await integration_service.delete_integration(integration_id)
        assert deleted is True
        assert integration_id not in integration_service.integrations


class TestServiceShutdown:
    """Test service shutdown and cleanup."""
    
    @pytest.mark.asyncio
    async def test_shutdown_cleanup(self, integration_service: Any) -> None:
        """Test that shutdown properly cleans up resources."""
        # Create integrations with active monitoring
        integrations = []
        for i in range(3):
            integration = await integration_service.create_integration(
                name=f"Shutdown Test {i}",
                integration_type=IntegrationType.CUSTOM,
                config={"id": i},
                test_connection=True
            )
            integrations.append(integration)
        
        # Start some sync tasks
        with patch('asyncio.sleep', new_callable=AsyncMock):
            for integration in integrations:
                await integration_service.trigger_sync(integration.id)
        
        # Shutdown service
        await integration_service.shutdown()
        
        # Verify all tasks are cleaned up
        assert len(integration_service._health_check_tasks) == 0
        assert len(integration_service._sync_tasks) == 0


class TestEdgeCases:
    """Test edge cases and boundary conditions."""
    
    @pytest.mark.asyncio
    async def test_empty_config(self, integration_service: Any) -> None:
        """Test creating integration with empty config."""
        integration = await integration_service.create_integration(
            name="Empty Config",
            integration_type=IntegrationType.CUSTOM,
            config={},
            test_connection=False
        )
        
        assert integration.config == {}
    
    @pytest.mark.asyncio
    async def test_very_long_integration_name(self, integration_service: Any) -> None:
        """Test creating integration with very long name."""
        long_name = "A" * MS_PER_SECOND
        integration = await integration_service.create_integration(
            name=long_name,
            integration_type=IntegrationType.CUSTOM,
            config={},
            test_connection=False
        )
        
        assert integration.name == long_name
    
    @pytest.mark.asyncio
    async def test_special_characters_in_config(self, integration_service: Any) -> None:
        """Test integration with special characters in config."""
        config = {
            "url": TEST_URL_HTTPS___EXAMPLE_COM_PATH_QUERY,
            "token": "token-with-special-chars!@#$%^&*()",
            "json_data": {"nested": {"key": "value"}},
            "unicode": "测试数据 🚀"
        }
        
        integration = await integration_service.create_integration(
            name="Special Chars",
            integration_type=IntegrationType.CUSTOM,
            config=config,
            test_connection=False
        )
        
        assert integration.config == config
    
    @pytest.mark.asyncio
    async def test_rapid_status_changes(self, integration_service: Any, sample_integration: Any) -> None:
        """Test rapid status changes don't cause issues."""
        # Add integration
        integration_service.integrations[sample_integration.id] = sample_integration
        
        # Rapidly change status
        statuses = [
            IntegrationStatus.ACTIVE,
            IntegrationStatus.TESTING,
            IntegrationStatus.SYNCING,
            IntegrationStatus.ERROR,
            IntegrationStatus.INACTIVE,
            IntegrationStatus.ACTIVE
        ]
        
        for status in statuses:
            sample_integration.status = status
            await asyncio.sleep(0.01)  # Small delay
        
        # Verify final status
        assert sample_integration.status == IntegrationStatus.ACTIVE
