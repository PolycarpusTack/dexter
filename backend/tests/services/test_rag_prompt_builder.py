"""
Unit tests for RAG Prompt Builder.

Tests prompt building and citation requirements.
"""

import pytest

from app.services.rag_prompt_builder import (
    CITATION_REQUIREMENTS,
    CitationRequirement,
    RAGPrompt,
    RAGPromptBuilder,
)
from app.services.retrieval_service import ContextForLLM, RetrievalResult, SimilarIssue


class TestCitationRequirement:
    """Tests for CitationRequirement model."""

    def test_high_confidence_no_disclaimer(self):
        """Test HIGH confidence doesn't require disclaimer."""
        req = CITATION_REQUIREMENTS["HIGH"]
        assert req.level == "HIGH"
        assert req.must_cite is True
        assert req.cite_count == 1
        assert req.disclaimer_required is False
        assert req.disclaimer_text is None

    def test_medium_confidence_with_disclaimer(self):
        """Test MEDIUM confidence requires disclaimer."""
        req = CITATION_REQUIREMENTS["MEDIUM"]
        assert req.level == "MEDIUM"
        assert req.must_cite is True
        assert req.disclaimer_required is True
        assert req.disclaimer_text is not None
        assert "adaptation" in req.disclaimer_text.lower()

    def test_low_confidence_with_disclaimer(self):
        """Test LOW confidence requires disclaimer but not citation."""
        req = CITATION_REQUIREMENTS["LOW"]
        assert req.level == "LOW"
        assert req.must_cite is False
        assert req.cite_count == 0
        assert req.disclaimer_required is True
        assert req.disclaimer_text is not None


class TestRAGPrompt:
    """Tests for RAGPrompt model."""

    def test_basic_prompt(self):
        """Test basic prompt creation."""
        prompt = RAGPrompt(
            system_prompt="You are an expert",
            user_prompt="Explain this error",
            context_summary="No similar issues",
            citation_requirement=CITATION_REQUIREMENTS["LOW"],
            similar_issues_count=0,
            has_validated_solution=False,
            confidence_level="LOW",
        )
        assert prompt.confidence_level == "LOW"
        assert prompt.similar_issues_count == 0
        assert prompt.has_validated_solution is False

    def test_prompt_with_context(self):
        """Test prompt with KB context."""
        prompt = RAGPrompt(
            system_prompt="You are an expert",
            user_prompt="Explain this error with context",
            context_summary="3 similar issues found",
            citation_requirement=CITATION_REQUIREMENTS["HIGH"],
            similar_issues_count=3,
            has_validated_solution=True,
            confidence_level="HIGH",
        )
        assert prompt.confidence_level == "HIGH"
        assert prompt.similar_issues_count == 3
        assert prompt.has_validated_solution is True


