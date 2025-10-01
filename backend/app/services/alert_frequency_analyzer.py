"""
Alert Frequency Analysis - Analyzes alert firing patterns and detects anomalies.

This module provides advanced analysis of alert frequency patterns including
time-series analysis, anomaly detection, and pattern recognition.
"""

import logging
import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


@dataclass
class AlertPattern:
    """Represents a detected alert pattern."""

    pattern_type: str  # 'periodic', 'burst', 'increasing', 'decreasing', 'random'
    confidence: float
    period_hours: Optional[float] = None
    trend_coefficient: Optional[float] = None
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "pattern_type": self.pattern_type,
            "confidence": self.confidence,
            "period_hours": self.period_hours,
            "trend_coefficient": self.trend_coefficient,
            "description": self.description,
        }


@dataclass
class FrequencyAnalysis:
    """Results of frequency analysis."""

    rule_id: str
    time_period_days: int
    total_alerts: int
    daily_average: float
    hourly_distribution: Dict[int, int]
    weekday_distribution: Dict[int, int]
    detected_patterns: List[AlertPattern]
    anomaly_score: float
    recommendations: List[str]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "rule_id": self.rule_id,
            "time_period_days": self.time_period_days,
            "total_alerts": self.total_alerts,
            "daily_average": self.daily_average,
            "hourly_distribution": self.hourly_distribution,
            "weekday_distribution": self.weekday_distribution,
            "detected_patterns": [p.to_dict() for p in self.detected_patterns],
            "anomaly_score": self.anomaly_score,
            "recommendations": self.recommendations,
        }


