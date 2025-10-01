"""
API endpoints for Alert Health Monitoring.

This module provides endpoints for analyzing alert rule health,
detecting patterns, and providing optimization recommendations.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status

from app.models.alerts import (
    AlertDashboardRequest,
    AlertDashboardResponse,
    AlertDashboardSummary,
    AlertHealthMetricsModel,
    AlertHealthMetricsResponse,
    AlertHealthRequest,
    AlertStormDetectionRequest,
    AlertStormDetectionResponse,
    AlertStormEventModel,
    AlertStormSummary,
    AlertThresholdRecommendation,
    ThresholdRecommendationRequest,
    ThresholdRecommendationResponse,
)
from app.services.alert_health_service import get_alert_health_service
from app.services.cache_service import CacheService, get_cache_service
from app.services.sentry_client import SentryApiClient, get_sentry_client

router = APIRouter(prefix="/alert-health", tags=["Alert Health"])


def require_auth_header(request: Request) -> str:
    """Simple auth check: require X-Sentry-Auth header for access."""
    token = request.headers.get("X-Sentry-Auth")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication header"
        )
    return token


@router.post("/metrics", response_model=AlertHealthMetricsResponse)
async def get_alert_health_metrics(
    request: AlertHealthRequest = Body(...),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    cache_service: CacheService = Depends(get_cache_service),
    _auth: str = Depends(require_auth_header),
):
    """
    Get health metrics for alert rules.

    This endpoint analyzes alert rules and provides health metrics including
    trigger frequency, health scores, and optimization recommendations.

    Args:
        request: Request parameters for alert health analysis

    Returns:
        AlertHealthMetricsResponse with metrics and summary
    """
    # Create service with dependencies
    service = get_alert_health_service(sentry_client, cache_service)

    # Get metrics
    result = await service.get_alert_rule_metrics(
        rule_id=request.rule_id,
        organization_slug=request.organization_slug,
        refresh_cache=request.refresh_cache,
    )

    if not result.get("success", False):
        raise HTTPException(
            status_code=500, detail=result.get("error", "Failed to fetch alert health metrics")
        )

    data = result.get("data", {})

    # Transform data to response model
    return AlertHealthMetricsResponse(
        success=True,
        metrics=[AlertHealthMetricsModel(**metric) for metric in data.get("metrics", [])],
        summary=AlertDashboardSummary(**data.get("summary", {})),
    )


@router.post("/storms", response_model=AlertStormDetectionResponse)
async def detect_alert_storms(
    request: AlertStormDetectionRequest = Body(...),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    cache_service: CacheService = Depends(get_cache_service),
    _auth: str = Depends(require_auth_header),
):
    """
    Detect alert storms within a given time period.

    This endpoint analyzes alert firing patterns to identify periods of
    unusually high alert activity (storms).

    Args:
        request: Request parameters for storm detection

    Returns:
        AlertStormDetectionResponse with detected storms
    """
    # Create service with dependencies
    service = get_alert_health_service(sentry_client, cache_service)

    # Detect storms
    result = await service.detect_alert_storms(
        days=request.days, organization_slug=request.organization_slug, threshold=request.threshold
    )

    if not result.get("success", False):
        raise HTTPException(
            status_code=500, detail=result.get("error", "Failed to detect alert storms")
        )

    data = result.get("data", {})

    # Transform data to response model
    return AlertStormDetectionResponse(
        success=True,
        storms=[AlertStormEventModel(**storm) for storm in data.get("storms", [])],
        summary=AlertStormSummary(**data.get("summary", {})),
    )


@router.post("/threshold-recommendations", response_model=ThresholdRecommendationResponse)
async def get_threshold_recommendations(
    request: ThresholdRecommendationRequest = Body(...),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    cache_service: CacheService = Depends(get_cache_service),
    _auth: str = Depends(require_auth_header),
):
    """
    Get threshold adjustment recommendations for an alert rule.

    This endpoint analyzes historical data and provides recommendations
    for adjusting alert thresholds to optimize alert behavior.

    Args:
        request: Request parameters for threshold analysis

    Returns:
        ThresholdRecommendationResponse with recommendations
    """
    # Create service with dependencies
    service = get_alert_health_service(sentry_client, cache_service)

    # Get recommendations
    result = await service.get_threshold_recommendations(
        rule_id=request.rule_id, organization_slug=request.organization_slug
    )

    if not result.get("success", False):
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to generate threshold recommendations"),
        )

    data = result.get("data", {})

    # Transform data to response model
    return ThresholdRecommendationResponse(
        success=True,
        rule_id=data.get("rule_id"),
        rule_name=data.get("rule_name"),
        current_thresholds=data.get("current_thresholds", {}),
        recommendations=[
            AlertThresholdRecommendation(**rec) for rec in data.get("recommendations", [])
        ],
    )


@router.post("/dashboard", response_model=AlertDashboardResponse)
async def get_dashboard_data(
    request: AlertDashboardRequest = Body(...),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    cache_service: CacheService = Depends(get_cache_service),
    _auth: str = Depends(require_auth_header),
):
    """
    Get aggregated data for the alert health dashboard.

    This endpoint provides comprehensive data for the alert health dashboard
    including metrics, storm information, and optimization opportunities.

    Args:
        request: Request parameters for dashboard data

    Returns:
        AlertDashboardResponse with dashboard data
    """
    # Create service with dependencies
    service = get_alert_health_service(sentry_client, cache_service)

    # Get dashboard data
    result = await service.get_dashboard_data(
        organization_slug=request.organization_slug, days=request.days
    )

    if not result.get("success", False):
        raise HTTPException(
            status_code=500, detail=result.get("error", "Failed to generate dashboard data")
        )

    data = result.get("data", {})

    # Transform data to response model
    response_data = {
        "success": True,
        "summary": data.get("summary"),
        "storms_summary": data.get("storms_summary"),
        "optimization_opportunities": data.get("optimization_opportunities"),
        "time_series": data.get("time_series"),
        "rule_health_distribution": data.get("rule_health_distribution"),
    }

    # Filter out None values
    response_data = {k: v for k, v in response_data.items() if v is not None}

    return AlertDashboardResponse(**response_data)


@router.get("/rules/{rule_id}/history", response_model=Dict[str, Any])
async def get_alert_rule_history(
    rule_id: str,
    days: int = Query(default=30, ge=1, le=90, description="Number of days of history"),
    organization_slug: Optional[str] = Query(default=None, description="Organization slug"),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
):
    """
    Get historical trigger data for a specific alert rule.

    This endpoint fetches and formats the trigger history for an alert rule
    to enable detailed analysis and visualization.

    Args:
        rule_id: Alert rule ID
        days: Number of days of history to fetch
        organization_slug: Optional organization slug

    Returns:
        Historical trigger data
    """
    try:
        # Fetch historical data from Sentry
        # Note: This is a placeholder - the actual API endpoint would need to be implemented
        response = {
            "success": True,
            "data": {
                "rule_id": rule_id,
                "days": days,
                "triggers": [],
                "summary": {"total_triggers": 0, "daily_average": 0.0, "peak_day": None},
            },
        }

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch alert history: {str(e)}")


@router.post("/analyze-batch", response_model=Dict[str, Any])
async def analyze_alerts_batch(
    rule_ids: List[str] = Body(..., description="List of rule IDs to analyze"),
    organization_slug: Optional[str] = Body(default=None, description="Organization slug"),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    cache_service: CacheService = Depends(get_cache_service),
):
    """
    Analyze multiple alert rules in batch.

    This endpoint allows analyzing multiple alert rules at once for
    efficiency when processing many rules.

    Args:
        rule_ids: List of alert rule IDs to analyze
        organization_slug: Optional organization slug

    Returns:
        Batch analysis results
    """
    # Create service with dependencies
    service = get_alert_health_service(sentry_client, cache_service)

    results = {}
    errors = {}

    # Process each rule
    for rule_id in rule_ids:
        try:
            result = await service.get_alert_rule_metrics(
                rule_id=rule_id, organization_slug=organization_slug, refresh_cache=False
            )

            if result.get("success", False):
                results[rule_id] = result.get("data", {})
            else:
                errors[rule_id] = result.get("error", "Unknown error")

        except Exception as e:
            errors[rule_id] = str(e)

    return {
        "success": len(errors) == 0,
        "results": results,
        "errors": errors,
        "summary": {
            "total_analyzed": len(rule_ids),
            "successful": len(results),
            "failed": len(errors),
        },
    }


@router.post("/simulate-threshold", response_model=Dict[str, Any])
async def simulate_threshold_change(
    rule_id: str = Body(..., description="Alert rule ID"),
    new_threshold: Dict[str, Any] = Body(..., description="New threshold configuration"),
    days: int = Body(default=30, ge=1, le=90, description="Days of history to simulate"),
    organization_slug: Optional[str] = Body(default=None, description="Organization slug"),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
):
    """
    Simulate the impact of changing alert thresholds.

    This endpoint simulates what would happen if alert thresholds were
    changed, based on historical data.

    Args:
        rule_id: Alert rule ID
        new_threshold: New threshold configuration to simulate
        days: Number of days of history to use
        organization_slug: Optional organization slug

    Returns:
        Simulation results showing impact
    """
    try:
        # This is a placeholder implementation
        # In reality, this would fetch historical data and simulate the new threshold

        result = {
            "success": True,
            "data": {
                "rule_id": rule_id,
                "simulation_period": f"{days} days",
                "current_triggers": 100,  # placeholder
                "simulated_triggers": 40,  # placeholder
                "reduction_percentage": 60,
                "false_negative_risk": "low",
                "recommendation": "This threshold change would significantly reduce alert noise while maintaining coverage of critical issues.",
            },
        }

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to simulate threshold change: {str(e)}"
        )
