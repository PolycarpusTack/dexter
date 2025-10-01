"""
Data models for system monitoring and health checks.
"""
from typing import Dict, List

from pydantic import BaseModel, Field


class SystemMetric(BaseModel):
    """System metric with status information."""

    name: str = Field(..., description="Name of the metric")
    value: float = Field(..., description="Current value of the metric")
    max: float = Field(..., description="Maximum value for this metric")
    unit: str = Field(..., description="Unit of measurement (e.g., '%', 'MB')")
    status: str = Field(..., description="Status: healthy, warning, or critical")


class ServiceStatus(BaseModel):
    """Status of an external service."""

    name: str = Field(..., description="Name of the service")
    status: str = Field(..., description="Status: up, down, or degraded")
    response_time: float = Field(..., description="Response time in milliseconds")
    last_checked: str = Field(..., description="ISO timestamp of last check")


class SystemHealthResponse(BaseModel):
    """Response model for system health endpoint."""

    status: str = Field(..., description="Overall system status: healthy, warning, or critical")
    metrics: List[SystemMetric] = Field(default_factory=list, description="Current system metrics")
    services: List[ServiceStatus] = Field(
        default_factory=list, description="Status of connected services"
    )
    timestamp: str = Field(..., description="ISO timestamp of the health check")


class ResourceUsage(BaseModel):
    """Current system resource usage."""

    cpu: float = Field(..., description="CPU usage percentage")
    memory: int = Field(..., description="Memory usage in bytes")
    memory_total: int = Field(..., description="Total memory in bytes")
    disk: int = Field(..., description="Disk usage in bytes")
    disk_total: int = Field(..., description="Total disk space in bytes")
    network: Dict[str, float] = Field(..., description="Network IO rates in bytes/second")


class MetricDataResponse(BaseModel):
    """Time series data for a specific metric."""

    metric: str = Field(..., description="Name of the metric")
    period: str = Field(..., description="Time period the data covers (e.g., '1h', '24h')")
    timestamps: List[str] = Field(..., description="List of timestamps for data points")
    values: List[float] = Field(..., description="List of values corresponding to timestamps")
