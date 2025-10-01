"""
Alert Storm Detection - Advanced detection and analysis of alert storms.

This module provides sophisticated algorithms for detecting alert storms,
including correlation analysis, impact assessment, and mitigation strategies.
"""

import logging
import statistics
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger(__name__)


@dataclass
class StormCharacteristics:
    """Detailed characteristics of an alert storm."""

    severity: str  # 'minor', 'moderate', 'severe', 'critical'
    peak_intensity: float
    spread_factor: float  # How many different rules are affected
    correlation_score: float  # How correlated the alerts are
    root_cause_candidates: List[str] = field(default_factory=list)
    impact_assessment: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "severity": self.severity,
            "peak_intensity": self.peak_intensity,
            "spread_factor": self.spread_factor,
            "correlation_score": self.correlation_score,
            "root_cause_candidates": self.root_cause_candidates,
            "impact_assessment": self.impact_assessment,
        }


@dataclass
class StormMitigation:
    """Mitigation recommendations for alert storms."""

    immediate_actions: List[str]
    long_term_fixes: List[str]
    affected_rules: List[str]
    priority: str  # 'low', 'medium', 'high', 'critical'
    estimated_reduction: float  # Percentage reduction in alerts

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "immediate_actions": self.immediate_actions,
            "long_term_fixes": self.long_term_fixes,
            "affected_rules": self.affected_rules,
            "priority": self.priority,
            "estimated_reduction": self.estimated_reduction,
        }


@dataclass
class AlertStorm:
    """Enhanced alert storm representation."""

    storm_id: str
    start_time: datetime
    end_time: Optional[datetime]
    duration_minutes: float
    total_alerts: int
    affected_rules: Set[str]
    characteristics: StormCharacteristics
    mitigation: StormMitigation
    timeline: List[Dict[str, Any]]  # Detailed timeline of the storm

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "storm_id": self.storm_id,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_minutes": self.duration_minutes,
            "total_alerts": self.total_alerts,
            "affected_rules": list(self.affected_rules),
            "characteristics": self.characteristics.to_dict(),
            "mitigation": self.mitigation.to_dict(),
            "timeline": self.timeline,
        }


