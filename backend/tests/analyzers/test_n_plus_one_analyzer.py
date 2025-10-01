# File: backend/tests/analyzers/test_n_plus_one_analyzer.py

"""
Tests for the N+1 Query Analyzer.

Tests the detection, parsing, analysis, and visualization of N+1 query patterns.
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
from app.services.n_plus_one_analyzer import N1QueryAnalyzer
from app.utils.n_plus_one_parser import N1QueryInfo, QueryInfo, QueryPattern


class TestN1QueryAnalyzer:
    """Test suite for N+1 Query Analyzer."""
    
    @pytest.fixture
    def analyzer(self):
        """Create analyzer instance."""
        return N1QueryAnalyzer()
    
    @pytest.fixture
    def mock_llm_service(self):
        """Create mock LLM service."""
        llm_service = Mock()
        llm_service.analyze = AsyncMock(return_value="Consider using batch loading or eager loading strategies.")
        return llm_service
    
    @pytest.fixture
    def analyzer_with_llm(self, mock_llm_service):
        """Create analyzer with LLM service."""
        return N1QueryAnalyzer(llm_service=mock_llm_service)
    
    @pytest.fixture
    def n1_transaction_event(self):
        """Sample transaction event with N+1 pattern."""
        return {
            'id': 'test123',
            'type': 'transaction',
            'platform': 'python',
            'transaction': '/api/products',
            'spans': [
                {
                    'span_id': '1',
                    'op': 'db',
                    'description': 'SELECT * FROM products',
                    'timestamp': 1000.0,
                    'start_timestamp': 999.0,
                    'data': {
                        'db.system': 'postgresql',
                        'db.statement': 'SELECT * FROM products'
                    }
                },
                {
                    'span_id': '2',
                    'parent_span_id': '1',
                    'op': 'db',
                    'description': 'SELECT * FROM categories WHERE id = 1',
                    'timestamp': 1001.1,
                    'start_timestamp': 1001.0,
                    'data': {
                        'db.system': 'postgresql',
                        'db.statement': 'SELECT * FROM categories WHERE id = 1'
                    }
                },
                {
                    'span_id': '3',
                    'parent_span_id': '1',
                    'op': 'db',
                    'description': 'SELECT * FROM categories WHERE id = 2',
                    'timestamp': 1002.1,
                    'start_timestamp': 1002.0,
                    'data': {
                        'db.system': 'postgresql',
                        'db.statement': 'SELECT * FROM categories WHERE id = 2'
                    }
                },
                {
                    'span_id': '4',
                    'parent_span_id': '1',
                    'op': 'db',
                    'description': 'SELECT * FROM categories WHERE id = 3',
                    'timestamp': 1003.1,
                    'start_timestamp': 1003.0,
                    'data': {
                        'db.system': 'postgresql',
                        'db.statement': 'SELECT * FROM categories WHERE id = 3'
                    }
                }
            ]
        }
    
    @pytest.fixture
    def django_n1_event(self):
        """Django-specific N+1 event."""
        return {
            'id': 'django123',
            'type': 'transaction',
            'platform': 'python',
            'contexts': {
                'trace': {
                    'op': 'django.db',
                    'trace_id': 'abc123'
                }
            },
            'spans': [
                {
                    'op': 'db',
                    'description': 'SELECT * FROM blog_post',
                    'timestamp': 1000.5,
                    'start_timestamp': 1000.0
                },
                {
                    'op': 'db',
                    'description': 'SELECT * FROM auth_user WHERE id = 1',
                    'timestamp': 1001.1,
                    'start_timestamp': 1001.0
                }
            ]
        }
    
    @pytest.mark.asyncio
    async def test_capabilities(self, analyzer):
        """Test analyzer capabilities."""
        capabilities = analyzer.capabilities
        
        assert capabilities.analyzer_type == AnalyzerType.N_PLUS_ONE
        assert capabilities.name == "N+1 Query Analyzer"
        assert "python" in capabilities.supported_platforms
        assert "PerformanceTransaction" in capabilities.supported_error_types
        assert capabilities.requires_llm is True
    
    @pytest.mark.asyncio
    async def test_detect_n1_pattern(self, analyzer, n1_transaction_event):
        """Test detection of N+1 patterns in transactions."""
        result = await analyzer.detect(n1_transaction_event)
        assert result is True
        
        # Test with insufficient queries
        event_few_queries = {
            'type': 'transaction',
            'spans': [
                {'op': 'db', 'description': 'SELECT * FROM products'},
                {'op': 'db', 'description': 'SELECT * FROM categories WHERE id = 1'}
            ]
        }
        result = await analyzer.detect(event_few_queries)
        assert result is False
    
    @pytest.mark.asyncio
    async def test_detect_by_keywords(self, analyzer):
        """Test detection by various keywords."""
        test_cases = [
            ('N+1 query detected in API endpoint', True),
            ('Too many queries executed', True),
            ('Database performance issue with excessive queries', True),
            ('Normal database operation', False),
            ('Single query executed successfully', False)
        ]
        
        for message, should_detect in test_cases:
            event = {'message': message}
            result = await analyzer.detect(event)
            assert result == should_detect, f"Failed for message: {message}"
    
    @pytest.mark.asyncio
    async def test_detect_orm_patterns(self, analyzer, django_n1_event):
        """Test detection of ORM-specific patterns."""
        result = await analyzer.detect(django_n1_event)
        assert result is True
    
    @pytest.mark.asyncio
    async def test_parse_n1_pattern(self, analyzer, n1_transaction_event):
        """Test parsing of N+1 patterns."""
        # Mock the parser
        with patch('app.services.n_plus_one_analyzer.parse_n_plus_one_query') as mock_parse:
            parent_query = QueryInfo(
                query_id='1',
                sql='SELECT * FROM products',
                execution_time=1.0,
                execution_count=1,
                table='products',
                query_type='SELECT',
                timestamp=999.0
            )
            
            child_queries = [
                QueryInfo(
                    query_id=str(i),
                    sql=f'SELECT * FROM categories WHERE id = {i}',
                    execution_time=0.1,
                    execution_count=1,
                    table='categories',
                    query_type='SELECT',
                    timestamp=1000.0 + i,
                    parent_query_id='1'
                )
                for i in range(2, 5)
            ]
            
            pattern = QueryPattern(
                parent_query=parent_query,
                child_queries=child_queries,
                total_execution_time=1.3,
                optimized_execution_time=0.2,
                savings_percentage=84.6
            )
            
            mock_n1_info = N1QueryInfo(
                raw_message='',
                queries=[parent_query] + child_queries,
                patterns=[pattern],
                visualization_data={'type': 'waterfall'},
                recommended_fix='Use eager loading to fetch categories with products in a single query'
            )
            
            mock_parse.return_value = mock_n1_info
            
            result = await analyzer.parse(n1_transaction_event)
            
            assert result['parsed'] is True
            assert result['event_id'] == 'test123'
            assert result['n1_info'] == mock_n1_info
            assert 'metrics' in result
    
    @pytest.mark.asyncio
    async def test_analyze_complete(self, analyzer_with_llm, n1_transaction_event):
        """Test complete analysis with findings and recommendations."""
        # Mock the parser
        with patch('app.services.n_plus_one_analyzer.parse_n_plus_one_query') as mock_parse:
            parent_query = QueryInfo(
                query_id='1',
                sql='SELECT * FROM products',
                execution_time=10.0,
                execution_count=1,
                table='products',
                query_type='SELECT',
                timestamp=999.0
            )
            
            child_queries = [
                QueryInfo(
                    query_id=str(i),
                    sql=f'SELECT * FROM categories WHERE id = {i}',
                    execution_time=5.0,
                    execution_count=1,
                    table='categories',
                    query_type='SELECT',
                    timestamp=1000.0 + i,
                    parent_query_id='1'
                )
                for i in range(2, 52)  # 50 child queries
            ]
            
            pattern = QueryPattern(
                parent_query=parent_query,
                child_queries=child_queries,
                total_execution_time=260.0,  # 10 + 50*5
                optimized_execution_time=15.0,  # Estimated
                savings_percentage=94.2
            )
            
            mock_n1_info = N1QueryInfo(
                raw_message='',
                queries=[parent_query] + child_queries,
                patterns=[pattern],
                visualization_data={'type': 'waterfall'},
                recommended_fix='Use eager loading'
            )
            
            mock_parse.return_value = mock_n1_info
            
            # Parse first
            parsed_data = await analyzer_with_llm.parse(n1_transaction_event)
            
            # Then analyze
            result = await analyzer_with_llm.analyze(parsed_data)
            
            assert result.analyzer_type == AnalyzerType.N_PLUS_ONE
            assert result.is_detected is True
            assert result.confidence > 0.5
            assert len(result.findings) > 0
            assert len(result.recommendations) > 0
            assert result.business_impact in [BusinessImpact.HIGH, BusinessImpact.CRITICAL]
    
    @pytest.mark.asyncio
    async def test_visualization_generation(self, analyzer):
        """Test visualization data generation."""
        # Create a mock analysis result
        analysis = Mock()
        analysis.raw_analysis_data = {
            'pattern_count': 2,
            'total_queries': 10,
            'performance_impact_ms': 500.0,
            'optimization_potential': 80.0
        }
        
        # Mock parsed data attached to analysis
        analysis._parsed_data = {
            'n1_info': Mock(
                visualization_data={
                    'queries': [
                        {'id': '1', 'sql': 'SELECT * FROM products', 'duration': 10},
                        {'id': '2', 'sql': 'SELECT * FROM categories WHERE id = 1', 'duration': 5}
                    ],
                    'patterns': [{
                        'parent': '1',
                        'children': ['2', '3', '4']
                    }]
                }
            )
        }
        
        viz_data = await analyzer.visualize(analysis)
        
        assert viz_data.chart_type == 'query_waterfall'
        assert 'queries' in viz_data.data
        assert viz_data.options['interactive'] is True
    
    @pytest.mark.asyncio
    async def test_django_specific_recommendations(self, analyzer):
        """Test Django-specific recommendation generation."""
        n1_info = N1QueryInfo(
            raw_message='',
            queries=[
                QueryInfo(
                    query_id='1',
                    sql='SELECT * FROM blog_post',
                    execution_time=10.0,
                    execution_count=1,
                    table='blog_post',
                    query_type='SELECT',
                    timestamp=1000.0,
                    parameters={'framework': 'django'}
                )
            ],
            patterns=[
                QueryPattern(
                    parent_query=QueryInfo(
                        query_id='1',
                        sql='SELECT * FROM blog_post',
                        execution_time=10.0,
                        execution_count=1,
                        table='blog_post',
                        query_type='SELECT',
                        timestamp=1000.0
                    ),
                    child_queries=[],
                    total_execution_time=10.0,
                    optimized_execution_time=5.0,
                    savings_percentage=50.0
                )
            ],
            visualization_data={},
            recommended_fix='Use select_related()'
        )
        
        recommendations = await analyzer._generate_recommendations(
            n1_info,
            {'pattern_count': 1},
            []
        )
        
        # Should have Django-specific recommendation
        django_recs = [r for r in recommendations if 'Django' in r.title or 'select_related' in r.description]
        assert len(django_recs) > 0
        assert 'select_related' in django_recs[0].code_example or 'select_related' in django_recs[0].description
    
    @pytest.mark.asyncio
    async def test_business_impact_calculation(self, analyzer):
        """Test business impact calculation logic."""
        # High impact - lots of wasted time
        n1_info = Mock(patterns=[])
        metrics = {'total_wasted_time': 1500, 'pattern_count': 6}
        impact = analyzer._calculate_business_impact(n1_info, metrics)
        assert impact == BusinessImpact.CRITICAL
        
        # Medium impact
        metrics = {'total_wasted_time': 300, 'pattern_count': 2}
        impact = analyzer._calculate_business_impact(n1_info, metrics)
        assert impact == BusinessImpact.MEDIUM
        
        # Low impact
        metrics = {'total_wasted_time': 50, 'pattern_count': 1}
        impact = analyzer._calculate_business_impact(n1_info, metrics)
        assert impact == BusinessImpact.LOW
    
    @pytest.mark.asyncio
    async def test_financial_impact_estimation(self, analyzer):
        """Test financial impact estimation."""
        # High waste scenario
        metrics = {
            'total_wasted_time': 5000,  # 5 seconds wasted
            'affected_users': 1000
        }
        impact = analyzer._estimate_financial_impact(metrics)
        assert '$' in impact
        assert 'year' in impact
        
        # Low waste scenario
        metrics = {
            'total_wasted_time': 10,  # 10ms wasted
            'affected_users': 10
        }
        impact = analyzer._estimate_financial_impact(metrics)
        assert 'Minimal' in impact
    
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
        n1_info = N1QueryInfo(
            raw_message='',
            queries=[],
            patterns=[
                QueryPattern(
                    parent_query=QueryInfo(
                        query_id='1',
                        sql='SELECT * FROM users',
                        execution_time=10.0,
                        execution_count=1,
                        table='users',
                        query_type='SELECT',
                        timestamp=1000.0
                    ),
                    child_queries=[],
                    total_execution_time=100.0,
                    optimized_execution_time=20.0,
                    savings_percentage=80.0
                )
            ],
            visualization_data={},
            recommended_fix=''
        )
        
        recommendations = await analyzer_with_llm._generate_recommendations(
            n1_info,
            {'pattern_count': 1, 'total_queries': 10, 'total_wasted_time': 80},
            []
        )
        
        # Verify LLM was called
        mock_llm_service.analyze.assert_called_once()
        
        # Should have AI-generated recommendation
        ai_recs = [r for r in recommendations if 'AI' in r.title]
        assert len(ai_recs) > 0