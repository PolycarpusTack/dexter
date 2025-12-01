"""
Unit tests for token counter utility.

EPIC P - Story P-2: Test token estimation and budget management.
"""

import pytest

from app.utils.token_counter import (
    TokenCounter,
    PromptBudgetManager,
    count_tokens,
    truncate_text,
    summarize_text,
)


class TestTokenEstimation:
    """Test token counting heuristics."""

    def test_estimate_tokens_simple(self):
        """Test basic token estimation."""
        text = "Hello, world!"
        tokens = TokenCounter.estimate_tokens(text)

        # "Hello, world!" is ~13 chars / 4 = ~3 tokens
        assert 2 <= tokens <= 4

    def test_estimate_tokens_empty(self):
        """Test empty string returns 0 tokens."""
        assert TokenCounter.estimate_tokens("") == 0
        assert TokenCounter.estimate_tokens(None) == 0

    def test_estimate_tokens_long_text(self):
        """Test estimation for longer text."""
        text = "This is a longer piece of text " * 100
        tokens = TokenCounter.estimate_tokens(text)

        # Should be roughly text_length / 4
        expected = len(text) / 4
        assert abs(tokens - expected) < 10

    def test_estimate_tokens_batch(self):
        """Test batch token estimation."""
        texts = [
            "First text",
            "Second text",
            "Third text",
        ]
        total = TokenCounter.estimate_tokens_batch(texts)

        individual_sum = sum(TokenCounter.estimate_tokens(t) for t in texts)
        assert total == individual_sum


class TestTextTruncation:
    """Test text truncation to fit token budgets."""

    def test_truncate_to_budget_no_truncation_needed(self):
        """Test text that fits budget is not truncated."""
        text = "Short text"
        budget = 100

        result = TokenCounter.truncate_to_budget(text, budget)
        assert result == text  # No truncation needed

    def test_truncate_to_budget_start_preserved(self):
        """Test truncation preserves start of text."""
        text = "A" * 1000
        budget = 50

        result = TokenCounter.truncate_to_budget(text, budget, preserve_end=False)

        assert result.endswith("...")
        assert len(result) < len(text)
        assert result.startswith("A")

    def test_truncate_to_budget_end_preserved(self):
        """Test truncation preserves end of text."""
        text = "A" * 1000
        budget = 50

        result = TokenCounter.truncate_to_budget(text, budget, preserve_end=True)

        assert result.startswith("...")
        assert len(result) < len(text)
        assert result.endswith("A")

    def test_summarize_to_budget(self):
        """Test text summarization (start + end)."""
        text = "START " + "MIDDLE " * 100 + "END"
        budget = 20

        result = TokenCounter.summarize_to_budget(text, budget, summary_ratio=0.3)

        assert "START" in result
        assert "END" in result
        assert "[content truncated]" in result
        assert len(result) < len(text)

    def test_summarize_very_short_text(self):
        """Test summarization falls back to truncation for short text."""
        text = "Short"
        budget = 1

        result = TokenCounter.summarize_to_budget(text, budget)

        # Should truncate instead of summarize
        assert len(result) <= len(text) + 3  # +3 for "..."


class TestBudgetManagement:
    """Test PromptBudgetManager."""

    def test_budget_initialization(self):
        """Test budget manager initializes correctly."""
        manager = PromptBudgetManager(total_budget=1000, output_reserve=200)

        assert manager.total_budget == 1000
        assert manager.output_reserve == 200
        assert manager.available_budget == 800
        assert manager.get_remaining() == 800

    def test_allocate_within_budget(self):
        """Test successful allocation within budget."""
        manager = PromptBudgetManager(total_budget=1000, output_reserve=200)

        success = manager.allocate("section1", 300)
        assert success is True
        assert manager.get_allocation("section1") == 300
        assert manager.get_remaining() == 500

    def test_allocate_exceeds_budget(self):
        """Test allocation fails when exceeding budget."""
        manager = PromptBudgetManager(total_budget=1000, output_reserve=200)

        manager.allocate("section1", 500)

        # Try to allocate more than remaining
        success = manager.allocate("section2", 400)
        assert success is False
        assert manager.get_allocation("section2") == 0  # Not allocated

    def test_multiple_allocations(self):
        """Test multiple allocations."""
        manager = PromptBudgetManager(total_budget=1000, output_reserve=200)

        manager.allocate("section1", 200)
        manager.allocate("section2", 300)
        manager.allocate("section3", 100)

        assert manager.get_remaining() == 200
        assert manager.get_allocation("section1") == 200
        assert manager.get_allocation("section2") == 300
        assert manager.get_allocation("section3") == 100

    def test_usage_summary(self):
        """Test usage summary generation."""
        manager = PromptBudgetManager(total_budget=1000, output_reserve=200)

        manager.allocate("section1", 400)
        manager.allocate("section2", 200)

        summary = manager.get_usage_summary()

        assert summary["total_budget"] == 1000
        assert summary["output_reserve"] == 200
        assert summary["available_budget"] == 800
        assert summary["used"] == 600
        assert summary["remaining"] == 200
        assert summary["utilization"] == 0.75  # 600/800
        assert summary["allocations"]["section1"] == 400
        assert summary["allocations"]["section2"] == 200

    def test_reset_allocations(self):
        """Test resetting allocations."""
        manager = PromptBudgetManager(total_budget=1000, output_reserve=200)

        manager.allocate("section1", 400)
        manager.allocate("section2", 200)

        manager.reset()

        assert manager.get_remaining() == 800
        assert manager.get_allocation("section1") == 0
        assert len(manager.allocations) == 0


class TestConvenienceFunctions:
    """Test convenience wrapper functions."""

    def test_count_tokens(self):
        """Test count_tokens convenience function."""
        text = "Test text"
        tokens = count_tokens(text)
        assert tokens > 0

    def test_truncate_text(self):
        """Test truncate_text convenience function."""
        text = "A" * 1000
        result = truncate_text(text, max_tokens=10)
        assert len(result) < len(text)

    def test_summarize_text(self):
        """Test summarize_text convenience function."""
        text = "START " + "MIDDLE " * 100 + "END"
        result = summarize_text(text, max_tokens=20)
        assert "[content truncated]" in result


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_truncate_budget_zero(self):
        """Test truncation with zero budget."""
        text = "Test"
        result = TokenCounter.truncate_to_budget(text, 0)
        assert result == "..."

    def test_fits_budget_exact_match(self):
        """Test fits_budget with exact token count."""
        text = "AAAA"  # ~1 token
        assert TokenCounter.fits_budget(text, 1)

    def test_fits_budget_over(self):
        """Test fits_budget when over budget."""
        text = "A" * 1000  # ~250 tokens
        assert not TokenCounter.fits_budget(text, 100)

    def test_allocation_to_zero_budget(self):
        """Test allocation with zero available budget."""
        manager = PromptBudgetManager(total_budget=100, output_reserve=100)
        success = manager.allocate("section1", 10)
        assert success is False
