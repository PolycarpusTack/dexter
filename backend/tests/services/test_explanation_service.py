"""
Unit tests for Explanation Service.

Tests RAG-enhanced explanation generation.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.explanation_service import (
    ExplanationResult,
    ExplanationService,
)
from app.services.rag_prompt_builder import (
    CITATION_REQUIREMENTS,
    RAGPrompt,
)
from app.services.retrieval_service import RetrievalResult, SimilarIssue


class TestExplanationResult:
    """Tests for ExplanationResult model."""

    def test_basic_result(self):
        """Test basic result creation."""
        result = ExplanationResult(
            explanation="This error occurs because...",
            model_used="mistral",
            confidence="HIGH",
            has_kb_context=True,
            similar_issues_count=3,
            has_validated_solution=True,
            citations=["Issue #1 (85% match, validated)"],
            processing_time_ms=1234.5,
        )
        assert result.confidence == "HIGH"
        assert result.has_kb_context is True
        assert len(result.citations) == 1

    def test_result_without_kb(self):
        """Test result without KB context."""
        result = ExplanationResult(
            explanation="General analysis...",
            model_used="llama3",
            confidence="LOW",
            has_kb_context=False,
            similar_issues_count=0,
            has_validated_solution=False,
            citations=[],
            disclaimer="No similar issues found.",
            processing_time_ms=500.0,
        )
        assert result.has_kb_context is False
        assert result.similar_issues_count == 0
        assert result.disclaimer is not None

    def test_result_with_tokens(self):
        """Test result with token usage."""
        result = ExplanationResult(
            explanation="Explanation",
            model_used="gpt-4",
            confidence="MEDIUM",
            has_kb_context=True,
            similar_issues_count=1,
            has_validated_solution=False,
            citations=[],
            processing_time_ms=2000.0,
            tokens_used={"prompt": 500, "completion": 200, "total": 700},
        )
        assert result.tokens_used is not None
        assert result.tokens_used["total"] == 700


class TestExplanationService:
    """Tests for ExplanationService."""

    @pytest.fixture
    def service(self):
        """Create service instance."""
        return ExplanationService()

    @pytest.fixture
    def mock_settings(self):
        """Create mock settings."""
        settings = MagicMock()
        settings.ENABLE_KNOWLEDGE_BASE = True
        settings.MAX_SIMILAR_ISSUES = 5
        return settings

    @pytest.fixture
    def sample_error_data(self):
        """Create sample error data."""
        return {
            "type": "ValueError",
            "value": "invalid literal for int() with base 10: 'abc'",
            "platform": "python",
        }

    @pytest.fixture
    def mock_retrieval_result(self):
        """Create mock retrieval result."""
        return RetrievalResult(
            query_error_type="ValueError",
            query_error_message="invalid literal",
            similar_issues=[
                SimilarIssue(
                    id=1,
                    sentry_issue_id="ISSUE-123",
                    error_type="ValueError",
                    error_message="similar error",
                    similarity_score=0.85,
                    human_solution="Validate input before conversion",
                    is_validated=True,
                ),
                SimilarIssue(
                    id=2,
                    sentry_issue_id="ISSUE-456",
                    error_type="ValueError",
                    error_message="another similar",
                    similarity_score=0.72,
                    ai_explanation="Check the input type",
                    is_validated=False,
                ),
            ],
            has_validated_solution=True,
            confidence="HIGH",
        )

    def test_is_kb_enabled_true(self, service, mock_settings):
        """Test KB enabled check returns True."""
        with patch.object(service, "settings", mock_settings):
            assert service._is_kb_enabled() is True

    def test_is_kb_enabled_false(self, service):
        """Test KB enabled check returns False when disabled."""
        settings = MagicMock()
        settings.ENABLE_KNOWLEDGE_BASE = False
        with patch.object(service, "settings", settings):
            assert service._is_kb_enabled() is False

    def test_extract_citations_with_validated(self, service, mock_retrieval_result):
        """Test citation extraction with validated issues."""
        citations = service._extract_citations(mock_retrieval_result)

        assert len(citations) >= 1
        assert "validated" in citations[0].lower()
        assert "85%" in citations[0]

    def test_extract_citations_empty(self, service):
        """Test citation extraction with no issues."""
        empty_result = RetrievalResult(
            query_error_type="Error",
            query_error_message="msg",
            similar_issues=[],
        )
        citations = service._extract_citations(empty_result)
        assert citations == []

    def test_extract_citations_none(self, service):
        """Test citation extraction with None."""
        citations = service._extract_citations(None)
        assert citations == []

    def test_get_fallback_explanation_high(self, service):
        """Test fallback explanation for HIGH confidence."""
        prompt = RAGPrompt(
            system_prompt="",
            user_prompt="",
            context_summary="",
            citation_requirement=CITATION_REQUIREMENTS["HIGH"],
            similar_issues_count=2,
            has_validated_solution=True,
            confidence_level="HIGH",
        )

        explanation = service._get_fallback_explanation(prompt)

        assert "knowledge base" in explanation.lower()
        assert "similar" in explanation.lower()

    def test_get_fallback_explanation_medium(self, service):
        """Test fallback explanation for MEDIUM confidence."""
        prompt = RAGPrompt(
            system_prompt="",
            user_prompt="",
            context_summary="",
            citation_requirement=CITATION_REQUIREMENTS["MEDIUM"],
            similar_issues_count=1,
            has_validated_solution=False,
            confidence_level="MEDIUM",
        )

        explanation = service._get_fallback_explanation(prompt)

        assert "similar" in explanation.lower()

    def test_get_fallback_explanation_low(self, service):
        """Test fallback explanation for LOW confidence."""
        prompt = RAGPrompt(
            system_prompt="",
            user_prompt="",
            context_summary="",
            citation_requirement=CITATION_REQUIREMENTS["LOW"],
            similar_issues_count=0,
            has_validated_solution=False,
            confidence_level="LOW",
        )

        explanation = service._get_fallback_explanation(prompt)

        assert "new" in explanation.lower() or "unique" in explanation.lower()

    def test_post_process_adds_disclaimer(self, service):
        """Test post-processing adds disclaimer when required."""
        prompt = RAGPrompt(
            system_prompt="",
            user_prompt="",
            context_summary="",
            citation_requirement=CITATION_REQUIREMENTS["LOW"],
            similar_issues_count=0,
            has_validated_solution=False,
            confidence_level="LOW",
        )

        original = "This is the explanation."
        processed = service._post_process_explanation(original, prompt, None)

        # Should add disclaimer
        assert "---" in processed
        assert prompt.citation_requirement.disclaimer_text in processed

    def test_post_process_no_duplicate_disclaimer(self, service):
        """Test post-processing doesn't duplicate disclaimer."""
        prompt = RAGPrompt(
            system_prompt="",
            user_prompt="",
            context_summary="",
            citation_requirement=CITATION_REQUIREMENTS["LOW"],
            similar_issues_count=0,
            has_validated_solution=False,
            confidence_level="LOW",
        )
        disclaimer = prompt.citation_requirement.disclaimer_text

        # Original already has disclaimer
        original = f"Explanation.\n\n{disclaimer}"
        processed = service._post_process_explanation(original, prompt, None)

        # Should not add it again
        assert processed.count(disclaimer) == 1

    def test_post_process_no_disclaimer_high_confidence(self, service):
        """Test post-processing doesn't add disclaimer for HIGH confidence."""
        prompt = RAGPrompt(
            system_prompt="",
            user_prompt="",
            context_summary="",
            citation_requirement=CITATION_REQUIREMENTS["HIGH"],
            similar_issues_count=3,
            has_validated_solution=True,
            confidence_level="HIGH",
        )

        original = "High confidence explanation."
        processed = service._post_process_explanation(original, prompt, None)

        # Should not add any disclaimer
        assert "---" not in processed

    def test_build_event_data_for_llm(self, service):
        """Test building event data structure for LLM."""
        prompt = RAGPrompt(
            system_prompt="You are an expert",
            user_prompt="Explain this error",
            context_summary="2 similar issues",
            citation_requirement=CITATION_REQUIREMENTS["MEDIUM"],
            similar_issues_count=2,
            has_validated_solution=True,
            confidence_level="MEDIUM",
        )

        event_data = service._build_event_data_for_llm(prompt)

        assert "_rag_system_prompt" in event_data
        assert "_rag_user_prompt" in event_data
        assert event_data["_rag_system_prompt"] == "You are an expert"
        assert event_data["_rag_user_prompt"] == "Explain this error"


