"""
Integration Framework API Router

This module provides RESTful API endpoints for managing external integrations
including CRUD operations, health monitoring, and data synchronization.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query
from pydantic import BaseModel, Field, validator
from starlette.status import (
    HTTP_200_OK,
    HTTP_201_CREATED,
    HTTP_204_NO_CONTENT,
    HTTP_400_BAD_REQUEST,
    HTTP_404_NOT_FOUND,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from app.core.logging import get_logger
from app.dependencies import get_current_user
from app.models.auth import User
from app.services.integration_service import Integration as ServiceIntegration
from app.services.integration_service import IntegrationService, IntegrationStatus
from app.services.integration_service import IntegrationType as ServiceIntegrationType

logger = get_logger(__name__)

router = APIRouter()

# Create integration service instance
integration_service = IntegrationService()


# Pydantic Models for API
class IntegrationType(BaseModel):
    """Available integration type model"""

    type_id: str = Field(..., description="Unique identifier for the integration type")
    name: str = Field(..., description="Human-readable name")
    description: str = Field(..., description="Description of the integration")
    category: str = Field(
        ..., description="Category (e.g., 'issue_tracking', 'monitoring', 'analytics')"
    )
    supported_features: List[str] = Field(
        default_factory=list, description="List of supported features"
    )
    required_fields: Dict[str, str] = Field(
        default_factory=dict, description="Required configuration fields"
    )
    optional_fields: Dict[str, str] = Field(
        default_factory=dict, description="Optional configuration fields"
    )


class IntegrationConfig(BaseModel):
    """Integration configuration model"""

    name: str = Field(..., description="Name of the integration instance")
    type_id: str = Field(..., description="Type of integration")
    description: Optional[str] = Field(None, description="Description of this integration instance")
    config: Dict[str, Any] = Field(..., description="Configuration parameters")
    enabled: bool = Field(True, description="Whether the integration is enabled")

    @validator("config")
    def validate_config_fields(cls, v, values) -> None:
        """Validate that required fields are present in config"""
        type_id = values.get("type_id")
        if type_id:
            # In a real implementation, we would check against actual required fields
            # For now, just ensure config is not empty
            if not v:
                raise ValueError(f"Configuration cannot be empty for integration type {type_id}")
        return v


class Integration(BaseModel):
    """Integration model with full details"""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Integration name")
    type_id: str = Field(..., description="Integration type")
    description: Optional[str] = Field(None, description="Description")
    config: Dict[str, Any] = Field(..., description="Configuration (sensitive data masked)")
    enabled: bool = Field(..., description="Whether the integration is enabled")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    created_by: str = Field(..., description="User who created the integration")
    status: str = Field(..., description="Current status")
    last_sync: Optional[datetime] = Field(None, description="Last synchronization timestamp")
    error_message: Optional[str] = Field(None, description="Last error message if any")


class IntegrationUpdate(BaseModel):
    """Integration update model"""

    name: Optional[str] = Field(None, description="New name")
    description: Optional[str] = Field(None, description="New description")
    config: Optional[Dict[str, Any]] = Field(None, description="Updated configuration")
    enabled: Optional[bool] = Field(None, description="Enable/disable integration")


class TestResult(BaseModel):
    """Connection test result"""

    success: bool = Field(..., description="Whether the test was successful")
    message: str = Field(..., description="Test result message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional test details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Test timestamp")


class HealthStatus(BaseModel):
    """Integration health status"""

    status: str = Field(..., description="Health status (healthy, degraded, unhealthy)")
    last_check: datetime = Field(..., description="Last health check timestamp")
    response_time_ms: Optional[float] = Field(
        None, description="Last response time in milliseconds"
    )
    error_count: int = Field(0, description="Recent error count")
    success_rate: float = Field(..., description="Recent success rate (0.0-1.0)")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional health details")


class SyncResult(BaseModel):
    """Data synchronization result"""

    sync_id: str = Field(..., description="Unique sync operation ID")
    status: str = Field(..., description="Sync status (in_progress, completed, failed)")
    started_at: datetime = Field(..., description="Sync start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Sync completion timestamp")
    records_synced: int = Field(0, description="Number of records synchronized")
    errors: List[str] = Field(default_factory=list, description="List of errors if any")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional sync details")


class IntegrationMetricsResponse(BaseModel):
    """Integration metrics response"""

    integration_id: str = Field(..., description="Integration ID")
    period: str = Field(..., description="Metrics period")
    request_count: int = Field(..., description="Total requests in period")
    error_count: int = Field(..., description="Total errors in period")
    average_response_time_ms: float = Field(..., description="Average response time")
    success_rate: float = Field(..., description="Success rate (0.0-1.0)")
    last_sync: Optional[datetime] = Field(None, description="Last sync timestamp")
    data_synced: int = Field(0, description="Total data synced in period")


# Integration type definitions
INTEGRATION_TYPES = {
    ServiceIntegrationType.JIRA: IntegrationType(
        type_id="jira",
        name="Jira",
        description="Atlassian Jira issue tracking integration",
        category="issue_tracking",
        supported_features=["issue_sync", "comment_sync", "status_updates", "webhooks"],
        required_fields={
            "base_url": "Jira instance URL",
            "api_token": "API Token",
            "email": "User email",
        },
        optional_fields={
            "project_key": "Default project key",
            "issue_types": "Issue types to sync",
        },
    ),
    ServiceIntegrationType.GITHUB: IntegrationType(
        type_id="github",
        name="GitHub",
        description="GitHub repository integration",
        category="version_control",
        supported_features=["issue_sync", "pr_sync", "commit_tracking"],
        required_fields={
            "api_token": "GitHub Personal Access Token",
            "repository": "Repository (owner/name)",
        },
        optional_fields={"webhook_secret": "Webhook secret for real-time updates"},
    ),
    ServiceIntegrationType.SLACK: IntegrationType(
        type_id="slack",
        name="Slack",
        description="Slack messaging integration",
        category="communication",
        supported_features=["notifications", "alerts", "commands"],
        required_fields={"webhook_url": "Slack Webhook URL"},
        optional_fields={"channel": "Default channel", "username": "Bot username"},
    ),
    ServiceIntegrationType.PAGERDUTY: IntegrationType(
        type_id="pagerduty",
        name="PagerDuty",
        description="PagerDuty incident management integration",
        category="monitoring",
        supported_features=["incident_sync", "alert_routing", "escalation"],
        required_fields={"api_key": "PagerDuty API Key", "service_id": "Service ID"},
        optional_fields={"escalation_policy": "Escalation policy ID"},
    ),
    ServiceIntegrationType.DATADOG: IntegrationType(
        type_id="datadog",
        name="Datadog",
        description="Datadog monitoring integration",
        category="monitoring",
        supported_features=["metrics_sync", "logs_sync", "apm_traces"],
        required_fields={"api_key": "Datadog API Key", "app_key": "Application Key"},
        optional_fields={"site": "Datadog site (e.g., datadoghq.com)", "tags": "Default tags"},
    ),
}


def convert_service_integration(integration: ServiceIntegration) -> Integration:
    """Convert service integration to API integration model"""
    # Mask sensitive configuration data
    masked_config = {}
    for k, v in integration.config.items():
        if k in ["api_key", "api_token", "secret", "password", "webhook_url"]:
            masked_config[k] = "***" if v else None
        else:
            masked_config[k] = v

    return Integration(
        id=integration.id,
        name=integration.name,
        type_id=integration.type_id.value,
        description=integration.description,
        config=masked_config,
        enabled=integration.enabled,
        created_at=integration.created_at,
        updated_at=integration.updated_at,
        created_by=integration.created_by,
        status=integration.status.value,
        last_sync=integration.last_sync,
        error_message=integration.error_message,
    )


@router.get(
    "",
    response_model=List[Integration],
    status_code=HTTP_200_OK,
    summary="List all integrations",
    description="Retrieve a list of all configured integrations with optional filtering",
)
async def list_integrations(
    enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    type_id: Optional[str] = Query(None, description="Filter by integration type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
) -> List[Integration]:
    """List all configured integrations with optional filtering"""
    try:
        # Convert string parameters to enums if provided
        integration_type = None
        if type_id:
            try:
                integration_type = ServiceIntegrationType(type_id)
            except ValueError:
                raise HTTPException(
                    status_code=HTTP_400_BAD_REQUEST, detail=f"Invalid integration type: {type_id}"
                )

        integration_status = None
        if status:
            try:
                integration_status = IntegrationStatus(status)
            except ValueError:
                raise HTTPException(
                    status_code=HTTP_400_BAD_REQUEST, detail=f"Invalid status: {status}"
                )

        # Get integrations from service
        integrations = await integration_service.list_integrations(
            integration_type=integration_type, status=integration_status, enabled_only=enabled
        )

        # Convert to API models and apply pagination
        api_integrations = [convert_service_integration(i) for i in integrations]
        return api_integrations[offset : offset + limit]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing integrations: {str(e)}")
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list integrations"
        )


@router.post(
    "",
    response_model=Integration,
    status_code=HTTP_201_CREATED,
    summary="Create new integration",
    description="Create a new integration configuration",
)
async def create_integration(
    integration_config: IntegrationConfig = Body(..., description="Integration configuration"),
    test_connection: bool = Query(True, description="Test connection before creating"),
    current_user: User = Depends(get_current_user),
) -> Integration:
    """Create a new integration configuration"""
    try:
        # Convert type_id to enum
        try:
            integration_type = ServiceIntegrationType(integration_config.type_id)
        except ValueError:
            raise HTTPException(
                status_code=HTTP_400_BAD_REQUEST,
                detail=f"Invalid integration type: {integration_config.type_id}",
            )

        # Create integration
        integration = await integration_service.create_integration(
            name=integration_config.name,
            integration_type=integration_type,
            config=integration_config.config,
            description=integration_config.description,
            enabled=integration_config.enabled,
            created_by=current_user.email,
            test_connection=test_connection,
        )

        return convert_service_integration(integration)

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating integration: {str(e)}")
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create integration"
        )


@router.get(
    "/{integration_id}",
    response_model=Integration,
    status_code=HTTP_200_OK,
    summary="Get integration details",
    description="Retrieve details of a specific integration",
)
async def get_integration(
    integration_id: str = Path(..., description="Integration ID"),
    current_user: User = Depends(get_current_user),
) -> Integration:
    """Get details of a specific integration"""
    try:
        integration = await integration_service.get_integration(integration_id)
        if not integration:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail=f"Integration {integration_id} not found"
            )

        return convert_service_integration(integration)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting integration {integration_id}: {str(e)}")
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get integration"
        )


@router.put(
    "/{integration_id}",
    response_model=Integration,
    status_code=HTTP_200_OK,
    summary="Update integration",
    description="Update an existing integration configuration",
)
async def update_integration(
    integration_id: str = Path(..., description="Integration ID"),
    update_data: IntegrationUpdate = Body(..., description="Fields to update"),
    current_user: User = Depends(get_current_user),
) -> Integration:
    """Update an existing integration"""
    try:
        integration = await integration_service.update_integration(
            integration_id,
            name=update_data.name,
            config=update_data.config,
            description=update_data.description,
            enabled=update_data.enabled,
        )

        if not integration:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail=f"Integration {integration_id} not found"
            )

        return convert_service_integration(integration)

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating integration {integration_id}: {str(e)}")
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update integration"
        )


@router.delete(
    "/{integration_id}",
    status_code=HTTP_204_NO_CONTENT,
    summary="Delete integration",
    description="Delete an integration configuration",
)
async def delete_integration(
    integration_id: str = Path(..., description="Integration ID"),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete an integration configuration"""
    try:
        success = await integration_service.delete_integration(integration_id)
        if not success:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail=f"Integration {integration_id} not found"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting integration {integration_id}: {str(e)}")
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete integration"
        )


