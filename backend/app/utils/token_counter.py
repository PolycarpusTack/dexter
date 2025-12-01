"""
Token Counter Utility for Prompt Engineering.

EPIC P - Story P-2: Token budget enforcement for RAG prompts.

Provides fast token estimation for:
- Prompt budget management
- Content truncation decisions
- Cost estimation

Uses simple heuristic (chars / 4) for speed. For exact counts,
consider using tiktoken library.
"""

import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


class TokenCounter:
    """
    Fast token counter for prompt engineering.

    Uses character-based heuristic for speed:
    - 1 token ≈ 4 characters (for English text)
    - Accurate to within ±10% for most content
    """

    CHARS_PER_TOKEN = 4.0  # Average for GPT-style tokenizers

    @classmethod
    def estimate_tokens(cls, text: str) -> int:
        """
        Estimate token count for text.

        Args:
            text: Input text

        Returns:
            Estimated token count
        """
        if not text:
            return 0

        # Simple heuristic: chars / 4
        char_count = len(text)
        estimated = int(char_count / cls.CHARS_PER_TOKEN)

        return max(1, estimated)  # Minimum 1 token

    @classmethod
    def estimate_tokens_batch(cls, texts: List[str]) -> int:
        """
        Estimate total tokens for multiple texts.

        Args:
            texts: List of text strings

        Returns:
            Total estimated token count
        """
        return sum(cls.estimate_tokens(text) for text in texts)

    @classmethod
    def truncate_to_budget(
        cls,
        text: str,
        token_budget: int,
        preserve_end: bool = False
    ) -> str:
        """
        Truncate text to fit within token budget.

        Args:
            text: Input text
            token_budget: Maximum tokens allowed
            preserve_end: If True, keep end of text instead of start

        Returns:
            Truncated text
        """
        current_tokens = cls.estimate_tokens(text)

        if current_tokens <= token_budget:
            return text  # Fits within budget

        # Calculate character limit
        target_chars = int(token_budget * cls.CHARS_PER_TOKEN)

        if preserve_end:
            # Keep the end
            truncated = "..." + text[-target_chars:]
        else:
            # Keep the start
            truncated = text[:target_chars] + "..."

        logger.debug(
            f"Truncated text from {current_tokens} to ~{token_budget} tokens",
            extra={
                "original_tokens": current_tokens,
                "budget": token_budget,
                "preserve_end": preserve_end
            }
        )

        return truncated

    @classmethod
    def summarize_to_budget(
        cls,
        text: str,
        token_budget: int,
        summary_ratio: float = 0.3
    ) -> str:
        """
        Summarize text to fit within token budget.

        Args:
            text: Input text
            token_budget: Maximum tokens allowed
            summary_ratio: Ratio of text to keep (0.0-1.0)

        Returns:
            Summarized text (first N%, middle ellipsis, last N%)
        """
        current_tokens = cls.estimate_tokens(text)

        if current_tokens <= token_budget:
            return text

        # Calculate how much to keep from start and end
        target_chars = int(token_budget * cls.CHARS_PER_TOKEN)
        keep_chars = int(target_chars * summary_ratio)

        if keep_chars * 2 >= len(text):
            # Can't summarize effectively, just truncate
            return cls.truncate_to_budget(text, token_budget)

        # Take first and last portions
        start_portion = text[:keep_chars]
        end_portion = text[-keep_chars:]

        summarized = f"{start_portion}\n\n... [content truncated] ...\n\n{end_portion}"

        logger.debug(
            f"Summarized text from {current_tokens} to ~{token_budget} tokens",
            extra={
                "original_tokens": current_tokens,
                "budget": token_budget,
                "keep_ratio": summary_ratio
            }
        )

        return summarized

    @classmethod
    def fits_budget(cls, text: str, budget: int) -> bool:
        """
        Check if text fits within token budget.

        Args:
            text: Input text
            budget: Token budget

        Returns:
            True if text fits, False otherwise
        """
        return cls.estimate_tokens(text) <= budget


class PromptBudgetManager:
    """
    Manages token budgets for multi-part prompts.

    Helps allocate tokens across different prompt sections:
    - System prompt
    - User query
    - Context sections (similar issues, enrichment data, etc.)
    - Output space
    """

    def __init__(
        self,
        total_budget: int = 8000,
        output_reserve: int = 2000
    ):
        """
        Initialize budget manager.

        Args:
            total_budget: Total token budget for entire prompt
            output_reserve: Tokens reserved for model output
        """
        self.total_budget = total_budget
        self.output_reserve = output_reserve
        self.available_budget = total_budget - output_reserve
        self.allocations: dict[str, int] = {}

    def allocate(self, section: str, tokens: int) -> bool:
        """
        Allocate tokens to a section.

        Args:
            section: Section name
            tokens: Tokens to allocate

        Returns:
            True if allocation succeeded, False if over budget
        """
        used = sum(self.allocations.values())
        remaining = self.available_budget - used

        if tokens > remaining:
            logger.warning(
                f"Cannot allocate {tokens} tokens to '{section}' (only {remaining} remaining)",
                extra={
                    "section": section,
                    "requested": tokens,
                    "remaining": remaining
                }
            )
            return False

        self.allocations[section] = tokens
        return True

    def get_allocation(self, section: str) -> int:
        """Get current allocation for a section."""
        return self.allocations.get(section, 0)

    def get_remaining(self) -> int:
        """Get remaining unallocated budget."""
        used = sum(self.allocations.values())
        return self.available_budget - used

    def get_usage_summary(self) -> dict:
        """Get budget usage summary."""
        used = sum(self.allocations.values())
        return {
            "total_budget": self.total_budget,
            "output_reserve": self.output_reserve,
            "available_budget": self.available_budget,
            "used": used,
            "remaining": self.available_budget - used,
            "utilization": used / self.available_budget if self.available_budget > 0 else 0,
            "allocations": dict(self.allocations)
        }

    def reset(self) -> None:
        """Reset all allocations."""
        self.allocations = {}


# Convenience functions
def count_tokens(text: str) -> int:
    """Estimate token count for text."""
    return TokenCounter.estimate_tokens(text)


def truncate_text(text: str, max_tokens: int) -> str:
    """Truncate text to max tokens."""
    return TokenCounter.truncate_to_budget(text, max_tokens)


def summarize_text(text: str, max_tokens: int) -> str:
    """Summarize text to max tokens."""
    return TokenCounter.summarize_to_budget(text, max_tokens)
