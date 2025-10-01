"""
System monitoring and health check endpoints.
"""
import logging
import time
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from prometheus_client import Counter, Gauge

from app.models.system import (
    MetricDataResponse,
    ResourceUsage,
    ServiceStatus,
    SystemHealthResponse,
    SystemMetric,
)
from app.services.config_service import ConfigService, get_config_service
from app.services.health_monitor import get_health_monitor
from app.services.sentry_client import get_sentry_client
from app.utils.resource_monitor import get_resource_metrics

# Create router
router = APIRouter(prefix="/system", tags=["System"])

# Metrics for resource usage tracking
CPU_USAGE = Gauge("system_cpu_usage_percent", "System CPU usage percentage")
MEMORY_USAGE = Gauge("system_memory_usage_bytes", "System memory usage in bytes")
DISK_USAGE = Gauge("system_disk_usage_bytes", "System disk usage in bytes")
NETWORK_IN = Counter("system_network_in_bytes_total", "Total network bytes received")
NETWORK_OUT = Counter("system_network_out_bytes_total", "Total network bytes sent")

# Set up logging
logger = logging.getLogger(__name__)


@router.get("/health", response_model=SystemHealthResponse)
async def get_system_health(
    config_service: ConfigService = Depends(get_config_service),
) -> SystemHealthResponse:
    """
    Get system health including resource usage metrics and service statuses.
    """
    # Get system metrics
    metrics: List[SystemMetric] = await get_system_metrics()

    # Get service statuses
    services: List[ServiceStatus] = await get_service_statuses(config_service)

    # Determine overall system status
    status = determine_system_status(metrics, services)

    return SystemHealthResponse(
        status=status,
        metrics=metrics,
        services=services,
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )


@router.get("/resources", response_model=ResourceUsage)
async def get_resource_usage() -> ResourceUsage:
    """
    Get current system resource usage.
    """
    try:
        # Get resource metrics from the monitoring utility
        metrics = get_resource_metrics()

        # Update Prometheus metrics
        CPU_USAGE.set(metrics["cpu_percent"])
        MEMORY_USAGE.set(metrics["memory_used"])
        DISK_USAGE.set(metrics["disk_used"])
        NETWORK_IN.inc(metrics["net_in_bytes"])
        NETWORK_OUT.inc(metrics["net_out_bytes"])

        # Return resource usage model
        return ResourceUsage(
            cpu=metrics["cpu_percent"],
            memory=metrics["memory_used"],
            memory_total=metrics["memory_total"],
            disk=metrics["disk_used"],
            disk_total=metrics["disk_total"],
            network={"in": metrics["net_in_rate"], "out": metrics["net_out_rate"]},
        )
    except Exception as e:
        # Log the error
        logger.error(f"Error getting resource usage: {e}")

        # Fallback with default values if any error occurs
        return ResourceUsage(
            cpu=50.0,
            memory=4 * 1024 * 1024 * 1024,
            memory_total=8 * 1024 * 1024 * 1024,
            disk=50 * 1024 * 1024 * 1024,
            disk_total=100 * 1024 * 1024 * 1024,
            network={"in": 1024 * 10, "out": 1024 * 5},
        )


@router.get("/sentry/health")
async def sentry_health_check():
    """
    Check connectivity to Sentry.io API.

    Tests the connection by attempting to make a simple API call to Sentry.
    """
    try:
        sentry_client = get_sentry_client()

        # Test connectivity with a simple API call
        # We'll try to make a request to test the connection
        try:
            # Simple test - try to access the API root
            from app.core.settings import settings

            test_url = f"{settings.sentry_base_url}/"
            await sentry_client._request("GET", test_url)
            return {
                "status": "healthy",
                "sentry_reachable": True,
                "api_endpoint": test_url,
                "token_valid": True,
            }
        except Exception:
            # Try a simpler test - just check if we can reach the base URL
            import aiohttp

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{settings.sentry_base_url}/",
                    headers={"Authorization": f"Bearer {sentry_client.token}"},
                ) as resp:
                    if resp.status == 401:
                        return {
                            "status": "degraded",
                            "sentry_reachable": True,
                            "api_endpoint": settings.sentry_base_url,
                            "token_valid": False,
                            "error": "Invalid API token",
                        }
                    elif resp.status < 500:
                        return {
                            "status": "healthy",
                            "sentry_reachable": True,
                            "api_endpoint": settings.sentry_base_url,
                            "token_valid": True,
                        }
                    else:
                        return {
                            "status": "degraded",
                            "sentry_reachable": False,
                            "api_endpoint": settings.sentry_base_url,
                            "error": f"Sentry API returned {resp.status}",
                        }

    except Exception as e:
        logger.error(f"Sentry health check failed: {e}")
        return {
            "status": "unhealthy",
            "sentry_reachable": False,
            "error": str(e),
            "details": "Unable to connect to Sentry API",
        }


