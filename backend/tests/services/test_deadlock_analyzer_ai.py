# File: backend/tests/services/test_deadlock_analyzer_ai.py

"""
Test AI-powered recommendations for the PostgreSQL Deadlock Analyzer.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime

from app.models.analyzers import (
    AnalyzerType,
    BusinessImpact,
    ConfidenceLevel
)
from app.services.deadlock_analyzer import PostgreSQLDeadlockAnalyzer


class TestDeadlockAnalyzerAI:
    """Test AI-powered features of the deadlock analyzer."""
    
    @pytest.fixture
    def mock_llm_service(self):
        """Create a mock LLM service."""
        llm_service = AsyncMock()
        llm_service.get_explanation = AsyncMock()
        return llm_service
    
    @pytest.fixture
    def analyzer_with_llm(self, mock_llm_service):
        """Create a deadlock analyzer with LLM service."""
        return PostgreSQLDeadlockAnalyzer(llm_service=mock_llm_service)
    
    @pytest.fixture
    def sample_deadlock_event(self):
        """Create a sample deadlock event."""
        return {
            "id": "test-deadlock-123",
            "message": "ERROR: deadlock detected\nDETAIL: Process 12345 waits for ShareLock on relation 16385 of database 12345; blocked by process 12346.\nProcess 12346 waits for ShareLock on relation 16386 of database 12345; blocked by process 12345.",
            "title": "OperationalError: deadlock detected",
            "platform": "python",
            "environment": "production",
            "exception": {
                "values": [{
                    "type": "OperationalError",
                    "value": "deadlock detected"
                }]
            },
            "tags": [
                {"key": "sql_state", "value": "40P01"},
                {"key": "database.type", "value": "postgresql"}
            ]
        }
    
    @pytest.fixture
    def parsed_deadlock_info(self):
        """Create parsed deadlock information."""
        return {
            "transactions": {
                "12345": {
                    "pid": 12345,
                    "query": "UPDATE users SET last_active = NOW() WHERE id = 123",
                    "tables_accessed": ["users"],
                    "lock_mode": "ShareLock"
                },
                "12346": {
                    "pid": 12346,
                    "query": "UPDATE accounts SET balance = balance - 100 WHERE user_id = 123",
                    "tables_accessed": ["accounts"],
                    "lock_mode": "ShareLock"
                }
            },
            "locks": [
                {"pid": 12345, "lock_mode": "ShareLock", "relation": 16385},
                {"pid": 12346, "lock_mode": "ShareLock", "relation": 16386}
            ],
            "cycles": [{
                "processes": [12345, 12346],
                "relations": ["users", "accounts"],
                "severity": 50
            }],
            "severity_score": 50,
            "visualization_data": {
                "nodes": [],
                "edges": []
            }
        }
    
    @pytest.mark.asyncio
    async def test_ai_recommendations_generation(self, analyzer_with_llm, parsed_deadlock_info, mock_llm_service):
        """Test that AI recommendations are generated when LLM service is available."""
        # Setup mock response
        ai_response = """
        Root Cause Analysis:
        The deadlock occurred because two transactions are updating related tables (users and accounts) in different orders. Process 12345 updates the users table first, while process 12346 updates the accounts table first, creating a circular dependency.
        
        Immediate Resolution Steps:
        1. Kill one of the deadlocked processes using pg_terminate_backend()
        2. Implement retry logic in your application code
        ```sql
        SELECT pg_terminate_backend(12345);
        ```
        
        Long-term Prevention:
        Always access tables in a consistent order across all transactions. For example, always update users before accounts.
        ```sql
        BEGIN;
        UPDATE users SET last_active = NOW() WHERE id = 123;
        UPDATE accounts SET balance = balance - 100 WHERE user_id = 123;
        COMMIT;
        ```
        
        Monitoring Recommendations:
        Enable log_lock_waits and set deadlock_timeout to detect potential deadlocks early.
        ```sql
        ALTER SYSTEM SET log_lock_waits = on;
        ALTER SYSTEM SET deadlock_timeout = '1s';
        SELECT pg_reload_conf();
        ```
        """
        
        mock_llm_service.get_explanation.return_value = ai_response
        
        # Generate AI recommendations
        parsed_data = {"event_id": "test-123", "platform": "postgresql"}
        ai_text = await analyzer_with_llm._generate_ai_recommendations(parsed_deadlock_info, parsed_data)
        
        # Verify LLM was called
        assert mock_llm_service.get_explanation.called
        assert ai_text == ai_response
        
        # Test recommendation parsing
        recommendations = await analyzer_with_llm._create_recommendations_with_ai(parsed_deadlock_info, ai_text)
        
        # Verify recommendations were created
        assert len(recommendations) == 4
        
        # Check root cause analysis
        assert recommendations[0].title == "Root Cause Analysis"
        assert "circular dependency" in recommendations[0].description
        assert recommendations[0].priority == BusinessImpact.HIGH
        assert "ai-generated" in recommendations[0].tags
        
        # Check immediate fixes
        assert recommendations[1].title == "Immediate Resolution Steps"
        assert "pg_terminate_backend" in recommendations[1].code_example
        assert recommendations[1].priority == BusinessImpact.CRITICAL
        
        # Check prevention strategy
        assert recommendations[2].title == "Long-term Prevention Strategy"
        assert "consistent order" in recommendations[2].description
        assert "BEGIN" in recommendations[2].code_example
        
        # Check monitoring
        assert recommendations[3].title == "Monitoring and Detection Setup"
        assert "log_lock_waits" in recommendations[3].description
    
    @pytest.mark.asyncio
    async def test_ai_recommendations_fallback(self, analyzer_with_llm, parsed_deadlock_info, mock_llm_service):
        """Test fallback to rules-based recommendations when AI fails."""
        # Setup mock to fail
        mock_llm_service.get_explanation.side_effect = Exception("LLM service unavailable")
        
        # Generate recommendations
        ai_text = await analyzer_with_llm._generate_ai_recommendations(parsed_deadlock_info, {})
        assert ai_text == ""  # Should return empty string on failure
        
        # Create recommendations should fallback to rules-based
        recommendations = await analyzer_with_llm._create_recommendations_with_ai(parsed_deadlock_info, ai_text)
        
        # Should have rules-based recommendations
        assert len(recommendations) > 0
        assert all("ai-generated" not in r.tags for r in recommendations)
    
    @pytest.mark.asyncio
    async def test_ai_prompt_generation(self, analyzer_with_llm, parsed_deadlock_info):
        """Test that appropriate prompts are generated for deadlock analysis."""
        parsed_data = {"event_id": "test-123", "platform": "postgresql", "environment": "production"}
        
        prompt = analyzer_with_llm._create_deadlock_recommendation_prompt(parsed_deadlock_info, parsed_data)
        
        # Verify prompt contains key information
        assert "PostgreSQL database expert" in prompt
        assert "DEADLOCK SUMMARY" in prompt
        assert "Processes involved: 2" in prompt
        assert "Tables involved: users, accounts" in prompt
        assert "Root cause analysis" in prompt
        assert "Immediate fixes" in prompt
        assert "Long-term preventive measures" in prompt
        assert "UPDATE users SET last_active" in prompt
        assert "UPDATE accounts SET balance" in prompt
    
    @pytest.mark.asyncio
    async def test_full_analysis_with_ai(self, analyzer_with_llm, sample_deadlock_event, mock_llm_service):
        """Test full analysis flow with AI recommendations."""
        # Setup AI response
        mock_llm_service.get_explanation.return_value = """
        Root Cause Analysis:
        Classic deadlock pattern detected between user and account updates.
        
        Immediate Resolution Steps:
        Use NOWAIT or implement retry logic.
        """
        
        # Run full analysis
        assert await analyzer_with_llm.detect(sample_deadlock_event)
        parsed = await analyzer_with_llm.parse(sample_deadlock_event)
        result = await analyzer_with_llm.analyze(parsed)
        
        # Verify result
        assert result.analyzer_type == AnalyzerType.DEADLOCK
        assert result.is_detected
        assert result.confidence > 0.3
        assert len(result.findings) > 0
        assert len(result.recommendations) > 0
        
        # Check for AI-generated recommendations
        ai_recommendations = [r for r in result.recommendations if "ai-generated" in r.tags]
        if mock_llm_service.get_explanation.called:
            assert len(ai_recommendations) > 0