"""
Chaos Testing Service for Memory Leak Analyzer

This module provides chaos engineering capabilities to test the resilience
and reliability of the memory leak analyzer under various failure conditions.
"""

import asyncio
import random
import time
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from app.models.memory_leak import MemoryLeakError, AnalysisResult
from app.services.memory_leak_analyzer import MemoryLeakAnalyzer


class ChaosExperimentType(str, Enum):
    """Types of chaos experiments."""

    LATENCY_INJECTION = "latency_injection"
    SERVICE_FAILURE = "service_failure"
    NETWORK_PARTITION = "network_partition"
    RESOURCE_EXHAUSTION = "resource_exhaustion"
    DATA_CORRUPTION = "data_corruption"
    CIRCUIT_BREAKER_TEST = "circuit_breaker_test"
    TIMEOUT_SIMULATION = "timeout_simulation"
    MEMORY_PRESSURE = "memory_pressure"


@dataclass
class ChaosExperiment:
    """Configuration for a chaos experiment."""

    name: str
    experiment_type: ChaosExperimentType
    duration_seconds: int
    intensity: float  # 0.0 to 1.0
    target_components: List[str]
    parameters: Dict[str, Any]
    enabled: bool = True


@dataclass
class ChaosResult:
    """Result of a chaos experiment."""

    experiment_name: str
    experiment_type: ChaosExperimentType
    start_time: datetime
    end_time: datetime
    success: bool
    error_message: Optional[str]
    metrics: Dict[str, Any]
    observations: List[str]
    resilience_score: float  # 0.0 to 1.0


