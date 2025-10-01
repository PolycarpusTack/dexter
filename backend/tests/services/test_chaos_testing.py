"""
Tests for Chaos Testing Service

This module tests the chaos engineering capabilities for memory leak analyzer resilience.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch

from app.services.chaos_testing import (
    ChaosTestingService,
    ChaosExperiment,
    ChaosExperimentType,
    ChaosResult
)
from app.services.memory_leak_analyzer import MemoryLeakAnalyzer
from app.models.memory_leak import MemoryLeakError, AnalysisResult


class TestChaosTestingService:
    """Test suite for Chaos Testing Service."""
    
    @pytest.fixture
    def mock_analyzer(self):
        """Create mock memory leak analyzer."""
        analyzer = Mock(spec=MemoryLeakAnalyzer)
        analyzer.analyze = AsyncMock()
        return analyzer
    
    @pytest.fixture
    def chaos_service(self, mock_analyzer):
        """Create chaos testing service."""
        return ChaosTestingService(mock_analyzer)
    
    @pytest.fixture
    def sample_test_data(self):
        """Create sample test data."""
        return {
            "event_id": "test-event-123",
            "platform": "javascript",
            "exception": {
                "values": [{
                    "type": "OutOfMemoryError",
                    "value": "JavaScript heap out of memory",
                    "stacktrace": {
                        "frames": [
                            {"filename": "app.js", "function": "processData", "lineno": 42}
                        ]
                    }
                }]
            },
            "tags": {"environment": "production"},
            "timestamp": datetime.now().isoformat()
        }
    
    @pytest.fixture
    def sample_experiment(self):
        """Create sample chaos experiment."""
        return ChaosExperiment(
            name="Test Latency Injection",
            experiment_type=ChaosExperimentType.LATENCY_INJECTION,
            duration_seconds=10,
            intensity=0.5,
            target_components=["memory_parsers"],
            parameters={"delay_ms": 500}
        )
    
    @pytest.mark.asyncio
    async def test_run_chaos_suite_success(self, chaos_service, sample_test_data, mock_analyzer):
        """Test successful chaos testing suite execution."""
        # Configure mock analyzer to return successful results
        mock_result = AnalysisResult(
            analyzer_type="memory_leak",
            is_detected=True,
            confidence=0.8,
            confidence_level="high",
            findings=[],
            recommendations=[],
            metadata={},
            visualization_data={}
        )
        mock_analyzer.analyze.return_value = mock_result
        
        # Run with default experiments
        result = await chaos_service.run_chaos_suite(sample_test_data)
        
        assert "chaos_testing_results" in result
        chaos_results = result["chaos_testing_results"]
        
        assert "overall_metrics" in chaos_results
        assert "experiment_results" in chaos_results
        assert "resilience_assessment" in chaos_results
        assert "recommendations" in chaos_results
        
        metrics = chaos_results["overall_metrics"]
        assert metrics["total_experiments"] > 0
        assert metrics["successful_experiments"] >= 0
        assert metrics["failed_experiments"] >= 0
        assert 0.0 <= metrics["average_resilience_score"] <= 1.0
    
    @pytest.mark.asyncio
    async def test_run_chaos_suite_with_custom_experiments(self, chaos_service, sample_test_data, mock_analyzer):
        """Test chaos suite with custom experiments."""
        mock_analyzer.analyze.return_value = Mock()
        
        custom_experiments = [
            ChaosExperiment(
                name="Custom Test",
                experiment_type=ChaosExperimentType.SERVICE_FAILURE,
                duration_seconds=5,
                intensity=0.3,
                target_components=["all"],
                parameters={}
            )
        ]
        
        result = await chaos_service.run_chaos_suite(sample_test_data, custom_experiments)
        
        chaos_results = result["chaos_testing_results"]
        assert len(chaos_results["experiment_results"]) == 1
        assert chaos_results["experiment_results"][0]["experiment_name"] == "Custom Test"
    
    @pytest.mark.asyncio
    async def test_run_single_experiment_success(self, chaos_service, sample_test_data, sample_experiment, mock_analyzer):
        """Test successful single experiment execution."""
        mock_analyzer.analyze.return_value = Mock()
        
        result = await chaos_service._run_single_experiment(sample_experiment, sample_test_data)
        
        assert isinstance(result, ChaosResult)
        assert result.experiment_name == "Test Latency Injection"
        assert result.experiment_type == ChaosExperimentType.LATENCY_INJECTION
        assert result.success is True
        assert result.resilience_score >= 0.0
        assert len(result.observations) > 0
    
    @pytest.mark.asyncio
    async def test_run_single_experiment_failure(self, chaos_service, sample_test_data, sample_experiment, mock_analyzer):
        """Test single experiment with analyzer failure."""
        # Configure mock to raise exception
        mock_analyzer.analyze.side_effect = MemoryLeakError(
            "Analysis failed", "TEST_ERROR", {}
        )
        
        result = await chaos_service._run_single_experiment(sample_experiment, sample_test_data)
        
        assert isinstance(result, ChaosResult)
        assert result.success is False
        assert result.error_message is not None
        assert result.resilience_score >= 0.0  # Should still get some score for graceful handling
    
    @pytest.mark.asyncio
    async def test_latency_injection_experiment(self, chaos_service, sample_test_data, mock_analyzer):
        """Test latency injection chaos experiment."""
        experiment = ChaosExperiment(
            name="Latency Test",
            experiment_type=ChaosExperimentType.LATENCY_INJECTION,
            duration_seconds=5,
            intensity=0.8,
            target_components=["memory_parsers"],
            parameters={"delay_ms": 1000}
        )
        
        mock_analyzer.analyze.return_value = Mock()
        
        start_time = datetime.now()
        result = await chaos_service._run_single_experiment(experiment, sample_test_data)
        duration = (datetime.now() - start_time).total_seconds()
        
        # Should take longer due to latency injection
        assert duration >= 1.0  # At least 1 second due to injected latency
        assert result.success is True
    
    @pytest.mark.asyncio
    async def test_service_failure_experiment(self, chaos_service, sample_test_data, mock_analyzer):
        """Test service failure chaos experiment."""
        experiment = ChaosExperiment(
            name="Service Failure Test",
            experiment_type=ChaosExperimentType.SERVICE_FAILURE,
            duration_seconds=5,
            intensity=1.0,  # 100% failure rate
            target_components=["llm_service"],
            parameters={}
        )
        
        mock_analyzer.analyze.return_value = Mock()
        
        # With 100% failure intensity, should trigger simulated failures
        result = await chaos_service._run_single_experiment(experiment, sample_test_data)
        
        # Result might succeed or fail depending on random generation
        assert isinstance(result, ChaosResult)
        assert result.experiment_type == ChaosExperimentType.SERVICE_FAILURE
    
    @pytest.mark.asyncio
    async def test_data_corruption_experiment(self, chaos_service, sample_test_data, mock_analyzer):
        """Test data corruption chaos experiment."""
        experiment = ChaosExperiment(
            name="Data Corruption Test",
            experiment_type=ChaosExperimentType.DATA_CORRUPTION,
            duration_seconds=5,
            intensity=0.8,
            target_components=["input_validation"],
            parameters={}
        )
        
        mock_analyzer.analyze.return_value = Mock()
        
        result = await chaos_service._run_single_experiment(experiment, sample_test_data)
        
        assert isinstance(result, ChaosResult)
        assert result.experiment_type == ChaosExperimentType.DATA_CORRUPTION
    
    @pytest.mark.asyncio
    async def test_activate_deactivate_chaos(self, chaos_service, sample_experiment):
        """Test chaos activation and deactivation."""
        # Initially no active experiments
        assert len(chaos_service.active_experiments) == 0
        assert len(chaos_service._chaos_state) == 0
        
        # Activate chaos
        await chaos_service._activate_chaos(sample_experiment)
        
        assert sample_experiment.name in chaos_service.active_experiments
        assert "latency_delay" in chaos_service._chaos_state
        
        # Deactivate chaos
        await chaos_service._deactivate_chaos(sample_experiment)
        
        assert sample_experiment.name not in chaos_service.active_experiments
        assert "latency_delay" not in chaos_service._chaos_state
    
    @pytest.mark.asyncio
    async def test_apply_chaos_to_data(self, chaos_service, sample_test_data):
        """Test chaos application to test data."""
        corruption_experiment = ChaosExperiment(
            name="Corruption Test",
            experiment_type=ChaosExperimentType.DATA_CORRUPTION,
            duration_seconds=5,
            intensity=1.0,  # 100% corruption probability
            target_components=["input_validation"],
            parameters={}
        )
        
        modified_data = await chaos_service._apply_chaos_to_data(sample_test_data, corruption_experiment)
        
        # Data should be modified in some way
        assert isinstance(modified_data, dict)
        # The exact modifications depend on random factors, but structure should remain
    
    def test_calculate_resilience_score_high(self, chaos_service, sample_experiment):
        """Test resilience score calculation for high resilience."""
        metrics = {
            "analysis_completed": True,
            "analysis_duration_seconds": 15.0,
            "recovery_successful": True
        }
        
        mock_result = Mock()
        mock_result.is_detected = True
        
        score = chaos_service._calculate_resilience_score(
            sample_experiment, mock_result, metrics
        )
        
        assert 0.0 <= score <= 1.0
        assert score > 0.5  # Should be relatively high
    
    def test_calculate_resilience_score_low(self, chaos_service, sample_experiment):
        """Test resilience score calculation for low resilience."""
        metrics = {
            "analysis_completed": False,
            "analysis_duration_seconds": 200.0,  # Very slow
            "recovery_successful": False
        }
        
        error = Exception("System failure")
        
        score = chaos_service._calculate_resilience_score(
            sample_experiment, None, metrics, error
        )
        
        assert 0.0 <= score <= 1.0
        assert score < 0.5  # Should be relatively low
    
    def test_get_default_experiments(self, chaos_service):
        """Test default experiments configuration."""
        experiments = chaos_service._get_default_experiments()
        
        assert isinstance(experiments, list)
        assert len(experiments) > 0
        
        # Check that all experiment types are covered
        experiment_types = {exp.experiment_type for exp in experiments}
        expected_types = {
            ChaosExperimentType.LATENCY_INJECTION,
            ChaosExperimentType.SERVICE_FAILURE,
            ChaosExperimentType.NETWORK_PARTITION,
            ChaosExperimentType.MEMORY_PRESSURE,
            ChaosExperimentType.DATA_CORRUPTION,
            ChaosExperimentType.CIRCUIT_BREAKER_TEST,
            ChaosExperimentType.TIMEOUT_SIMULATION
        }
        
        assert experiment_types.issuperset(expected_types)
        
        # Validate experiment configurations
        for exp in experiments:
            assert isinstance(exp.name, str)
            assert exp.name != ""
            assert 0.0 <= exp.intensity <= 1.0
            assert exp.duration_seconds > 0
            assert isinstance(exp.target_components, list)
            assert isinstance(exp.parameters, dict)
    
    def test_assess_overall_resilience_excellent(self, chaos_service):
        """Test resilience assessment for excellent performance."""
        # Create high-performing results
        results = []
        for i in range(5):
            result = ChaosResult(
                experiment_name=f"Test {i}",
                experiment_type=ChaosExperimentType.LATENCY_INJECTION,
                start_time=datetime.now(),
                end_time=datetime.now(),
                success=True,
                error_message=None,
                metrics={},
                observations=[],
                resilience_score=0.9
            )
            results.append(result)
        
        assessment = chaos_service._assess_overall_resilience(results)
        
        assert assessment["resilience_level"] == "excellent"
        assert assessment["average_resilience_score"] >= 0.8
        assert assessment["success_rate"] >= 0.8
    
    def test_assess_overall_resilience_poor(self, chaos_service):
        """Test resilience assessment for poor performance."""
        # Create poor-performing results
        results = []
        for i in range(5):
            result = ChaosResult(
                experiment_name=f"Test {i}",
                experiment_type=ChaosExperimentType.SERVICE_FAILURE,
                start_time=datetime.now(),
                end_time=datetime.now(),
                success=False,
                error_message="Test failure",
                metrics={},
                observations=[],
                resilience_score=0.2
            )
            results.append(result)
        
        assessment = chaos_service._assess_overall_resilience(results)
        
        assert assessment["resilience_level"] == "poor"
        assert assessment["average_resilience_score"] < 0.4
        assert assessment["success_rate"] < 0.5
    
    def test_identify_weak_areas(self, chaos_service):
        """Test identification of weak resilience areas."""
        # Create results with weak areas
        results = [
            ChaosResult(
                experiment_name="Service Failure Test",
                experiment_type=ChaosExperimentType.SERVICE_FAILURE,
                start_time=datetime.now(),
                end_time=datetime.now(),
                success=False,
                error_message="Failed",
                metrics={},
                observations=[],
                resilience_score=0.3  # Low score
            ),
            ChaosResult(
                experiment_name="Latency Test",
                experiment_type=ChaosExperimentType.LATENCY_INJECTION,
                start_time=datetime.now(),
                end_time=datetime.now(),
                success=True,
                error_message=None,
                metrics={},
                observations=[],
                resilience_score=0.8  # High score
            )
        ]
        
        weak_areas = chaos_service._identify_weak_areas(results)
        
        assert ChaosExperimentType.SERVICE_FAILURE in weak_areas
        assert ChaosExperimentType.LATENCY_INJECTION not in weak_areas
    
    def test_generate_resilience_recommendations(self, chaos_service):
        """Test generation of resilience recommendations."""
        # Create results indicating various weaknesses
        results = [
            ChaosResult(
                experiment_name="Service Failure Test",
                experiment_type=ChaosExperimentType.SERVICE_FAILURE,
                start_time=datetime.now(),
                end_time=datetime.now(),
                success=False,
                error_message="Failed",
                metrics={},
                observations=[],
                resilience_score=0.3
            ),
            ChaosResult(
                experiment_name="Memory Pressure Test",
                experiment_type=ChaosExperimentType.MEMORY_PRESSURE,
                start_time=datetime.now(),
                end_time=datetime.now(),
                success=False,
                error_message="Memory issues",
                metrics={},
                observations=[],
                resilience_score=0.4
            )
        ]
        
        recommendations = chaos_service._generate_resilience_recommendations(results)
        
        assert isinstance(recommendations, list)
        assert len(recommendations) > 0
        
        # Should include specific recommendations for weak areas
        rec_text = " ".join(recommendations).lower()
        assert "service failure" in rec_text or "retry" in rec_text
        assert "memory" in rec_text
    
    def test_serialize_result(self, chaos_service):
        """Test chaos result serialization."""
        start_time = datetime.now()
        end_time = start_time + timedelta(seconds=30)
        
        result = ChaosResult(
            experiment_name="Test Experiment",
            experiment_type=ChaosExperimentType.LATENCY_INJECTION,
            start_time=start_time,
            end_time=end_time,
            success=True,
            error_message=None,
            metrics={"test_metric": 123},
            observations=["Test observation"],
            resilience_score=0.75
        )
        
        serialized = chaos_service._serialize_result(result)
        
        assert isinstance(serialized, dict)
        assert serialized["experiment_name"] == "Test Experiment"
        assert serialized["experiment_type"] == ChaosExperimentType.LATENCY_INJECTION
        assert serialized["success"] is True
        assert serialized["resilience_score"] == 0.75
        assert serialized["duration_seconds"] == 30.0
        assert "start_time" in serialized
        assert "end_time" in serialized
    
    @pytest.mark.asyncio
    async def test_chaos_state_isolation(self, chaos_service, sample_test_data, mock_analyzer):
        """Test that chaos state is properly isolated between experiments."""
        mock_analyzer.analyze.return_value = Mock()
        
        experiment1 = ChaosExperiment(
            name="Test 1",
            experiment_type=ChaosExperimentType.LATENCY_INJECTION,
            duration_seconds=1,
            intensity=0.5,
            target_components=["test"],
            parameters={"delay_ms": 500}
        )
        
        experiment2 = ChaosExperiment(
            name="Test 2",
            experiment_type=ChaosExperimentType.SERVICE_FAILURE,
            duration_seconds=1,
            intensity=0.3,
            target_components=["test"],
            parameters={}
        )
        
        # Run first experiment
        await chaos_service._run_single_experiment(experiment1, sample_test_data)
        
        # Chaos state should be clean
        assert len(chaos_service._chaos_state) == 0
        assert len(chaos_service.active_experiments) == 0
        
        # Run second experiment
        await chaos_service._run_single_experiment(experiment2, sample_test_data)
        
        # Chaos state should still be clean
        assert len(chaos_service._chaos_state) == 0
        assert len(chaos_service.active_experiments) == 0


if __name__ == "__main__":
    pytest.main([__file__])