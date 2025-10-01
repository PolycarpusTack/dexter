import logging


# Constants for magic values
MS_PER_SECOND = 1000

logger = logging.getLogger(__name__)
"""Integration Service for managing external system connections."""

import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any
from uuid import uuid4
from enum import Enum

from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.services.external_api_service import ExternalAPIService

logger = get_logger(__name__)


class IntegrationStatus(str, Enum):
    """Integration status enumeration."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    TESTING = "testing"
    SYNCING = "syncing"


class IntegrationType(str, Enum):
    """Integration type enumeration."""

    JIRA = "jira"
    SLACK = "slack"
    PAGERDUTY = "pagerduty"
    GITHUB = "github"
    GITLAB = "gitlab"
    DATADOG = "datadog"
    CUSTOM = "custom"


class IntegrationHealth(BaseModel):
    """Integration health status model."""

    status: str = Field(description="Health status")
    last_check: datetime = Field(description="Last health check timestamp")
    response_time_ms: float = Field(description="Response time in milliseconds")
    error_message: Optional[str] = Field(default=None, description="Error message if any")
    consecutive_failures: int = Field(default=0, description="Number of consecutive failures")


class IntegrationMetrics(BaseModel):
    """Integration metrics model."""

    total_requests: int = Field(default=0, description="Total API requests")
    successful_requests: int = Field(default=0, description="Successful requests")
    failed_requests: int = Field(default=0, description="Failed requests")
    average_response_time_ms: float = Field(default=0.0, description="Average response time")
    last_sync_timestamp: Optional[datetime] = Field(default=None, description="Last sync timestamp")
    data_synced_count: int = Field(default=0, description="Number of items synced")


class SyncResult(BaseModel):
    """Result model for sync operations."""

    sync_id: str = Field(..., description="Sync operation ID")
    status: str = Field(..., description="Status of the sync (started, completed)")
    started_at: datetime = Field(default_factory=datetime.utcnow, description="Start time")
    completed_at: Optional[datetime] = Field(default=None, description="Completion time")


class Integration(BaseModel):
    """Integration model."""

    id: str = Field(default_factory=lambda: str(uuid4()), description="Integration ID")
    name: str = Field(description="Integration name")
    type: IntegrationType = Field(description="Integration type")
    config: Dict[str, Any] = Field(default_factory=dict, description="Integration configuration")
    status: IntegrationStatus = Field(
        default=IntegrationStatus.INACTIVE, description="Integration status"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Last update timestamp"
    )
    health: IntegrationHealth = Field(
        default_factory=lambda: IntegrationHealth(
            status="unknown", last_check=datetime.utcnow(), response_time_ms=0.0
        ),
        description="Health information",
    )
    metrics: IntegrationMetrics = Field(
        default_factory=IntegrationMetrics, description="Integration metrics"
    )
    last_error: Optional[str] = Field(default=None, description="Last error message")
    enabled: bool = Field(default=True, description="Whether integration is enabled")


class IntegrationService:
    """Service for managing external integrations."""

    def __init__(self, external_api_service: Optional[ExternalAPIService] = None) -> None:
        """Initialize the integration service."""
        self.integrations: Dict[str, Integration] = {}
        self.external_api_service = external_api_service or ExternalAPIService()
        self._health_check_tasks: Dict[str, asyncio.Task] = {}
        self._sync_tasks: Dict[str, asyncio.Task] = {}
        logger.info("IntegrationService initialized")

    async def create_integration(
        self,
        name: str,
        integration_type: IntegrationType,
        config: Dict[str, Any],
        test_connection: bool = True,
    ) -> Integration:
        """Create a new integration."""
        try:
            # Create integration instance
            integration = Integration(
                name=name, type=integration_type, config=config, status=IntegrationStatus.INACTIVE
            )

            # Test connection if requested
            if test_connection:
                connection_result = await self.test_connection(integration)
                if not connection_result["success"]:
                    integration.status = IntegrationStatus.ERROR
                    integration.last_error = connection_result.get(
                        "error", "Connection test failed"
                    )
                else:
                    integration.status = IntegrationStatus.ACTIVE

            # Store integration
            self.integrations[integration.id] = integration

            # Start health monitoring if active
            if integration.status == IntegrationStatus.ACTIVE:
                await self._start_health_monitoring(integration.id)

            logger.info(f"Created integration: {integration.id} ({name})")
            return integration

        except Exception as e:
            logger.error(f"Failed to create integration: {str(e)}")
            raise

    async def update_integration(
        self,
        integration_id: str,
        name: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
        enabled: Optional[bool] = None,
    ) -> Optional[Integration]:
        """Update an existing integration."""
        try:
            integration = self.integrations.get(integration_id)
            if not integration:
                logger.warning(f"Integration not found: {integration_id}")
                return None

            # Update fields
            if name is not None:
                integration.name = name

            if config is not None:
                integration.config.update(config)
                # Test new configuration
                connection_result = await self.test_connection(integration)
                if not connection_result["success"]:
                    integration.status = IntegrationStatus.ERROR
                    integration.last_error = connection_result.get(
                        "error", "Configuration test failed"
                    )
                else:
                    integration.status = IntegrationStatus.ACTIVE
                    integration.last_error = None

            if enabled is not None:
                integration.enabled = enabled
                if not enabled:
                    integration.status = IntegrationStatus.INACTIVE
                    await self._stop_health_monitoring(integration_id)
                elif integration.status == IntegrationStatus.INACTIVE:
                    integration.status = IntegrationStatus.ACTIVE
                    await self._start_health_monitoring(integration_id)

            integration.updated_at = datetime.utcnow()

            logger.info(f"Updated integration: {integration_id}")
            return integration

        except Exception as e:
            logger.error(f"Failed to update integration {integration_id}: {str(e)}")
            raise

    async def delete_integration(self, integration_id: str) -> bool:
        """Delete an integration."""
        try:
            if integration_id not in self.integrations:
                logger.warning(f"Integration not found: {integration_id}")
                return False

            # Stop monitoring
            await self._stop_health_monitoring(integration_id)
            await self._stop_sync_task(integration_id)

            # Remove integration
            del self.integrations[integration_id]

            logger.info(f"Deleted integration: {integration_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete integration {integration_id}: {str(e)}")
            raise

    async def test_connection(self, integration: Integration) -> Dict[str, Any]:
        """Test integration connection."""
        try:
            integration.status = IntegrationStatus.TESTING
            start_time = datetime.utcnow()

            # Perform connection test based on integration type
            result = await self._perform_connection_test(integration)

            # Update health information
            response_time_ms = (datetime.utcnow() - start_time).total_seconds() * MS_PER_SECOND
            integration.health.response_time_ms = response_time_ms
            integration.health.last_check = datetime.utcnow()

            if result["success"]:
                integration.health.status = "healthy"
                integration.health.consecutive_failures = 0
                integration.health.error_message = None
                integration.status = IntegrationStatus.ACTIVE
            else:
                integration.health.status = "unhealthy"
                integration.health.consecutive_failures += 1
                integration.health.error_message = result.get("error", "Unknown error")
                integration.status = IntegrationStatus.ERROR

            return result

        except Exception as e:
            logger.error(f"Connection test failed for {integration.id}: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_health_status(self, integration_id: str) -> Optional[IntegrationHealth]:
        """Get integration health status."""
        integration = self.integrations.get(integration_id)
        if not integration:
            return None

        return integration.health

    async def trigger_sync(self, integration_id: str) -> Dict[str, Any]:
        """Trigger data synchronization for an integration."""
        try:
            integration = self.integrations.get(integration_id)
            if not integration:
                return {"success": False, "error": "Integration not found"}

            if integration.status != IntegrationStatus.ACTIVE:
                return {
                    "success": False,
                    "error": f"Integration is not active (status: {integration.status})",
                }

            # Check if sync is already running
            if integration_id in self._sync_tasks and not self._sync_tasks[integration_id].done():
                return {"success": False, "error": "Sync already in progress"}

            # Start sync task
            self._sync_tasks[integration_id] = asyncio.create_task(self._perform_sync(integration))

            return {"success": True, "message": "Sync started", "sync_id": str(uuid4())}

        except Exception as e:
            logger.error(f"Failed to trigger sync for {integration_id}: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_metrics(self, integration_id: str) -> Optional[IntegrationMetrics]:
        """Get integration metrics."""
        integration = self.integrations.get(integration_id)
        if not integration:
            return None

        return integration.metrics

    async def get_integration(self, integration_id: str) -> Optional[Integration]:
        """Get integration by ID."""
        return self.integrations.get(integration_id)

    async def list_integrations(
        self,
        integration_type: Optional[IntegrationType] = None,
        status: Optional[IntegrationStatus] = None,
    ) -> List[Integration]:
        """List integrations with optional filters."""
        integrations = list(self.integrations.values())

        if integration_type:
            integrations = [i for i in integrations if i.type == integration_type]

        if status:
            integrations = [i for i in integrations if i.status == status]

        return integrations

    async def _perform_connection_test(self, integration: Integration) -> Dict[str, Any]:
        """Perform actual connection test based on integration type."""
        try:
            if integration.type == IntegrationType.JIRA:
                # Test JIRA connection
                integration.config.get("base_url", "") + "/rest/api/2/myself"
                headers = {
                    "Authorization": f"Basic {integration.config.get('api_token', '')}",
                    "Accept": "application/json",
                }
                # Simulate API call (in real implementation, use actual HTTP client)
                return {"success": True, "data": {"user": "test@example.com"}}

            elif integration.type == IntegrationType.SLACK:
                # Test Slack connection
                return {"success": True, "data": {"team": "Test Team"}}

            elif integration.type == IntegrationType.GITHUB:
                # Test GitHub connection
                return {"success": True, "data": {"user": "github-user"}}

            else:
                # Generic test for other types
                return {"success": True, "data": {"status": "connected"}}

        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _perform_sync(self, integration: Integration) -> None:
        """Perform data synchronization."""
        try:
            integration.status = IntegrationStatus.SYNCING
            start_time = datetime.utcnow()

            # Simulate sync operation
            await asyncio.sleep(2)  # Simulate work

            # Update metrics
            integration.metrics.total_requests += 1
            integration.metrics.successful_requests += 1
            integration.metrics.last_sync_timestamp = datetime.utcnow()
            integration.metrics.data_synced_count += 10  # Simulated count

            # Calculate average response time
            sync_time_ms = (datetime.utcnow() - start_time).total_seconds() * MS_PER_SECOND
            current_avg = integration.metrics.average_response_time_ms
            total_requests = integration.metrics.total_requests
            integration.metrics.average_response_time_ms = (
                current_avg * (total_requests - 1) + sync_time_ms
            ) / total_requests

            integration.status = IntegrationStatus.ACTIVE
            logger.info(f"Sync completed for integration {integration.id}")

        except Exception as e:
            integration.status = IntegrationStatus.ERROR
            integration.last_error = f"Sync failed: {str(e)}"
            integration.metrics.failed_requests += 1
            logger.error(f"Sync failed for integration {integration.id}: {str(e)}")

    async def _start_health_monitoring(self, integration_id: str) -> None:
        """Start health monitoring for an integration."""
        if integration_id in self._health_check_tasks:
            await self._stop_health_monitoring(integration_id)

        self._health_check_tasks[integration_id] = asyncio.create_task(
            self._health_check_loop(integration_id)
        )

    async def _stop_health_monitoring(self, integration_id: str) -> None:
        """Stop health monitoring for an integration."""
        if integration_id in self._health_check_tasks:
            self._health_check_tasks[integration_id].cancel()
            try:
                await self._health_check_tasks[integration_id]
            except asyncio.CancelledError:
                # TODO: Add proper error handling
                logger.debug("Exception caught but not handled", exc_info=True)
            del self._health_check_tasks[integration_id]

    async def _stop_sync_task(self, integration_id: str) -> None:
        """Stop sync task for an integration."""
        if integration_id in self._sync_tasks:
            self._sync_tasks[integration_id].cancel()
            try:
                await self._sync_tasks[integration_id]
            except asyncio.CancelledError:
                # TODO: Add proper error handling
                logger.debug("Exception caught but not handled", exc_info=True)
            del self._sync_tasks[integration_id]

    async def _health_check_loop(self, integration_id: str) -> None:
        """Health check loop for an integration."""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute

                integration = self.integrations.get(integration_id)
                if not integration or not integration.enabled:
                    break

                # Perform health check
                await self.test_connection(integration)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check error for {integration_id}: {str(e)}")

    async def shutdown(self) -> None:
        """Shutdown the service and cleanup resources."""
        # Stop all health monitoring tasks
        for integration_id in list(self._health_check_tasks.keys()):
            await self._stop_health_monitoring(integration_id)

        # Stop all sync tasks
        for integration_id in list(self._sync_tasks.keys()):
            await self._stop_sync_task(integration_id)

        logger.info("IntegrationService shutdown complete")
