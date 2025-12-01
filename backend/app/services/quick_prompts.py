"""
Quick Prompt Templates for AI Analysis.

Provides pre-configured prompt templates for different analysis focuses,
allowing users to quickly re-analyze issues with specific perspectives.
"""

import logging
from typing import Dict, List

from app.models.analysis import QuickPromptType

logger = logging.getLogger(__name__)


# Quick prompt template definitions
QUICK_PROMPT_TEMPLATES: Dict[str, QuickPromptType] = {
    "root_cause": QuickPromptType(
        prompt_type="root_cause",
        label="Root Cause",
        icon="search",
        system_prompt="""Focus on identifying the root cause of this error.

Analyze the stack trace, suspect commits, and recent releases to pinpoint the exact
code change or condition that triggered this issue. Your analysis should:

1. Identify the specific code path that led to the error
2. Highlight any recent changes that correlate with the issue
3. Explain the underlying technical reason for the failure
4. Distinguish between symptoms and root causes

Be precise and technical. Cite specific line numbers, functions, and commits.""",
        enrichment_priority=[
            "release_context",
            "suspect_commits",
            "performance_spans",
            "grouping_info",
            "breadcrumb_timeline",
        ],
    ),
    "performance_impact": QuickPromptType(
        prompt_type="performance_impact",
        label="Performance Impact",
        icon="gauge",
        system_prompt="""Analyze the performance impact of this issue.

Focus on slow operations, profiling data, and measurements. Your analysis should:

1. Quantify the performance degradation (latency, throughput, resource usage)
2. Identify performance hotspots and bottlenecks
3. Compare against baseline performance metrics if available
4. Assess the impact on user experience
5. Recommend specific optimizations

Include concrete numbers and measurements. Prioritize actionable insights.""",
        enrichment_priority=[
            "performance_spans",
            "profiling_hotspots",
            "measurements",
            "breadcrumb_timeline",
            "session_context",
        ],
    ),
    "customer_explanation": QuickPromptType(
        prompt_type="customer_explanation",
        label="For Customer",
        icon="user",
        system_prompt="""Explain this issue in non-technical language suitable for a customer-facing status page.

Your explanation should:

1. Describe WHAT users experienced (not HOW it happened technically)
2. Explain the business impact and affected functionality
3. Use simple, empathetic language
4. Avoid technical jargon, stack traces, and implementation details
5. Focus on user-visible symptoms and resolution steps

Write as if explaining to a non-technical stakeholder or end user.""",
        enrichment_priority=[
            "session_context",
            "replay_metadata",
            "measurements",
            "breadcrumb_timeline",
            "environment_info",
        ],
    ),
    "steps_to_reproduce": QuickPromptType(
        prompt_type="steps_to_reproduce",
        label="Reproduce Steps",
        icon="list-numbers",
        system_prompt="""Reconstruct the steps to reproduce this issue.

Based on breadcrumbs, session data, and similar issues, create a clear, numbered
list of reproduction steps. Your analysis should:

1. Provide a step-by-step reproduction guide
2. Include relevant input data, conditions, or configuration
3. Specify the environment or browser requirements
4. Note any preconditions or setup needed
5. Describe the expected vs actual behavior

Format as a QA engineer's bug report. Be specific and actionable.""",
        enrichment_priority=[
            "breadcrumb_timeline",
            "session_context",
            "replay_metadata",
            "environment_info",
            "request_context",
        ],
    ),
    "similar_patterns": QuickPromptType(
        prompt_type="similar_patterns",
        label="Similar Patterns",
        icon="arrows-join",
        system_prompt="""Identify patterns across similar issues.

Look for common threads in environments, tags, ownership, and grouping insights.
Your analysis should:

1. Identify commonalities across similar issues (browsers, OS, regions, etc)
2. Detect patterns in when/where the issue occurs
3. Analyze tag distributions for insights
4. Highlight ownership and team patterns
5. Suggest whether issues should be grouped differently

Focus on meta-patterns that help understand the broader issue landscape.""",
        enrichment_priority=[
            "tag_distributions",
            "grouping_info",
            "ownership_info",
            "environment_info",
            "release_context",
        ],
    ),
}


class QuickPromptService:
    """Service for managing quick prompt templates."""

    def __init__(self):
        """Initialize quick prompt service."""
        self.templates = QUICK_PROMPT_TEMPLATES

    def get_all_prompts(self) -> List[QuickPromptType]:
        """
        Get all available quick prompt templates.

        Returns:
            List of QuickPromptType templates
        """
        return list(self.templates.values())

    def get_prompt(self, prompt_type: str) -> QuickPromptType:
        """
        Get a specific quick prompt template.

        Args:
            prompt_type: The prompt type identifier

        Returns:
            QuickPromptType template

        Raises:
            ValueError: If prompt_type not found
        """
        template = self.templates.get(prompt_type)
        if not template:
            raise ValueError(
                f"Unknown prompt type: {prompt_type}. "
                f"Available: {list(self.templates.keys())}"
            )
        return template

    def get_system_prompt(self, prompt_type: str) -> str:
        """
        Get the system prompt text for a specific type.

        Args:
            prompt_type: The prompt type identifier

        Returns:
            System prompt string

        Raises:
            ValueError: If prompt_type not found
        """
        template = self.get_prompt(prompt_type)
        return template.system_prompt

    def get_enrichment_priority(self, prompt_type: str) -> List[str]:
        """
        Get the enrichment priority list for a specific type.

        Args:
            prompt_type: The prompt type identifier

        Returns:
            List of enrichment source names in priority order

        Raises:
            ValueError: If prompt_type not found
        """
        template = self.get_prompt(prompt_type)
        return template.enrichment_priority

    def validate_prompt_type(self, prompt_type: str) -> bool:
        """
        Check if a prompt type is valid.

        Args:
            prompt_type: The prompt type to validate

        Returns:
            True if valid, False otherwise
        """
        return prompt_type in self.templates

    def get_prompt_types(self) -> List[str]:
        """
        Get list of all available prompt type identifiers.

        Returns:
            List of prompt type strings
        """
        return list(self.templates.keys())


# Singleton instance
_quick_prompt_service = None


def get_quick_prompt_service() -> QuickPromptService:
    """
    Get singleton quick prompt service instance.

    Returns:
        QuickPromptService instance
    """
    global _quick_prompt_service
    if _quick_prompt_service is None:
        _quick_prompt_service = QuickPromptService()
    return _quick_prompt_service