class AlertFrequencyAnalyzer:
    """Analyzes alert frequency patterns and detects anomalies."""

    # Thresholds for pattern detection
    PERIODICITY_THRESHOLD = 0.7  # Correlation threshold for periodic patterns
    TREND_THRESHOLD = 0.6  # R-squared threshold for trend detection
    BURST_THRESHOLD = 3.0  # Standard deviations for burst detection

    def __init__(self):
        """Initialize the frequency analyzer."""
        self.patterns = []

    def analyze_frequency(
        self, alert_timestamps: List[datetime], rule_id: str, time_period_days: Optional[int] = None
    ) -> FrequencyAnalysis:
        """
        Analyze alert frequency patterns.

        Args:
            alert_timestamps: List of timestamps when alerts fired
            rule_id: Alert rule ID
            time_period_days: Analysis period (defaults to span of data)

        Returns:
            FrequencyAnalysis with patterns and recommendations
        """
        if not alert_timestamps:
            return self._empty_analysis(rule_id, time_period_days or 0)

        # Sort timestamps
        sorted_timestamps = sorted(alert_timestamps)

        # Determine time period
        if time_period_days is None:
            time_span = sorted_timestamps[-1] - sorted_timestamps[0]
            time_period_days = max(1, time_span.days)

        # Calculate basic metrics
        total_alerts = len(sorted_timestamps)
        daily_average = total_alerts / time_period_days

        # Calculate distributions
        hourly_dist = self._calculate_hourly_distribution(sorted_timestamps)
        weekday_dist = self._calculate_weekday_distribution(sorted_timestamps)

        # Detect patterns
        patterns = []

        # Check for periodic patterns
        periodic_pattern = self._detect_periodic_pattern(sorted_timestamps)
        if periodic_pattern:
            patterns.append(periodic_pattern)

        # Check for trends
        trend_pattern = self._detect_trend_pattern(sorted_timestamps)
        if trend_pattern:
            patterns.append(trend_pattern)

        # Check for burst patterns
        burst_patterns = self._detect_burst_patterns(sorted_timestamps)
        patterns.extend(burst_patterns)

        # Calculate anomaly score
        anomaly_score = self._calculate_anomaly_score(sorted_timestamps, hourly_dist, weekday_dist)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            patterns, daily_average, anomaly_score, hourly_dist, weekday_dist
        )

        return FrequencyAnalysis(
            rule_id=rule_id,
            time_period_days=time_period_days,
            total_alerts=total_alerts,
            daily_average=daily_average,
            hourly_distribution=hourly_dist,
            weekday_distribution=weekday_dist,
            detected_patterns=patterns,
            anomaly_score=anomaly_score,
            recommendations=recommendations,
        )

    def _empty_analysis(self, rule_id: str, time_period_days: int) -> FrequencyAnalysis:
        """Return empty analysis for rules with no alerts."""
        return FrequencyAnalysis(
            rule_id=rule_id,
            time_period_days=time_period_days,
            total_alerts=0,
            daily_average=0.0,
            hourly_distribution={i: 0 for i in range(24)},
            weekday_distribution={i: 0 for i in range(7)},
            detected_patterns=[],
            anomaly_score=0.0,
            recommendations=["Alert has never fired. Verify configuration is correct."],
        )

    def _calculate_hourly_distribution(self, timestamps: List[datetime]) -> Dict[int, int]:
        """Calculate distribution of alerts by hour of day."""
        hourly_counts = Counter(ts.hour for ts in timestamps)

        # Ensure all hours are represented
        distribution = {hour: hourly_counts.get(hour, 0) for hour in range(24)}
        return distribution

    def _calculate_weekday_distribution(self, timestamps: List[datetime]) -> Dict[int, int]:
        """Calculate distribution of alerts by day of week (0=Monday, 6=Sunday)."""
        weekday_counts = Counter(ts.weekday() for ts in timestamps)

        # Ensure all days are represented
        distribution = {day: weekday_counts.get(day, 0) for day in range(7)}
        return distribution

    def _detect_periodic_pattern(self, timestamps: List[datetime]) -> Optional[AlertPattern]:
        """Detect periodic patterns in alert firing."""
        if len(timestamps) < 10:
            return None

        # Calculate time differences between consecutive alerts
        time_diffs = []
        for i in range(1, len(timestamps)):
            diff = (timestamps[i] - timestamps[i - 1]).total_seconds() / 3600  # hours
            time_diffs.append(diff)

        if not time_diffs:
            return None

        # Look for consistent intervals
        # Use autocorrelation to detect periodicity
        try:
            # Convert to numpy array for analysis
            diffs_array = np.array(time_diffs)

            # Calculate autocorrelation
            autocorr = self._calculate_autocorrelation(diffs_array)

            # Find peaks in autocorrelation
            peaks = self._find_peaks(autocorr)

            if peaks:
                # Get the most significant peak
                best_peak = peaks[0]
                period = time_diffs[best_peak]
                confidence = autocorr[best_peak]

                if confidence > self.PERIODICITY_THRESHOLD:
                    return AlertPattern(
                        pattern_type="periodic",
                        confidence=confidence,
                        period_hours=period,
                        description=f"Alert fires approximately every {period:.1f} hours",
                    )

        except Exception as e:
            logger.warning(f"Error detecting periodic pattern: {str(e)}")

        return None

    def _detect_trend_pattern(self, timestamps: List[datetime]) -> Optional[AlertPattern]:
        """Detect increasing or decreasing trend in alert frequency."""
        if len(timestamps) < 5:
            return None

        try:
            # Group alerts by day
            daily_counts = defaultdict(int)
            start_date = timestamps[0].date()

            for ts in timestamps:
                days_since_start = (ts.date() - start_date).days
                daily_counts[days_since_start] += 1

            # Create time series
            days = sorted(daily_counts.keys())
            counts = [daily_counts[day] for day in days]

            if len(days) < 3:
                return None

            # Perform linear regression
            x = np.array(days)
            y = np.array(counts)

            slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

            # Check if trend is significant
            r_squared = r_value**2
            if r_squared > self.TREND_THRESHOLD:
                if slope > 0:
                    pattern_type = "increasing"
                    description = f"Alert frequency is increasing by {slope:.2f} alerts/day"
                else:
                    pattern_type = "decreasing"
                    description = f"Alert frequency is decreasing by {abs(slope):.2f} alerts/day"

                return AlertPattern(
                    pattern_type=pattern_type,
                    confidence=r_squared,
                    trend_coefficient=slope,
                    description=description,
                )

        except Exception as e:
            logger.warning(f"Error detecting trend pattern: {str(e)}")

        return None

    def _detect_burst_patterns(self, timestamps: List[datetime]) -> List[AlertPattern]:
        """Detect burst patterns in alert firing."""
        if len(timestamps) < 10:
            return []

        patterns = []

        try:
            # Group alerts by hour
            hourly_counts = defaultdict(int)
            start_time = timestamps[0].replace(minute=0, second=0, microsecond=0)

            for ts in timestamps:
                hours_since_start = int((ts - start_time).total_seconds() / 3600)
                hourly_counts[hours_since_start] += 1

            # Calculate statistics
            if hourly_counts:
                counts = list(hourly_counts.values())
                mean_count = statistics.mean(counts)
                std_count = statistics.stdev(counts) if len(counts) > 1 else 0

                # Find bursts (hours with unusually high alert counts)
                bursts = []
                for hour, count in hourly_counts.items():
                    if std_count > 0 and count > mean_count + self.BURST_THRESHOLD * std_count:
                        burst_time = start_time + timedelta(hours=hour)
                        bursts.append((burst_time, count))

                if bursts:
                    # Analyze burst characteristics
                    burst_counts = [count for _, count in bursts]
                    avg_burst_size = statistics.mean(burst_counts)

                    pattern = AlertPattern(
                        pattern_type="burst",
                        confidence=0.8,  # High confidence if we found clear bursts
                        description=f"Detected {len(bursts)} alert bursts with average size {avg_burst_size:.0f}",
                    )
                    patterns.append(pattern)

        except Exception as e:
            logger.warning(f"Error detecting burst patterns: {str(e)}")

        return patterns

    def _calculate_anomaly_score(
        self, timestamps: List[datetime], hourly_dist: Dict[int, int], weekday_dist: Dict[int, int]
    ) -> float:
        """
        Calculate anomaly score based on distribution patterns.

        Returns score 0-1, where higher means more anomalous.
        """
        scores = []

        # Check hourly distribution uniformity
        hourly_values = list(hourly_dist.values())
        if sum(hourly_values) > 0:
            # Calculate entropy
            hourly_entropy = self._calculate_entropy(hourly_values)
            max_entropy = np.log2(24)  # Maximum entropy for 24 hours
            hourly_uniformity = hourly_entropy / max_entropy if max_entropy > 0 else 0

            # Invert to get anomaly score (uniform = normal, concentrated = anomalous)
            hourly_anomaly = 1 - hourly_uniformity
            scores.append(hourly_anomaly)

        # Check weekday distribution uniformity
        weekday_values = list(weekday_dist.values())
        if sum(weekday_values) > 0:
            # Calculate entropy
            weekday_entropy = self._calculate_entropy(weekday_values)
            max_entropy = np.log2(7)  # Maximum entropy for 7 days
            weekday_uniformity = weekday_entropy / max_entropy if max_entropy > 0 else 0

            # Invert to get anomaly score
            weekday_anomaly = 1 - weekday_uniformity
            scores.append(weekday_anomaly)

        # Check for temporal clustering
        if len(timestamps) > 1:
            clustering_score = self._calculate_temporal_clustering(timestamps)
            scores.append(clustering_score)

        # Average all scores
        return sum(scores) / len(scores) if scores else 0.0

    def _calculate_entropy(self, values: List[int]) -> float:
        """Calculate Shannon entropy of a distribution."""
        total = sum(values)
        if total == 0:
            return 0.0

        probabilities = [v / total for v in values if v > 0]
        entropy = -sum(p * np.log2(p) for p in probabilities)

        return entropy

    def _calculate_temporal_clustering(self, timestamps: List[datetime]) -> float:
        """
        Calculate temporal clustering score.

        Returns 0-1, where higher means more clustered (anomalous).
        """
        if len(timestamps) < 2:
            return 0.0

        # Calculate time differences
        diffs = []
        for i in range(1, len(timestamps)):
            diff = (timestamps[i] - timestamps[i - 1]).total_seconds()
            diffs.append(diff)

        if not diffs:
            return 0.0

        # Calculate coefficient of variation
        mean_diff = statistics.mean(diffs)
        std_diff = statistics.stdev(diffs) if len(diffs) > 1 else 0

        cv = std_diff / mean_diff if mean_diff > 0 else 0

        # Normalize to 0-1 (cap at 2 for very high variation)
        clustering_score = min(cv / 2, 1.0)

        return clustering_score

    def _calculate_autocorrelation(self, series: np.ndarray) -> np.ndarray:
        """Calculate autocorrelation of a time series."""
        n = len(series)
        if n < 2:
            return np.array([])

        # Normalize series
        series_normalized = (series - np.mean(series)) / np.std(series)

        # Calculate autocorrelation for different lags
        autocorr = []
        for lag in range(1, min(n // 2, 50)):  # Limit to reasonable lags
            if lag < n:
                correlation = np.corrcoef(series_normalized[:-lag], series_normalized[lag:])[0, 1]
                autocorr.append(correlation)
            else:
                autocorr.append(0)

        return np.array(autocorr)

    def _find_peaks(self, signal: np.ndarray, min_height: float = 0.3) -> List[int]:
        """Find peaks in a signal."""
        peaks = []

        for i in range(1, len(signal) - 1):
            if signal[i] > min_height:
                if signal[i] > signal[i - 1] and signal[i] > signal[i + 1]:
                    peaks.append(i)

        return peaks

    def _generate_recommendations(
        self,
        patterns: List[AlertPattern],
        daily_average: float,
        anomaly_score: float,
        hourly_dist: Dict[int, int],
        weekday_dist: Dict[int, int],
    ) -> List[str]:
        """Generate recommendations based on analysis."""
        recommendations = []

        # Check for periodic patterns
        periodic_patterns = [p for p in patterns if p.pattern_type == "periodic"]
        if periodic_patterns:
            period = periodic_patterns[0].period_hours
            if period < 1:
                recommendations.append(
                    f"Alert fires every {period*60:.0f} minutes. Consider batch processing to reduce frequency."
                )
            else:
                recommendations.append(
                    f"Alert shows periodic pattern (every {period:.1f} hours). Consider if this matches expected behavior."
                )

        # Check for trends
        trend_patterns = [p for p in patterns if p.pattern_type in ["increasing", "decreasing"]]
        if trend_patterns:
            trend = trend_patterns[0]
            if trend.pattern_type == "increasing":
                recommendations.append(
                    "Alert frequency is increasing over time. Investigate root cause to prevent alert fatigue."
                )
            else:
                recommendations.append(
                    "Alert frequency is decreasing. Verify the alert is still relevant and configured correctly."
                )

        # Check for bursts
        burst_patterns = [p for p in patterns if p.pattern_type == "burst"]
        if burst_patterns:
            recommendations.append(
                "Alert shows burst patterns. Consider implementing rate limiting or batching during high-activity periods."
            )

        # Check daily average
        if daily_average > 50:
            recommendations.append(
                f"Alert fires {daily_average:.0f} times per day. Consider increasing thresholds to reduce noise."
            )
        elif daily_average < 0.1:
            recommendations.append(
                "Alert rarely fires. Verify thresholds are appropriate for catching issues."
            )

        # Check for time-based patterns
        peak_hours = sorted(hourly_dist.items(), key=lambda x: x[1], reverse=True)[:3]
        if peak_hours[0][1] > sum(hourly_dist.values()) * 0.2:
            peak_hour = peak_hours[0][0]
            recommendations.append(
                f"Alert concentrates around {peak_hour}:00. Consider time-based thresholds or separate business/off-hours alerts."
            )

        # Check weekday patterns
        weekday_total = sum(weekday_dist[i] for i in range(5))  # Monday-Friday
        weekend_total = sum(weekday_dist[i] for i in range(5, 7))  # Saturday-Sunday

        if weekday_total > 0 and weekend_total > 0:
            weekday_ratio = weekday_total / (weekday_total + weekend_total)
            if weekday_ratio > 0.9:
                recommendations.append(
                    "Alert primarily fires on weekdays. Consider separate weekend thresholds."
                )
            elif weekday_ratio < 0.1:
                recommendations.append(
                    "Alert primarily fires on weekends. Consider separate weekday thresholds."
                )

        # Check anomaly score
        if anomaly_score > 0.7:
            recommendations.append(
                "Alert shows highly anomalous patterns. Review configuration and investigate unusual behavior."
            )

        return recommendations if recommendations else ["Alert behavior appears normal."]
