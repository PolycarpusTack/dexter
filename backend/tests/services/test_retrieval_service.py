"""
Unit tests for Retrieval Service.

Tests similarity search and context building.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.retrieval_service import (
    ContextForLLM,
    RetrievalResult,
    RetrievalService,
    SimilarIssue,
)


class TestSimilarIssue:
    """Tests for SimilarIssue model."""

    def test_basic_issue(self):
        """Test basic similar issue creation."""
        issue = SimilarIssue(
            id=1,
            sentry_issue_id="ISSUE-123",
            error_type="ValueError",
            error_message="test error",
            similarity_score=0.85,
        )
        assert issue.id == 1
        assert issue.similarity_score == 0.85
        assert not issue.is_validated

    def test_validated_issue(self):
        """Test validated issue with solution."""
        issue = SimilarIssue(
            id=2,
            sentry_issue_id="ISSUE-456",
            error_type="TypeError",
            error_message="null reference",
            similarity_score=0.92,
            human_solution="Check for null before accessing",
            is_validated=True,
            feedback_count=5,
        )
        assert issue.is_validated
        assert issue.human_solution is not None
        assert issue.feedback_count == 5

    def test_similarity_score_bounds(self):
        """Test similarity score validation."""
        # Valid scores
        issue = SimilarIssue(
            id=1,
            sentry_issue_id="X",
            error_type="E",
            error_message="M",
            similarity_score=0.0,
        )
        assert issue.similarity_score == 0.0

        issue = SimilarIssue(
            id=1,
            sentry_issue_id="X",
            error_type="E",
            error_message="M",
            similarity_score=1.0,
        )
        assert issue.similarity_score == 1.0


class TestRetrievalResult:
    """Tests for RetrievalResult model."""

    def test_empty_result(self):
        """Test empty result."""
        result = RetrievalResult(
            query_error_type="Error",
            query_error_message="test",
            similar_issues=[],
        )
        assert len(result.similar_issues) == 0
        assert result.confidence == "LOW"
        assert not result.has_validated_solution

    def test_result_with_validated(self):
        """Test result with validated solution."""
        result = RetrievalResult(
            query_error_type="ValueError",
            query_error_message="invalid input",
            similar_issues=[
                SimilarIssue(
                    id=1,
                    sentry_issue_id="X",
                    error_type="ValueError",
                    error_message="similar",
                    similarity_score=0.9,
                    is_validated=True,
                )
            ],
            has_validated_solution=True,
            confidence="HIGH",
        )
        assert result.has_validated_solution
        assert result.confidence == "HIGH"


class TestContextForLLM:
    """Tests for ContextForLLM model."""

    def test_context_creation(self):
        """Test LLM context creation."""
        context = ContextForLLM(
            current_error={"type": "Error", "message": "test"},
            similar_issues=[{"error_type": "Error", "similarity": 0.8}],
            validated_solutions=["Check input validation"],
            suggested_fixes=["Add null check"],
            confidence_level="MEDIUM",
        )
        assert context.confidence_level == "MEDIUM"
        assert len(context.validated_solutions) == 1
        assert len(context.suggested_fixes) == 1


class TestRetrievalService:
    """Tests for RetrievalService class."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return RetrievalService()

    def test_calculate_confidence_high(self, service):
        """Test HIGH confidence calculation."""
        issues = [
            SimilarIssue(
                id=1,
                sentry_issue_id="X",
                error_type="E",
                error_message="M",
                similarity_score=0.90,
                is_validated=True,
            )
        ]
        result = service._calculate_confidence(issues)
        assert result == "HIGH"

    def test_calculate_confidence_medium_similarity(self, service):
        """Test MEDIUM confidence from high similarity."""
        issues = [
            SimilarIssue(
                id=1,
                sentry_issue_id="X",
                error_type="E",
                error_message="M",
                similarity_score=0.80,
                is_validated=False,
            )
        ]
        result = service._calculate_confidence(issues)
        assert result == "MEDIUM"

    def test_calculate_confidence_medium_validated(self, service):
        """Test MEDIUM confidence from validated but lower similarity."""
        issues = [
            SimilarIssue(
                id=1,
                sentry_issue_id="X",
                error_type="E",
                error_message="M",
                similarity_score=0.72,
                is_validated=True,
            )
        ]
        result = service._calculate_confidence(issues)
        assert result == "MEDIUM"

    def test_calculate_confidence_low(self, service):
        """Test LOW confidence."""
        issues = [
            SimilarIssue(
                id=1,
                sentry_issue_id="X",
                error_type="E",
                error_message="M",
                similarity_score=0.65,
                is_validated=False,
            )
        ]
        result = service._calculate_confidence(issues)
        assert result == "LOW"

    def test_calculate_confidence_empty(self, service):
        """Test confidence with no issues."""
        result = service._calculate_confidence([])
        assert result == "LOW"
