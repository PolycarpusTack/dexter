"""
Tests for APM Integration Service

This module tests the APM integration capabilities for memory leak analysis.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch

from app.services.apm_integration import (
    APMIntegrationService,
    APMIntegrationConfig,
    APMMetric
)
from app.models.memory_leak import AnalysisResult


class TestAPMIntegrationService:
    """Test suite for APM Integration Service."""
    
    @pytest.fixture
    def config(self):
        """Create test configuration."""
        return APMIntegrationConfig(
            enabled=True,
            timeout_seconds=5,
            max_concurrent_requests=2,
            cache_ttl_seconds=60,
            correlation_window_minutes=10
        )
    
    @pytest.fixture
    def apm_service(self, config):
        """Create APM integration service."""
        return APMIntegrationService(config)
    
    @pytest.fixture
    def sample_analysis_result(self):
        """Create sample analysis result."""
        return AnalysisResult(
            analyzer_type="memory_leak",
            is_detected=True,
            confidence=0.85,
            confidence_level="high",
            findings=[],
            recommendations=[],
            metadata={},
            visualization_data={}
        )
    
    @pytest.mark.asyncio
    async def test_correlate_with_apm_data_success(self, apm_service, sample_analysis_result):
        """Test successful APM data correlation."""
        event_timestamp = datetime.now()
        event_metadata = {"service": "test-service", "environment": "production"}
        
        result = await apm_service.correlate_with_apm_data(
            event_timestamp,
            event_metadata,
            sample_analysis_result
        )
        
        assert "apm_correlation" in result
        assert result["apm_correlation"]["enabled"] is True
        assert "memory_trends" in result["apm_correlation"]
        assert "gc_activity" in result["apm_correlation"]
        assert "performance_impact" in result["apm_correlation"]
        assert "error_correlation" in result["apm_correlation"]
        assert "correlation_score" in result["apm_correlation"]
    
    @pytest.mark.asyncio
    async def test_correlate_with_disabled_apm(self):
        """Test correlation with disabled APM."""
        config = APMIntegrationConfig(enabled=False)
        apm_service = APMIntegrationService(config)
        
        result = await apm_service.correlate_with_apm_data(
            datetime.now(),
            {},
            None
        )
        
        assert result["apm_correlation"]["enabled"] is False
    
    @pytest.mark.asyncio
    async def test_get_memory_metrics(self, apm_service):
        """Test memory metrics retrieval."""
        start_time = datetime.now() - timedelta(minutes=15)
        end_time = datetime.now()
        metadata = {"service": "test-service"}
        
        metrics = await apm_service._get_memory_metrics(start_time, end_time, metadata)
        
        assert isinstance(metrics, list)
        assert len(metrics) > 0
        
        for metric in metrics:
            assert isinstance(metric, APMMetric)
            assert metric.metric_name == "memory.heap.used"
            assert start_time <= metric.timestamp <= end_time
            assert metric.value > 0
    
    @pytest.mark.asyncio
    async def test_get_gc_metrics(self, apm_service):
        """Test GC metrics retrieval."""
        start_time = datetime.now() - timedelta(minutes=15)
        end_time = datetime.now()
        metadata = {"service": "test-service"}
        
        metrics = await apm_service._get_gc_metrics(start_time, end_time, metadata)
        
        assert isinstance(metrics, list)
        assert len(metrics) > 0
        
        # Should have both frequency and duration metrics
        frequency_metrics = [m for m in metrics if m.metric_name == "gc.frequency"]
        duration_metrics = [m for m in metrics if m.metric_name == "gc.duration_ms"]
        
        assert len(frequency_metrics) > 0
        assert len(duration_metrics) > 0
    
    @pytest.mark.asyncio
    async def test_get_performance_metrics(self, apm_service):
        """Test performance metrics retrieval."""
        start_time = datetime.now() - timedelta(minutes=15)
        end_time = datetime.now()
        metadata = {"service": "test-service"}
        
        metrics = await apm_service._get_performance_metrics(start_time, end_time, metadata)
        
        assert isinstance(metrics, list)
        assert len(metrics) > 0
        
        # Should have both response time and CPU metrics
        response_metrics = [m for m in metrics if m.metric_name == "response_time_ms"]
        cpu_metrics = [m for m in metrics if m.metric_name == "cpu_usage_percent"]
        
        assert len(response_metrics) > 0
        assert len(cpu_metrics) > 0
    
    @pytest.mark.asyncio
    async def test_get_error_rate_metrics(self, apm_service):
        """Test error rate metrics retrieval."""
        start_time = datetime.now() - timedelta(minutes=15)
        end_time = datetime.now()
        metadata = {"service": "test-service"}
        
        metrics = await apm_service._get_error_rate_metrics(start_time, end_time, metadata)
        
        assert isinstance(metrics, list)
        assert len(metrics) > 0
        
        for metric in metrics:
            assert metric.metric_name == "error_rate_percent"
            assert metric.value >= 0
    
    def test_analyze_memory_trends_increasing(self, apm_service):
        """Test memory trend analysis for increasing pattern."""
        # Create metrics with increasing memory usage
        base_time = datetime.now()
        metrics = []
        
        for i in range(10):
            metrics.append(APMMetric(
                timestamp=base_time + timedelta(minutes=i),
                value=100 * 1024 * 1024 + (i * 10 * 1024 * 1024),  # Increasing by 10MB
                tags={"service": "test"},
                metric_name="memory.heap.used"
            ))
        
        analysis = apm_service._analyze_memory_trends(metrics)
        
        assert analysis["trend"] == "increasing"
        assert analysis["severity"] in ["high", "medium"]
        assert analysis["slope_bytes_per_hour"] > 0
    
    def test_analyze_memory_trends_stable(self, apm_service):
        """Test memory trend analysis for stable pattern."""
        base_time = datetime.now()
        metrics = []
        
        for i in range(10):
            # Stable memory with minor fluctuations
            metrics.append(APMMetric(
                timestamp=base_time + timedelta(minutes=i),
                value=100 * 1024 * 1024 + (i % 2) * 1024 * 1024,  # Minor fluctuations
                tags={"service": "test"},
                metric_name="memory.heap.used"
            ))
        
        analysis = apm_service._analyze_memory_trends(metrics)
        
        assert analysis["trend"] == "stable"
        assert analysis["severity"] == "low"
    
    def test_analyze_gc_activity_high_frequency(self, apm_service):
        """Test GC activity analysis with high frequency."""
        base_time = datetime.now()
        metrics = []
        
        # High GC frequency metrics
        for i in range(5):
            metrics.extend([
                APMMetric(
                    timestamp=base_time + timedelta(minutes=i * 2),
                    value=15,  # High frequency
                    tags={"gc_type": "minor"},
                    metric_name="gc.frequency"
                ),
                APMMetric(
                    timestamp=base_time + timedelta(minutes=i * 2),
                    value=150,  # High duration
                    tags={"gc_type": "minor"},
                    metric_name="gc.duration_ms"
                )
            ])
        
        analysis = apm_service._analyze_gc_activity(metrics)
        
        assert analysis["frequency_trend"] == "high"
        assert analysis["duration_trend"] == "concerning"
        assert analysis["gc_health"] == "poor"
    
    def test_analyze_gc_activity_normal(self, apm_service):
        """Test GC activity analysis with normal activity."""
        base_time = datetime.now()
        metrics = []
        
        # Normal GC activity
        for i in range(5):
            metrics.extend([
                APMMetric(
                    timestamp=base_time + timedelta(minutes=i * 2),
                    value=5,  # Normal frequency
                    tags={"gc_type": "minor"},
                    metric_name="gc.frequency"
                ),
                APMMetric(
                    timestamp=base_time + timedelta(minutes=i * 2),
                    value=50,  # Normal duration
                    tags={"gc_type": "minor"},
                    metric_name="gc.duration_ms"
                )
            ])
        
        analysis = apm_service._analyze_gc_activity(metrics)
        
        assert analysis["frequency_trend"] == "normal"
        assert analysis["duration_trend"] == "normal"
        assert analysis["gc_health"] == "good"
    
    def test_analyze_performance_impact_high(self, apm_service):
        """Test performance impact analysis with high impact."""
        base_time = datetime.now()
        metrics = []
        
        # High response times and CPU usage
        for i in range(5):
            metrics.extend([
                APMMetric(
                    timestamp=base_time + timedelta(minutes=i * 2),
                    value=300,  # High response time
                    tags={"endpoint": "/api/data"},
                    metric_name="response_time_ms"
                ),
                APMMetric(
                    timestamp=base_time + timedelta(minutes=i * 2),
                    value=85,  # High CPU usage
                    tags={},
                    metric_name="cpu_usage_percent"
                )
            ])
        
        analysis = apm_service._analyze_performance_impact(metrics)
        
        assert analysis["response_trend"] == "degraded"
        assert analysis["cpu_trend"] == "high"
        assert analysis["performance_impact"] == "high"
    
    def test_analyze_error_correlation_strong(self, apm_service):
        """Test error correlation analysis with strong correlation."""
        base_time = datetime.now()
        metrics = []
        
        # High error rates
        for i in range(5):
            metrics.append(APMMetric(
                timestamp=base_time + timedelta(minutes=i * 5),
                value=3.0,  # 3% error rate
                tags={"error_type": "OutOfMemoryError"},
                metric_name="error_rate_percent"
            ))
        
        analysis = apm_service._analyze_error_correlation(metrics)
        
        assert analysis["correlation_strength"] == "strong"
        assert analysis["avg_error_rate_percent"] > 2.0
    
    @pytest.mark.asyncio
    async def test_analyze_correlations(self, apm_service, sample_analysis_result):
        """Test correlation analysis."""
        event_timestamp = datetime.now()
        
        # Create sample metrics indicating problems
        memory_metrics = [
            APMMetric(
                timestamp=event_timestamp,
                value=200 * 1024 * 1024,  # High memory
                tags={},
                metric_name="memory.heap.used"
            )
        ]
        
        gc_metrics = [
            APMMetric(
                timestamp=event_timestamp,
                value=15,  # High GC frequency
                tags={},
                metric_name="gc.frequency"
            )
        ]
        
        perf_metrics = [
            APMMetric(
                timestamp=event_timestamp,
                value=300,  # High response time
                tags={},
                metric_name="response_time_ms"
            )
        ]
        
        error_metrics = [
            APMMetric(
                timestamp=event_timestamp,
                value=3.0,  # High error rate
                tags={},
                metric_name="error_rate_percent"
            )
        ]
        
        correlation = await apm_service._analyze_correlations(
            event_timestamp,
            sample_analysis_result,
            memory_metrics,
            gc_metrics,
            perf_metrics,
            error_metrics
        )
        
        assert "score" in correlation
        assert 0.0 <= correlation["score"] <= 1.0
        assert "insights" in correlation
        assert "recommendations" in correlation
        assert isinstance(correlation["insights"], list)
        assert isinstance(correlation["recommendations"], list)
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_integration(self, apm_service):
        """Test circuit breaker integration with APM service."""
        # Mock failing metrics fetch
        with patch.object(apm_service, '_get_memory_metrics', side_effect=Exception("APM service down")):
            # First few calls should fail and open circuit breaker
            for _ in range(5):
                try:
                    await apm_service._get_memory_metrics(
                        datetime.now() - timedelta(minutes=15),
                        datetime.now(),
                        {}
                    )
                except:
                    pass
            
            # Circuit breaker should be open now
            assert apm_service.circuit_breaker.state.name == "OPEN"
    
    @pytest.mark.asyncio
    async def test_metric_caching(self, apm_service):
        """Test metric caching functionality."""
        start_time = datetime.now() - timedelta(minutes=15)
        end_time = datetime.now()
        metadata = {"service": "test-service"}
        
        # First call - should cache results
        metrics1 = await apm_service._get_memory_metrics(start_time, end_time, metadata)
        
        # Second call - should return cached results
        metrics2 = await apm_service._get_memory_metrics(start_time, end_time, metadata)
        
        # Should be identical (from cache)
        assert len(metrics1) == len(metrics2)
        assert metrics1[0].value == metrics2[0].value
    
    @pytest.mark.asyncio
    async def test_bulkhead_isolation(self, apm_service):
        """Test bulkhead isolation limits."""
        # Test that concurrent requests are limited by bulkhead
        start_time = datetime.now() - timedelta(minutes=15)
        end_time = datetime.now()
        metadata = {"service": "test-service"}
        
        # Start more concurrent requests than bulkhead allows
        tasks = []
        for _ in range(10):  # More than max_concurrent_requests (5)
            task = asyncio.create_task(
                apm_service._get_memory_metrics(start_time, end_time, metadata)
            )
            tasks.append(task)
        
        # Should complete without errors (bulkhead should manage concurrency)
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All should succeed or be limited by bulkhead
        successful_results = [r for r in results if not isinstance(r, Exception)]
        assert len(successful_results) > 0
    
    def test_empty_metrics_handling(self, apm_service):
        """Test handling of empty metrics."""
        # Test memory trends with no data
        analysis = apm_service._analyze_memory_trends([])
        assert analysis["trend"] == "unknown"
        assert analysis["reason"] == "no_data"
        
        # Test GC activity with no data
        analysis = apm_service._analyze_gc_activity([])
        assert analysis["activity"] == "unknown"
        assert analysis["reason"] == "no_data"
        
        # Test performance impact with no data
        analysis = apm_service._analyze_performance_impact([])
        assert analysis["impact"] == "unknown"
        assert analysis["reason"] == "no_data"
        
        # Test error correlation with no data
        analysis = apm_service._analyze_error_correlation([])
        assert analysis["correlation"] == "unknown"
        assert analysis["reason"] == "no_data"


if __name__ == "__main__":
    pytest.main([__file__])