@router.post(
    "/{integration_id}/test",
    response_model=TestResult,
    status_code=HTTP_200_OK,
    summary="Test integration connection",
    description="Test the connection for a specific integration",
)
async def test_integration(
    integration_id: str = Path(..., description="Integration ID"),
    current_user: User = Depends(get_current_user),
) -> TestResult:
    """Test integration connection"""
    try:
        success, message, details = await integration_service.test_connection(integration_id)

        return TestResult(
            success=success, message=message, details=details, timestamp=datetime.utcnow()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing integration {integration_id}: {str(e)}")
        return TestResult(
            success=False, message=f"Test failed: {str(e)}", timestamp=datetime.utcnow()
        )


@router.get(
    "/{integration_id}/health",
    response_model=HealthStatus,
    status_code=HTTP_200_OK,
    summary="Get integration health",
    description="Get the current health status of an integration",
)
async def get_integration_health(
    integration_id: str = Path(..., description="Integration ID"),
    current_user: User = Depends(get_current_user),
) -> HealthStatus:
    """Get integration health status"""
    try:
        health = await integration_service.get_health_status(integration_id)
        if not health:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail=f"Integration {integration_id} not found"
            )

        return HealthStatus(
            status=health.status,
            last_check=health.last_check,
            response_time_ms=health.response_time_ms,
            error_count=health.error_count,
            success_rate=health.success_rate,
            details=health.details,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting health for integration {integration_id}: {str(e)}")
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get integration health"
        )