class TestExplanationServiceIntegration:
    """Integration-style tests for ExplanationService."""

    @pytest.fixture
    def service(self):
        """Create service with mocked dependencies."""
        return ExplanationService()

    @pytest.mark.asyncio
    async def test_explain_error_with_mocked_kb(self, service):
        """Test explain_error with mocked knowledge base."""
        mock_retrieval = MagicMock()
        mock_retrieval.find_similar = AsyncMock(
            return_value=RetrievalResult(
                query_error_type="TypeError",
                query_error_message="cannot read property",
                similar_issues=[
                    SimilarIssue(
                        id=1,
                        sentry_issue_id="ISSUE-1",
                        error_type="TypeError",
                        error_message="similar",
                        similarity_score=0.8,
                        is_validated=True,
                        human_solution="Check for null",
                    )
                ],
                has_validated_solution=True,
                confidence="MEDIUM",
            )
        )

        mock_settings = MagicMock()
        mock_settings.ENABLE_KNOWLEDGE_BASE = True
        mock_settings.MAX_SIMILAR_ISSUES = 5

        # Mock the LLM call
        async def mock_generate(*args, **kwargs):
            return ("This error occurs when accessing a property of undefined.", "mistral", None)

        with patch.object(service, "_retrieval", mock_retrieval):
            with patch.object(service, "_settings", mock_settings):
                with patch.object(service, "_generate_explanation", mock_generate):
                    result = await service.explain_error(
                        error_data={
                            "type": "TypeError",
                            "value": "cannot read property 'map' of undefined",
                            "platform": "javascript",
                        }
                    )

        assert result.confidence == "MEDIUM"
        assert result.has_kb_context is True
        assert result.similar_issues_count == 1

    @pytest.mark.asyncio
    async def test_explain_simple(self, service):
        """Test explain_simple convenience method."""
        async def mock_explain(*args, **kwargs):
            return ExplanationResult(
                explanation="Test explanation",
                model_used="test",
                confidence="LOW",
                has_kb_context=False,
                similar_issues_count=0,
                has_validated_solution=False,
                citations=[],
                processing_time_ms=100.0,
            )

        with patch.object(service, "explain_error", mock_explain):
            result = await service.explain_simple(
                error_type="KeyError",
                error_message="'missing'",
                platform="python",
            )

        assert result.explanation == "Test explanation"

    @pytest.mark.asyncio
    async def test_explain_error_kb_disabled(self, service):
        """Test explain_error when KB is disabled."""
        mock_settings = MagicMock()
        mock_settings.ENABLE_KNOWLEDGE_BASE = False

        async def mock_generate(*args, **kwargs):
            return ("General explanation", "llama3", None)

        with patch.object(service, "_settings", mock_settings):
            with patch.object(service, "_generate_explanation", mock_generate):
                result = await service.explain_error(
                    error_data={"type": "Error", "value": "test"},
                    use_knowledge_base=True,  # Should be ignored
                )

        # Should still work but without KB context
        assert result.has_kb_context is False
        assert result.similar_issues_count == 0

    @pytest.mark.asyncio
    async def test_explain_error_kb_failure(self, service):
        """Test explain_error handles KB retrieval failure gracefully."""
        mock_retrieval = MagicMock()
        mock_retrieval.find_similar = AsyncMock(
            side_effect=Exception("Database connection failed")
        )

        mock_settings = MagicMock()
        mock_settings.ENABLE_KNOWLEDGE_BASE = True
        mock_settings.MAX_SIMILAR_ISSUES = 5

        async def mock_generate(*args, **kwargs):
            return ("Explanation without KB", "mistral", None)

        with patch.object(service, "_retrieval", mock_retrieval):
            with patch.object(service, "_settings", mock_settings):
                with patch.object(service, "_generate_explanation", mock_generate):
                    # Should not raise, just proceed without KB
                    result = await service.explain_error(
                        error_data={"type": "Error", "value": "test"}
                    )

        assert result.has_kb_context is False
        assert result.confidence == "LOW"