class ChaosTestingService:
    """
    Service for performing chaos engineering tests on the memory leak analyzer.

    Tests various failure scenarios to ensure the analyzer maintains
    reliability and graceful degradation under adverse conditions.
    """

    def __init__(self, analyzer: MemoryLeakAnalyzer):
        self.analyzer = analyzer
        self.logger = logging.getLogger(__name__)
        self.active_experiments: Dict[str, ChaosExperiment] = {}
        self.experiment_results: List[ChaosResult] = []
        self._chaos_state: Dict[str, Any] = {}

    async def run_chaos_suite(
        self, test_event_data: Dict[str, Any], experiments: Optional[List[ChaosExperiment]] = None
    ) -> Dict[str, Any]:
        """
        Run a comprehensive chaos testing suite.

        Args:
            test_event_data: Sample event data for testing
            experiments: Custom experiments to run (optional)

        Returns:
            Comprehensive test results and resilience assessment
        """
        if experiments is None:
            experiments = self._get_default_experiments()

        suite_start_time = datetime.now()
        results = []
        overall_metrics = {
            "total_experiments": len(experiments),
            "successful_experiments": 0,
            "failed_experiments": 0,
            "average_resilience_score": 0.0,
            "total_duration_seconds": 0.0,
        }

        self.logger.info(f"Starting chaos testing suite with {len(experiments)} experiments")

        for experiment in experiments:
            if not experiment.enabled:
                continue

            try:
                result = await self._run_single_experiment(experiment, test_event_data)
                results.append(result)

                if result.success:
                    overall_metrics["successful_experiments"] += 1
                else:
                    overall_metrics["failed_experiments"] += 1

                # Add cooldown between experiments
                await asyncio.sleep(2.0)

            except Exception as e:
                self.logger.error(f"Experiment {experiment.name} failed with exception: {e}")
                results.append(
                    ChaosResult(
                        experiment_name=experiment.name,
                        experiment_type=experiment.experiment_type,
                        start_time=datetime.now(),
                        end_time=datetime.now(),
                        success=False,
                        error_message=str(e),
                        metrics={},
                        observations=[f"Experiment failed with exception: {e}"],
                        resilience_score=0.0,
                    )
                )
                overall_metrics["failed_experiments"] += 1

        suite_end_time = datetime.now()
        overall_metrics["total_duration_seconds"] = (
            suite_end_time - suite_start_time
        ).total_seconds()

        # Calculate average resilience score
        if results:
            overall_metrics["average_resilience_score"] = sum(
                r.resilience_score for r in results
            ) / len(results)

        # Store results
        self.experiment_results.extend(results)

        return {
            "chaos_testing_results": {
                "suite_start_time": suite_start_time.isoformat(),
                "suite_end_time": suite_end_time.isoformat(),
                "overall_metrics": overall_metrics,
                "experiment_results": [self._serialize_result(r) for r in results],
                "resilience_assessment": self._assess_overall_resilience(results),
                "recommendations": self._generate_resilience_recommendations(results),
            }
        }

    async def _run_single_experiment(
        self, experiment: ChaosExperiment, test_data: Dict[str, Any]
    ) -> ChaosResult:
        """Run a single chaos experiment."""
        start_time = datetime.now()
        observations = []
        metrics = {}

        self.logger.info(f"Starting chaos experiment: {experiment.name}")

        try:
            # Activate chaos condition
            await self._activate_chaos(experiment)
            observations.append(f"Activated {experiment.experiment_type} chaos condition")

            # Run analysis under chaos conditions
            analysis_start = time.time()

            try:
                # Test the analyzer under chaos conditions
                result = await self._test_analyzer_under_chaos(test_data, experiment)
                analysis_duration = time.time() - analysis_start

                # Collect metrics
                metrics.update(
                    {
                        "analysis_duration_seconds": analysis_duration,
                        "analysis_completed": True,
                        "chaos_intensity": experiment.intensity,
                        "recovery_successful": True,
                    }
                )

                observations.append(
                    f"Analysis completed in {analysis_duration:.2f} seconds under chaos"
                )

                # Calculate resilience score
                resilience_score = self._calculate_resilience_score(experiment, result, metrics)

                return ChaosResult(
                    experiment_name=experiment.name,
                    experiment_type=experiment.experiment_type,
                    start_time=start_time,
                    end_time=datetime.now(),
                    success=True,
                    error_message=None,
                    metrics=metrics,
                    observations=observations,
                    resilience_score=resilience_score,
                )

            except Exception as analysis_error:
                analysis_duration = time.time() - analysis_start

                metrics.update(
                    {
                        "analysis_duration_seconds": analysis_duration,
                        "analysis_completed": False,
                        "chaos_intensity": experiment.intensity,
                        "error_type": type(analysis_error).__name__,
                        "recovery_successful": False,
                    }
                )

                observations.append(
                    f"Analysis failed after {analysis_duration:.2f} seconds: {analysis_error}"
                )

                # Even failures can show resilience if handled gracefully
                resilience_score = self._calculate_resilience_score(
                    experiment, None, metrics, analysis_error
                )

                return ChaosResult(
                    experiment_name=experiment.name,
                    experiment_type=experiment.experiment_type,
                    start_time=start_time,
                    end_time=datetime.now(),
                    success=False,
                    error_message=str(analysis_error),
                    metrics=metrics,
                    observations=observations,
                    resilience_score=resilience_score,
                )

        finally:
            # Always deactivate chaos condition
            await self._deactivate_chaos(experiment)
            observations.append(f"Deactivated {experiment.experiment_type} chaos condition")

    async def _activate_chaos(self, experiment: ChaosExperiment):
        """Activate chaos condition for the experiment."""
        self.active_experiments[experiment.name] = experiment

        if experiment.experiment_type == ChaosExperimentType.LATENCY_INJECTION:
            self._chaos_state["latency_delay"] = (
                experiment.parameters.get("delay_ms", 1000) / 1000.0
            )

        elif experiment.experiment_type == ChaosExperimentType.SERVICE_FAILURE:
            self._chaos_state["service_failure_rate"] = experiment.intensity

        elif experiment.experiment_type == ChaosExperimentType.NETWORK_PARTITION:
            self._chaos_state["network_partition"] = True
            self._chaos_state["partition_probability"] = experiment.intensity

        elif experiment.experiment_type == ChaosExperimentType.RESOURCE_EXHAUSTION:
            self._chaos_state["resource_exhaustion"] = True
            self._chaos_state["memory_limit_mb"] = experiment.parameters.get("memory_limit_mb", 100)

        elif experiment.experiment_type == ChaosExperimentType.DATA_CORRUPTION:
            self._chaos_state["data_corruption_rate"] = experiment.intensity

        elif experiment.experiment_type == ChaosExperimentType.CIRCUIT_BREAKER_TEST:
            self._chaos_state["force_circuit_breaker"] = True

        elif experiment.experiment_type == ChaosExperimentType.TIMEOUT_SIMULATION:
            self._chaos_state["timeout_probability"] = experiment.intensity

        elif experiment.experiment_type == ChaosExperimentType.MEMORY_PRESSURE:
            self._chaos_state["memory_pressure"] = True
            self._chaos_state["pressure_level"] = experiment.intensity

    async def _deactivate_chaos(self, experiment: ChaosExperiment):
        """Deactivate chaos condition."""
        if experiment.name in self.active_experiments:
            del self.active_experiments[experiment.name]

        # Clear chaos state
        chaos_keys = [
            "latency_delay",
            "service_failure_rate",
            "network_partition",
            "partition_probability",
            "resource_exhaustion",
            "memory_limit_mb",
            "data_corruption_rate",
            "force_circuit_breaker",
            "timeout_probability",
            "memory_pressure",
            "pressure_level",
        ]

        for key in chaos_keys:
            self._chaos_state.pop(key, None)

    async def _test_analyzer_under_chaos(
        self, test_data: Dict[str, Any], experiment: ChaosExperiment
    ) -> Optional[AnalysisResult]:
        """Test the analyzer under chaos conditions."""

        # Apply chaos to the test data or environment
        modified_data = await self._apply_chaos_to_data(test_data, experiment)

        # Simulate various chaos conditions during analysis
        if experiment.experiment_type == ChaosExperimentType.LATENCY_INJECTION:
            await self._inject_latency()

        elif experiment.experiment_type == ChaosExperimentType.SERVICE_FAILURE:
            await self._simulate_service_failure()

        elif experiment.experiment_type == ChaosExperimentType.NETWORK_PARTITION:
            await self._simulate_network_partition()

        # Run the actual analysis
        try:
            result = await self.analyzer.analyze(modified_data)
            return result
        except Exception as e:
            # Re-raise with chaos context
            raise MemoryLeakError(
                f"Analysis failed under chaos condition {experiment.experiment_type}: {str(e)}",
                "CHAOS_TESTING_FAILURE",
                {"experiment": experiment.name, "chaos_type": experiment.experiment_type},
            )

    async def _apply_chaos_to_data(
        self, test_data: Dict[str, Any], experiment: ChaosExperiment
    ) -> Dict[str, Any]:
        """Apply chaos modifications to test data."""
        modified_data = test_data.copy()

        if experiment.experiment_type == ChaosExperimentType.DATA_CORRUPTION:
            # Randomly corrupt some data fields
            if random.random() < experiment.intensity:
                if "exception" in modified_data:
                    # Corrupt stack trace
                    stacktrace = (
                        modified_data["exception"].get("values", [{}])[0].get("stacktrace", {})
                    )
                    frames = stacktrace.get("frames", [])
                    if frames:
                        # Remove random frames
                        frames_to_remove = int(len(frames) * experiment.intensity * 0.3)
                        for _ in range(frames_to_remove):
                            if frames:
                                frames.pop(random.randint(0, len(frames) - 1))

                # Corrupt event metadata
                if "tags" in modified_data and random.random() < 0.5:
                    modified_data["tags"] = {}

        return modified_data

    async def _inject_latency(self):
        """Inject artificial latency."""
        delay = self._chaos_state.get("latency_delay", 0)
        if delay > 0:
            await asyncio.sleep(delay)

    async def _simulate_service_failure(self):
        """Simulate random service failures."""
        failure_rate = self._chaos_state.get("service_failure_rate", 0)
        if random.random() < failure_rate:
            raise MemoryLeakError(
                "Simulated service failure during chaos testing",
                "CHAOS_SERVICE_FAILURE",
                {"failure_rate": failure_rate},
            )

    async def _simulate_network_partition(self):
        """Simulate network partition."""
        if self._chaos_state.get("network_partition") and random.random() < self._chaos_state.get(
            "partition_probability", 0
        ):
            raise MemoryLeakError(
                "Simulated network partition during chaos testing",
                "CHAOS_NETWORK_PARTITION",
                {"partition_active": True},
            )

    def _calculate_resilience_score(
        self,
        experiment: ChaosExperiment,
        result: Optional[AnalysisResult],
        metrics: Dict[str, Any],
        error: Optional[Exception] = None,
    ) -> float:
        """Calculate resilience score for the experiment."""
        score = 0.0

        # Base score for completing without crash
        if metrics.get("analysis_completed", False):
            score += 0.4
        elif error and isinstance(error, MemoryLeakError):
            # Graceful error handling gets partial credit
            score += 0.2

        # Score for reasonable performance under chaos
        duration = metrics.get("analysis_duration_seconds", float("inf"))
        if duration < 30:  # Completed quickly
            score += 0.3
        elif duration < 60:  # Reasonable time
            score += 0.2
        elif duration < 120:  # Slow but completed
            score += 0.1

        # Score for successful recovery
        if metrics.get("recovery_successful", False):
            score += 0.2

        # Score based on chaos intensity handled
        intensity_bonus = (1.0 - experiment.intensity) * 0.1
        score += intensity_bonus

        # Bonus for maintaining functionality under high chaos
        if experiment.intensity > 0.7 and result and result.is_detected:
            score += 0.1

        return min(score, 1.0)  # Cap at 1.0

    def _get_default_experiments(self) -> List[ChaosExperiment]:
        """Get default chaos experiments."""
        return [
            ChaosExperiment(
                name="Low Latency Injection",
                experiment_type=ChaosExperimentType.LATENCY_INJECTION,
                duration_seconds=30,
                intensity=0.3,
                target_components=["memory_parsers", "pattern_detection"],
                parameters={"delay_ms": 500},
            ),
            ChaosExperiment(
                name="High Latency Injection",
                experiment_type=ChaosExperimentType.LATENCY_INJECTION,
                duration_seconds=30,
                intensity=0.7,
                target_components=["memory_parsers", "llm_service"],
                parameters={"delay_ms": 2000},
            ),
            ChaosExperiment(
                name="Random Service Failures",
                experiment_type=ChaosExperimentType.SERVICE_FAILURE,
                duration_seconds=45,
                intensity=0.4,
                target_components=["llm_service", "external_apis"],
                parameters={},
            ),
            ChaosExperiment(
                name="Network Partition Simulation",
                experiment_type=ChaosExperimentType.NETWORK_PARTITION,
                duration_seconds=30,
                intensity=0.5,
                target_components=["llm_service"],
                parameters={},
            ),
            ChaosExperiment(
                name="Memory Pressure Test",
                experiment_type=ChaosExperimentType.MEMORY_PRESSURE,
                duration_seconds=60,
                intensity=0.6,
                target_components=["memory_parsers"],
                parameters={},
            ),
            ChaosExperiment(
                name="Data Corruption Test",
                experiment_type=ChaosExperimentType.DATA_CORRUPTION,
                duration_seconds=30,
                intensity=0.4,
                target_components=["input_validation"],
                parameters={},
            ),
            ChaosExperiment(
                name="Circuit Breaker Test",
                experiment_type=ChaosExperimentType.CIRCUIT_BREAKER_TEST,
                duration_seconds=45,
                intensity=0.8,
                target_components=["resilience_components"],
                parameters={},
            ),
            ChaosExperiment(
                name="Timeout Simulation",
                experiment_type=ChaosExperimentType.TIMEOUT_SIMULATION,
                duration_seconds=30,
                intensity=0.5,
                target_components=["all"],
                parameters={},
            ),
        ]

    def _assess_overall_resilience(self, results: List[ChaosResult]) -> Dict[str, Any]:
        """Assess overall system resilience."""
        if not results:
            return {"assessment": "no_data"}

        avg_score = sum(r.resilience_score for r in results) / len(results)
        success_rate = sum(1 for r in results if r.success) / len(results)

        # Categorize resilience level
        if avg_score >= 0.8 and success_rate >= 0.8:
            resilience_level = "excellent"
        elif avg_score >= 0.6 and success_rate >= 0.7:
            resilience_level = "good"
        elif avg_score >= 0.4 and success_rate >= 0.5:
            resilience_level = "fair"
        else:
            resilience_level = "poor"

        return {
            "resilience_level": resilience_level,
            "average_resilience_score": avg_score,
            "success_rate": success_rate,
            "total_experiments": len(results),
            "successful_experiments": sum(1 for r in results if r.success),
            "failed_experiments": sum(1 for r in results if not r.success),
            "weakest_areas": self._identify_weak_areas(results),
            "strongest_areas": self._identify_strong_areas(results),
        }

    def _identify_weak_areas(self, results: List[ChaosResult]) -> List[str]:
        """Identify areas with poor resilience."""
        weak_areas = []

        # Group by experiment type
        by_type = {}
        for result in results:
            exp_type = result.experiment_type
            if exp_type not in by_type:
                by_type[exp_type] = []
            by_type[exp_type].append(result)

        # Find types with low average scores
        for exp_type, type_results in by_type.items():
            avg_score = sum(r.resilience_score for r in type_results) / len(type_results)
            if avg_score < 0.5:
                weak_areas.append(exp_type)

        return weak_areas

    def _identify_strong_areas(self, results: List[ChaosResult]) -> List[str]:
        """Identify areas with good resilience."""
        strong_areas = []

        # Group by experiment type
        by_type = {}
        for result in results:
            exp_type = result.experiment_type
            if exp_type not in by_type:
                by_type[exp_type] = []
            by_type[exp_type].append(result)

        # Find types with high average scores
        for exp_type, type_results in by_type.items():
            avg_score = sum(r.resilience_score for r in type_results) / len(type_results)
            if avg_score >= 0.8:
                strong_areas.append(exp_type)

        return strong_areas

    def _generate_resilience_recommendations(self, results: List[ChaosResult]) -> List[str]:
        """Generate recommendations based on chaos test results."""
        recommendations = []

        weak_areas = self._identify_weak_areas(results)

        if ChaosExperimentType.SERVICE_FAILURE in weak_areas:
            recommendations.append(
                "Improve service failure handling with better retry policies and fallbacks"
            )

        if ChaosExperimentType.LATENCY_INJECTION in weak_areas:
            recommendations.append("Optimize performance under high latency conditions")

        if ChaosExperimentType.NETWORK_PARTITION in weak_areas:
            recommendations.append(
                "Enhance network resilience with timeout handling and graceful degradation"
            )

        if ChaosExperimentType.MEMORY_PRESSURE in weak_areas:
            recommendations.append(
                "Implement memory management improvements and streaming processing"
            )

        if ChaosExperimentType.DATA_CORRUPTION in weak_areas:
            recommendations.append("Strengthen input validation and error recovery mechanisms")

        # General recommendations
        avg_score = sum(r.resilience_score for r in results) / len(results) if results else 0
        if avg_score < 0.6:
            recommendations.append(
                "Consider implementing additional resilience patterns (bulkhead, timeout, fallback)"
            )

        if not recommendations:
            recommendations.append(
                "System demonstrates good resilience - maintain current practices"
            )

        return recommendations

    def _serialize_result(self, result: ChaosResult) -> Dict[str, Any]:
        """Serialize chaos result for JSON output."""
        return {
            "experiment_name": result.experiment_name,
            "experiment_type": result.experiment_type,
            "start_time": result.start_time.isoformat(),
            "end_time": result.end_time.isoformat(),
            "duration_seconds": (result.end_time - result.start_time).total_seconds(),
            "success": result.success,
            "error_message": result.error_message,
            "metrics": result.metrics,
            "observations": result.observations,
            "resilience_score": result.resilience_score,
        }
