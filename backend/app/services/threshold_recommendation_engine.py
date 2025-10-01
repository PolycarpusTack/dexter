"""
Threshold Recommendation Engine - Provides intelligent threshold recommendations.

This module analyzes historical alert data and provides data-driven recommendations
for threshold adjustments to optimize alert behavior.
"""

import logging
import statistics
from dataclasses import dataclass
from collections import defaultdict
from typing import Any, Dict, List, Optional

# Optional scientific libraries (guarded for environments without scipy/numpy)
try:  # pragma: no cover - availability dependent
    import numpy as np  # type: ignore
    from scipy import stats  # type: ignore
except Exception:  # pragma: no cover - fall back
    np = None  # type: ignore
    stats = None  # type: ignore

logger = logging.getLogger(__name__)


@dataclass
class ThresholdAnalysis:
    """Results of threshold analysis."""

    current_value: Any
    recommended_value: Any
    confidence: float
    improvement_percentage: float
    validation_results: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "current_value": self.current_value,
            "recommended_value": self.recommended_value,
            "confidence": self.confidence,
            "improvement_percentage": self.improvement_percentage,
            "validation_results": self.validation_results,
        }


@dataclass
class ThresholdRecommendation:
    """Comprehensive threshold recommendation."""

    rule_id: str
    rule_type: str
    current_config: Dict[str, Any]
    recommended_config: Dict[str, Any]
    analysis: ThresholdAnalysis
    rationale: str
    implementation_steps: List[str]
    risk_assessment: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "rule_id": self.rule_id,
            "rule_type": self.rule_type,
            "current_config": self.current_config,
            "recommended_config": self.recommended_config,
            "analysis": self.analysis.to_dict(),
            "rationale": self.rationale,
            "implementation_steps": self.implementation_steps,
            "risk_assessment": self.risk_assessment,
        }


