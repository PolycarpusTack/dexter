"""
Unit tests for enriched RAG prompt builder.

EPIC P - Story P-2: Test enrichment context injection and token budget enforcement.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.db.models import SentryIssue
from app.services.rag_prompt_builder import RAGPromptBuilder
from app.services.retrieval_service import SimilarIssue
from app.utils.token_counter import count_tokens


@pytest.fixture
def prompt_builder():
    """Create a prompt builder instance."""
    return RAGPromptBuilder()


@pytest.fixture
def mock_issue():
    """Create a mock SentryIssue with enrichment data."""
    return SentryIssue(
        id=1,
        sentry_issue_id="ISSUE-001",
        sentry_event_id="EVENT-001",
        error_type="TimeoutError",
        error_message="Request timeout after 30s in database query",
        platform="python",
        level="error",
        release_context={
            "releases": [{
                "version": "v1.2.3",
                "date_created": "2025-11-29T10:00:00Z",
                "crash_free_rate": 98.5,
            }],
            "health_score": 0.95,
            "suspect_commits": [{
                "author": {"name": "Jane Doe"},
                "message": "Optimize database queries",
            }],
        },
        performance_data={
            "problem_spans": [{
                "op": "db.query",
                "description": "SELECT * FROM users WHERE ...",
                "duration_ms": 5000,
                "severity": "high",
            }],
            "n_plus_one_patterns": [{
                "query_template": "SELECT * FROM posts WHERE user_id = ?",
                "occurrence_count": 50,
            }],
        },
        profiling_data={
            "hot_functions": [{
                "function_name": "query_database",
                "file": "db.py",
                "time_percentage": 45.0,
                "severity": "high",
            }],
        },
        alert_context={
            "recent_alert_count": 5,
            "in_active_incident": True,
            "alert_history": [{
                "rule_name": "Timeout Rate High",
                "timestamp": "2025-11-30T14:00:00Z",
            }],
        },
        session_data={
            "crash_free_rate": 97.8,
            "impact_percentage": 2.5,
            "replay_count": 3,
        },
        breadcrumbs={
            "timeline": [
                {
                    "category": "http",
                    "message": "GET /api/users",
                    "timestamp": "2025-11-30T14:30:00Z",
                },
                {
                    "category": "db",
                    "message": "Query users table",
                    "timestamp": "2025-11-30T14:30:01Z",
                },
            ],
        },
        ownership={
            "teams": ["backend-team"],
            "primary_team": "backend-team",
        },
        tag_distributions={
            "top_values": {
                "environment": [{"value": "production", "count": 100}],
                "browser": [{"value": "Chrome", "count": 80}],
            },
        },
        measurements={
            "web_vitals": {
                "lcp": 2500,
                "fid": 100,
                "cls": 0.1,
            },
        },
    )


@pytest.fixture
def mock_similar_issues():
    """Create mock similar issues."""
    return [
        SimilarIssue(
            id=2,
            sentry_issue_id="ISSUE-002",
            error_type="TimeoutError",
            error_message="Database timeout",
            similarity_score=0.92,
            combined_score=0.95,
            composite_score=0.88,
            is_validated=True,
            human_solution="Add index on user_id column",
            ai_explanation="Slow query due to missing index",
        ),
        SimilarIssue(
            id=3,
            sentry_issue_id="ISSUE-003",
            error_type="TimeoutError",
            error_message="Query too slow",
            similarity_score=0.85,
            combined_score=0.85,
            composite_score=0.80,
            is_validated=False,
            ai_suggested_fix="Optimize query with pagination",
        ),
    ]


class TestEnrichmentContextInjection:
    """Test enrichment data injection into prompts."""

    @pytest.mark.asyncio
    async def test_enrichment_context_included(
        self, prompt_builder, mock_issue, mock_similar_issues
    ):
        """Test enrichment context is included in prompt."""
        prompt = await prompt_builder.build_enriched_prompt(
            issue=mock_issue,
            similar_issues=mock_similar_issues,
            user_query="Why is this timing out?",
        )

        assert "Enrichment Context:" in prompt.user_prompt
        assert "Release Context:" in prompt.user_prompt
        assert "Performance Data:" in prompt.user_prompt
        assert "v1.2.3" in prompt.user_prompt  # Release version
        assert "Problem Spans" in prompt.user_prompt
        assert "5000ms" in prompt.user_prompt  # Slow span duration

    @pytest.mark.asyncio
    async def test_performance_error_prioritization(
        self, prompt_builder, mock_issue, mock_similar_issues
    ):
        """Test performance errors prioritize performance/profiling data."""
        prompt = await prompt_builder.build_enriched_prompt(
            issue=mock_issue,
            similar_issues=mock_similar_issues,
        )

        # For timeout errors, performance data should appear early
        user_prompt = prompt.user_prompt
        perf_idx = user_prompt.find("Performance Data:")
        profiling_idx = user_prompt.find("Profiling Hotspots")

        # Both should be present
        assert perf_idx > 0
        assert profiling_idx > 0

    @pytest.mark.asyncio
    async def test_enrichment_priorities_by_error_type(self, prompt_builder):
        """Test different error types get different enrichment priorities."""
        # Performance error
        perf_priorities = prompt_builder._determine_enrichment_priorities("TimeoutError")
        assert perf_priorities[0] == "performance_data"
        assert "profiling_data" in perf_priorities[:3]

        # Database error
        db_priorities = prompt_builder._determine_enrichment_priorities("DatabaseError")
        assert db_priorities[0] == "performance_data"
        assert "profiling_data" in db_priorities[:3]

        # Memory error
        mem_priorities = prompt_builder._determine_enrichment_priorities("MemoryError")
        assert mem_priorities[0] == "profiling_data"
        assert "measurements" in mem_priorities[:3]


class TestTokenBudgetEnforcement:
    """Test token budget enforcement."""

    @pytest.mark.asyncio
    async def test_token_budget_enforcement(
        self, prompt_builder, mock_issue, mock_similar_issues
    ):
        """Test prompt stays within token budget."""
        prompt = await prompt_builder.build_enriched_prompt(
            issue=mock_issue,
            similar_issues=mock_similar_issues * 10,  # Many similar issues
        )

        total_tokens = count_tokens(prompt.system_prompt + prompt.user_prompt)

        # Should be under total budget
        assert total_tokens <= prompt_builder.TOKEN_BUDGET

    @pytest.mark.asyncio
    async def test_block_summarization(self, prompt_builder):
        """Test large blocks are summarized."""
        # Create issue with very large enrichment data
        large_issue = SentryIssue(
            id=1,
            sentry_issue_id="ISSUE-001",
            sentry_event_id="EVENT-001",
            error_type="Error",
            error_message="Test",
            platform="python",
            level="error",
            breadcrumbs={
                "timeline": [
                    {
                        "category": "http",
                        "message": f"Request {i}" * 100,  # Very long messages
                        "timestamp": "2025-11-30T14:30:00Z",
                    }
                    for i in range(100)  # Many breadcrumbs
                ],
            },
        )

        prompt = await prompt_builder.build_enriched_prompt(
            issue=large_issue,
            similar_issues=[],
        )

        # Breadcrumbs should be included but truncated
        assert "Breadcrumb Timeline" in prompt.user_prompt

        # Total should still be under budget
        total_tokens = count_tokens(prompt.user_prompt)
        assert total_tokens <= prompt_builder.TOKEN_BUDGET


class TestEnrichmentFormatting:
    """Test formatting of individual enrichment sources."""

    def test_format_release_context(self, prompt_builder):
        """Test release context formatting."""
        data = {
            "releases": [{
                "version": "v2.0.0",
                "date_created": "2025-11-30",
                "crash_free_rate": 99.5,
            }],
            "health_score": 0.98,
            "suspect_commits": [
                {
                    "author": {"name": "John Doe"},
                    "message": "Fix critical bug in authentication",
                }
            ],
        }

        formatted = prompt_builder._format_release_context(data)

        assert "Release Context:" in formatted
        assert "v2.0.0" in formatted
        assert "99.5%" in formatted
        assert "Suspect Commits" in formatted
        assert "John Doe" in formatted

    def test_format_performance_data(self, prompt_builder):
        """Test performance data formatting."""
        data = {
            "problem_spans": [
                {
                    "op": "db.query",
                    "description": "SELECT * FROM orders",
                    "duration_ms": 3000,
                    "severity": "critical",
                }
            ],
            "n_plus_one_patterns": [
                {
                    "query_template": "SELECT * FROM items WHERE order_id = ?",
                    "occurrence_count": 100,
                }
            ],
        }

        formatted = prompt_builder._format_performance_data(data)

        assert "Performance Data:" in formatted
        assert "Problem Spans" in formatted
        assert "[CRITICAL]" in formatted
        assert "3000ms" in formatted
        assert "N+1 Query Patterns" in formatted
        assert "100 occurrences" in formatted

    def test_format_profiling_data(self, prompt_builder):
        """Test profiling data formatting."""
        data = {
            "hot_functions": [
                {
                    "function_name": "process_data",
                    "file": "processor.py",
                    "time_percentage": 65.0,
                    "severity": "high",
                }
            ],
        }

        formatted = prompt_builder._format_profiling_data(data)

        assert "Profiling Hotspots" in formatted
        assert "process_data" in formatted
        assert "processor.py" in formatted
        assert "65.0% time" in formatted
        assert "[HIGH]" in formatted

    def test_format_alert_context(self, prompt_builder):
        """Test alert context formatting."""
        data = {
            "recent_alert_count": 8,
            "in_active_incident": True,
            "alert_history": [
                {
                    "rule_name": "Error Rate Exceeded",
                    "timestamp": "2025-11-30T15:00:00Z",
                }
            ],
        }

        formatted = prompt_builder._format_alert_context(data)

        assert "Alert Context:" in formatted
        assert "8 in last 24h" in formatted
        assert "Currently in Active Incident" in formatted
        assert "Error Rate Exceeded" in formatted

    def test_format_session_data(self, prompt_builder):
        """Test session data formatting."""
        data = {
            "crash_free_rate": 95.5,
            "impact_percentage": 4.5,
            "replay_count": 10,
        }

        formatted = prompt_builder._format_session_data(data)

        assert "Session Impact:" in formatted
        assert "95.5%" in formatted
        assert "4.5% of sessions" in formatted
        assert "10 available" in formatted

    def test_format_breadcrumbs(self, prompt_builder):
        """Test breadcrumb formatting."""
        data = {
            "timeline": [
                {
                    "category": "navigation",
                    "message": "User navigated to /dashboard",
                    "timestamp": "2025-11-30T14:00:00.123456Z",
                },
                {
                    "category": "xhr",
                    "message": "AJAX request to /api/data",
                    "timestamp": "2025-11-30T14:00:01.789012Z",
                },
            ],
        }

        formatted = prompt_builder._format_breadcrumbs(data)

        assert "Breadcrumb Timeline" in formatted
        assert "navigation:" in formatted
        assert "User navigated to /dashboard" in formatted
        assert "xhr:" in formatted


class TestPromptStructure:
    """Test overall prompt structure and components."""

    @pytest.mark.asyncio
    async def test_user_query_included(
        self, prompt_builder, mock_issue, mock_similar_issues
    ):
        """Test user query is included when provided."""
        prompt = await prompt_builder.build_enriched_prompt(
            issue=mock_issue,
            similar_issues=mock_similar_issues,
            user_query="Why does this keep happening?",
        )

        assert "User Question:" in prompt.user_prompt
        assert "Why does this keep happening?" in prompt.user_prompt

    @pytest.mark.asyncio
    async def test_issue_summary_included(
        self, prompt_builder, mock_issue, mock_similar_issues
    ):
        """Test issue summary is always included."""
        prompt = await prompt_builder.build_enriched_prompt(
            issue=mock_issue,
            similar_issues=mock_similar_issues,
        )

        assert "Current Error" in prompt.user_prompt
        assert "TimeoutError" in prompt.user_prompt
        assert "Request timeout after 30s" in prompt.user_prompt

    @pytest.mark.asyncio
    async def test_similar_issues_included(
        self, prompt_builder, mock_issue, mock_similar_issues
    ):
        """Test similar issues are included."""
        prompt = await prompt_builder.build_enriched_prompt(
            issue=mock_issue,
            similar_issues=mock_similar_issues,
        )

        assert "Similar Past Issues" in prompt.user_prompt
        assert "Validated Solution" in prompt.user_prompt
        assert "Add index on user_id column" in prompt.user_prompt

    @pytest.mark.asyncio
    async def test_instructions_included(
        self, prompt_builder, mock_issue, mock_similar_issues
    ):
        """Test analysis instructions are included."""
        prompt = await prompt_builder.build_enriched_prompt(
            issue=mock_issue,
            similar_issues=mock_similar_issues,
        )

        assert "Please Provide" in prompt.user_prompt
        assert "Root Cause" in prompt.user_prompt
        assert "Solution" in prompt.user_prompt
        assert "Prevention" in prompt.user_prompt