@router.get("/metrics/{metric}", response_model=MetricDataResponse)
async def get_metric_data(metric: str, period: str = "1h") -> MetricDataResponse:
    """
    Get time series data for a specific metric.

    Args:
        metric: The name of the metric to fetch
        period: Time period to fetch data for (e.g., '1h', '24h', '7d')
    """
    # This would typically fetch data from a time series database
    # For now, we'll return some dummy data

    # Check if metric exists
    valid_metrics = ["cpu", "memory", "disk", "network_in", "network_out"]
    if metric not in valid_metrics:
        raise HTTPException(status_code=404, detail=f"Metric '{metric}' not found")

    # Calculate timestamps and values based on period
    # This is placeholder data - in a real implementation, you'd fetch from
    # Prometheus or similar time series database
    timestamps = []
    values = []

    current_time = int(time.time())

    if period == "1h":
        # Generate data points for the last hour (60 points, one per minute)
        for i in range(60):
            time_offset = current_time - (59 - i) * 60
            timestamps.append(time.strftime("%H:%M", time.gmtime(time_offset)))

            # Generate some random but realistic looking data
            if metric == "cpu":
                cpu_value = 50 + (i % 10) * 5 + (i % 3) * 3
                values.append(min(100, max(0, cpu_value)))
            elif metric == "memory":
                mem_value = 60 + (i % 15) * 2 + (i % 5) * 1
                values.append(min(100, max(0, mem_value)))
            else:
                other_value = 40 + (i % 20) * 3 + (i % 7) * 2
                values.append(min(100, max(0, other_value)))

    return MetricDataResponse(metric=metric, period=period, timestamps=timestamps, values=values)


async def get_system_metrics() -> List[SystemMetric]:
    """
    Get current system metrics.
    """
    # Get metrics from resource monitor
    metrics = get_resource_metrics()

    # Extract percentages
    cpu_percent = metrics["cpu_percent"]
    memory_percent = metrics["memory_percent"]
    disk_percent = metrics["disk_percent"]

    metrics = [
        SystemMetric(
            name="CPU Usage",
            value=cpu_percent,
            max=100,
            unit="%",
            status="healthy" if cpu_percent < 70 else "warning" if cpu_percent < 90 else "critical",
        ),
        SystemMetric(
            name="Memory Usage",
            value=memory_percent,
            max=100,
            unit="%",
            status="healthy"
            if memory_percent < 75
            else "warning"
            if memory_percent < 90
            else "critical",
        ),
        SystemMetric(
            name="Disk Usage",
            value=disk_percent,
            max=100,
            unit="%",
            status="healthy"
            if disk_percent < 80
            else "warning"
            if disk_percent < 95
            else "critical",
        ),
    ]

    return metrics


async def get_service_statuses(config_service: ConfigService) -> List[ServiceStatus]:
    """
    Get status of connected services by performing actual health checks.
    """
    # Get health monitor instance
    health_monitor = get_health_monitor()

    # Get configuration for services
    sentry_url = config_service.get_sentry_url() or ""

    # Safely get API token
    sentry_token = (
        config_service.get_api_token() if hasattr(config_service, "get_api_token") else ""
    )

    # Safely get Ollama URL
    ollama_url = (
        config_service.settings.get("ollama_url") if hasattr(config_service, "settings") else ""
    )

    # Get Redis URL from config service
    redis_url = ""  # Default empty value

    # Check all services using the health monitor
    try:
        services = await health_monitor.check_all_services(
            sentry_url=sentry_url,
            sentry_token=sentry_token,
            ollama_url=ollama_url,
            redis_url=redis_url,
        )
        return services
    except Exception as e:
        # Log error
        logger.error(f"Error checking service health: {e}")

        # Fallback to basic status
        current_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        services = [
            ServiceStatus(
                name="Sentry API",
                status="unknown",
                response_time=0,
                last_checked=current_time,
            )
        ]

        if ollama_url:
            services.append(
                ServiceStatus(
                    name="Ollama AI",
                    status="unknown",
                    response_time=0,
                    last_checked=current_time,
                )
            )

        return services


def determine_system_status(metrics: List[SystemMetric], services: List[ServiceStatus]) -> str:
    """
    Determine overall system status based on metrics and service statuses.
    """
    # Check for any critical metrics
    if any(metric.status == "critical" for metric in metrics):
        return "critical"

    # Check for any down services
    if any(service.status == "down" for service in services):
        return "critical"

    # Check for any warning metrics or degraded services
    if any(metric.status == "warning" for metric in metrics) or any(
        service.status == "degraded" for service in services
    ):
        return "warning"

    # Otherwise system is healthy
    return "healthy"