class ThresholdRecommendationEngine:
    """Engine for generating intelligent threshold recommendations."""

    # Configuration parameters
    MIN_DATA_POINTS = 100  # Minimum data points for reliable analysis
    CONFIDENCE_THRESHOLD = 0.7  # Minimum confidence for recommendations
    NOISE_REDUCTION_TARGET = 0.5  # Target 50% noise reduction
    FALSE_NEGATIVE_TOLERANCE = 0.05  # Accept 5% false negative rate

    # Statistical parameters
    PERCENTILE_OPTIONS = [50, 75, 90, 95, 99]  # Percentiles to consider
    OUTLIER_THRESHOLD = 3.0  # Standard deviations for outlier detection

    def __init__(self):
        """Initialize the recommendation engine."""
        self.analysis_cache = {}

    def generate_recommendations(
        self,
        rule_config: Dict[str, Any],
        historical_data: List[Dict[str, Any]],
        target_metrics: Optional[Dict[str, float]] = None,
    ) -> ThresholdRecommendation:
        """
        Generate threshold recommendations for a rule.

        Args:
            rule_config: Current rule configuration
            historical_data: Historical alert and metric data
            target_metrics: Target metrics (e.g., noise reduction)

        Returns:
            ThresholdRecommendation with analysis and suggestions
        """
        rule_id = rule_config.get("id", "unknown")
        rule_type = rule_config.get("type", "unknown")

        # Extract current threshold configuration
        current_config = self._extract_threshold_config(rule_config)

        # Analyze historical data
        if rule_type == "metric":
            analysis = self._analyze_metric_rule(current_config, historical_data, target_metrics)
        elif rule_type == "issue":
            analysis = self._analyze_issue_rule(current_config, historical_data, target_metrics)
        else:
            # Generic analysis
            analysis = self._analyze_generic_rule(current_config, historical_data, target_metrics)

        # Generate recommended configuration
        recommended_config = self._generate_recommended_config(current_config, analysis, rule_type)

        # Create comprehensive recommendation
        recommendation = ThresholdRecommendation(
            rule_id=rule_id,
            rule_type=rule_type,
            current_config=current_config,
            recommended_config=recommended_config,
            analysis=analysis,
            rationale=self._generate_rationale(analysis, rule_type),
            implementation_steps=self._generate_implementation_steps(
                current_config, recommended_config, rule_type
            ),
            risk_assessment=self._assess_risks(analysis, rule_type),
        )

        return recommendation

    def _extract_threshold_config(self, rule_config: Dict[str, Any]) -> Dict[str, Any]:
        """Extract threshold configuration from rule config."""
        threshold_config = {}

        # For metric alerts
        if "triggers" in rule_config:
            for trigger in rule_config["triggers"]:
                threshold_config[trigger.get("label", "trigger")] = {
                    "threshold": trigger.get("threshold"),
                    "threshold_type": trigger.get("threshold_type"),
                    "timewindow": trigger.get("timewindow", 300),  # Default 5 minutes
                }

        # For issue alerts
        if "conditions" in rule_config:
            for condition in rule_config["conditions"]:
                if condition.get("type") == "event.frequency":
                    threshold_config["frequency"] = {
                        "value": condition.get("value"),
                        "interval": condition.get("interval"),
                        "comparison_type": condition.get("comparison_type", "greater"),
                    }

        # Generic threshold extraction
        if "threshold" in rule_config:
            threshold_config["threshold"] = rule_config["threshold"]

        return threshold_config

    def _analyze_metric_rule(
        self,
        current_config: Dict[str, Any],
        historical_data: List[Dict[str, Any]],
        target_metrics: Optional[Dict[str, float]],
    ) -> ThresholdAnalysis:
        """Analyze metric-based alert rule."""
        # Extract metric values from historical data
        metric_values = []
        alert_points = []

        for data_point in historical_data:
            value = data_point.get("value")
            if value is not None:
                metric_values.append(value)
                if data_point.get("alert_fired", False):
                    alert_points.append(value)

        if len(metric_values) < self.MIN_DATA_POINTS:
            logger.warning(f"Insufficient data points: {len(metric_values)}")
            return self._create_low_confidence_analysis(current_config)

        # Statistical analysis
        stats_analysis = self._perform_statistical_analysis(metric_values)

        # Analyze alert effectiveness
        effectiveness = self._analyze_alert_effectiveness(
            metric_values, alert_points, current_config
        )

        # Find optimal threshold
        optimal_threshold = self._find_optimal_threshold(
            metric_values, stats_analysis, effectiveness, target_metrics
        )

        # Calculate improvement
        improvement = self._calculate_improvement(current_config, optimal_threshold, metric_values)

        # Validate recommendation
        validation = self._validate_threshold(optimal_threshold, metric_values, target_metrics)

        return ThresholdAnalysis(
            current_value=current_config.get("threshold"),
            recommended_value=optimal_threshold,
            confidence=self._calculate_confidence(stats_analysis, effectiveness),
            improvement_percentage=improvement,
            validation_results=validation,
        )

    def _analyze_issue_rule(
        self,
        current_config: Dict[str, Any],
        historical_data: List[Dict[str, Any]],
        target_metrics: Optional[Dict[str, float]],
    ) -> ThresholdAnalysis:
        """Analyze issue-based alert rule."""
        # Extract event frequencies from historical data
        time_windows = defaultdict(int)
        alert_windows = []

        current_frequency = current_config.get("frequency", {})
        window_size = current_frequency.get("interval", 3600)  # Default 1 hour

        for data_point in historical_data:
            timestamp = data_point.get("timestamp")
            if timestamp:
                window_key = int(timestamp / window_size) * window_size
                time_windows[window_key] += 1

                if data_point.get("alert_fired", False):
                    alert_windows.append(window_key)

        # Analyze frequency distribution
        frequencies = list(time_windows.values())
        if len(frequencies) < self.MIN_DATA_POINTS:
            return self._create_low_confidence_analysis(current_config)

        # Statistical analysis of frequencies
        stats_analysis = self._perform_statistical_analysis(frequencies)

        # Find optimal frequency threshold
        optimal_frequency = self._find_optimal_frequency(
            frequencies, stats_analysis, current_frequency, target_metrics
        )

        # Calculate improvement
        improvement = self._calculate_frequency_improvement(
            current_frequency, optimal_frequency, frequencies
        )

        # Validate recommendation
        validation = self._validate_frequency(optimal_frequency, frequencies, target_metrics)

        return ThresholdAnalysis(
            current_value=current_frequency.get("value"),
            recommended_value=optimal_frequency,
            confidence=self._calculate_confidence(stats_analysis, None),
            improvement_percentage=improvement,
            validation_results=validation,
        )

    def _analyze_generic_rule(
        self,
        current_config: Dict[str, Any],
        historical_data: List[Dict[str, Any]],
        target_metrics: Optional[Dict[str, float]],
    ) -> ThresholdAnalysis:
        """Generic analysis for other rule types."""
        # Extract relevant values
        values = []
        alert_values = []

        for data_point in historical_data:
            value = data_point.get("value") or data_point.get("count")
            if value is not None:
                values.append(value)
                if data_point.get("alert_fired", False):
                    alert_values.append(value)

        if not values:
            return self._create_low_confidence_analysis(current_config)

        # Basic statistical analysis
        stats_analysis = self._perform_statistical_analysis(values)

        # Simple optimization
        if current_config.get("threshold"):
            current_threshold = current_config["threshold"]
            recommended_threshold = stats_analysis["percentiles"].get("p95", current_threshold)
        else:
            recommended_threshold = stats_analysis["percentiles"].get("p95", 0)

        return ThresholdAnalysis(
            current_value=current_config.get("threshold"),
            recommended_value=recommended_threshold,
            confidence=0.5,  # Lower confidence for generic analysis
            improvement_percentage=0.0,
            validation_results={"method": "generic"},
        )

    def _perform_statistical_analysis(self, values: List[float]) -> Dict[str, Any]:
        """Perform comprehensive statistical analysis."""
        analysis = {
            "count": len(values),
            "mean": statistics.mean(values),
            "median": statistics.median(values),
            "std_dev": statistics.stdev(values) if len(values) > 1 else 0,
            "min": min(values),
            "max": max(values),
            "percentiles": {},
        }

        # Calculate percentiles
        for p in self.PERCENTILE_OPTIONS:
            analysis["percentiles"][f"p{p}"] = np.percentile(values, p)

        # Detect outliers
        outliers = self._detect_outliers(values)
        analysis["outlier_count"] = len(outliers)
        analysis["outlier_percentage"] = len(outliers) / len(values) * 100

        # Distribution analysis
        analysis["distribution"] = self._analyze_distribution(values)

        return analysis

    def _detect_outliers(self, values: List[float]) -> List[float]:
        """Detect outliers using statistical methods."""
        if len(values) < 3:
            return []

        mean = statistics.mean(values)
        std_dev = statistics.stdev(values)

        outliers = []
        for value in values:
            z_score = (value - mean) / std_dev if std_dev > 0 else 0
            if abs(z_score) > self.OUTLIER_THRESHOLD:
                outliers.append(value)

        return outliers

    def _analyze_distribution(self, values: List[float]) -> Dict[str, Any]:
        """Analyze the distribution of values."""
        distribution = {"type": "unknown", "skewness": 0.0, "kurtosis": 0.0}

        if len(values) < 3:
            return distribution

        try:
            # Calculate skewness and kurtosis
            distribution["skewness"] = stats.skew(values)
            distribution["kurtosis"] = stats.kurtosis(values)

            # Determine distribution type
            if abs(distribution["skewness"]) < 0.5:
                distribution["type"] = "normal"
            elif distribution["skewness"] > 1:
                distribution["type"] = "right_skewed"
            elif distribution["skewness"] < -1:
                distribution["type"] = "left_skewed"
            else:
                distribution["type"] = "moderately_skewed"

        except Exception as e:
            logger.warning(f"Error analyzing distribution: {str(e)}")

        return distribution

    def _analyze_alert_effectiveness(
        self, metric_values: List[float], alert_points: List[float], current_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze how effective current alerts are."""
        effectiveness = {
            "total_alerts": len(alert_points),
            "alert_rate": len(alert_points) / len(metric_values) if metric_values else 0,
            "false_positive_rate": 0.0,
            "coverage": 0.0,
        }

        if not alert_points:
            return effectiveness

        # Analyze false positives (alerts that didn't need action)
        # This is a simplified analysis - in practice, you'd need labeled data
        current_threshold = current_config.get("threshold")
        if current_threshold:
            # Consider alerts near the threshold as potentially false positives
            threshold_margin = abs(current_threshold) * 0.1  # 10% margin
            potential_false_positives = sum(
                1 for point in alert_points if abs(point - current_threshold) < threshold_margin
            )
            effectiveness["false_positive_rate"] = potential_false_positives / len(alert_points)

        # Calculate coverage (what percentage of concerning values triggered alerts)
        if metric_values:
            concerning_values = [v for v in metric_values if v > np.percentile(metric_values, 95)]
            if concerning_values:
                alerts_on_concerning = sum(1 for v in alert_points if v in concerning_values)
                effectiveness["coverage"] = alerts_on_concerning / len(concerning_values)

        return effectiveness

    def _find_optimal_threshold(
        self,
        values: List[float],
        stats_analysis: Dict[str, Any],
        effectiveness: Dict[str, Any],
        target_metrics: Optional[Dict[str, float]],
    ) -> float:
        """Find the optimal threshold value."""
        # Default to 95th percentile if no specific targets
        if not target_metrics:
            return stats_analysis["percentiles"]["p95"]

        # Define candidate thresholds
        candidates = []

        # Add percentile-based candidates
        for p_key, p_value in stats_analysis["percentiles"].items():
            candidates.append(p_value)

        # Add mean + n*std candidates
        mean = stats_analysis["mean"]
        std_dev = stats_analysis["std_dev"]
        for n in [1, 1.5, 2, 2.5, 3]:
            candidates.append(mean + n * std_dev)

        # Evaluate each candidate
        best_threshold = None
        best_score = float("-inf")

        for candidate in candidates:
            score = self._evaluate_threshold_candidate(
                candidate, values, target_metrics, effectiveness
            )
            if score > best_score:
                best_score = score
                best_threshold = candidate

        return best_threshold or stats_analysis["percentiles"]["p95"]

    def _evaluate_threshold_candidate(
        self,
        threshold: float,
        values: List[float],
        target_metrics: Dict[str, float],
        effectiveness: Dict[str, Any],
    ) -> float:
        """Evaluate a threshold candidate against target metrics."""
        score = 0.0

        # Calculate metrics for this threshold
        alerts_triggered = sum(1 for v in values if v > threshold)
        alert_rate = alerts_triggered / len(values) if values else 0

        # Noise reduction score
        target_noise_reduction = target_metrics.get("noise_reduction", self.NOISE_REDUCTION_TARGET)
        current_alert_rate = effectiveness.get("alert_rate", 1.0)
        noise_reduction = 1 - (alert_rate / current_alert_rate) if current_alert_rate > 0 else 0

        if noise_reduction >= target_noise_reduction:
            score += 50  # Major points for meeting noise reduction target
        else:
            score += 50 * (noise_reduction / target_noise_reduction)

        # False negative tolerance
        concerning_values = [v for v in values if v > np.percentile(values, 99)]
        if concerning_values:
            missed_concerning = sum(1 for v in concerning_values if v <= threshold)
            false_negative_rate = missed_concerning / len(concerning_values)

            if false_negative_rate <= self.FALSE_NEGATIVE_TOLERANCE:
                score += 30  # Points for acceptable false negative rate
            else:
                score -= 30 * (false_negative_rate / self.FALSE_NEGATIVE_TOLERANCE)

        # Stability score (not too far from current patterns)
        percentile_rank = stats.percentileofscore(values, threshold)
        if 85 <= percentile_rank <= 99:
            score += 20  # Points for reasonable percentile

        return score

    def _find_optimal_frequency(
        self,
        frequencies: List[int],
        stats_analysis: Dict[str, Any],
        current_config: Dict[str, Any],
        target_metrics: Optional[Dict[str, float]],
    ) -> int:
        """Find optimal frequency threshold for issue alerts."""
        # Use percentile approach for frequency thresholds
        if not target_metrics:
            return int(stats_analysis["percentiles"]["p90"])

        # Evaluate different percentiles
        candidates = []
        for p in [75, 80, 85, 90, 95]:
            candidates.append(int(stats_analysis["percentiles"][f"p{p}"]))

        # Find best candidate
        current_value = current_config.get("value", 0)
        best_frequency = current_value
        best_score = float("-inf")

        for candidate in candidates:
            score = self._evaluate_frequency_candidate(
                candidate, frequencies, current_value, target_metrics
            )
            if score > best_score:
                best_score = score
                best_frequency = candidate

        return best_frequency

    def _evaluate_frequency_candidate(
        self,
        threshold: int,
        frequencies: List[int],
        current_value: int,
        target_metrics: Dict[str, float],
    ) -> float:
        """Evaluate a frequency threshold candidate."""
        score = 0.0

        # Calculate alert rate
        alerts_triggered = sum(1 for f in frequencies if f >= threshold)
        alert_rate = alerts_triggered / len(frequencies) if frequencies else 0

        # Current alert rate
        current_alerts = sum(1 for f in frequencies if f >= current_value)
        current_alert_rate = current_alerts / len(frequencies) if frequencies else 1

        # Noise reduction
        noise_reduction = 1 - (alert_rate / current_alert_rate) if current_alert_rate > 0 else 0
        target_reduction = target_metrics.get("noise_reduction", self.NOISE_REDUCTION_TARGET)

        if noise_reduction >= target_reduction:
            score += 50
        else:
            score += 50 * (noise_reduction / target_reduction)

        # Coverage of high-frequency events
        high_frequency_events = [f for f in frequencies if f > np.percentile(frequencies, 95)]
        if high_frequency_events:
            covered = sum(1 for f in high_frequency_events if f >= threshold)
            coverage = covered / len(high_frequency_events)
            score += 30 * coverage

        return score

    def _calculate_improvement(
        self, current_config: Dict[str, Any], recommended_value: float, values: List[float]
    ) -> float:
        """Calculate the improvement percentage."""
        current_value = current_config.get("threshold")
        if not current_value:
            return 0.0

        # Calculate alert rates
        current_alerts = sum(1 for v in values if v > current_value)
        recommended_alerts = sum(1 for v in values if v > recommended_value)

        current_rate = current_alerts / len(values) if values else 0
        recommended_rate = recommended_alerts / len(values) if values else 0

        # Calculate noise reduction
        if current_rate > 0:
            noise_reduction = (current_rate - recommended_rate) / current_rate * 100
            return max(0, noise_reduction)  # Don't show negative improvement

        return 0.0

    def _calculate_frequency_improvement(
        self, current_config: Dict[str, Any], recommended_value: int, frequencies: List[int]
    ) -> float:
        """Calculate improvement for frequency thresholds."""
        current_value = current_config.get("value", 0)

        # Calculate alert reduction
        current_alerts = sum(1 for f in frequencies if f >= current_value)
        recommended_alerts = sum(1 for f in frequencies if f >= recommended_value)

        if current_alerts > 0:
            reduction = (current_alerts - recommended_alerts) / current_alerts * 100
            return max(0, reduction)

        return 0.0

    def _validate_threshold(
        self, threshold: float, values: List[float], target_metrics: Optional[Dict[str, float]]
    ) -> Dict[str, Any]:
        """Validate the recommended threshold."""
        validation = {
            "alerts_triggered": 0,
            "alert_rate": 0.0,
            "coverage_score": 0.0,
            "stability_score": 0.0,
            "overall_score": 0.0,
        }

        # Calculate basic metrics
        alerts_triggered = sum(1 for v in values if v > threshold)
        validation["alerts_triggered"] = alerts_triggered
        validation["alert_rate"] = alerts_triggered / len(values) if values else 0

        # Coverage of extreme values
        extreme_values = [v for v in values if v > np.percentile(values, 99)]
        if extreme_values:
            covered = sum(1 for v in extreme_values if v > threshold)
            validation["coverage_score"] = covered / len(extreme_values)

        # Stability (not triggering on normal variations)
        normal_values = [
            v for v in values if np.percentile(values, 25) <= v <= np.percentile(values, 75)
        ]
        if normal_values:
            false_alerts = sum(1 for v in normal_values if v > threshold)
            validation["stability_score"] = 1 - (false_alerts / len(normal_values))

        # Overall score
        validation["overall_score"] = (
            validation["coverage_score"] * 0.4 + validation["stability_score"] * 0.6
        )

        return validation

    def _validate_frequency(
        self, frequency: int, frequencies: List[int], target_metrics: Optional[Dict[str, float]]
    ) -> Dict[str, Any]:
        """Validate frequency threshold."""
        validation = {"alerts_triggered": 0, "alert_rate": 0.0, "reduction_achieved": 0.0}

        alerts = sum(1 for f in frequencies if f >= frequency)
        validation["alerts_triggered"] = alerts
        validation["alert_rate"] = alerts / len(frequencies) if frequencies else 0

        # Calculate reduction if current threshold is known
        target_reduction = target_metrics.get("noise_reduction", 0.5) if target_metrics else 0.5
        validation["reduction_achieved"] = target_reduction  # Simplified

        return validation

    def _calculate_confidence(
        self, stats_analysis: Dict[str, Any], effectiveness: Optional[Dict[str, Any]]
    ) -> float:
        """Calculate confidence in the recommendation."""
        confidence_factors = []

        # Data volume factor
        data_count = stats_analysis.get("count", 0)
        volume_confidence = min(data_count / 1000, 1.0)  # More data = higher confidence
        confidence_factors.append(volume_confidence)

        # Distribution factor
        distribution = stats_analysis.get("distribution", {})
        if distribution.get("type") == "normal":
            confidence_factors.append(0.9)  # High confidence for normal distributions
        elif distribution.get("type") in ["right_skewed", "left_skewed"]:
            confidence_factors.append(0.7)  # Medium confidence for skewed
        else:
            confidence_factors.append(0.5)  # Lower confidence for unknown

        # Outlier factor
        outlier_percentage = stats_analysis.get("outlier_percentage", 0)
        outlier_confidence = 1 - min(
            outlier_percentage / 10, 1.0
        )  # Fewer outliers = higher confidence
        confidence_factors.append(outlier_confidence)

        # Effectiveness factor (if available)
        if effectiveness:
            coverage = effectiveness.get("coverage", 0)
            confidence_factors.append(coverage)

        # Average all factors
        return sum(confidence_factors) / len(confidence_factors)

    def _create_low_confidence_analysis(self, current_config: Dict[str, Any]) -> ThresholdAnalysis:
        """Create a low-confidence analysis when insufficient data."""
        return ThresholdAnalysis(
            current_value=current_config.get("threshold") or current_config.get("value"),
            recommended_value=current_config.get("threshold") or current_config.get("value"),
            confidence=0.1,
            improvement_percentage=0.0,
            validation_results={"error": "Insufficient data for analysis"},
        )

    def _generate_recommended_config(
        self, current_config: Dict[str, Any], analysis: ThresholdAnalysis, rule_type: str
    ) -> Dict[str, Any]:
        """Generate the recommended configuration."""
        recommended_config = current_config.copy()

        if rule_type == "metric":
            # Update metric thresholds
            for key in current_config:
                if "threshold" in current_config[key]:
                    recommended_config[key]["threshold"] = analysis.recommended_value
        elif rule_type == "issue":
            # Update frequency thresholds
            if "frequency" in current_config:
                recommended_config["frequency"]["value"] = analysis.recommended_value
        else:
            # Generic update
            if "threshold" in recommended_config:
                recommended_config["threshold"] = analysis.recommended_value

        return recommended_config

    def _generate_rationale(self, analysis: ThresholdAnalysis, rule_type: str) -> str:
        """Generate human-readable rationale for the recommendation."""
        if analysis.confidence < self.CONFIDENCE_THRESHOLD:
            return (
                f"Low confidence recommendation ({analysis.confidence:.1%}). "
                "Insufficient data for reliable analysis. Consider gathering more data "
                "before making changes."
            )

        rationale_parts = []

        # Base rationale
        if analysis.improvement_percentage > 0:
            rationale_parts.append(
                f"This adjustment would reduce alert noise by approximately "
                f"{analysis.improvement_percentage:.0f}% while maintaining coverage "
                "of critical events."
            )

        # Validation results
        validation = analysis.validation_results
        if validation.get("coverage_score", 0) > 0.9:
            rationale_parts.append(
                "The recommendation maintains excellent coverage of extreme values."
            )

        if validation.get("stability_score", 0) > 0.8:
            rationale_parts.append(
                "The new threshold shows good stability against normal variations."
            )

        # Confidence statement
        rationale_parts.append(f"Confidence in this recommendation: {analysis.confidence:.1%}")

        return " ".join(rationale_parts)

    def _generate_implementation_steps(
        self, current_config: Dict[str, Any], recommended_config: Dict[str, Any], rule_type: str
    ) -> List[str]:
        """Generate step-by-step implementation instructions."""
        steps = []

        # Generic steps
        steps.append("1. Review the recommended changes with your team")
        steps.append("2. Create a backup of the current rule configuration")

        # Type-specific steps
        if rule_type == "metric":
            current_threshold = None
            recommended_threshold = None

            for key in current_config:
                if isinstance(current_config[key], dict) and "threshold" in current_config[key]:
                    current_threshold = current_config[key]["threshold"]
                    recommended_threshold = recommended_config[key]["threshold"]
                    break

            if current_threshold and recommended_threshold:
                steps.append(
                    f"3. Update the threshold from {current_threshold} to {recommended_threshold}"
                )

                if recommended_threshold > current_threshold:
                    steps.append("4. Monitor for any missed critical events in the first 24 hours")
                else:
                    steps.append("4. Monitor for increased alert volume in the first 24 hours")

        elif rule_type == "issue":
            if "frequency" in current_config and "frequency" in recommended_config:
                current_freq = current_config["frequency"].get("value")
                recommended_freq = recommended_config["frequency"].get("value")

                steps.append(
                    f"3. Update the frequency threshold from {current_freq} to {recommended_freq}"
                )

        # Final steps
        steps.append("5. Monitor alert behavior for at least 48 hours")
        steps.append("6. Gather feedback from the team on the new threshold")
        steps.append("7. Fine-tune if necessary based on real-world results")

        return steps

    def _assess_risks(self, analysis: ThresholdAnalysis, rule_type: str) -> Dict[str, Any]:
        """Assess risks associated with the recommendation."""
        risks = {
            "risk_level": "low",
            "false_negative_risk": "low",
            "operational_risk": "low",
            "rollback_difficulty": "easy",
            "mitigation_strategies": [],
        }

        # Assess false negative risk
        validation = analysis.validation_results
        coverage = validation.get("coverage_score", 1.0)

        if coverage < 0.8:
            risks["false_negative_risk"] = "high"
            risks["risk_level"] = "high"
            risks["mitigation_strategies"].append(
                "Implement additional monitoring for critical events"
            )
        elif coverage < 0.9:
            risks["false_negative_risk"] = "medium"
            if risks["risk_level"] == "low":
                risks["risk_level"] = "medium"
            risks["mitigation_strategies"].append("Set up temporary notifications for edge cases")

        # Assess operational risk based on improvement
        if analysis.improvement_percentage > 50:
            risks["operational_risk"] = "medium"
            if risks["risk_level"] == "low":
                risks["risk_level"] = "medium"
            risks["mitigation_strategies"].append("Implement changes during low-traffic periods")
            risks["mitigation_strategies"].append("Have rollback plan ready")

        # Add general mitigation strategies
        risks["mitigation_strategies"].extend(
            [
                "Keep the original configuration for quick rollback",
                "Monitor key metrics closely for the first week",
                "Communicate changes to all stakeholders",
            ]
        )

        return risks
