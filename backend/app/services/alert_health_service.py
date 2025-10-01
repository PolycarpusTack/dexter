"""
Alert Health Service - Provides analysis of alert rule behavior.

This service fetches and analyzes alert rule data from Sentry to identify patterns,
detect anomalies, and provide optimization recommendations.
"""

import logging
import statistics
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set

from app.services.alert_frequency_analyzer import AlertFrequencyAnalyzer
from app.services.alert_storm_detector import AlertStormDetector
from app.services.cache_service import CacheService
from app.services.sentry_client import SentryApiClient
from app.services.threshold_recommendation_engine import ThresholdRecommendationEngine

logger = logging.getLogger(__name__)


class AlertHealthMetrics:
    """Class representing health metrics for an alert rule."""

    def __init__(self, rule_id: str, rule_name: str):
        """Initialize with alert rule information."""
        self.rule_id = rule_id
        self.rule_name = rule_name
        self.total_triggered_count = 0
        self.last_triggered_at: Optional[datetime] = None
        self.first_seen_at: Optional[datetime] = None
        self.trigger_frequency: Optional[float] = None  # triggers per day
        self.is_noisy = False
        self.is_quiet = False
        self.recommendations: List[str] = []
        self.health_score = 100  # 0-100 score, higher is better

    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary."""
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "total_triggered_count": self.total_triggered_count,
            "last_triggered_at": self.last_triggered_at.isoformat()
            if self.last_triggered_at
            else None,
            "first_seen_at": self.first_seen_at.isoformat() if self.first_seen_at else None,
            "trigger_frequency": self.trigger_frequency,
            "is_noisy": self.is_noisy,
            "is_quiet": self.is_quiet,
            "recommendations": self.recommendations,
            "health_score": self.health_score,
        }


class AlertStormEvent:
    """Class representing an alert storm event."""

    def __init__(self, start_time: datetime):
        """Initialize alert storm event."""
        self.start_time = start_time
        self.end_time: Optional[datetime] = None
        self.duration_minutes: Optional[float] = None
        self.affected_rules: Set[str] = set()
        self.total_alerts = 0
        self.peak_alerts_per_minute = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary."""
        return {
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_minutes": self.duration_minutes,
            "affected_rules": list(self.affected_rules),
            "total_alerts": self.total_alerts,
            "peak_alerts_per_minute": self.peak_alerts_per_minute,
        }


