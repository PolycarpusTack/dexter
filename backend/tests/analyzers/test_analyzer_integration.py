# File: backend/tests/analyzers/test_analyzer_integration.py

"""
Integration tests for the analyzer framework.
"""

import pytest
from datetime import datetime

from app.models.analyzers import AnalyzerType, BusinessImpact
from app.services.analyzer_registry import analyzer_registry
from app.services.analyzer_orchestrator import analyzer_orchestrator
from app.services.deadlock_analyzer import PostgreSQLDeadlockAnalyzer


class TestAnalyzerIntegration:
    """Integration tests for analyzer framework components."""
    
    @pytest.fixture(autouse=True)
    def setup_analyzers(self):
        """Register analyzers before tests."""
        # Make sure deadlock analyzer is registered
        if AnalyzerType.DEADLOCK not in analyzer_registry.list_analyzers():
            analyzer_registry.register_analyzer(
                AnalyzerType.DEADLOCK,
                PostgreSQLDeadlockAnalyzer
            )
    
    @pytest.fixture
    def deadlock_event(self):
        """Sample deadlock event."""
        return {
            "id": "integration_test_123",
            "title": "deadlock detected",
            "message": """ERROR: deadlock detected
DETAIL: Process 12345 waits for ShareLock on relation 16385; blocked by process 12346.
Process 12346 waits for ShareLock on relation 16386; blocked by process 12345.
Process 12345: UPDATE users SET last_active = NOW() WHERE id = 123;
Process 12346: UPDATE orders SET status = 'completed' WHERE user_id = 123;""",
            "platform": "python",
            "environment": "production",
            "exception": {
                "values": [{
                    "type": "OperationalError",
                    "value": "deadlock detected"
                }]
            }
        }
    
    @pytest.mark.asyncio
    async def test_analyzer_registration(self):
        """Test that analyzers are properly registered."""
        # Check that deadlock analyzer is registered
        analyzers = analyzer_registry.list_analyzers()
        assert AnalyzerType.DEADLOCK in analyzers
        
        # Get capabilities
        capabilities = analyzer_registry.get_capabilities(AnalyzerType.DEADLOCK)
        assert capabilities.name == "PostgreSQL Deadlock Analyzer"
        assert capabilities.analyzer_type == AnalyzerType.DEADLOCK
    
    @pytest.mark.asyncio
    async def test_analyzer_discovery(self, deadlock_event):
        """Test automatic analyzer discovery."""
        applicable = await analyzer_registry.discover_applicable_analyzers(deadlock_event)
        
        assert AnalyzerType.DEADLOCK in applicable
        assert len(applicable) >= 1  # At least deadlock analyzer should apply
    
    @pytest.mark.asyncio
    async def test_single_analyzer_execution(self, deadlock_event):
        """Test running a specific analyzer."""
        result = await analyzer_registry.run_analyzer(
            AnalyzerType.DEADLOCK,
            deadlock_event
        )
        
        assert result.analyzer_type == AnalyzerType.DEADLOCK
        assert result.is_detected == True
        assert result.confidence > 0.5
        assert len(result.findings) > 0
        assert len(result.recommendations) > 0
    
    @pytest.mark.asyncio
    async def test_orchestrator_execution(self, deadlock_event):
        """Test orchestrator with auto-discovery."""
        results, metrics = await analyzer_orchestrator.analyze_event(
            event_data=deadlock_event,
            requested_analyzers=None,  # Auto-discover
            force_refresh=True
        )
        
        assert len(results) >= 1
        assert metrics.analyzers_attempted >= 1
        assert metrics.analyzers_succeeded >= 1
        assert metrics.analyzers_failed == 0
        
        # Check deadlock analysis result
        deadlock_results = [r for r in results if r.analyzer_type == AnalyzerType.DEADLOCK]
        assert len(deadlock_results) == 1
        assert deadlock_results[0].is_detected == True
    
    @pytest.mark.asyncio
    async def test_orchestrator_with_specific_analyzers(self, deadlock_event):
        """Test orchestrator with specific analyzer request."""
        results, metrics = await analyzer_orchestrator.analyze_event(
            event_data=deadlock_event,
            requested_analyzers=[AnalyzerType.DEADLOCK],
            force_refresh=True
        )
        
        assert len(results) == 1
        assert results[0].analyzer_type == AnalyzerType.DEADLOCK
        assert metrics.analyzers_attempted == 1
        assert metrics.analyzers_succeeded == 1
    
    @pytest.mark.asyncio
    async def test_orchestrator_caching(self, deadlock_event):
        """Test result caching in orchestrator."""
        # First execution
        results1, metrics1 = await analyzer_orchestrator.analyze_event(
            event_data=deadlock_event,
            force_refresh=False
        )
        
        assert metrics1.cache_misses == 1
        assert metrics1.cache_hits == 0
        
        # Second execution should hit cache
        results2, metrics2 = await analyzer_orchestrator.analyze_event(
            event_data=deadlock_event,
            force_refresh=False
        )
        
        assert metrics2.cache_hits == 1
        assert metrics2.cache_misses == 0
        assert metrics2.total_execution_time_ms < metrics1.total_execution_time_ms
        
        # Results should be the same
        assert len(results1) == len(results2)
    
    @pytest.mark.asyncio
    async def test_performance_tracking(self):
        """Test performance statistics tracking."""
        # Get initial stats
        initial_stats = analyzer_registry.get_performance_stats(AnalyzerType.DEADLOCK)
        initial_executions = initial_stats.get('total_executions', 0)
        
        # Run analyzer
        event = {
            "id": "perf_test",
            "message": "deadlock detected",
            "title": "deadlock detected"
        }
        
        await analyzer_registry.run_analyzer(AnalyzerType.DEADLOCK, event)
        
        # Check updated stats
        updated_stats = analyzer_registry.get_performance_stats(AnalyzerType.DEADLOCK)
        assert updated_stats['total_executions'] == initial_executions + 1
        assert updated_stats['average_time_ms'] > 0
        assert updated_stats['last_execution'] is not None
    
    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test analyzer framework health check."""
        # Registry health check
        registry_health = analyzer_registry.health_check()
        assert registry_health['healthy'] == True
        assert registry_health['total_analyzers'] >= 1
        assert AnalyzerType.DEADLOCK in registry_health['analyzer_status']
        
        # Orchestrator health check
        orchestrator_health = analyzer_orchestrator.health_check()
        assert orchestrator_health['status'] == 'healthy'
        assert 'config' in orchestrator_health
        assert 'cache_stats' in orchestrator_health
    
    @pytest.mark.asyncio
    async def test_non_matching_event(self):
        """Test with event that doesn't match any analyzer."""
        event = {
            "id": "no_match",
            "title": "Generic Error",
            "message": "Something went wrong"
        }
        
        # Should return empty list
        applicable = await analyzer_registry.discover_applicable_analyzers(event)
        assert len(applicable) == 0
        
        # Orchestrator should handle gracefully
        results, metrics = await analyzer_orchestrator.analyze_event(event)
        assert len(results) == 0
        assert metrics.analyzers_attempted == 0