class AlertStormDetector:
    """Advanced alert storm detection and analysis."""

    # Configuration parameters
    STORM_WINDOW_MINUTES = 5  # Time window for storm detection
    MIN_ALERTS_PER_MINUTE = 10  # Minimum alerts/minute to consider a storm
    CORRELATION_THRESHOLD = 0.7  # Threshold for alert correlation
    SEVERITY_THRESHOLDS = {
        "minor": 50,  # 50 alerts in window
        "moderate": 200,  # 200 alerts in window
        "severe": 500,  # 500 alerts in window
        "critical": 1000,  # 1000+ alerts in window
    }

    def __init__(self):
        """Initialize the storm detector."""
        self.active_storms = {}
        self.storm_history = []
        self.rule_relationships = defaultdict(set)

    def detect_storms(
        self, alert_events: List[Dict[str, Any]], lookback_hours: int = 24
    ) -> List[AlertStorm]:
        """
        Detect alert storms in the given events.

        Args:
            alert_events: List of alert event dictionaries
            lookback_hours: Hours to look back for storm detection

        Returns:
            List of detected alert storms
        """
        if not alert_events:
            return []

        # Sort events by timestamp
        sorted_events = sorted(alert_events, key=lambda x: x.get("timestamp", 0))

        # Filter events within lookback period
        cutoff_time = datetime.now() - timedelta(hours=lookback_hours)
        recent_events = [
            e for e in sorted_events if datetime.fromtimestamp(e.get("timestamp", 0)) > cutoff_time
        ]

        if not recent_events:
            return []

        # Group events by time windows
        time_windows = self._group_by_time_windows(recent_events)

        # Detect storm periods
        storm_periods = self._identify_storm_periods(time_windows)

        # Analyze each storm period
        storms = []
        for period in storm_periods:
            storm = self._analyze_storm_period(period, recent_events)
            if storm:
                storms.append(storm)

        # Post-process storms (merge overlapping, etc.)
        storms = self._post_process_storms(storms)

        return storms

    def _group_by_time_windows(
        self, events: List[Dict[str, Any]]
    ) -> Dict[int, List[Dict[str, Any]]]:
        """Group events into time windows."""
        windows = defaultdict(list)

        for event in events:
            timestamp = event.get("timestamp", 0)
            # Round to nearest window
            window_key = int(timestamp / (self.STORM_WINDOW_MINUTES * 60)) * (
                self.STORM_WINDOW_MINUTES * 60
            )
            windows[window_key].append(event)

        return dict(windows)

    def _identify_storm_periods(
        self, time_windows: Dict[int, List[Dict[str, Any]]]
    ) -> List[Tuple[datetime, datetime, List[Dict[str, Any]]]]:
        """Identify continuous periods that qualify as storms."""
        storm_periods = []
        current_storm_start = None
        current_storm_events = []

        sorted_windows = sorted(time_windows.items())

        for window_time, events in sorted_windows:
            alerts_per_minute = len(events) / self.STORM_WINDOW_MINUTES

            if alerts_per_minute >= self.MIN_ALERTS_PER_MINUTE:
                # Storm condition met
                if current_storm_start is None:
                    current_storm_start = datetime.fromtimestamp(window_time)
                current_storm_events.extend(events)
            else:
                # Storm condition not met
                if current_storm_start is not None:
                    # End of storm
                    storm_end = datetime.fromtimestamp(window_time)
                    storm_periods.append((current_storm_start, storm_end, current_storm_events))
                    current_storm_start = None
                    current_storm_events = []

        # Handle ongoing storm
        if current_storm_start is not None and current_storm_events:
            last_window_time = sorted_windows[-1][0]
            storm_end = datetime.fromtimestamp(last_window_time + self.STORM_WINDOW_MINUTES * 60)
            storm_periods.append((current_storm_start, storm_end, current_storm_events))

        return storm_periods

    def _analyze_storm_period(
        self,
        period: Tuple[datetime, datetime, List[Dict[str, Any]]],
        all_events: List[Dict[str, Any]],
    ) -> Optional[AlertStorm]:
        """Analyze a storm period to extract characteristics."""
        start_time, end_time, storm_events = period

        if not storm_events:
            return None

        # Generate storm ID
        storm_id = f"storm_{start_time.strftime('%Y%m%d_%H%M%S')}"

        # Extract affected rules
        affected_rules = set()
        rule_alerts = defaultdict(list)

        for event in storm_events:
            rule_id = event.get("rule_id", "unknown")
            affected_rules.add(rule_id)
            rule_alerts[rule_id].append(event)

        # Calculate storm characteristics
        characteristics = self._calculate_storm_characteristics(
            storm_events, rule_alerts, all_events
        )

        # Generate mitigation recommendations
        mitigation = self._generate_mitigation_recommendations(
            characteristics, affected_rules, rule_alerts
        )

        # Create timeline
        timeline = self._create_storm_timeline(storm_events)

        # Calculate duration
        duration_minutes = (end_time - start_time).total_seconds() / 60

        return AlertStorm(
            storm_id=storm_id,
            start_time=start_time,
            end_time=end_time,
            duration_minutes=duration_minutes,
            total_alerts=len(storm_events),
            affected_rules=affected_rules,
            characteristics=characteristics,
            mitigation=mitigation,
            timeline=timeline,
        )

    def _calculate_storm_characteristics(
        self,
        storm_events: List[Dict[str, Any]],
        rule_alerts: Dict[str, List[Dict[str, Any]]],
        all_events: List[Dict[str, Any]],
    ) -> StormCharacteristics:
        """Calculate detailed storm characteristics."""
        # Determine severity
        total_alerts = len(storm_events)
        severity = "minor"
        for sev, threshold in sorted(
            self.SEVERITY_THRESHOLDS.items(), key=lambda x: x[1], reverse=True
        ):
            if total_alerts >= threshold:
                severity = sev
                break

        # Calculate peak intensity
        # Group by minute and find peak
        minute_counts = defaultdict(int)
        for event in storm_events:
            minute_key = int(event.get("timestamp", 0) / 60) * 60
            minute_counts[minute_key] += 1

        peak_intensity = max(minute_counts.values()) if minute_counts else 0

        # Calculate spread factor
        spread_factor = len(rule_alerts) / max(len(all_events), 1)

        # Calculate correlation
        correlation_score = self._calculate_alert_correlation(rule_alerts)

        # Identify root cause candidates
        root_cause_candidates = self._identify_root_causes(rule_alerts, correlation_score)

        # Assess impact
        impact_assessment = self._assess_storm_impact(storm_events, rule_alerts)

        return StormCharacteristics(
            severity=severity,
            peak_intensity=peak_intensity,
            spread_factor=spread_factor,
            correlation_score=correlation_score,
            root_cause_candidates=root_cause_candidates,
            impact_assessment=impact_assessment,
        )

    def _calculate_alert_correlation(self, rule_alerts: Dict[str, List[Dict[str, Any]]]) -> float:
        """Calculate correlation between different alert rules."""
        if len(rule_alerts) < 2:
            return 0.0

        correlation_scores = []

        # Compare timing patterns between different rules
        rule_ids = list(rule_alerts.keys())
        for i in range(len(rule_ids)):
            for j in range(i + 1, len(rule_ids)):
                rule1_times = [e.get("timestamp", 0) for e in rule_alerts[rule_ids[i]]]
                rule2_times = [e.get("timestamp", 0) for e in rule_alerts[rule_ids[j]]]

                # Calculate temporal correlation
                correlation = self._calculate_temporal_correlation(rule1_times, rule2_times)
                correlation_scores.append(correlation)

        return statistics.mean(correlation_scores) if correlation_scores else 0.0

    def _calculate_temporal_correlation(self, times1: List[float], times2: List[float]) -> float:
        """Calculate temporal correlation between two alert series."""
        if not times1 or not times2:
            return 0.0

        # Create time bins
        all_times = sorted(times1 + times2)
        if len(all_times) < 2:
            return 0.0

        bin_size = 60  # 1 minute bins
        start_time = all_times[0]
        end_time = all_times[-1]

        num_bins = max(1, int((end_time - start_time) / bin_size) + 1)

        # Count alerts in each bin
        bins1 = [0] * num_bins
        bins2 = [0] * num_bins

        for t in times1:
            bin_idx = min(int((t - start_time) / bin_size), num_bins - 1)
            bins1[bin_idx] += 1

        for t in times2:
            bin_idx = min(int((t - start_time) / bin_size), num_bins - 1)
            bins2[bin_idx] += 1

        # Calculate correlation coefficient
        if all(b == 0 for b in bins1) or all(b == 0 for b in bins2):
            return 0.0

        try:
            # Use Pearson correlation
            mean1 = sum(bins1) / len(bins1)
            mean2 = sum(bins2) / len(bins2)

            numerator = sum((b1 - mean1) * (b2 - mean2) for b1, b2 in zip(bins1, bins2))

            sq_sum1 = sum((b - mean1) ** 2 for b in bins1)
            sq_sum2 = sum((b - mean2) ** 2 for b in bins2)

            denominator = (sq_sum1 * sq_sum2) ** 0.5

            correlation = numerator / denominator if denominator > 0 else 0.0
            return max(0, min(1, correlation))  # Clamp to [0, 1]

        except Exception as e:
            logger.warning(f"Error calculating correlation: {str(e)}")
            return 0.0

    def _identify_root_causes(
        self, rule_alerts: Dict[str, List[Dict[str, Any]]], correlation_score: float
    ) -> List[str]:
        """Identify potential root causes of the storm."""
        root_causes = []

        # Find the rule that fired first
        earliest_alerts = []
        for rule_id, alerts in rule_alerts.items():
            if alerts:
                earliest = min(alerts, key=lambda x: x.get("timestamp", float("inf")))
                earliest_alerts.append((rule_id, earliest.get("timestamp", 0)))

        if earliest_alerts:
            earliest_alerts.sort(key=lambda x: x[1])
            first_rule = earliest_alerts[0][0]
            root_causes.append(f"Initial trigger: {first_rule}")

        # High correlation suggests common cause
        if correlation_score > self.CORRELATION_THRESHOLD:
            root_causes.append("High correlation suggests common infrastructure issue")

        # Check for cascade patterns
        cascade_rules = self._detect_cascade_pattern(rule_alerts)
        if cascade_rules:
            root_causes.append(f"Cascade pattern detected: {' -> '.join(cascade_rules)}")

        return root_causes

    def _detect_cascade_pattern(self, rule_alerts: Dict[str, List[Dict[str, Any]]]) -> List[str]:
        """Detect if alerts follow a cascade pattern."""
        # Sort rules by their first alert time
        rule_times = []
        for rule_id, alerts in rule_alerts.items():
            if alerts:
                first_time = min(a.get("timestamp", float("inf")) for a in alerts)
                rule_times.append((rule_id, first_time))

        if len(rule_times) < 2:
            return []

        rule_times.sort(key=lambda x: x[1])

        # Check if there's a clear sequence
        cascade = []
        time_threshold = 30  # 30 seconds between stages

        for i in range(len(rule_times) - 1):
            current_rule, current_time = rule_times[i]
            next_rule, next_time = rule_times[i + 1]

            if next_time - current_time <= time_threshold:
                if not cascade:
                    cascade.append(current_rule)
                cascade.append(next_rule)
            else:
                # Gap too large, break the cascade
                if cascade and len(cascade) > 2:
                    return cascade
                cascade = []

        return cascade if len(cascade) > 2 else []

    def _assess_storm_impact(
        self, storm_events: List[Dict[str, Any]], rule_alerts: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """Assess the impact of the storm."""
        impact = {
            "total_alerts": len(storm_events),
            "affected_rules": len(rule_alerts),
            "estimated_noise_minutes": 0,
            "user_impact": "unknown",
            "system_impact": "unknown",
        }

        # Estimate noise duration (how long alerts were overwhelming)
        if storm_events:
            first_timestamp = min(e.get("timestamp", 0) for e in storm_events)
            last_timestamp = max(e.get("timestamp", 0) for e in storm_events)
            duration_minutes = (last_timestamp - first_timestamp) / 60
            impact["estimated_noise_minutes"] = duration_minutes

        # Assess user impact based on alert volume
        alerts_per_minute = len(storm_events) / max(impact["estimated_noise_minutes"], 1)
        if alerts_per_minute > 50:
            impact["user_impact"] = "severe - alert fatigue likely"
        elif alerts_per_minute > 20:
            impact["user_impact"] = "moderate - difficult to process alerts"
        else:
            impact["user_impact"] = "minor - manageable alert volume"

        # Assess system impact
        if len(storm_events) > 1000:
            impact["system_impact"] = "high - potential performance impact"
        elif len(storm_events) > 500:
            impact["system_impact"] = "moderate - increased system load"
        else:
            impact["system_impact"] = "low - minimal system impact"

        return impact

    def _generate_mitigation_recommendations(
        self,
        characteristics: StormCharacteristics,
        affected_rules: Set[str],
        rule_alerts: Dict[str, List[Dict[str, Any]]],
    ) -> StormMitigation:
        """Generate mitigation recommendations."""
        immediate_actions = []
        long_term_fixes = []

        # Immediate actions based on severity
        if characteristics.severity in ["severe", "critical"]:
            immediate_actions.append("Consider temporarily disabling non-critical alerts")
            immediate_actions.append("Implement emergency rate limiting")
            immediate_actions.append("Notify on-call team about ongoing storm")
        elif characteristics.severity == "moderate":
            immediate_actions.append("Monitor storm progression closely")
            immediate_actions.append("Prepare to implement rate limiting if needed")

        # Long-term fixes based on patterns
        if characteristics.correlation_score > self.CORRELATION_THRESHOLD:
            long_term_fixes.append("Implement alert deduplication for correlated rules")
            long_term_fixes.append("Consider combining related alerts into composite rules")

        if characteristics.spread_factor > 0.3:
            long_term_fixes.append("Review alert dependencies and implement circuit breakers")
            long_term_fixes.append("Add storm detection to prevent cascade effects")

        # Rule-specific recommendations
        for rule_id, alerts in rule_alerts.items():
            if len(alerts) > 100:
                long_term_fixes.append(
                    f"Review threshold for rule {rule_id} - fired {len(alerts)} times"
                )

        # Determine priority
        if characteristics.severity == "critical":
            priority = "critical"
        elif characteristics.severity == "severe":
            priority = "high"
        elif characteristics.severity == "moderate":
            priority = "medium"
        else:
            priority = "low"

        # Estimate reduction
        estimated_reduction = 0.0
        if characteristics.correlation_score > self.CORRELATION_THRESHOLD:
            estimated_reduction += 30.0  # Deduplication can reduce by 30%
        if characteristics.spread_factor > 0.3:
            estimated_reduction += 20.0  # Circuit breakers can reduce by 20%

        return StormMitigation(
            immediate_actions=immediate_actions,
            long_term_fixes=long_term_fixes,
            affected_rules=list(affected_rules),
            priority=priority,
            estimated_reduction=min(estimated_reduction, 70.0),  # Cap at 70%
        )

    def _create_storm_timeline(self, storm_events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Create a detailed timeline of the storm."""
        timeline = []

        # Group events by minute
        minute_events = defaultdict(list)
        for event in storm_events:
            timestamp = event.get("timestamp", 0)
            minute_key = int(timestamp / 60) * 60
            minute_events[minute_key].append(event)

        # Create timeline entries
        for minute_timestamp, events in sorted(minute_events.items()):
            # Count by rule
            rule_counts = defaultdict(int)
            for event in events:
                rule_id = event.get("rule_id", "unknown")
                rule_counts[rule_id] += 1

            timeline.append(
                {
                    "timestamp": datetime.fromtimestamp(minute_timestamp).isoformat(),
                    "total_alerts": len(events),
                    "rule_breakdown": dict(rule_counts),
                    "intensity": len(events),  # Alerts in this minute
                }
            )

        return timeline

    def _post_process_storms(self, storms: List[AlertStorm]) -> List[AlertStorm]:
        """Post-process storms to merge overlapping ones."""
        if len(storms) < 2:
            return storms

        # Sort by start time
        sorted_storms = sorted(storms, key=lambda s: s.start_time)

        merged_storms = []
        current_storm = sorted_storms[0]

        for next_storm in sorted_storms[1:]:
            # Check if storms overlap or are very close
            gap_minutes = (next_storm.start_time - current_storm.end_time).total_seconds() / 60

            if gap_minutes < 5:  # Less than 5 minutes gap
                # Merge storms
                current_storm = self._merge_storms(current_storm, next_storm)
            else:
                # No overlap, keep separate
                merged_storms.append(current_storm)
                current_storm = next_storm

        merged_storms.append(current_storm)

        return merged_storms

    def _merge_storms(self, storm1: AlertStorm, storm2: AlertStorm) -> AlertStorm:
        """Merge two storms into one."""
        # Combine basic attributes
        merged_id = f"{storm1.storm_id}_merged_{storm2.storm_id}"
        start_time = min(storm1.start_time, storm2.start_time)
        end_time = max(storm1.end_time, storm2.end_time)
        duration_minutes = (end_time - start_time).total_seconds() / 60
        total_alerts = storm1.total_alerts + storm2.total_alerts
        affected_rules = storm1.affected_rules.union(storm2.affected_rules)

        # Merge characteristics
        severity = max(
            storm1.characteristics.severity,
            storm2.characteristics.severity,
            key=lambda s: self.SEVERITY_THRESHOLDS.get(s, 0),
        )

        merged_characteristics = StormCharacteristics(
            severity=severity,
            peak_intensity=max(
                storm1.characteristics.peak_intensity, storm2.characteristics.peak_intensity
            ),
            spread_factor=len(affected_rules) / max(total_alerts, 1),
            correlation_score=(
                storm1.characteristics.correlation_score + storm2.characteristics.correlation_score
            )
            / 2,
            root_cause_candidates=(
                storm1.characteristics.root_cause_candidates
                + storm2.characteristics.root_cause_candidates
            ),
            impact_assessment=self._merge_impact_assessments(
                storm1.characteristics.impact_assessment, storm2.characteristics.impact_assessment
            ),
        )

        # Merge mitigation
        merged_mitigation = StormMitigation(
            immediate_actions=list(
                set(storm1.mitigation.immediate_actions + storm2.mitigation.immediate_actions)
            ),
            long_term_fixes=list(
                set(storm1.mitigation.long_term_fixes + storm2.mitigation.long_term_fixes)
            ),
            affected_rules=list(affected_rules),
            priority=max(storm1.mitigation.priority, storm2.mitigation.priority),
            estimated_reduction=max(
                storm1.mitigation.estimated_reduction, storm2.mitigation.estimated_reduction
            ),
        )

        # Merge timeline
        merged_timeline = sorted(storm1.timeline + storm2.timeline, key=lambda x: x["timestamp"])

        return AlertStorm(
            storm_id=merged_id,
            start_time=start_time,
            end_time=end_time,
            duration_minutes=duration_minutes,
            total_alerts=total_alerts,
            affected_rules=affected_rules,
            characteristics=merged_characteristics,
            mitigation=merged_mitigation,
            timeline=merged_timeline,
        )

    def _merge_impact_assessments(
        self, impact1: Dict[str, Any], impact2: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Merge two impact assessments."""
        return {
            "total_alerts": impact1.get("total_alerts", 0) + impact2.get("total_alerts", 0),
            "affected_rules": max(
                impact1.get("affected_rules", 0), impact2.get("affected_rules", 0)
            ),
            "estimated_noise_minutes": (
                impact1.get("estimated_noise_minutes", 0)
                + impact2.get("estimated_noise_minutes", 0)
            ),
            "user_impact": max(
                impact1.get("user_impact", "unknown"), impact2.get("user_impact", "unknown")
            ),
            "system_impact": max(
                impact1.get("system_impact", "unknown"), impact2.get("system_impact", "unknown")
            ),
        }
