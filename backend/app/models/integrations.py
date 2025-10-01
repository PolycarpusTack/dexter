import os

# File: backend/app/models/integrations.py

"""
External integration framework models.

This module defines the core models for managing external system integrations,
including configuration, authentication, health monitoring, and business impact tracking.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, HttpUrl, validator


class IntegrationType(str, Enum):
    """Types of external integrations supported by the system."""

    GIT = "git"  # GitHub, GitLab, Bitbucket
    CRM = "crm"  # Salesforce, HubSpot, etc.
    ANALYTICS = "analytics"  # Google Analytics, Mixpanel, Amplitude
    APM = "apm"  # New Relic, DataDog, AppDynamics
    ISSUE_TRACKING = "issue_tracking"  # Jira, Linear, Asana
    COMMUNICATION = "communication"  # Slack, Teams, Discord
    CI_CD = "ci_cd"  # Jenkins, CircleCI, GitHub Actions
    MONITORING = "monitoring"  # PagerDuty, Opsgenie
    DATABASE = "database"  # PostgreSQL, MySQL, MongoDB
    CUSTOM = "custom"  # Custom/proprietary integrations


class AuthMethod(str, Enum):
    """Authentication methods for external integrations."""

    OAUTH2 = "oauth2"
    api_key = os.getenv("API_KEY", "")
    BEARER_token = os.getenv("ACCESS_TOKEN", "")
    BASIC = "basic"
    JWT = "jwt"
    CUSTOM = "custom"


class ConnectorStatus(str, Enum):
    """Current status of an integration connector."""

    CONNECTED = "connected"  # Successfully connected and operational
    DISCONNECTED = "disconnected"  # Not connected
    ERROR = "error"  # Connection error
    AUTHENTICATING = "authenticating"  # In process of authentication
    RATE_LIMITED = "rate_limited"  # Temporarily rate limited
    MAINTENANCE = "maintenance"  # Under maintenance
    DEPRECATED = "deprecated"  # Deprecated, will be removed


class SyncStatus(str, Enum):
    """Data synchronization status."""

    IDLE = "idle"
    SYNCING = "syncing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class IntegrationCredentials(BaseModel):
    """Credentials for authenticating with external services."""

    auth_method: AuthMethod = Field(..., description="Authentication method")

    # OAuth2 fields
    client_id: Optional[str] = Field(None, description="OAuth2 client ID")
    client_secret: Optional[str] = Field(None, description="OAuth2 client secret")
    access_token: Optional[str] = Field(None, description="OAuth2 access token")
    refresh_token: Optional[str] = Field(None, description="OAuth2 refresh token")
    token_expiry: Optional[datetime] = Field(None, description="Token expiration time")

    # API Key fields
    api_key: Optional[str] = Field(None, description="API key")
    api_secret: Optional[str] = Field(None, description="API secret")

    # Basic auth fields
    username: Optional[str] = Field(None, description="Username for basic auth")
    password: Optional[str] = Field(None, description="Password for basic auth")

    # Additional headers or parameters
    custom_headers: Dict[str, str] = Field(
        default_factory=dict, description="Custom authentication headers"
    )
    custom_params: Dict[str, Any] = Field(
        default_factory=dict, description="Custom authentication parameters"
    )

    @validator(
        "client_secret", "api_key", "api_secret", "password", "access_token", "refresh_token"
    )
    def mask_sensitive_fields(cls, v) -> None:
        """Ensure sensitive fields are not logged in full."""
        if v and len(v) > 8:
            return f"{v[:4]}...{v[-4:]}"
        return v

    class Config:
        """Pydantic configuration."""

        json_encoders = {datetime: lambda v: v.isoformat()}


class IntegrationEndpoint(BaseModel):
    """Configuration for a specific API endpoint."""

    name: str = Field(..., description="Endpoint name")
    url: HttpUrl = Field(..., description="Full endpoint URL")
    method: str = Field("GET", description="HTTP method")
    headers: Dict[str, str] = Field(default_factory=dict, description="Additional headers")
    query_params: Dict[str, Any] = Field(default_factory=dict, description="Query parameters")
    rate_limit: Optional[int] = Field(None, description="Rate limit (requests per minute)")
    timeout_seconds: int = Field(30, description="Request timeout in seconds")
    retry_count: int = Field(3, description="Number of retries on failure")


class IntegrationConfig(BaseModel):
    """Configuration for an external integration."""

    integration_id: str = Field(..., description="Unique integration ID")
    name: str = Field(..., description="Human-readable integration name")
    integration_type: IntegrationType = Field(..., description="Type of integration")
    description: str = Field(..., description="Integration description")

    # Connection details
    base_url: HttpUrl = Field(..., description="Base URL for the service")
    credentials: IntegrationCredentials = Field(..., description="Authentication credentials")
    endpoints: Dict[str, IntegrationEndpoint] = Field(
        default_factory=dict, description="API endpoints"
    )

    # Configuration
    enabled: bool = Field(True, description="Whether integration is enabled")
    auto_sync: bool = Field(False, description="Enable automatic data synchronization")
    sync_interval_minutes: int = Field(60, description="Minutes between sync operations")

    # Metadata
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="When integration was created"
    )
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update time")
    created_by: str = Field(..., description="User who created the integration")

    # Field mappings for data transformation
    field_mappings: Dict[str, str] = Field(
        default_factory=dict, description="Map external fields to internal fields"
    )

    # Custom configuration
    custom_config: Dict[str, Any] = Field(
        default_factory=dict, description="Integration-specific configuration"
    )

    class Config:
        """Pydantic configuration."""

        use_enum_values = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class ConnectionHealth(BaseModel):
    """Health status of an integration connection."""

    integration_id: str = Field(..., description="Integration ID")
    status: ConnectorStatus = Field(..., description="Current connection status")
    last_check: datetime = Field(
        default_factory=datetime.utcnow, description="Last health check time"
    )
    last_successful_connection: Optional[datetime] = Field(
        None, description="Last successful connection"
    )

    # Health metrics
    response_time_ms: Optional[float] = Field(
        None, description="Last response time in milliseconds"
    )
    uptime_percentage: float = Field(100.0, description="Uptime percentage (last 24h)")
    error_count_24h: int = Field(0, description="Errors in last 24 hours")

    # Error details
    last_error: Optional[str] = Field(None, description="Last error message")
    last_error_time: Optional[datetime] = Field(None, description="When last error occurred")
    consecutive_failures: int = Field(0, description="Number of consecutive failures")

    # Rate limiting
    rate_limit_remaining: Optional[int] = Field(None, description="Remaining API calls")
    rate_limit_reset: Optional[datetime] = Field(None, description="When rate limit resets")

    class Config:
        """Pydantic configuration."""

        use_enum_values = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class IntegrationEvent(BaseModel):
    """Event tracking for integration activities."""

    event_id: str = Field(..., description="Unique event ID")
    integration_id: str = Field(..., description="Integration ID")
    event_type: str = Field(..., description="Type of event (sync, error, auth, etc.)")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When event occurred")

    # Event details
    status: str = Field(..., description="Event status (success, failure, warning)")
    message: str = Field(..., description="Human-readable event message")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional event details")

    # Performance metrics
    duration_ms: Optional[float] = Field(None, description="Event duration in milliseconds")
    records_processed: Optional[int] = Field(None, description="Number of records processed")

    # Error information
    error_code: Optional[str] = Field(None, description="Error code if applicable")
    error_details: Optional[Dict[str, Any]] = Field(None, description="Detailed error information")

    # User context
    triggered_by: Optional[str] = Field(None, description="User or system that triggered event")

    class Config:
        """Pydantic configuration."""

        json_encoders = {datetime: lambda v: v.isoformat()}


class BusinessMetric(BaseModel):
    """Business metric derived from integration data."""

    metric_name: str = Field(..., description="Name of the metric")
    value: float = Field(..., description="Metric value")
    unit: str = Field(..., description="Unit of measurement")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="When metric was calculated"
    )
    confidence: float = Field(1.0, ge=0.0, le=1.0, description="Confidence in metric accuracy")
    source_integration: str = Field(..., description="Integration that provided the data")


class BusinessImpact(BaseModel):
    """Business impact analysis for integration data."""

    integration_id: str = Field(..., description="Integration ID")
    analysis_timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="When analysis was performed"
    )

    # Financial impact
    revenue_impact: Optional[float] = Field(None, description="Estimated revenue impact")
    cost_impact: Optional[float] = Field(None, description="Estimated cost impact")
    currency: str = Field("USD", description="Currency for financial values")

    # User impact
    affected_users: Optional[int] = Field(None, description="Number of affected users")
    user_satisfaction_impact: Optional[float] = Field(
        None, description="Impact on user satisfaction score"
    )

    # Operational impact
    productivity_impact: Optional[float] = Field(
        None, description="Impact on team productivity (hours)"
    )
    sla_impact: Optional[bool] = Field(None, description="Whether SLAs are affected")

    # Risk assessment
    risk_level: str = Field("low", description="Risk level (low, medium, high, critical)")
    mitigation_urgency: str = Field(
        "normal", description="Urgency of mitigation (low, normal, high, immediate)"
    )

    # Metrics
    key_metrics: List[BusinessMetric] = Field(
        default_factory=list, description="Key business metrics"
    )

    # Recommendations
    recommendations: List[str] = Field(default_factory=list, description="Business recommendations")

    class Config:
        """Pydantic configuration."""

        json_encoders = {datetime: lambda v: v.isoformat()}


class SyncResult(BaseModel):
    """Result of a data synchronization operation."""

    sync_id: str = Field(..., description="Unique sync operation ID")
    integration_id: str = Field(..., description="Integration ID")
    sync_type: str = Field(..., description="Type of sync (full, incremental, selective)")

    # Timing
    started_at: datetime = Field(..., description="When sync started")
    completed_at: Optional[datetime] = Field(None, description="When sync completed")
    duration_seconds: Optional[float] = Field(None, description="Total sync duration")

    # Status
    status: SyncStatus = Field(..., description="Sync status")
    progress_percentage: float = Field(0.0, description="Sync progress (0-100)")

    # Results
    records_fetched: int = Field(0, description="Records fetched from source")
    records_created: int = Field(0, description="New records created")
    records_updated: int = Field(0, description="Records updated")
    records_deleted: int = Field(0, description="Records deleted")
    records_failed: int = Field(0, description="Records that failed to process")

    # Errors
    errors: List[Dict[str, Any]] = Field(
        default_factory=list, description="List of errors encountered"
    )
    warnings: List[str] = Field(default_factory=list, description="List of warnings")

    # Next sync
    next_sync_after: Optional[datetime] = Field(None, description="When next sync should occur")

    class Config:
        """Pydantic configuration."""

        use_enum_values = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class IntegrationCapabilities(BaseModel):
    """Capabilities and features of an integration."""

    integration_type: IntegrationType = Field(..., description="Type of integration")

    # Data operations
    supports_read: bool = Field(True, description="Can read data from source")
    supports_write: bool = Field(False, description="Can write data to source")
    supports_update: bool = Field(False, description="Can update existing data")
    supports_delete: bool = Field(False, description="Can delete data")

    # Sync capabilities
    supports_full_sync: bool = Field(True, description="Supports full data sync")
    supports_incremental_sync: bool = Field(False, description="Supports incremental sync")
    supports_real_time: bool = Field(False, description="Supports real-time updates")
    supports_webhooks: bool = Field(False, description="Supports webhook notifications")

    # Data types
    supported_entities: List[str] = Field(
        default_factory=list, description="Entity types supported"
    )
    supported_operations: List[str] = Field(
        default_factory=list, description="Operations supported"
    )

    # Limits
    max_records_per_request: Optional[int] = Field(None, description="Maximum records per API call")
    rate_limit_per_minute: Optional[int] = Field(None, description="API rate limit")

    # Features
    requires_approval: bool = Field(False, description="Requires approval for actions")
    supports_sandbox: bool = Field(False, description="Has sandbox/test environment")
    supports_bulk_operations: bool = Field(False, description="Supports bulk operations")

    class Config:
        """Pydantic configuration."""

        use_enum_values = True


# Export all public classes and types
__all__ = [
    "IntegrationType",
    "AuthMethod",
    "ConnectorStatus",
    "SyncStatus",
    "IntegrationCredentials",
    "IntegrationEndpoint",
    "IntegrationConfig",
    "ConnectionHealth",
    "IntegrationEvent",
    "BusinessMetric",
    "BusinessImpact",
    "SyncResult",
    "IntegrationCapabilities",
]
