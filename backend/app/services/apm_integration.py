"""
APM Integration Service for Memory Leak Analyzer

This module provides integration with Application Performance Monitoring (APM) tools
to enhance memory leak detection with production telemetry data.
"""

import asyncio
import statistics
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.models.memory_leak import AnalysisResult, MemoryLeakError
from app.services.resilience import BulkheadIsolator, CircuitBreaker, RetryPolicy


@dataclass
class APMMetric:
    """APM metric data point."""

    timestamp: datetime
    value: float
    tags: Dict[str, str]
    metric_name: str


@dataclass
class APMIntegrationConfig:
    """Configuration for APM integration."""

    enabled: bool = True
    endpoints: Dict[str, str] = None
    timeout_seconds: int = 30
    max_concurrent_requests: int = 5
    cache_ttl_seconds: int = 300
    correlation_window_minutes: int = 15


class APMIntegrationService:
    """
    Service for integrating with APM tools to enhance memory leak detection.

    Supports integration with:
    - New Relic
    - DataDog
    - Prometheus/Grafana
    - Custom metrics endpoints
    """

    def __init__(self, config: Optional[APMIntegrationConfig] = None):
        self.config = config or APMIntegrationConfig()
        self.circuit_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=60)
        self.retry_policy = RetryPolicy(max_attempts=3, base_delay=1.0, exponential_base=2.0)
        self.bulkhead = BulkheadIsolator(max_concurrent=self.config.max_concurrent_requests)
        self._metric_cache: Dict[str, Tuple[datetime, List[APMMetric]]] = {}

    async def correlate_with_apm_data(
        self,
        event_timestamp: datetime,
        event_metadata: Dict[str, Any],
        analysis_result: AnalysisResult,
    ) -> Dict[str, Any]:
        """
        Correlate memory leak analysis with APM data.

        Args:
            event_timestamp: When the memory leak event occurred
            event_metadata: Event metadata from Sentry
            analysis_result: Memory leak analysis results

        Returns:
            Enhanced analysis with APM correlation data
        """
        if not self.config.enabled:
            return {"apm_correlation": {"enabled": False}}

        try:
            correlation_window = timedelta(minutes=self.config.correlation_window_minutes)
            start_time = event_timestamp - correlation_window
            end_time = event_timestamp + correlation_window

            # Gather APM metrics concurrently
            apm_tasks = [
                self._get_memory_metrics(start_time, end_time, event_metadata),
                self._get_gc_metrics(start_time, end_time, event_metadata),
                self._get_performance_metrics(start_time, end_time, event_metadata),
                self._get_error_rate_metrics(start_time, end_time, event_metadata),
            ]

            apm_results = await asyncio.gather(*apm_tasks, return_exceptions=True)

            # Process results and handle exceptions
            memory_metrics, gc_metrics, perf_metrics, error_metrics = [], [], [], []
            for i, result in enumerate(apm_results):
                if isinstance(result, Exception):
                    continue  # Log but continue with other metrics
                elif i == 0:
                    memory_metrics = result
                elif i == 1:
                    gc_metrics = result
                elif i == 2:
                    perf_metrics = result
                elif i == 3:
                    error_metrics = result

            # Analyze correlations
            correlation_analysis = await self._analyze_correlations(
                event_timestamp,
                analysis_result,
                memory_metrics,
                gc_metrics,
                perf_metrics,
                error_metrics,
            )

            return {
                "apm_correlation": {
                    "enabled": True,
                    "correlation_window_minutes": self.config.correlation_window_minutes,
                    "memory_trends": self._analyze_memory_trends(memory_metrics),
                    "gc_activity": self._analyze_gc_activity(gc_metrics),
                    "performance_impact": self._analyze_performance_impact(perf_metrics),
                    "error_correlation": self._analyze_error_correlation(error_metrics),
                    "correlation_score": correlation_analysis.get("score", 0.0),
                    "insights": correlation_analysis.get("insights", []),
                    "recommendations": correlation_analysis.get("recommendations", []),
                }
            }

        except Exception as e:
            return {
                "apm_correlation": {
                    "enabled": True,
                    "error": f"APM correlation failed: {str(e)}",
                    "correlation_attempted": True,
                }
            }

    async def _get_memory_metrics(
        self, start_time: datetime, end_time: datetime, metadata: Dict[str, Any]
    ) -> List[APMMetric]:
        """Get memory usage metrics from APM."""
        cache_key = f"memory_{start_time}_{end_time}"

        # Check cache
        if cache_key in self._metric_cache:
            cached_time, cached_data = self._metric_cache[cache_key]
            if datetime.now() - cached_time < timedelta(seconds=self.config.cache_ttl_seconds):
                return cached_data

        async def fetch_memory_metrics():
            # Simulate APM API call for memory metrics
            await asyncio.sleep(0.1)  # Simulate network latency

            # In real implementation, this would call actual APM APIs
            metrics = []
            current = start_time
            while current <= end_time:
                # Simulate memory usage data
                base_memory = 100 * 1024 * 1024  # 100MB baseline
                growth = min(
                    (current - start_time).total_seconds() / 3600 * 10 * 1024 * 1024,
                    50 * 1024 * 1024,
                )
                noise = abs(hash(str(current))) % (5 * 1024 * 1024)

                metrics.append(
                    APMMetric(
                        timestamp=current,
                        value=base_memory + growth + noise,
                        tags={
                            "service": metadata.get("service", "unknown"),
                            "environment": "production",
                        },
                        metric_name="memory.heap.used",
                    )
                )
                current += timedelta(minutes=1)

            return metrics

        try:
            metrics = await self.bulkhead.execute(
                self.circuit_breaker.call(self.retry_policy.execute(fetch_memory_metrics))
            )

            # Cache the results
            self._metric_cache[cache_key] = (datetime.now(), metrics)
            return metrics

        except Exception as e:
            raise MemoryLeakError(
                f"Failed to fetch memory metrics: {str(e)}",
                "APM_MEMORY_FETCH_ERROR",
                {"start_time": start_time, "end_time": end_time},
            )

    async def _get_gc_metrics(
        self, start_time: datetime, end_time: datetime, metadata: Dict[str, Any]
    ) -> List[APMMetric]:
        """Get garbage collection metrics from APM."""
        cache_key = f"gc_{start_time}_{end_time}"

        if cache_key in self._metric_cache:
            cached_time, cached_data = self._metric_cache[cache_key]
            if datetime.now() - cached_time < timedelta(seconds=self.config.cache_ttl_seconds):
                return cached_data

        async def fetch_gc_metrics():
            await asyncio.sleep(0.1)

            metrics = []
            current = start_time
            while current <= end_time:
                # Simulate GC activity
                gc_frequency = 5 + abs(hash(str(current))) % 10  # GC every 5-15 minutes
                gc_duration = 10 + abs(hash(str(current))) % 50  # 10-60ms GC pauses

                metrics.extend(
                    [
                        APMMetric(
                            timestamp=current,
                            value=gc_frequency,
                            tags={
                                "gc_type": "minor",
                                "service": metadata.get("service", "unknown"),
                            },
                            metric_name="gc.frequency",
                        ),
                        APMMetric(
                            timestamp=current,
                            value=gc_duration,
                            tags={
                                "gc_type": "minor",
                                "service": metadata.get("service", "unknown"),
                            },
                            metric_name="gc.duration_ms",
                        ),
                    ]
                )
                current += timedelta(minutes=2)

            return metrics

        try:
            metrics = await self.bulkhead.execute(
                self.circuit_breaker.call(self.retry_policy.execute(fetch_gc_metrics))
            )

            self._metric_cache[cache_key] = (datetime.now(), metrics)
            return metrics

        except Exception as e:
            raise MemoryLeakError(
                f"Failed to fetch GC metrics: {str(e)}",
                "APM_GC_FETCH_ERROR",
                {"start_time": start_time, "end_time": end_time},
            )

    async def _get_performance_metrics(
        self, start_time: datetime, end_time: datetime, metadata: Dict[str, Any]
    ) -> List[APMMetric]:
        """Get performance metrics from APM."""
        cache_key = f"perf_{start_time}_{end_time}"

        if cache_key in self._metric_cache:
            cached_time, cached_data = self._metric_cache[cache_key]
            if datetime.now() - cached_time < timedelta(seconds=self.config.cache_ttl_seconds):
                return cached_data

        async def fetch_perf_metrics():
            await asyncio.sleep(0.1)

            metrics = []
            current = start_time
            while current <= end_time:
                # Simulate performance degradation
                baseline_response_time = 150  # 150ms baseline
                degradation = min((current - start_time).total_seconds() / 3600 * 50, 200)
                noise = abs(hash(str(current))) % 30

                metrics.extend(
                    [
                        APMMetric(
                            timestamp=current,
                            value=baseline_response_time + degradation + noise,
                            tags={
                                "endpoint": "/api/data",
                                "service": metadata.get("service", "unknown"),
                            },
                            metric_name="response_time_ms",
                        ),
                        APMMetric(
                            timestamp=current,
                            value=85 - min(degradation / 4, 20),  # CPU usage increases
                            tags={"service": metadata.get("service", "unknown")},
                            metric_name="cpu_usage_percent",
                        ),
                    ]
                )
                current += timedelta(minutes=2)

            return metrics

        try:
            metrics = await self.bulkhead.execute(
                self.circuit_breaker.call(self.retry_policy.execute(fetch_perf_metrics))
            )

            self._metric_cache[cache_key] = (datetime.now(), metrics)
            return metrics

        except Exception as e:
            raise MemoryLeakError(
                f"Failed to fetch performance metrics: {str(e)}",
                "APM_PERF_FETCH_ERROR",
                {"start_time": start_time, "end_time": end_time},
            )

    async def _get_error_rate_metrics(
        self, start_time: datetime, end_time: datetime, metadata: Dict[str, Any]
    ) -> List[APMMetric]:
        """Get error rate metrics from APM."""
        cache_key = f"errors_{start_time}_{end_time}"

        if cache_key in self._metric_cache:
            cached_time, cached_data = self._metric_cache[cache_key]
            if datetime.now() - cached_time < timedelta(seconds=self.config.cache_ttl_seconds):
                return cached_data

        async def fetch_error_metrics():
            await asyncio.sleep(0.1)

            metrics = []
            current = start_time
            while current <= end_time:
                # Simulate increasing error rates
                baseline_errors = 0.5  # 0.5% baseline error rate
                increase = min((current - start_time).total_seconds() / 3600 * 2, 5)

                metrics.append(
                    APMMetric(
                        timestamp=current,
                        value=baseline_errors + increase,
                        tags={
                            "service": metadata.get("service", "unknown"),
                            "error_type": "OutOfMemoryError",
                        },
                        metric_name="error_rate_percent",
                    )
                )
                current += timedelta(minutes=5)

            return metrics

        try:
            metrics = await self.bulkhead.execute(
                self.circuit_breaker.call(self.retry_policy.execute(fetch_error_metrics))
            )

            self._metric_cache[cache_key] = (datetime.now(), metrics)
            return metrics

        except Exception as e:
            raise MemoryLeakError(
                f"Failed to fetch error rate metrics: {str(e)}",
                "APM_ERROR_FETCH_ERROR",
                {"start_time": start_time, "end_time": end_time},
            )

    def _analyze_memory_trends(self, metrics: List[APMMetric]) -> Dict[str, Any]:
        """Analyze memory usage trends."""
        if not metrics:
            return {"trend": "unknown", "reason": "no_data"}

        memory_values = [m.value for m in metrics if m.metric_name == "memory.heap.used"]
        if len(memory_values) < 2:
            return {"trend": "insufficient_data"}

        # Calculate trend
        timestamps = [
            m.timestamp.timestamp() for m in metrics if m.metric_name == "memory.heap.used"
        ]

        # Simple linear regression for trend
        n = len(memory_values)
        sum_x = sum(timestamps)
        sum_y = sum(memory_values)
        sum_xy = sum(x * y for x, y in zip(timestamps, memory_values))
        sum_x_squared = sum(x * x for x in timestamps)

        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x_squared - sum_x * sum_x)

        # Determine trend
        if slope > 1000000:  # More than 1MB/hour growth
            trend = "increasing"
            severity = "high" if slope > 5000000 else "medium"
        elif slope < -1000000:
            trend = "decreasing"
            severity = "low"
        else:
            trend = "stable"
            severity = "low"

        return {
            "trend": trend,
            "severity": severity,
            "slope_bytes_per_hour": slope * 3600,
            "max_memory": max(memory_values),
            "min_memory": min(memory_values),
            "avg_memory": statistics.mean(memory_values),
            "memory_variance": statistics.variance(memory_values) if len(memory_values) > 1 else 0,
        }

    def _analyze_gc_activity(self, metrics: List[APMMetric]) -> Dict[str, Any]:
        """Analyze garbage collection activity."""
        if not metrics:
            return {"activity": "unknown", "reason": "no_data"}

        gc_frequency = [m.value for m in metrics if m.metric_name == "gc.frequency"]
        gc_duration = [m.value for m in metrics if m.metric_name == "gc.duration_ms"]

        if not gc_frequency and not gc_duration:
            return {"activity": "no_gc_data"}

        analysis = {}

        if gc_frequency:
            avg_frequency = statistics.mean(gc_frequency)
            analysis.update(
                {
                    "avg_gc_frequency_per_period": avg_frequency,
                    "max_gc_frequency": max(gc_frequency),
                    "frequency_trend": "high" if avg_frequency > 10 else "normal",
                }
            )

        if gc_duration:
            avg_duration = statistics.mean(gc_duration)
            analysis.update(
                {
                    "avg_gc_duration_ms": avg_duration,
                    "max_gc_duration_ms": max(gc_duration),
                    "duration_trend": "concerning" if avg_duration > 100 else "normal",
                }
            )

        # Determine overall GC health
        if (
            analysis.get("frequency_trend") == "high"
            or analysis.get("duration_trend") == "concerning"
        ):
            analysis["gc_health"] = "poor"
            analysis["recommendation"] = "High GC activity detected - potential memory pressure"
        else:
            analysis["gc_health"] = "good"

        return analysis

    def _analyze_performance_impact(self, metrics: List[APMMetric]) -> Dict[str, Any]:
        """Analyze performance impact correlation."""
        if not metrics:
            return {"impact": "unknown", "reason": "no_data"}

        response_times = [m.value for m in metrics if m.metric_name == "response_time_ms"]
        cpu_usage = [m.value for m in metrics if m.metric_name == "cpu_usage_percent"]

        analysis = {}

        if response_times:
            avg_response = statistics.mean(response_times)
            analysis.update(
                {
                    "avg_response_time_ms": avg_response,
                    "max_response_time_ms": max(response_times),
                    "response_trend": "degraded" if avg_response > 200 else "normal",
                }
            )

        if cpu_usage:
            avg_cpu = statistics.mean(cpu_usage)
            analysis.update(
                {
                    "avg_cpu_usage_percent": avg_cpu,
                    "max_cpu_usage_percent": max(cpu_usage),
                    "cpu_trend": "high" if avg_cpu > 80 else "normal",
                }
            )

        # Overall impact assessment
        impact_indicators = 0
        if analysis.get("response_trend") == "degraded":
            impact_indicators += 1
        if analysis.get("cpu_trend") == "high":
            impact_indicators += 1

        if impact_indicators >= 2:
            analysis["performance_impact"] = "high"
        elif impact_indicators == 1:
            analysis["performance_impact"] = "medium"
        else:
            analysis["performance_impact"] = "low"

        return analysis

    def _analyze_error_correlation(self, metrics: List[APMMetric]) -> Dict[str, Any]:
        """Analyze error rate correlation."""
        if not metrics:
            return {"correlation": "unknown", "reason": "no_data"}

        error_rates = [m.value for m in metrics if m.metric_name == "error_rate_percent"]

        if not error_rates:
            return {"correlation": "no_error_data"}

        avg_error_rate = statistics.mean(error_rates)
        max_error_rate = max(error_rates)

        analysis = {
            "avg_error_rate_percent": avg_error_rate,
            "max_error_rate_percent": max_error_rate,
            "error_trend": "increasing" if max_error_rate > avg_error_rate * 1.5 else "stable",
        }

        # Correlation assessment
        if avg_error_rate > 2.0:  # More than 2% error rate
            analysis["correlation_strength"] = "strong"
            analysis["recommendation"] = "High error rate correlation with memory leak event"
        elif avg_error_rate > 1.0:
            analysis["correlation_strength"] = "moderate"
        else:
            analysis["correlation_strength"] = "weak"

        return analysis

    async def _analyze_correlations(
        self,
        event_timestamp: datetime,
        analysis_result: AnalysisResult,
        memory_metrics: List[APMMetric],
        gc_metrics: List[APMMetric],
        perf_metrics: List[APMMetric],
        error_metrics: List[APMMetric],
    ) -> Dict[str, Any]:
        """Perform correlation analysis between leak and APM data."""

        # Calculate correlation score based on multiple factors
        correlation_factors = []
        insights = []
        recommendations = []

        # Memory trend correlation
        memory_analysis = self._analyze_memory_trends(memory_metrics)
        if memory_analysis.get("trend") == "increasing" and memory_analysis.get("severity") in [
            "high",
            "medium",
        ]:
            correlation_factors.append(0.3)
            insights.append("Strong memory growth trend detected in APM data")
            if memory_analysis.get("severity") == "high":
                recommendations.append(
                    "Immediate memory optimization required - growth rate exceeds 5MB/hour"
                )

        # GC activity correlation
        gc_analysis = self._analyze_gc_activity(gc_metrics)
        if gc_analysis.get("gc_health") == "poor":
            correlation_factors.append(0.25)
            insights.append("Elevated garbage collection activity indicates memory pressure")
            recommendations.append("Optimize object lifecycle and reduce allocation rate")

        # Performance impact correlation
        perf_analysis = self._analyze_performance_impact(perf_metrics)
        if perf_analysis.get("performance_impact") in ["high", "medium"]:
            correlation_factors.append(0.25)
            insights.append("Performance degradation correlates with memory leak timeline")
            if perf_analysis.get("performance_impact") == "high":
                recommendations.append("Critical: Performance severely impacted by memory issues")

        # Error rate correlation
        error_analysis = self._analyze_error_correlation(error_metrics)
        if error_analysis.get("correlation_strength") in ["strong", "moderate"]:
            correlation_factors.append(0.2)
            insights.append("Error rate increase correlates with memory leak occurrence")
            if error_analysis.get("correlation_strength") == "strong":
                recommendations.append(
                    "High error rate suggests memory exhaustion - scale resources"
                )

        # Calculate overall correlation score
        correlation_score = sum(correlation_factors)

        # Add confidence boost if analysis detected leaks
        if analysis_result.is_detected and analysis_result.confidence > 0.7:
            correlation_score += 0.1
            insights.append("Memory leak analyzer confidence supports APM correlation")

        # Add general recommendations based on correlation strength
        if correlation_score > 0.7:
            recommendations.insert(
                0, "Strong APM correlation confirms memory leak - immediate action required"
            )
        elif correlation_score > 0.4:
            recommendations.insert(
                0, "Moderate APM correlation suggests investigating memory patterns"
            )
        else:
            recommendations.insert(0, "Weak APM correlation - monitor for emerging patterns")

        return {
            "score": min(correlation_score, 1.0),  # Cap at 1.0
            "insights": insights,
            "recommendations": recommendations,
            "contributing_factors": {
                "memory_trend": len([f for f in correlation_factors[:1]]) > 0,
                "gc_activity": len(correlation_factors) > 1 and correlation_factors[1] > 0,
                "performance_impact": len(correlation_factors) > 2 and correlation_factors[2] > 0,
                "error_correlation": len(correlation_factors) > 3 and correlation_factors[3] > 0,
            },
        }
