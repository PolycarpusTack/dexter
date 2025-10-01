"""
Alert Health Data Models.

These models represent alert rule health metrics, analysis results,
and recommendations for the Alert Health Monitoring system.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AlertHealthMetricsModel(BaseModel):
    """Model representing health metrics for an alert rule."""

    rule_id: str = Field(..., description="Alert rule identifier")
    rule_name: str = Field(..., description="Alert rule name")
    total_triggered_count: int = Field(
        default=0, description="Total number of times alert triggered"
    )
    last_triggered_at: Optional[datetime] = Field(
        default=None, description="Last time alert triggered"
    )
    first_seen_at: Optional[datetime] = Field(default=None, description="First time alert was seen")
    trigger_frequency: Optional[float] = Field(default=None, description="Alert triggers per day")
    is_noisy: bool = Field(default=False, description="Whether alert triggers too frequently")
    is_quiet: bool = Field(default=False, description="Whether alert triggers too infrequently")
    recommendations: List[str] = Field(
        default_factory=list, description="Optimization recommendations"
    )
    health_score: int = Field(default=100, ge=0, le=100, description="Overall health score (0-100)")

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}


# Backward-compatible alias used by some tests
AlertHealthMetrics = AlertHealthMetricsModel


class AlertStormEventModel(BaseModel):
    """Model representing an alert storm event."""

    start_time: datetime = Field(..., description="Storm start time")
    end_time: Optional[datetime] = Field(default=None, description="Storm end time")
    duration_minutes: Optional[float] = Field(default=None, description="Storm duration in minutes")
    affected_rules: List[str] = Field(default_factory=list, description="List of affected rule IDs")
    total_alerts: int = Field(default=0, description="Total alerts during storm")
    peak_alerts_per_minute: int = Field(
        default=0, description="Peak alerts per minute during storm"
    )

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}


# Backward-compatible alias expected by some tests
AlertStormEvent = AlertStormEventModel


class AlertThresholdRecommendation(BaseModel):
    """Model for threshold adjustment recommendation."""

    type: str = Field(..., description="Type of recommendation")
    current: Dict[str, Any] = Field(..., description="Current threshold configuration")
    suggested: Dict[str, Any] = Field(..., description="Suggested threshold configuration")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    rationale: str = Field(..., description="Explanation for the recommendation")


class AlertDashboardSummary(BaseModel):
    """Model for alert health dashboard summary."""

    total_rules: int = Field(..., description="Total number of alert rules")
    healthy_rules: int = Field(..., description="Number of healthy alert rules")
    noisy_rules: int = Field(..., description="Number of noisy alert rules")
    quiet_rules: int = Field(..., description="Number of quiet/inactive alert rules")
    health_score_avg: float = Field(..., description="Average health score across all rules")
    recommendations_count: int = Field(..., description="Total number of recommendations")


class AlertStormSummary(BaseModel):
    """Model for alert storm summary."""

    total_storms: int = Field(..., description="Total number of detected storms")
    average_duration: float = Field(..., description="Average storm duration in minutes")
    max_storm_alerts: int = Field(..., description="Maximum alerts in a single storm")
    most_recent_storm: Optional[datetime] = Field(
        default=None, description="Timestamp of most recent storm"
    )

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}


class AlertOptimizationOpportunity(BaseModel):
    """Model for alert optimization opportunity."""

    rule_id: str = Field(..., description="Alert rule identifier")
    rule_name: str = Field(..., description="Alert rule name")
    health_score: int = Field(..., description="Current health score")
    top_recommendation: str = Field(..., description="Primary recommendation")


class AlertHealthDistribution(BaseModel):
    """Model for health score distribution."""

    excellent: int = Field(default=0, description="Rules with 90+ health score")
    good: int = Field(default=0, description="Rules with 70-89 health score")
    fair: int = Field(default=0, description="Rules with 50-69 health score")
    poor: int = Field(default=0, description="Rules with 30-49 health score")
    critical: int = Field(default=0, description="Rules with <30 health score")


class AlertTimeSeries(BaseModel):
    """Model for alert time series data."""

    timestamps: List[datetime] = Field(default_factory=list, description="Time series timestamps")
    total_alerts: List[int] = Field(
        default_factory=list, description="Total alerts at each timestamp"
    )
    noisy_alerts: List[int] = Field(
        default_factory=list, description="Noisy alerts at each timestamp"
    )
    healthy_alerts: List[int] = Field(
        default_factory=list, description="Healthy alerts at each timestamp"
    )

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}


# Request/Response Models


class AlertHealthRequest(BaseModel):
    """Request model for alert health metrics."""

    rule_id: Optional[str] = Field(default=None, description="Specific rule ID to analyze")
    organization_slug: Optional[str] = Field(default=None, description="Organization to query")
    refresh_cache: bool = Field(default=False, description="Force refresh of cached data")


class AlertStormDetectionRequest(BaseModel):
    """Request model for alert storm detection."""

    days: int = Field(default=7, ge=1, le=90, description="Number of days to look back")
    organization_slug: Optional[str] = Field(default=None, description="Organization to query")
    threshold: Optional[int] = Field(
        default=None, ge=1, description="Custom storm detection threshold"
    )


class ThresholdRecommendationRequest(BaseModel):
    """Request model for threshold recommendations."""

    rule_id: str = Field(..., description="Alert rule ID to analyze")
    organization_slug: Optional[str] = Field(default=None, description="Organization to query")


class AlertDashboardRequest(BaseModel):
    """Request model for dashboard data."""

    organization_slug: Optional[str] = Field(default=None, description="Organization to query")
    days: int = Field(default=30, ge=1, le=365, description="Number of days to include in analysis")


# Response Models


class AlertHealthMetricsResponse(BaseModel):
    """Response model for alert health metrics."""

    success: bool = Field(..., description="Success status")
    metrics: Optional[List[AlertHealthMetricsModel]] = Field(
        default=None, description="Alert metrics"
    )
    summary: Optional[AlertDashboardSummary] = Field(default=None, description="Summary statistics")
    error: Optional[str] = Field(default=None, description="Error message if request failed")


class AlertStormDetectionResponse(BaseModel):
    """Response model for alert storm detection."""

    success: bool = Field(..., description="Success status")
    storms: Optional[List[AlertStormEventModel]] = Field(
        default=None, description="Detected storm events"
    )
    summary: Optional[AlertStormSummary] = Field(
        default=None, description="Storm summary statistics"
    )
    error: Optional[str] = Field(default=None, description="Error message if request failed")


class ThresholdRecommendationResponse(BaseModel):
    """Response model for threshold recommendations."""

    success: bool = Field(..., description="Success status")
    rule_id: Optional[str] = Field(default=None, description="Alert rule identifier")
    rule_name: Optional[str] = Field(default=None, description="Alert rule name")
    current_thresholds: Optional[Dict[str, Any]] = Field(
        default=None, description="Current threshold values"
    )
    recommendations: Optional[List[AlertThresholdRecommendation]] = Field(
        default=None, description="Recommendations"
    )
    error: Optional[str] = Field(default=None, description="Error message if request failed")


# Backward-compatible alias expected by some tests
ThresholdRecommendation = AlertThresholdRecommendation


class AlertDashboardResponse(BaseModel):
    """Response model for dashboard data."""

    success: bool = Field(..., description="Success status")
    summary: Optional[AlertDashboardSummary] = Field(default=None, description="Overall summary")
    storms_summary: Optional[AlertStormSummary] = Field(default=None, description="Storm summary")
    optimization_opportunities: Optional[Dict[str, Any]] = Field(
        default=None, description="Optimization suggestions"
    )
    time_series: Optional[AlertTimeSeries] = Field(default=None, description="Time series data")
    rule_health_distribution: Optional[AlertHealthDistribution] = Field(
        default=None, description="Health distribution"
    )
    error: Optional[str] = Field(default=None, description="Error message if request failed")


from enum import Enum as _AlertsEnum


class RecommendationImpact(_AlertsEnum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"
