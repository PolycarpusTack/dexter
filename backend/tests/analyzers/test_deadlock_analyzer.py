# File: backend/tests/analyzers/test_deadlock_analyzer.py

"""
Tests for the PostgreSQL Deadlock Analyzer.
"""

import pytest
from datetime import datetime

from app.models.analyzers import AnalyzerType, BusinessImpact, ConfidenceLevel
from app.services.deadlock_analyzer import PostgreSQLDeadlockAnalyzer


class TestPostgreSQLDeadlockAnalyzer:
    """Test cases for PostgreSQL Deadlock Analyzer."""
    
    @pytest.fixture
    def analyzer(self):
        """Create an analyzer instance."""
        return PostgreSQLDeadlockAnalyzer()
    
    @pytest.fixture
    def deadlock_event(self):
        """Sample deadlock event from Sentry."""
        return {
            "id": "test123",
            "title": "OperationalError: deadlock detected",
            "message": """ERROR: deadlock detected
DETAIL: Process 12345 waits for ShareLock on relation 16385 of database 12345; blocked by process 12346.
Process 12346 waits for ShareLock on relation 16386 of database 12345; blocked by process 12345.
HINT: See server log for query details.
Process 12345: UPDATE users SET last_active = NOW() WHERE id = 123;
Process 12346: UPDATE accounts SET balance = balance - 100 WHERE user_id = 123;""",
            "platform": "python",
            "environment": "production",
            "timestamp": datetime.utcnow().isoformat(),
            "exception": {
                "values": [{
                    "type": "OperationalError",
                    "value": "deadlock detected"
                }]
            },
            "tags": {
                "database.type": "postgresql",
                "error.type": "deadlock"
            }
        }
    
    @pytest.mark.asyncio
    async def test_capabilities(self, analyzer):
        """Test analyzer capabilities."""
        capabilities = analyzer.capabilities
        
        assert capabilities.analyzer_type == AnalyzerType.DEADLOCK
        assert capabilities.name == "PostgreSQL Deadlock Analyzer"
        assert "postgresql" in capabilities.supported_platforms
        assert "DeadlockError" in capabilities.supported_error_types
        assert capabilities.version == "2.0.0"
    
    @pytest.mark.asyncio
    async def test_detect_deadlock(self, analyzer, deadlock_event):
        """Test deadlock detection."""
        assert await analyzer.detect(deadlock_event) == True
        
        # Test with non-deadlock event
        non_deadlock = {
            "title": "ValueError: invalid input",
            "message": "Something went wrong"
        }
        assert await analyzer.detect(non_deadlock) == False
    
    @pytest.mark.asyncio
    async def test_detect_by_error_code(self, analyzer):
        """Test detection by PostgreSQL error code."""
        event = {
            "message": "40P01: Some error message"
        }
        assert await analyzer.detect(event) == True
    
    @pytest.mark.asyncio
    async def test_parse_deadlock(self, analyzer, deadlock_event):
        """Test deadlock parsing."""
        parsed = await analyzer.parse(deadlock_event)
        
        assert "event_id" in parsed
        assert parsed["event_id"] == "test123"
        assert "deadlock_info" in parsed
        assert parsed["platform"] == "python"
        assert parsed["environment"] == "production"
    
    @pytest.mark.asyncio
    async def test_analyze_deadlock(self, analyzer, deadlock_event):
        """Test deadlock analysis."""
        parsed = await analyzer.parse(deadlock_event)
        result = await analyzer.analyze(parsed)
        
        assert result.analyzer_type == AnalyzerType.DEADLOCK
        assert result.is_detected == True
        assert result.confidence > 0.5
        assert result.business_impact in [BusinessImpact.HIGH, BusinessImpact.CRITICAL]
        assert len(result.findings) > 0
        assert len(result.recommendations) > 0
        
        # Check for specific findings
        finding_categories = [f.category for f in result.findings]
        assert "deadlock_cycle" in finding_categories
    
    @pytest.mark.asyncio
    async def test_visualize_deadlock(self, analyzer, deadlock_event):
        """Test deadlock visualization."""
        parsed = await analyzer.parse(deadlock_event)
        analysis = await analyzer.analyze(parsed)
        viz = await analyzer.visualize(analysis)
        
        assert viz.chart_type == "force-directed-graph"
        assert "nodes" in viz.data
        assert "edges" in viz.data
        assert "options" in viz.options
        assert viz.options["title"] == "PostgreSQL Deadlock Dependency Graph"
    
    @pytest.mark.asyncio
    async def test_recommendations(self, analyzer, deadlock_event):
        """Test recommendation generation."""
        parsed = await analyzer.parse(deadlock_event)
        analysis = await analyzer.analyze(parsed)
        recommendations = await analyzer.recommend(analysis)
        
        assert len(recommendations) > 0
        
        # Check for key recommendations
        rec_titles = [r.title for r in recommendations]
        assert any("Table Access Order" in title for title in rec_titles)
    
    @pytest.mark.asyncio
    async def test_basic_analysis_fallback(self, analyzer):
        """Test basic analysis when parsing fails."""
        event = {
            "id": "test456",
            "message": "deadlock detected but no details",
            "platform": "python"
        }
        
        parsed = await analyzer.parse(event)
        analysis = await analyzer.analyze(parsed)
        
        assert analysis.is_detected == True
        assert analysis.confidence == 0.3  # Low confidence
        assert len(analysis.findings) > 0
        assert len(analysis.recommendations) > 0
    
    @pytest.mark.asyncio
    async def test_production_impact(self, analyzer):
        """Test business impact calculation for production environment."""
        event = {
            "id": "test789",
            "message": """ERROR: deadlock detected
Process 12345: UPDATE payments SET status = 'processed' WHERE id = 456;
Process 12346: UPDATE accounts SET balance = balance - 100 WHERE id = 789;""",
            "environment": "production",
            "tags": {"database.type": "postgresql"}
        }
        
        parsed = await analyzer.parse(event)
        analysis = await analyzer.analyze(parsed)
        
        # Should be CRITICAL because it's production + critical tables
        assert analysis.business_impact == BusinessImpact.CRITICAL
    
    @pytest.mark.asyncio
    async def test_error_handling(self, analyzer):
        """Test error handling in analyzer."""
        # Test with malformed event
        bad_event = None
        
        # Should not crash
        assert await analyzer.detect({}) == False
        
        parsed = await analyzer.parse({})
        assert "error" in parsed or "event_id" in parsed
        
        analysis = await analyzer.analyze({"event_id": "test"})
        assert analysis.is_detected == False or analysis.confidence == 0.3