@router.post(
    "/{integration_id}/sync",
    response_model=SyncResult,
    status_code=HTTP_200_OK,
    summary="Trigger data sync",
    description="Trigger a data synchronization for the integration",
)
async def sync_integration(
    integration_id: str = Path(..., description="Integration ID"),
    force: bool = Query(False, description="Force sync even if recently synced"),
    current_user: User = Depends(get_current_user),
) -> SyncResult:
    """Trigger data synchronization"""
    try:
        sync_result = await integration_service.trigger_sync(integration_id, force=force)

        return SyncResult(
            sync_id=sync_result["sync_id"],
            status=sync_result["status"],
            started_at=sync_result["started_at"],
            completed_at=sync_result.get("completed_at"),
            records_synced=sync_result.get("records_synced", 0),
            errors=sync_result.get("errors", []),
            details=sync_result.get("details"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing integration {integration_id}: {str(e)}")
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to sync integration"
        )


@router.get(
    "/{integration_id}/metrics",
    response_model=IntegrationMetricsResponse,
    status_code=HTTP_200_OK,
    summary="Get integration metrics",
    description="Get usage and performance metrics for an integration",
)
async def get_integration_metrics(
    integration_id: str = Path(..., description="Integration ID"),
    period: str = Query("24h", regex="^(1h|6h|24h|7d|30d)$", description="Time period for metrics"),
    current_user: User = Depends(get_current_user),
) -> IntegrationMetricsResponse:
    """Get integration metrics"""
    try:
        metrics = await integration_service.get_metrics(integration_id, period=period)
        if not metrics:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail=f"Integration {integration_id} not found"
            )

        return IntegrationMetricsResponse(
            integration_id=integration_id,
            period=period,
            request_count=metrics.request_count,
            error_count=metrics.error_count,
            average_response_time_ms=metrics.average_response_time_ms,
            success_rate=metrics.success_rate,
            last_sync=metrics.last_sync,
            data_synced=metrics.data_synced,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting metrics for integration {integration_id}: {str(e)}")
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get integration metrics"
        )


@router.get(
    "/types",
    response_model=List[IntegrationType],
    status_code=HTTP_200_OK,
    summary="List integration types",
    description="Get a list of all available integration types",
)
async def list_integration_types(
    current_user: User = Depends(get_current_user),
) -> List[IntegrationType]:
    """List all available integration types"""
    return list(INTEGRATION_TYPES.values())


# Ensure service cleanup on shutdown
@router.on_event("shutdown")
async def shutdown_event() -> None:
    """Clean up integration service resources"""
    await integration_service.shutdown()
