# File: backend/app/services/analyzer_orchestrator.py

"""
Analyzer orchestrator service for coordinating analyzer execution.

This service manages the execution of multiple analyzers on events,
handles parallel processing, result aggregation, and performance monitoring.
"""

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from ..models.analyzers import AnalysisResult, AnalyzerType, BusinessImpact
from .analyzer_registry import AnalyzerRegistryError, analyzer_registry

logger = logging.getLogger(__name__)


@dataclass
class OrchestrationConfig:
    """Configuration for analyzer orchestration."""

    max_parallel_analyzers: int = 5
    analysis_timeout_seconds: int = 30
    min_confidence_threshold: float = 0.3
    enable_performance_monitoring: bool = True
    enable_result_caching: bool = True
    cache_ttl_seconds: int = 3600  # 1 hour


@dataclass
class OrchestrationMetrics:
    """Metrics from analyzer orchestration."""

    total_execution_time_ms: float
    analyzers_attempted: int
    analyzers_succeeded: int
    analyzers_failed: int
    analyzers_timed_out: int
    highest_confidence: float
    highest_business_impact: BusinessImpact
    cache_hits: int = 0
    cache_misses: int = 0


class AnalyzerOrchestrator:
    """
    Orchestrates the execution of multiple analyzers on events.

    This class manages the complex workflow of:
    1. Discovering applicable analyzers
    2. Running analyzers in parallel
    3. Aggregating and ranking results
    4. Caching results for performance
    5. Monitoring and reporting metrics
    """

    def __init__(self, config: Optional[OrchestrationConfig] = None):
        self.config = config or OrchestrationConfig()
        self._result_cache: Dict[str, Tuple[List[AnalysisResult], datetime]] = {}
        self._orchestration_metrics: Dict[str, OrchestrationMetrics] = {}

    async def analyze_event(
        self,
        event_data: Dict[str, Any],
        requested_analyzers: Optional[List[AnalyzerType]] = None,
        force_refresh: bool = False,
    ) -> Tuple[List[AnalysisResult], OrchestrationMetrics]:
        """
        Analyze an event using appropriate analyzers.

        Args:
            event_data: Raw event data from Sentry
            requested_analyzers: Specific analyzers to run (None for auto-discovery)
            force_refresh: Skip cache and force fresh analysis

        Returns:
            Tuple of (analysis_results, orchestration_metrics)
        """
        start_time = datetime.utcnow()
        event_id = event_data.get("id", "unknown")

        # Check cache first (unless forced refresh)
        if not force_refresh and self.config.enable_result_caching:
            cached_results = self._get_cached_results(event_id)
            if cached_results:
                metrics = OrchestrationMetrics(
                    total_execution_time_ms=0.0,
                    analyzers_attempted=len(cached_results),
                    analyzers_succeeded=len(cached_results),
                    analyzers_failed=0,
                    analyzers_timed_out=0,
                    highest_confidence=max((r.confidence for r in cached_results), default=0.0),
                    highest_business_impact=self._get_highest_impact(cached_results),
                    cache_hits=1,
                    cache_misses=0,
                )
                logger.info(f"Returning cached results for event {event_id}")
                return cached_results, metrics

        try:
            # Discover applicable analyzers
            if requested_analyzers:
                applicable_analyzers = requested_analyzers
                logger.info(f"Using requested analyzers: {applicable_analyzers}")
            else:
                applicable_analyzers = await analyzer_registry.discover_applicable_analyzers(
                    event_data
                )
                logger.info(
                    f"Discovered {len(applicable_analyzers)} applicable analyzers for event {event_id}"
                )

            if not applicable_analyzers:
                logger.warning(f"No applicable analyzers found for event {event_id}")
                return [], OrchestrationMetrics(
                    total_execution_time_ms=0.0,
                    analyzers_attempted=0,
                    analyzers_succeeded=0,
                    analyzers_failed=0,
                    analyzers_timed_out=0,
                    highest_confidence=0.0,
                    highest_business_impact=BusinessImpact.LOW,
                    cache_misses=1,
                )

            # Execute analyzers in parallel
            results, metrics = await self._execute_analyzers_parallel(
                applicable_analyzers, event_data
            )

            # Filter results by confidence threshold
            filtered_results = [
                result
                for result in results
                if result.confidence >= self.config.min_confidence_threshold
            ]

            if len(filtered_results) < len(results):
                logger.info(
                    f"Filtered {len(results) - len(filtered_results)} results "
                    f"below confidence threshold {self.config.min_confidence_threshold}"
                )

            # Sort results by confidence and business impact
            sorted_results = self._sort_results_by_priority(filtered_results)

            # Cache results if enabled
            if self.config.enable_result_caching:
                self._cache_results(event_id, sorted_results)

            # Update final metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            metrics.total_execution_time_ms = execution_time
            metrics.cache_misses = 1

            # Store metrics for monitoring
            self._orchestration_metrics[event_id] = metrics

            logger.info(
                f"Analysis completed for event {event_id}: "
                f"{len(sorted_results)} results in {execution_time:.1f}ms"
            )

            return sorted_results, metrics

        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            logger.error(f"Orchestration failed for event {event_id}: {e}")

            # Return error metrics
            error_metrics = OrchestrationMetrics(
                total_execution_time_ms=execution_time,
                analyzers_attempted=len(applicable_analyzers)
                if "applicable_analyzers" in locals()
                else 0,
                analyzers_succeeded=0,
                analyzers_failed=len(applicable_analyzers)
                if "applicable_analyzers" in locals()
                else 1,
                analyzers_timed_out=0,
                highest_confidence=0.0,
                highest_business_impact=BusinessImpact.LOW,
                cache_misses=1,
            )

            return [], error_metrics

    async def _execute_analyzers_parallel(
        self, analyzer_types: List[AnalyzerType], event_data: Dict[str, Any]
    ) -> Tuple[List[AnalysisResult], OrchestrationMetrics]:
        """Execute multiple analyzers in parallel with proper error handling and timeouts."""

        # Create semaphore to limit parallel execution
        semaphore = asyncio.Semaphore(self.config.max_parallel_analyzers)

        async def run_single_analyzer(analyzer_type: AnalyzerType) -> Optional[AnalysisResult]:
            """Run a single analyzer with timeout and error handling."""
            async with semaphore:
                try:
                    return await asyncio.wait_for(
                        analyzer_registry.run_analyzer(analyzer_type, event_data),
                        timeout=self.config.analysis_timeout_seconds,
                    )
                except asyncio.TimeoutError:
                    logger.warning(f"Analyzer {analyzer_type} timed out")
                    return None
                except AnalyzerRegistryError as e:
                    logger.error(f"Analyzer {analyzer_type} failed: {e}")
                    return None
                except Exception as e:
                    logger.error(f"Unexpected error in analyzer {analyzer_type}: {e}")
                    return None

        # Create tasks for all analyzers
        tasks = [
            asyncio.create_task(run_single_analyzer(analyzer_type), name=f"analyze_{analyzer_type}")
            for analyzer_type in analyzer_types
        ]

        # Wait for all tasks to complete
        task_results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results and gather metrics
        successful_results = []
        failed_count = 0
        timeout_count = 0

        for i, result in enumerate(task_results):
            if isinstance(result, Exception):
                failed_count += 1
                logger.error(f"Task {tasks[i].get_name()} failed with exception: {result}")
            elif result is None:
                # None indicates timeout or controlled failure
                if tasks[i].cancelled():
                    timeout_count += 1
                else:
                    failed_count += 1
            else:
                successful_results.append(result)

        # Create metrics
        metrics = OrchestrationMetrics(
            total_execution_time_ms=0.0,  # Will be set by caller
            analyzers_attempted=len(analyzer_types),
            analyzers_succeeded=len(successful_results),
            analyzers_failed=failed_count,
            analyzers_timed_out=timeout_count,
            highest_confidence=max((r.confidence for r in successful_results), default=0.0),
            highest_business_impact=self._get_highest_impact(successful_results),
        )

        return successful_results, metrics

    def _sort_results_by_priority(self, results: List[AnalysisResult]) -> List[AnalysisResult]:
        """Sort analysis results by priority (confidence and business impact)."""

        def priority_score(result: AnalysisResult) -> float:
            """Calculate priority score for sorting."""
            # Business impact weights
            impact_weights = {
                BusinessImpact.CRITICAL: 4.0,
                BusinessImpact.HIGH: 3.0,
                BusinessImpact.MEDIUM: 2.0,
                BusinessImpact.LOW: 1.0,
            }

            impact_weight = impact_weights.get(result.business_impact, 1.0)

            # Combine confidence and business impact
            # Formula: (confidence * 0.7) + (impact_weight * 0.3 / 4.0)
            return (result.confidence * 0.7) + (impact_weight * 0.3 / 4.0)

        return sorted(results, key=priority_score, reverse=True)

    def _get_highest_impact(self, results: List[AnalysisResult]) -> BusinessImpact:
        """Get the highest business impact from a list of results."""
        if not results:
            return BusinessImpact.LOW

        impact_order = [
            BusinessImpact.CRITICAL,
            BusinessImpact.HIGH,
            BusinessImpact.MEDIUM,
            BusinessImpact.LOW,
        ]

        for impact in impact_order:
            if any(result.business_impact == impact for result in results):
                return impact

        return BusinessImpact.LOW

    def _get_cached_results(self, event_id: str) -> Optional[List[AnalysisResult]]:
        """Get cached results if they exist and are not expired."""
        if event_id not in self._result_cache:
            return None

        results, timestamp = self._result_cache[event_id]

        # Check if cache is expired
        if datetime.utcnow() - timestamp > timedelta(seconds=self.config.cache_ttl_seconds):
            del self._result_cache[event_id]
            return None

        return results

    def _cache_results(self, event_id: str, results: List[AnalysisResult]) -> None:
        """Cache analysis results."""
        self._result_cache[event_id] = (results, datetime.utcnow())

        # Clean up expired cache entries periodically
        if len(self._result_cache) > 1000:  # Arbitrary limit
            self._cleanup_expired_cache()

    def _cleanup_expired_cache(self) -> None:
        """Clean up expired cache entries."""
        cutoff_time = datetime.utcnow() - timedelta(seconds=self.config.cache_ttl_seconds)
        expired_keys = [
            key for key, (_, timestamp) in self._result_cache.items() if timestamp < cutoff_time
        ]

        for key in expired_keys:
            del self._result_cache[key]

        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")

    def get_orchestration_metrics(self, event_id: Optional[str] = None) -> Dict[str, Any]:
        """Get orchestration metrics."""
        if event_id:
            return self._orchestration_metrics.get(event_id, {})
        else:
            return dict(self._orchestration_metrics)

    def clear_cache(self, event_id: Optional[str] = None) -> None:
        """Clear analysis result cache."""
        if event_id:
            self._result_cache.pop(event_id, None)
            logger.info(f"Cleared cache for event {event_id}")
        else:
            self._result_cache.clear()
            logger.info("Cleared all cached results")

    def health_check(self) -> Dict[str, Any]:
        """Perform health check on the orchestrator."""
        return {
            "status": "healthy",
            "config": {
                "max_parallel_analyzers": self.config.max_parallel_analyzers,
                "analysis_timeout_seconds": self.config.analysis_timeout_seconds,
                "min_confidence_threshold": self.config.min_confidence_threshold,
                "cache_enabled": self.config.enable_result_caching,
                "cache_ttl_seconds": self.config.cache_ttl_seconds,
            },
            "cache_stats": {
                "total_entries": len(self._result_cache),
                "oldest_entry": min(
                    (timestamp.isoformat() for _, timestamp in self._result_cache.values()),
                    default=None,
                ),
            },
            "metrics_tracked": len(self._orchestration_metrics),
            "timestamp": datetime.utcnow().isoformat(),
        }


# Global orchestrator instance
analyzer_orchestrator = AnalyzerOrchestrator()
