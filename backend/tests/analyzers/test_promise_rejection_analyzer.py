# File: backend/tests/analyzers/test_promise_rejection_analyzer.py

"""
Tests for the Promise Rejection Analyzer.

Tests the detection, parsing, analysis, and visualization of promise rejection events.
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

from app.models.analyzers import (
    AnalyzerType,
    BusinessImpact,
    ConfidenceLevel
)
from app.services.promise_rejection_analyzer import PromiseRejectionAnalyzer
from app.utils.promise_rejection_parser import PromiseRejectionInfo


class TestPromiseRejectionAnalyzer:
    """Test suite for Promise Rejection Analyzer."""
    
    @pytest.fixture
    def analyzer(self):
        """Create analyzer instance."""
        return PromiseRejectionAnalyzer()
    
    @pytest.fixture
    def mock_llm_service(self):
        """Create mock LLM service."""
        llm_service = Mock()
        llm_service.analyze = AsyncMock(return_value="Use try-catch blocks around async operations.")
        return llm_service
    
    @pytest.fixture
    def analyzer_with_llm(self, mock_llm_service):
        """Create analyzer with LLM service."""
        return PromiseRejectionAnalyzer(llm_service=mock_llm_service)
    
    @pytest.fixture
    def promise_rejection_event(self):
        """Sample promise rejection event."""
        return {
            'id': 'test123',
            'platform': 'javascript',
            'message': 'Unhandled promise rejection: Cannot read property of undefined',
            'title': 'UnhandledPromiseRejectionWarning',
            'exception': {
                'values': [{
                    'type': 'UnhandledPromiseRejectionWarning',
                    'value': "Cannot read property 'data' of undefined",
                    'stacktrace': {
                        'frames': [
                            {
                                'function': 'fetchUserData',
                                'filename': '/app/services/userService.js',
                                'lineno': 45,
                                'colno': 12
                            },
                            {
                                'function': 'async handleRequest',
                                'filename': '/app/controllers/userController.js',
                                'lineno': 23,
                                'colno': 8
                            },
                            {
                                'function': 'Promise.then',
                                'filename': '/app/index.js',
                                'lineno': 15,
                                'colno': 4
                            }
                        ]
                    }
                }]
            },
            'tags': {
                'error.type': 'UnhandledRejection'
            }
        }
    
    @pytest.fixture
    def react_promise_event(self):
        """React-specific promise rejection event."""
        return {
            'id': 'react123',
            'platform': 'javascript',
            'message': 'Uncaught (in promise) Error: Failed to fetch user data',
            'sdk': {'name': 'sentry.javascript.react'},
            'exception': {
                'values': [{
                    'type': 'Error',
                    'value': 'Failed to fetch user data',
                    'stacktrace': {
                        'frames': [
                            {
                                'function': 'UserProfile',
                                'filename': '/app/components/UserProfile.jsx',
                                'lineno': 34,
                                'colno': 16
                            },
                            {
                                'function': 'useEffect',
                                'filename': '/app/components/UserProfile.jsx',
                                'lineno': 28,
                                'colno': 4
                            }
                        ]
                    }
                }]
            }
        }
    
    @pytest.mark.asyncio
    async def test_capabilities(self, analyzer):
        """Test analyzer capabilities."""
        capabilities = analyzer.capabilities
        
        assert capabilities.analyzer_type == AnalyzerType.PROMISE_REJECTION
        assert capabilities.name == "Promise Rejection Analyzer"
        assert "javascript" in capabilities.supported_platforms
        assert "UnhandledRejection" in capabilities.supported_error_types
        assert capabilities.requires_llm is True
    
    @pytest.mark.asyncio
    async def test_detect_promise_rejection(self, analyzer, promise_rejection_event):
        """Test detection of promise rejection events."""
        result = await analyzer.detect(promise_rejection_event)
        assert result is True
        
        # Test non-promise event
        non_promise_event = {
            'platform': 'python',
            'message': 'AttributeError: NoneType has no attribute',
            'exception': {'values': [{'type': 'AttributeError'}]}
        }
        result = await analyzer.detect(non_promise_event)
        assert result is False
    
    @pytest.mark.asyncio
    async def test_detect_by_keywords(self, analyzer):
        """Test detection by various keywords."""
        test_cases = [
            ('Unhandled promise rejection detected', True),
            ('Uncaught (in promise) Error', True),
            ('Promise rejected without handler', True),
            ('Regular JavaScript error', False),
            ('TypeError: undefined is not a function', False)
        ]
        
        for message, should_detect in test_cases:
            event = {
                'platform': 'javascript',
                'message': message
            }
            result = await analyzer.detect(event)
            assert result == should_detect, f"Failed for message: {message}"
    
    @pytest.mark.asyncio
    async def test_parse_promise_rejection(self, analyzer, promise_rejection_event):
        """Test parsing of promise rejection data."""
        with patch('app.services.promise_rejection_analyzer.parse_promise_rejection') as mock_parse:
            mock_rejection_info = PromiseRejectionInfo(
                rejection_type='unhandled',
                error_message="Cannot read property 'data' of undefined",
                error_type='UnhandledPromiseRejectionWarning',
                framework='javascript',
                function_name='fetchUserData',
                file_path='/app/services/userService.js',
                line_number=45
            )
            mock_parse.return_value = mock_rejection_info
            
            result = await analyzer.parse(promise_rejection_event)
            
            assert result['parsed'] is True
            assert result['event_id'] == 'test123'
            assert result['rejection_info'] == mock_rejection_info
            assert 'patterns' in result
    
    @pytest.mark.asyncio
    async def test_analyze_complete(self, analyzer_with_llm, promise_rejection_event):
        """Test complete analysis with findings and recommendations."""
        # Mock the parser
        with patch('app.services.promise_rejection_analyzer.parse_promise_rejection') as mock_parse:
            mock_rejection_info = PromiseRejectionInfo(
                rejection_type='unhandled',
                error_message="Cannot read property 'data' of undefined",
                error_type='TypeError',
                framework='javascript',
                function_name='fetchUserData',
                file_path='/app/services/userService.js',
                line_number=45,
                async_context={'async_depth': 2, 'catch_handlers': []}
            )
            mock_parse.return_value = mock_rejection_info
            
            with patch('app.services.promise_rejection_analyzer.extract_promise_patterns') as mock_patterns:
                mock_patterns.return_value = {
                    'missing_catch': True,
                    'floating_promise': False,
                    'promise_constructor_antipattern': False
                }
                
                # Parse first
                parsed_data = await analyzer_with_llm.parse(promise_rejection_event)
                
                # Then analyze
                result = await analyzer_with_llm.analyze(parsed_data)
                
                assert result.analyzer_type == AnalyzerType.PROMISE_REJECTION
                assert result.is_detected is True
                assert result.confidence > 0.5
                assert len(result.findings) > 0
                assert len(result.recommendations) > 0
                assert result.business_impact in [BusinessImpact.HIGH, BusinessImpact.MEDIUM]
    
    @pytest.mark.asyncio
    async def test_visualization_generation(self, analyzer):
        """Test visualization data generation."""
        # Create a mock analysis result
        analysis = Mock()
        analysis.raw_analysis_data = {
            'rejection_type': 'unhandled',
            'framework': 'react',
            'patterns_detected': {
                'missing_catch': True,
                'floating_promise': True
            },
            'async_depth': 3
        }
        
        viz_data = await analyzer.visualize(analysis)
        
        assert viz_data.chart_type == 'promise_flow'
        assert 'flow' in viz_data.data
        assert 'nodes' in viz_data.data['flow']
        assert 'edges' in viz_data.data['flow']
        assert len(viz_data.data['flow']['nodes']) >= 4  # At least creation, async ops, rejection
        assert viz_data.options['interactive'] is True
    
    @pytest.mark.asyncio
    async def test_framework_specific_recommendations(self, analyzer):
        """Test framework-specific recommendation generation."""
        # Test React recommendations
        react_info = PromiseRejectionInfo(
            rejection_type='unhandled',
            error_message='Error in component',
            framework='react',
            component='UserProfile'
        )
        
        recommendations = await analyzer._generate_recommendations(
            react_info,
            {'missing_catch': True},
            []
        )
        
        # Should have React-specific error boundary recommendation
        react_recs = [r for r in recommendations if 'Error Boundaries' in r.title]
        assert len(react_recs) > 0
        
        # Test Node.js recommendations
        node_info = PromiseRejectionInfo(
            rejection_type='unhandled',
            error_message='Database connection failed',
            framework='node'
        )
        
        recommendations = await analyzer._generate_recommendations(
            node_info,
            {'missing_catch': True},
            []
        )
        
        # Should have Node-specific recommendations
        node_recs = [r for r in recommendations if 'process.on' in str(r.code_example)]
        assert len(node_recs) > 0
    
    @pytest.mark.asyncio
    async def test_business_impact_calculation(self, analyzer):
        """Test business impact calculation logic."""
        # Unhandled rejection should be high impact
        info1 = PromiseRejectionInfo(
            rejection_type='unhandled',
            error_message='Critical error'
        )
        impact1 = analyzer._calculate_business_impact(info1, {})
        assert impact1 == BusinessImpact.HIGH
        
        # Multiple patterns should increase impact
        info2 = PromiseRejectionInfo(
            rejection_type='handled_late',
            error_message='Minor error'
        )
        patterns = {
            'missing_catch': True,
            'floating_promise': True,
            'promise_constructor_antipattern': True
        }
        impact2 = analyzer._calculate_business_impact(info2, patterns)
        assert impact2 == BusinessImpact.HIGH
        
        # Component errors have medium impact
        info3 = PromiseRejectionInfo(
            rejection_type='handled_late',
            error_message='Component error',
            component='UserProfile'
        )
        impact3 = analyzer._calculate_business_impact(info3, {})
        assert impact3 == BusinessImpact.MEDIUM
    
    @pytest.mark.asyncio
    async def test_error_handling_in_analysis(self, analyzer):
        """Test error handling during analysis."""
        # Test with invalid parsed data
        invalid_data = {
            'event_id': 'test123',
            'parsed': False,
            'error': 'Parse failed'
        }
        
        result = await analyzer.analyze(invalid_data)
        
        assert result.is_detected is False
        assert result.confidence == 0.0
        assert len(result.findings) == 0
        assert 'error' in result.raw_analysis_data
    
    @pytest.mark.asyncio
    async def test_llm_integration(self, analyzer_with_llm, mock_llm_service):
        """Test LLM service integration for recommendations."""
        rejection_info = PromiseRejectionInfo(
            rejection_type='unhandled',
            error_message='Test error',
            framework='react'
        )
        
        recommendations = await analyzer_with_llm._generate_recommendations(
            rejection_info,
            {'missing_catch': True},
            []
        )
        
        # Verify LLM was called
        mock_llm_service.analyze.assert_called_once()
        
        # Should have AI-generated recommendation
        ai_recs = [r for r in recommendations if 'AI-Suggested' in r.title]
        assert len(ai_recs) > 0