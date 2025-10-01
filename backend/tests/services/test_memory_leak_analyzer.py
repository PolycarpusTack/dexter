"""
Test Memory Leak Analyzer Service

Tests for the enterprise-grade memory leak analyzer implementation.
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.analyzers import AnalyzerType, BusinessImpact, ConfidenceLevel
from app.models.memory_leak import (
    HeapSnapshotFormat,
    LeakType,
    GrowthPattern,
    MemoryLeakAnalysis,
    LeakPattern,
    RetentionPath
)
from app.services.memory_leak_analyzer import MemoryLeakAnalyzer


class TestMemoryLeakAnalyzer:
    """Test memory leak analyzer functionality."""
    
    @pytest.fixture
    def analyzer(self):
        """Create a memory leak analyzer instance."""
        return MemoryLeakAnalyzer()
    
    @pytest.fixture
    def analyzer_with_llm(self):
        """Create a memory leak analyzer with mock LLM service."""
        llm_service = AsyncMock()
        llm_service.get_explanation = AsyncMock()
        return MemoryLeakAnalyzer(llm_service=llm_service)
    
    @pytest.fixture
    def sample_memory_event(self):
        """Create a sample memory-related event."""
        return {
            "id": "test-memory-123",
            "message": "RangeError: Maximum call stack size exceeded",
            "title": "RangeError: Maximum call stack size exceeded",
            "platform": "javascript",
            "environment": "production",
            "exception": {
                "values": [{
                    "type": "RangeError",
                    "value": "Maximum call stack size exceeded"
                }]
            },
            "tags": [
                {"key": "memory.issue", "value": "stack_overflow"}
            ],
            "heap_snapshot": '{"snapshot":{"meta":{"node_fields":["type","name","id","self_size","edge_count","trace_node_id"],"node_types":[["hidden","array","string","object","code","closure","regexp","number","native","synthetic","concatenated string","sliced string","symbol","bigint"],"string","object","native"],"edge_fields":["type","name_or_index","to_node"],"edge_types":[["context","element","property","internal","hidden","shortcut","weak"]]},"node_count":100,"edge_count":150},"nodes":[0,0,0,1024,5,0,1,1,1,512,3,0],"edges":[0,0,6,1,0,12],"strings":["","Object","test"]}'
        }
    
    @pytest.fixture
    def oom_event(self):
        """Create an out-of-memory event."""
        return {
            "id": "test-oom-456",
            "message": "JavaScript heap out of memory",
            "title": "FATAL ERROR: JavaScript heap out of memory",
            "platform": "node",
            "environment": "production",
            "exception": {
                "values": [{
                    "type": "FatalError",
                    "value": "JavaScript heap out of memory"
                }]
            }
        }
    
    def test_analyzer_capabilities(self, analyzer):
        """Test analyzer capabilities."""
        capabilities = analyzer.capabilities
        
        assert capabilities.analyzer_type == AnalyzerType.MEMORY_LEAK
        assert capabilities.name == "Memory Leak Analyzer"
        assert "javascript" in capabilities.supported_platforms
        assert "v8" in capabilities.capabilities["heap_formats"]
        assert capabilities.capabilities["streaming"] is True
        assert capabilities.capabilities["ml_detection"] is True
    
    @pytest.mark.asyncio
    async def test_detect_memory_leak_event(self, analyzer, sample_memory_event):
        """Test detection of memory leak events."""
        result = await analyzer.detect(sample_memory_event)
        assert result is True
    
    @pytest.mark.asyncio
    async def test_detect_oom_event(self, analyzer, oom_event):
        """Test detection of out-of-memory events."""
        result = await analyzer.detect(oom_event)
        assert result is True
    
    @pytest.mark.asyncio
    async def test_detect_non_memory_event(self, analyzer):
        """Test that non-memory events are not detected."""
        event = {
            "id": "test-other-789",
            "message": "TypeError: Cannot read property 'foo' of undefined",
            "title": "TypeError",
            "platform": "javascript"
        }
        
        result = await analyzer.detect(event)
        assert result is False
    
    @pytest.mark.asyncio
    async def test_parse_heap_snapshot(self, analyzer, sample_memory_event):
        """Test parsing of heap snapshot data."""
        parsed = await analyzer.parse(sample_memory_event)
        
        assert "snapshot" in parsed
        assert "heap_graph" in parsed
        assert "context" in parsed
        
        snapshot = parsed["snapshot"]
        assert snapshot.format == HeapSnapshotFormat.V8
        assert snapshot.object_count > 0
        assert snapshot.total_size > 0
    
    @pytest.mark.asyncio
    async def test_parse_without_heap_data(self, analyzer, oom_event):
        """Test parsing event without heap snapshot data."""
        parsed = await analyzer.parse(oom_event)
        
        # Should still create a basic snapshot structure
        assert "snapshot" in parsed
        assert "context" in parsed
    
    @pytest.mark.asyncio
    async def test_analyze_with_leaks(self, analyzer, sample_memory_event):
        """Test full analysis with memory leaks detected."""
        # Mock the pattern detection and retention analysis
        with patch.object(analyzer.pattern_engine, 'detect_patterns') as mock_patterns, \
             patch.object(analyzer.retention_analyzer, 'analyze_paths') as mock_retention:
            
            # Setup mock leak patterns
            mock_patterns.return_value = [
                LeakPattern(
                    type=LeakType.CLOSURE_LEAK,
                    confidence=0.85,
                    affected_objects=["obj_1", "obj_2"],
                    total_retained_size=1048576,
                    description="Large closures capturing excessive data",
                    evidence={"closure_count": 15, "avg_size": 69905}
                )
            ]
            
            # Setup mock retention paths
            mock_retention.return_value = [
                RetentionPath(
                    object_id="obj_1",
                    path=[
                        {
                            "object_id": "root",
                            "type": "Global",
                            "name": "window",
                            "size": 0,
                            "property": "reference"
                        },
                        {
                            "object_id": "obj_1",
                            "type": "Closure",
                            "name": "handler",
                            "size": 524288,
                            "property": "closure"
                        }
                    ],
                    retained_size=524288,
                    leak_probability=0.85
                )
            ]
            
            # Parse and analyze
            parsed = await analyzer.parse(sample_memory_event)
            result = await analyzer.analyze(parsed)
            
            # Verify result
            assert result.analyzer_type == AnalyzerType.MEMORY_LEAK
            assert result.is_detected is True
            assert result.confidence > 0.5
            assert len(result.findings) > 0
            assert len(result.recommendations) > 0
            
            # Check metadata
            assert "growth_pattern" in result.metadata
            assert "total_leaks" in result.metadata
            assert result.metadata["total_leaks"] == 1
    
    @pytest.mark.asyncio
    async def test_analyze_no_leaks(self, analyzer, sample_memory_event):
        """Test analysis when no leaks are detected."""
        with patch.object(analyzer.pattern_engine, 'detect_patterns') as mock_patterns, \
             patch.object(analyzer.retention_analyzer, 'analyze_paths') as mock_retention:
            
            # No leaks detected
            mock_patterns.return_value = []
            mock_retention.return_value = []
            
            parsed = await analyzer.parse(sample_memory_event)
            result = await analyzer.analyze(parsed)
            
            assert result.analyzer_type == AnalyzerType.MEMORY_LEAK
            assert result.is_detected is False
            assert result.confidence < 0.5
            assert len(result.findings) == 0
            assert len(result.recommendations) > 0  # Should still have general recommendations
    
    @pytest.mark.asyncio
    async def test_ai_recommendations(self, analyzer_with_llm, sample_memory_event):
        """Test AI-powered recommendations generation."""
        # Setup AI response
        analyzer_with_llm.llm_service.get_explanation.return_value = """
        Root Cause Analysis:
        The memory leak is caused by closures capturing large objects unnecessarily.
        
        Immediate Resolution Steps:
        1. Review closure implementations for unnecessary captures
        2. Use weak references where appropriate
        
        Code Example:
        ```javascript
        // Instead of capturing the entire object
        const handler = () => console.log(largeObject.id);
        
        // Only capture what's needed
        const id = largeObject.id;
        const handler = () => console.log(id);
        ```
        """
        
        with patch.object(analyzer_with_llm.pattern_engine, 'detect_patterns') as mock_patterns, \
             patch.object(analyzer_with_llm.retention_analyzer, 'analyze_paths') as mock_retention:
            
            mock_patterns.return_value = [
                LeakPattern(
                    type=LeakType.CLOSURE_LEAK,
                    confidence=0.85,
                    affected_objects=["obj_1"],
                    total_retained_size=1048576,
                    description="Closure memory leak",
                    evidence={}
                )
            ]
            mock_retention.return_value = []
            
            parsed = await analyzer_with_llm.parse(sample_memory_event)
            result = await analyzer_with_llm.analyze(parsed)
            
            # Should have AI-generated recommendations
            ai_recommendations = [r for r in result.recommendations if "ai-generated" in r.tags]
            assert len(ai_recommendations) > 0
            
            # Check that AI service was called
            assert analyzer_with_llm.llm_service.get_explanation.called
    
    @pytest.mark.asyncio
    async def test_ai_fallback_to_rules(self, analyzer_with_llm, sample_memory_event):
        """Test fallback to rule-based recommendations when AI fails."""
        # Make AI service fail
        analyzer_with_llm.llm_service.get_explanation.side_effect = Exception("AI service down")
        
        with patch.object(analyzer_with_llm.pattern_engine, 'detect_patterns') as mock_patterns, \
             patch.object(analyzer_with_llm.retention_analyzer, 'analyze_paths') as mock_retention:
            
            mock_patterns.return_value = [
                LeakPattern(
                    type=LeakType.DOM_DETACHED,
                    confidence=0.75,
                    affected_objects=["obj_1"],
                    total_retained_size=512000,
                    description="Detached DOM nodes",
                    evidence={}
                )
            ]
            mock_retention.return_value = []
            
            parsed = await analyzer_with_llm.parse(sample_memory_event)
            result = await analyzer_with_llm.analyze(parsed)
            
            # Should still have recommendations (rule-based)
            assert len(result.recommendations) > 0
            
            # Should not have AI-generated tags
            ai_recommendations = [r for r in result.recommendations if "ai-generated" in r.tags]
            assert len(ai_recommendations) == 0
            
            # Should have rule-based tags
            rule_recommendations = [r for r in result.recommendations if "rule-based" in r.tags]
            assert len(rule_recommendations) > 0
    
    @pytest.mark.asyncio
    async def test_streaming_parse_large_snapshot(self, analyzer):
        """Test streaming parsing for large heap snapshots."""
        # Create a large fake snapshot (simulate size > streaming threshold)
        large_snapshot_data = '{"snapshot":{"meta":{}},"nodes":[],"edges":[]}' * 10000
        
        event = {
            "id": "test-large-123",
            "heap_snapshot": large_snapshot_data.encode('utf-8'),
            "platform": "javascript"
        }
        
        with patch.object(analyzer, '_parse_streaming') as mock_streaming:
            mock_streaming.return_value = {
                "format": HeapSnapshotFormat.V8,
                "metadata": {},
                "objects": [],
                "graph": {"nodes": [], "edges": []},
                "statistics": {"heap_size": 1000000},
                "object_count": 0,
                "total_size": 1000000
            }
            
            parsed = await analyzer.parse(event)
            
            # Should use streaming parser for large snapshots
            assert mock_streaming.called
            assert "snapshot" in parsed
    
    @pytest.mark.asyncio
    async def test_growth_pattern_analysis(self, analyzer, sample_memory_event):
        """Test memory growth pattern analysis."""
        with patch.object(analyzer.pattern_engine, 'detect_patterns') as mock_patterns, \
             patch.object(analyzer.retention_analyzer, 'analyze_paths') as mock_retention:
            
            mock_patterns.return_value = []
            mock_retention.return_value = []
            
            parsed = await analyzer.parse(sample_memory_event)
            result = await analyzer.analyze(parsed)
            
            # Should determine growth pattern
            assert "growth_pattern" in result.metadata
            growth_pattern = result.metadata["growth_pattern"]
            assert growth_pattern in [p.value for p in GrowthPattern]
    
    def test_configuration_validation(self, analyzer):
        """Test analyzer configuration validation."""
        config = analyzer.config
        
        # Should have default configuration
        assert "min_retained_size" in config
        assert "leak_confidence_threshold" in config
        assert "enable_ml_detection" in config
        assert "max_analysis_duration_seconds" in config
        
        # Values should be reasonable
        assert config["min_retained_size"] > 0
        assert 0 < config["leak_confidence_threshold"] <= 1
        assert config["max_analysis_duration_seconds"] > 0
    
    @pytest.mark.asyncio
    async def test_error_handling_invalid_snapshot(self, analyzer):
        """Test error handling for invalid heap snapshot data."""
        invalid_event = {
            "id": "test-invalid-123",
            "heap_snapshot": "invalid json data",
            "platform": "javascript"
        }
        
        with pytest.raises(Exception):
            await analyzer.parse(invalid_event)
    
    @pytest.mark.asyncio
    async def test_performance_metrics(self, analyzer, sample_memory_event):
        """Test that performance metrics are tracked."""
        parsed = await analyzer.parse(sample_memory_event)
        
        # Check that timing is recorded
        snapshot = parsed["snapshot"]
        assert snapshot.parsing_duration_ms is not None
        assert snapshot.parsing_duration_ms >= 0
        
        # Analysis should also have timing
        with patch.object(analyzer.pattern_engine, 'detect_patterns') as mock_patterns, \
             patch.object(analyzer.retention_analyzer, 'analyze_paths') as mock_retention:
            
            mock_patterns.return_value = []
            mock_retention.return_value = []
            
            result = await analyzer.analyze(parsed)
            assert "analysis_duration_ms" in result.metadata
            assert result.metadata["analysis_duration_ms"] >= 0