class TestRAGPromptBuilder:
    """Tests for RAGPromptBuilder."""

    @pytest.fixture
    def builder(self):
        """Create builder instance."""
        return RAGPromptBuilder()

    @pytest.fixture
    def basic_error_data(self):
        """Create basic error data."""
        return {
            "type": "ValueError",
            "value": "invalid literal for int(): 'abc'",
            "platform": "python",
        }

    @pytest.fixture
    def error_with_stack(self):
        """Create error data with stack trace."""
        return {
            "type": "TypeError",
            "value": "cannot read property 'map' of undefined",
            "platform": "javascript",
            "stack_frames": [
                {"filename": "app.js", "function": "processData", "line": 42},
                {"filename": "utils.js", "function": "transform", "line": 15},
            ],
        }

    def test_build_simple_prompt_no_kb(self, builder):
        """Test building prompt without KB context."""
        result = builder.build_simple_prompt(
            error_type="KeyError",
            error_message="'missing_key'",
            platform="python",
        )

        assert isinstance(result, RAGPrompt)
        assert result.confidence_level == "LOW"
        assert result.similar_issues_count == 0
        assert result.has_validated_solution is False
        assert "KeyError" in result.user_prompt
        assert "'missing_key'" in result.user_prompt

    def test_build_prompt_with_error_data(self, builder, basic_error_data):
        """Test building prompt from error data dict."""
        result = builder.build_prompt(basic_error_data)

        assert isinstance(result, RAGPrompt)
        assert "ValueError" in result.user_prompt
        assert "int()" in result.user_prompt
        assert "python" in result.user_prompt.lower()

    def test_build_prompt_with_stack_frames(self, builder, error_with_stack):
        """Test prompt includes stack frame info."""
        result = builder.build_prompt(error_with_stack)

        assert "app.js" in result.user_prompt
        assert "processData" in result.user_prompt
        assert "42" in result.user_prompt

    def test_build_prompt_with_retrieval_result(self, builder, basic_error_data):
        """Test prompt building with retrieval result."""
        similar_issue = SimilarIssue(
            id=1,
            sentry_issue_id="ISSUE-123",
            error_type="ValueError",
            error_message="similar error",
            similarity_score=0.85,
            ai_explanation="This happens when...",
            human_solution="Fix by validating input",
            is_validated=True,
        )

        retrieval_result = RetrievalResult(
            query_error_type="ValueError",
            query_error_message="invalid literal",
            similar_issues=[similar_issue],
            has_validated_solution=True,
            confidence="HIGH",
        )

        result = builder.build_prompt(
            error_data=basic_error_data,
            retrieval_result=retrieval_result,
        )

        assert result.confidence_level == "HIGH"
        assert result.similar_issues_count == 1
        assert result.has_validated_solution is True
        assert result.citation_requirement.must_cite is True
        assert "Similar Past Issues" in result.user_prompt
        assert "Validated Solution" in result.user_prompt

    def test_build_prompt_with_context(self, builder, basic_error_data):
        """Test prompt building with ContextForLLM."""
        context = ContextForLLM(
            current_error={"type": "ValueError", "message": "test"},
            similar_issues=[
                {"error_type": "ValueError", "similarity": 0.8, "is_validated": True}
            ],
            validated_solutions=["Check input type before conversion"],
            suggested_fixes=["Use try/except"],
            confidence_level="MEDIUM",
        )

        result = builder.build_prompt(
            error_data=basic_error_data,
            context=context,
        )

        assert result.confidence_level == "MEDIUM"
        assert result.has_validated_solution is True
        assert "Knowledge Base Context" in result.user_prompt

    def test_system_prompt_high_confidence(self, builder, basic_error_data):
        """Test system prompt adjusts for HIGH confidence."""
        similar_issue = SimilarIssue(
            id=1,
            sentry_issue_id="X",
            error_type="E",
            error_message="M",
            similarity_score=0.9,
            human_solution="Solution",
            is_validated=True,
        )

        retrieval_result = RetrievalResult(
            query_error_type="E",
            query_error_message="M",
            similar_issues=[similar_issue],
            has_validated_solution=True,
            confidence="HIGH",
        )

        result = builder.build_prompt(basic_error_data, retrieval_result)

        assert "HIGH confidence" in result.system_prompt
        assert "cite" in result.system_prompt.lower()

    def test_system_prompt_with_validated_solution(self, builder, basic_error_data):
        """Test system prompt mentions validated solutions."""
        similar_issue = SimilarIssue(
            id=1,
            sentry_issue_id="X",
            error_type="E",
            error_message="M",
            similarity_score=0.8,
            human_solution="Verified fix",
            is_validated=True,
        )

        retrieval_result = RetrievalResult(
            query_error_type="E",
            query_error_message="M",
            similar_issues=[similar_issue],
            has_validated_solution=True,
            confidence="MEDIUM",
        )

        result = builder.build_prompt(basic_error_data, retrieval_result)

        assert "validated solutions" in result.system_prompt.lower()
        assert "verified" in result.system_prompt.lower()

    def test_citation_instruction_added(self, builder, basic_error_data):
        """Test citation instruction added when must_cite is True."""
        similar_issue = SimilarIssue(
            id=1,
            sentry_issue_id="X",
            error_type="E",
            error_message="M",
            similarity_score=0.9,
            is_validated=True,
        )

        retrieval_result = RetrievalResult(
            query_error_type="E",
            query_error_message="M",
            similar_issues=[similar_issue],
            has_validated_solution=True,
            confidence="HIGH",
        )

        result = builder.build_prompt(basic_error_data, retrieval_result)

        assert "cite" in result.user_prompt.lower()

    def test_disclaimer_added_for_low_confidence(self, builder, basic_error_data):
        """Test disclaimer added for LOW confidence."""
        result = builder.build_prompt(basic_error_data)

        assert result.confidence_level == "LOW"
        # Disclaimer text should be in the citation requirement
        assert result.citation_requirement.disclaimer_text is not None

    def test_context_summary_generated(self, builder, basic_error_data):
        """Test context summary is generated."""
        similar_issue = SimilarIssue(
            id=1,
            sentry_issue_id="X",
            error_type="E",
            error_message="M",
            similarity_score=0.85,
            human_solution="Fix it",
            is_validated=True,
        )

        retrieval_result = RetrievalResult(
            query_error_type="E",
            query_error_message="M",
            similar_issues=[similar_issue],
            has_validated_solution=True,
            confidence="HIGH",
        )

        result = builder.build_prompt(basic_error_data, retrieval_result)

        assert result.context_summary != ""
        assert "similar" in result.context_summary.lower() or "Validated" in result.context_summary

    def test_multiple_similar_issues(self, builder, basic_error_data):
        """Test prompt with multiple similar issues."""
        issues = [
            SimilarIssue(
                id=i,
                sentry_issue_id=f"ISSUE-{i}",
                error_type="ValueError",
                error_message=f"Error {i}",
                similarity_score=0.9 - (i * 0.1),
                is_validated=i == 1,
                human_solution="Solution" if i == 1 else None,
            )
            for i in range(1, 4)
        ]

        retrieval_result = RetrievalResult(
            query_error_type="ValueError",
            query_error_message="test",
            similar_issues=issues,
            has_validated_solution=True,
            confidence="MEDIUM",
        )

        result = builder.build_prompt(basic_error_data, retrieval_result)

        assert result.similar_issues_count == 3
        # Should include info from multiple issues
        assert "Issue #1" in result.user_prompt or "90%" in result.user_prompt