class AlertHealthService:
    """Service for analyzing alert rule health and behavior."""

    # Constants for analysis
    NOISY_THRESHOLD = 10  # alerts per day
    QUIET_THRESHOLD = 0.1  # alerts per day
    INACTIVE_DAYS = 30  # days without alerts to be considered inactive
    STORM_THRESHOLD = 20  # alerts per minute to be considered a storm

    def __init__(
        self,
        sentry_client: Optional[SentryApiClient] = None,
        cache_service: Optional[CacheService] = None,
    ):
        """Initialize with optional dependencies."""
        self.sentry_client = sentry_client
        self.cache_service = cache_service
        self.alert_metrics_cache: Dict[str, AlertHealthMetrics] = {}
        self.alert_storms: List[AlertStormEvent] = []

        # Initialize advanced analyzers
        self.frequency_analyzer = AlertFrequencyAnalyzer()
        self.storm_detector = AlertStormDetector()
        self.recommendation_engine = ThresholdRecommendationEngine()

    async def get_alert_rule_metrics(
        self,
        rule_id: Optional[str] = None,
        organization_slug: Optional[str] = None,
        refresh_cache: bool = False,
    ) -> Dict[str, Any]:
        """
        Get health metrics for alert rules.

        Args:
            rule_id: Optional specific rule ID to analyze
            organization_slug: Organization to query
            refresh_cache: Force refresh of cached data

        Returns:
            Dictionary with alert health metrics
        """
        if not self.sentry_client:
            logger.error("Sentry client not available for alert health analysis")
            return {"success": False, "error": "Sentry client not available"}

        # Use cache if available and not forcing refresh
        cache_key = f"alert_health:{organization_slug or 'default'}:{rule_id or 'all'}"
        if not refresh_cache and self.cache_service:
            cached_data = await self.cache_service.get(cache_key)
            if cached_data:
                logger.info(f"Using cached alert health data for {cache_key}")
                return cached_data

        try:
            # Fetch alert rules
            alert_rules = await self._fetch_alert_rules(organization_slug, rule_id)
            if not alert_rules or not alert_rules.get("success", False):
                return {"success": False, "error": "Failed to fetch alert rules"}

            rules = alert_rules.get("data", [])
            if not rules:
                return {
                    "success": True,
                    "data": {"metrics": [], "summary": self._generate_empty_summary()},
                }

            # Process each rule
            metrics = []
            for rule in rules:
                rule_metrics = await self._analyze_rule(rule, organization_slug)
                if rule_metrics:
                    metrics.append(rule_metrics.to_dict())

            # Generate summary metrics
            summary = self._generate_summary(metrics)

            result = {"success": True, "data": {"metrics": metrics, "summary": summary}}

            # Cache the result
            if self.cache_service:
                await self.cache_service.set(cache_key, result, ttl=3600)  # Cache for 1 hour

            return result

        except Exception as e:
            logger.exception(f"Error analyzing alert health: {str(e)}")
            return {"success": False, "error": str(e)}

    async def detect_alert_storms(
        self,
        days: int = 7,
        organization_slug: Optional[str] = None,
        threshold: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Detect alert storms within the given time period.

        Args:
            days: Number of days to look back
            organization_slug: Organization to query
            threshold: Custom threshold for alert storm detection

        Returns:
            Dictionary with detected alert storms
        """
        if not self.sentry_client:
            logger.error("Sentry client not available for alert storm detection")
            return {"success": False, "error": "Sentry client not available"}

        try:
            # Fetch alert trigger history
            alert_history = await self._fetch_alert_trigger_history(
                organization_slug, datetime.now() - timedelta(days=days), datetime.now()
            )

            if not alert_history or not alert_history.get("success", False):
                return {"success": False, "error": "Failed to fetch alert history"}

            history_data = alert_history.get("data", [])
            if not history_data:
                return {
                    "success": True,
                    "data": {"storms": [], "summary": {"total_storms": 0}},
                }

            # Use advanced storm detector
            storms = self.storm_detector.detect_storms(history_data, lookback_hours=days * 24)

            # Generate enhanced summary
            summary = {
                "total_storms": len(storms),
                "average_duration": statistics.mean([s.duration_minutes for s in storms])
                if storms
                else 0,
                "max_storm_alerts": max([s.total_alerts for s in storms]) if storms else 0,
                "most_recent_storm": storms[0].start_time.isoformat() if storms else None,
                "severity_distribution": self._calculate_severity_distribution(storms),
                "mitigation_priorities": self._extract_mitigation_priorities(storms),
            }

            return {
                "success": True,
                "data": {
                    "storms": [storm.to_dict() for storm in storms],
                    "summary": summary,
                },
            }

        except Exception as e:
            logger.exception(f"Error detecting alert storms: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_threshold_recommendations(
        self, rule_id: str, organization_slug: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate threshold adjustment recommendations for an alert rule.

        Args:
            rule_id: Alert rule ID
            organization_slug: Organization to query

        Returns:
            Dictionary with threshold recommendations
        """
        if not self.sentry_client:
            logger.error("Sentry client not available for threshold analysis")
            return {"success": False, "error": "Sentry client not available"}

        try:
            # Fetch rule details
            rule_details = await self._fetch_alert_rule_detail(rule_id, organization_slug)
            if not rule_details or not rule_details.get("success", False):
                return {
                    "success": False,
                    "error": f"Failed to fetch rule details for {rule_id}",
                }

            rule = rule_details.get("data", {})
            if not rule:
                return {"success": False, "error": f"Rule {rule_id} not found"}

            # Fetch historical data for this rule
            historical_response = await self._fetch_rule_historical_data(rule_id, organization_slug)

            historical_data = []
            if historical_response and historical_response.get("success", False):
                historical_data = historical_response.get("data", [])

            # Use the advanced recommendation engine
            recommendation = self.recommendation_engine.generate_recommendations(
                rule_config=rule,
                historical_data=historical_data,
                target_metrics={"noise_reduction": 0.5},  # Target 50% noise reduction
            )

            return {"success": True, "data": recommendation.to_dict()}

        except Exception as e:
            logger.exception(f"Error generating threshold recommendations: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_dashboard_data(
        self, organization_slug: Optional[str] = None, days: int = 30
    ) -> Dict[str, Any]:
        """
        Get aggregated data for the alert health dashboard.

        Args:
            organization_slug: Organization to query
            days: Number of days to include in analysis

        Returns:
            Dictionary with dashboard data
        """
        if not self.sentry_client:
            logger.error("Sentry client not available for dashboard data")
            return {"success": False, "error": "Sentry client not available"}

        try:
            # Fetch metrics
            metrics_result = await self.get_alert_rule_metrics(
                organization_slug=organization_slug, refresh_cache=False
            )

            if not metrics_result or not metrics_result.get("success", False):
                return {"success": False, "error": "Failed to fetch alert metrics"}

            # Fetch storm data
            storms_result = await self.detect_alert_storms(
                days=days, organization_slug=organization_slug
            )

            if not storms_result or not storms_result.get("success", False):
                return {"success": False, "error": "Failed to fetch storm data"}

            # Aggregate and prepare dashboard data
            metrics_data = metrics_result.get("data", {})
            storms_data = storms_result.get("data", {})

            # Prepare time series data
            time_series = await self._prepare_alert_time_series(
                organization_slug, datetime.now() - timedelta(days=days), datetime.now()
            )

            # Calculate optimization opportunities
            optimization_opportunities = self._calculate_optimization_opportunities(
                metrics_data.get("metrics", [])
            )

            return {
                "success": True,
                "data": {
                    "summary": metrics_data.get("summary", {}),
                    "storms_summary": storms_data.get("summary", {}),
                    "optimization_opportunities": optimization_opportunities,
                    "time_series": time_series,
                    "rule_health_distribution": self._calculate_health_distribution(
                        metrics_data.get("metrics", [])
                    ),
                },
            }

        except Exception as e:
            logger.exception(f"Error generating dashboard data: {str(e)}")
            return {"success": False, "error": str(e)}

    # Private helper methods

    async def _fetch_alert_rules(
        self, organization_slug: Optional[str], rule_id: Optional[str]
    ) -> Dict[str, Any]:
        """Fetch alert rules from Sentry API."""
        if rule_id:
            return await self.sentry_client.get_alert_rule(rule_id, organization_slug)
        else:
            return await self.sentry_client.get_alert_rules(organization_slug)

    async def _fetch_alert_rule_detail(
        self, rule_id: str, organization_slug: Optional[str]
    ) -> Dict[str, Any]:
        """Fetch detailed information about a specific alert rule."""
        return await self.sentry_client.get_alert_rule(rule_id, organization_slug)

    async def _fetch_alert_trigger_history(
        self, organization_slug: Optional[str], start_time: datetime, end_time: datetime
    ) -> Dict[str, Any]:
        """Fetch historical alert trigger data."""
        # This would call the appropriate Sentry API endpoint
        # For now, we'll return a mock response since this is implementation-dependent
        return {"success": True, "data": []}

    async def _fetch_rule_historical_data(
        self, rule_id: str, organization_slug: Optional[str]
    ) -> Dict[str, Any]:
        """Fetch historical data for a specific rule."""
        # This would fetch relevant metrics for the rule
        # For now, we'll return a mock response
        return {"success": True, "data": {}}

    async def _analyze_rule(
        self, rule: Dict[str, Any], organization_slug: Optional[str]
    ) -> Optional[AlertHealthMetrics]:
        """Analyze a single alert rule and generate health metrics."""
        try:
            rule_id = rule.get("id")
            if not rule_id:
                return None

            metrics = AlertHealthMetrics(rule_id, rule.get("name", "Unknown Rule"))

            # Fetch trigger history for this rule
            trigger_history = await self._fetch_rule_trigger_history(rule_id, organization_slug)

            if trigger_history and trigger_history.get("success", False):
                history_data = trigger_history.get("data", [])

                # Calculate basic metrics
                metrics = self._calculate_metrics_from_history(metrics, history_data)

                # Perform frequency analysis
                if history_data:
                    timestamps = [
                        datetime.fromtimestamp(d.get("timestamp", 0))
                        for d in history_data
                        if d.get("timestamp")
                    ]

                    if timestamps:
                        frequency_analysis = self.frequency_analyzer.analyze_frequency(
                            alert_timestamps=timestamps, rule_id=rule_id, time_period_days=30
                        )

                        # Enhance metrics with frequency analysis insights
                        metrics = self._enhance_metrics_with_frequency(metrics, frequency_analysis)

                # Determine health status
                metrics = self._evaluate_health_status(metrics)

                # Generate recommendations
                metrics.recommendations = self._generate_recommendations(metrics, rule)

            return metrics

        except Exception as e:
            logger.exception(f"Error analyzing rule {rule.get('id')}: {str(e)}")
            return None

    async def _fetch_rule_trigger_history(
        self, rule_id: str, organization_slug: Optional[str]
    ) -> Dict[str, Any]:
        """Fetch trigger history for a specific rule."""
        # This would call the appropriate Sentry API endpoint
        # For now, we'll return a mock response
        return {"success": True, "data": []}

    def _calculate_metrics_from_history(
        self, metrics: AlertHealthMetrics, history: List[Dict[str, Any]]
    ) -> AlertHealthMetrics:
        """Calculate metrics from trigger history."""
        if not history:
            return metrics

        # Calculate basic metrics
        metrics.total_triggered_count = len(history)

        # Sort by timestamp to find first and last trigger
        sorted_history = sorted(history, key=lambda x: x.get("timestamp", 0))

        if sorted_history:
            first = sorted_history[0]
            last = sorted_history[-1]

            metrics.first_seen_at = datetime.fromtimestamp(first.get("timestamp", 0))
            metrics.last_triggered_at = datetime.fromtimestamp(last.get("timestamp", 0))

            # Calculate frequency (triggers per day)
            if metrics.first_seen_at and metrics.last_triggered_at:
                time_diff = metrics.last_triggered_at - metrics.first_seen_at
                days = max(time_diff.total_seconds() / 86400, 1)  # avoid division by zero
                metrics.trigger_frequency = metrics.total_triggered_count / days

        return metrics

    def _evaluate_health_status(self, metrics: AlertHealthMetrics) -> AlertHealthMetrics:
        """Evaluate the health status of an alert rule."""
        if metrics.trigger_frequency is not None:
            # Check if alert is noisy
            if metrics.trigger_frequency > self.NOISY_THRESHOLD:
                metrics.is_noisy = True
                metrics.health_score -= min(
                    50, int(metrics.trigger_frequency / self.NOISY_THRESHOLD * 10)
                )

            # Check if alert is too quiet
            if metrics.trigger_frequency < self.QUIET_THRESHOLD:
                metrics.is_quiet = True
                metrics.health_score -= 20

        # Check if alert hasn't fired in a long time
        if metrics.last_triggered_at:
            days_since_last_trigger = (datetime.now() - metrics.last_triggered_at).days
            if days_since_last_trigger > self.INACTIVE_DAYS:
                metrics.is_quiet = True
                metrics.health_score -= min(40, days_since_last_trigger - self.INACTIVE_DAYS)

        # Ensure health score is within bounds
        metrics.health_score = max(0, min(100, metrics.health_score))

        return metrics

    def _generate_recommendations(
        self, metrics: AlertHealthMetrics, rule: Dict[str, Any]
    ) -> List[str]:
        """Generate recommendations for alert rule optimization."""
        recommendations = []

        if metrics.is_noisy:
            recommendations.append(
                f"Alert is firing too frequently ({metrics.trigger_frequency:.1f} times/day). Consider increasing thresholds."
            )

            # Add more specific threshold recommendations based on rule type
            if rule.get("type") == "metric":
                recommendations.append(
                    "Consider using a dynamic threshold based on historical patterns."
                )

        if metrics.is_quiet:
            if metrics.total_triggered_count == 0:
                recommendations.append(
                    "Alert has never fired. Verify that the alert configuration is correct."
                )
            else:
                days_since_last = (
                    (datetime.now() - metrics.last_triggered_at).days
                    if metrics.last_triggered_at
                    else 0
                )
                recommendations.append(
                    f"Alert hasn't fired in {days_since_last} days. Consider decreasing thresholds or archiving if no longer needed."
                )

        # Check for missing notification actions
        if rule.get("actions", []) == []:
            recommendations.append(
                "Alert has no notification actions. Add actions to ensure proper notification."
            )

        return recommendations

    def _generate_empty_summary(self) -> Dict[str, Any]:
        """Generate empty summary when no alert rules are found."""
        return {
            "total_rules": 0,
            "healthy_rules": 0,
            "noisy_rules": 0,
            "quiet_rules": 0,
            "health_score_avg": 0,
            "recommendations_count": 0,
        }

    def _generate_summary(self, metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate summary metrics from individual rule metrics."""
        if not metrics:
            return self._generate_empty_summary()

        total_rules = len(metrics)
        noisy_rules = sum(1 for m in metrics if m.get("is_noisy", False))
        quiet_rules = sum(1 for m in metrics if m.get("is_quiet", False))
        healthy_rules = total_rules - noisy_rules - quiet_rules

        health_scores = [m.get("health_score", 0) for m in metrics]
        health_score_avg = sum(health_scores) / len(health_scores) if health_scores else 0

        recommendations_count = sum(len(m.get("recommendations", [])) for m in metrics)

        return {
            "total_rules": total_rules,
            "healthy_rules": healthy_rules,
            "noisy_rules": noisy_rules,
            "quiet_rules": quiet_rules,
            "health_score_avg": health_score_avg,
            "recommendations_count": recommendations_count,
        }

    def _detect_storms(
        self, history: List[Dict[str, Any]], threshold: int
    ) -> List[AlertStormEvent]:
        """Detect alert storms from alert trigger history."""
        if not history:
            return []

        # Sort history by timestamp
        sorted_history = sorted(history, key=lambda x: x.get("timestamp", 0))

        # Group alerts by minute
        alerts_by_minute: Dict[int, List[Dict[str, Any]]] = {}
        for alert in sorted_history:
            timestamp = alert.get("timestamp", 0)
            minute_timestamp = int(timestamp / 60) * 60  # Round to minute
            if minute_timestamp not in alerts_by_minute:
                alerts_by_minute[minute_timestamp] = []
            alerts_by_minute[minute_timestamp].append(alert)

        # Identify storm periods (consecutive minutes over threshold)
        storms: List[AlertStormEvent] = []
        current_storm: Optional[AlertStormEvent] = None

        for minute, alerts in sorted(alerts_by_minute.items()):
            if len(alerts) >= threshold:
                # Start or continue a storm
                if not current_storm:
                    current_storm = AlertStormEvent(datetime.fromtimestamp(minute))

                # Update storm stats
                current_storm.total_alerts += len(alerts)
                current_storm.peak_alerts_per_minute = max(
                    current_storm.peak_alerts_per_minute, len(alerts)
                )

                # Add affected rules
                for alert in alerts:
                    rule_id = alert.get("rule_id")
                    if rule_id:
                        current_storm.affected_rules.add(rule_id)

                # Update end time
                current_storm.end_time = datetime.fromtimestamp(minute + 60)
            elif current_storm:
                # Storm has ended, calculate duration
                current_storm.duration_minutes = (
                    current_storm.end_time - current_storm.start_time
                ).total_seconds() / 60

                # Add to list and reset
                storms.append(current_storm)
                current_storm = None

        # Handle ongoing storm
        if current_storm:
            current_storm.duration_minutes = (
                current_storm.end_time - current_storm.start_time
            ).total_seconds() / 60
            storms.append(current_storm)

        # Sort by start time (most recent first)
        return sorted(storms, key=lambda s: s.start_time, reverse=True)

    def _extract_current_thresholds(self, rule: Dict[str, Any]) -> Dict[str, Any]:
        """Extract current threshold values from rule configuration."""
        thresholds = {}

        # This will depend on the specific rule type and structure
        # Here's a generic implementation
        if rule.get("type") == "metric":
            trigger_config = rule.get("triggers", [])
            for trigger in trigger_config:
                thresholds[trigger.get("label", "unknown")] = {
                    "value": trigger.get("threshold", "N/A"),
                    "type": trigger.get("threshold_type", "N/A"),
                }
        elif rule.get("type") == "issue":
            conditions = rule.get("conditions", [])
            for condition in conditions:
                if condition.get("type") == "threshold":
                    thresholds["issue"] = {
                        "value": condition.get("value", "N/A"),
                        "period": condition.get("interval", "N/A"),
                    }

        return thresholds

    def _generate_threshold_recommendations(
        self, rule: Dict[str, Any], historical_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate threshold adjustment recommendations based on rule and data."""
        recommendations = []

        # This is a placeholder implementation
        # In a real system, this would use historical data and statistical analysis

        # Example recommendation for a metric alert
        if rule.get("type") == "metric":
            recommendations.append(
                {
                    "type": "threshold_adjustment",
                    "current": self._extract_current_thresholds(rule),
                    "suggested": {"critical": {"value": 100, "type": "above"}},
                    "confidence": 0.8,
                    "rationale": "Based on historical patterns, this threshold would reduce alert noise by 60% while still catching critical issues.",
                }
            )

        # Example recommendation for an issue alert
        elif rule.get("type") == "issue":
            recommendations.append(
                {
                    "type": "threshold_adjustment",
                    "current": self._extract_current_thresholds(rule),
                    "suggested": {"issue": {"value": 10, "period": "1h"}},
                    "confidence": 0.7,
                    "rationale": "This threshold better aligns with your application's error patterns and would reduce false alarms.",
                }
            )

        return recommendations

    def _calculate_optimization_opportunities(
        self, metrics: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate optimization opportunities from metrics."""
        if not metrics:
            return {"total": 0, "priorities": [], "estimated_noise_reduction": 0}

        # Count rules with recommendations
        rules_with_recs = [m for m in metrics if m.get("recommendations", [])]

        # Prioritize by health score (lowest first)
        prioritized = sorted(rules_with_recs, key=lambda m: m.get("health_score", 100))

        # Calculate potential noise reduction
        noisy_rules = [m for m in metrics if m.get("is_noisy", False)]
        total_noise = sum(m.get("trigger_frequency", 0) for m in noisy_rules)

        # Assume we can reduce by 50% with optimizations
        estimated_reduction = total_noise * 0.5 if total_noise > 0 else 0

        # Format top priorities
        priorities = []
        for i, rule in enumerate(prioritized[:5]):
            priorities.append(
                {
                    "rule_id": rule.get("rule_id"),
                    "rule_name": rule.get("rule_name"),
                    "health_score": rule.get("health_score"),
                    "top_recommendation": rule.get("recommendations", [""])[0]
                    if rule.get("recommendations")
                    else "",
                }
            )

        return {
            "total": len(rules_with_recs),
            "priorities": priorities,
            "estimated_noise_reduction": estimated_reduction,
        }

    def _calculate_health_distribution(self, metrics: List[Dict[str, Any]]) -> Dict[str, int]:
        """Calculate distribution of health scores."""
        if not metrics:
            return {"excellent": 0, "good": 0, "fair": 0, "poor": 0, "critical": 0}

        # Count rules in each category
        excellent = sum(1 for m in metrics if m.get("health_score", 0) >= 90)
        good = sum(1 for m in metrics if 70 <= m.get("health_score", 0) < 90)
        fair = sum(1 for m in metrics if 50 <= m.get("health_score", 0) < 70)
        poor = sum(1 for m in metrics if 30 <= m.get("health_score", 0) < 50)
        critical = sum(1 for m in metrics if m.get("health_score", 0) < 30)

        return {
            "excellent": excellent,
            "good": good,
            "fair": fair,
            "poor": poor,
            "critical": critical,
        }

    def _calculate_severity_distribution(self, storms: List[Any]) -> Dict[str, int]:
        """Calculate distribution of storm severities."""
        if not storms:
            return {"minor": 0, "moderate": 0, "severe": 0, "critical": 0}

        distribution = {"minor": 0, "moderate": 0, "severe": 0, "critical": 0}

        for storm in storms:
            severity = storm.characteristics.severity
            if severity in distribution:
                distribution[severity] += 1

        return distribution

    def _extract_mitigation_priorities(self, storms: List[Any]) -> List[Dict[str, Any]]:
        """Extract top mitigation priorities from storms."""
        if not storms:
            return []

        # Extract all mitigation recommendations
        all_mitigations = []

        for storm in storms:
            mitigation = storm.mitigation
            priority_score = {"critical": 4, "high": 3, "medium": 2, "low": 1}.get(
                mitigation.priority, 0
            )

            all_mitigations.append(
                {
                    "storm_id": storm.storm_id,
                    "priority": mitigation.priority,
                    "priority_score": priority_score,
                    "estimated_reduction": mitigation.estimated_reduction,
                    "immediate_actions": mitigation.immediate_actions[:1],  # Top action
                    "affected_rules_count": len(mitigation.affected_rules),
                }
            )

        # Sort by priority score and return top 5
        sorted_mitigations = sorted(
            all_mitigations,
            key=lambda x: (x["priority_score"], x["estimated_reduction"]),
            reverse=True,
        )

        return sorted_mitigations[:5]

    async def _prepare_alert_time_series(
        self, organization_slug: Optional[str], start_time: datetime, end_time: datetime
    ) -> Dict[str, Any]:
        """Prepare time series data for alerts."""
        # In a real implementation, this would fetch alert trigger data
        # and aggregate it into time series format
        # This is a placeholder implementation
        return {
            "timestamps": [],
            "total_alerts": [],
            "noisy_alerts": [],
            "healthy_alerts": [],
        }

    def _enhance_metrics_with_frequency(
        self, metrics: AlertHealthMetrics, frequency_analysis: Any
    ) -> AlertHealthMetrics:
        """Enhance metrics with insights from frequency analysis."""

        # Add detected patterns to recommendations
        for pattern in frequency_analysis.detected_patterns:
            if pattern.pattern_type == "periodic":
                metrics.recommendations.append(
                    f"Alert shows periodic pattern ({pattern.description})"
                )
            elif pattern.pattern_type == "burst":
                metrics.recommendations.append(
                    f"Alert exhibits burst behavior ({pattern.description})"
                )
            elif pattern.pattern_type in ["increasing", "decreasing"]:
                metrics.recommendations.append(
                    f"Alert frequency is {pattern.pattern_type} ({pattern.description})"
                )

        # Adjust health score based on anomaly score
        anomaly_penalty = int(frequency_analysis.anomaly_score * 20)
        metrics.health_score = max(0, metrics.health_score - anomaly_penalty)

        # Add frequency-based recommendations
        if frequency_analysis.recommendations:
            metrics.recommendations.extend(frequency_analysis.recommendations[:2])

        return metrics


def get_alert_health_service(
    sentry_client: Optional[SentryApiClient] = None,
    cache_service: Optional[CacheService] = None,
) -> AlertHealthService:
    """Factory function to create AlertHealthService instance."""
    return AlertHealthService(sentry_client, cache_service)
