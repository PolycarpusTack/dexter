"""
RAG-Enhanced Prompt Builder for Dexter.

Builds prompts with context from the knowledge base for better LLM explanations.
Implements confidence-based citation requirements.

EPIC P - Story P-2: Enhanced prompt building with enrichment context injection.

Features:
- Token budget enforcement (max 6000 tokens per prompt)
- Source prioritization by error type
- Enrichment data formatting (release, performance, profiling, etc.)
- Context summarization when exceeding token limits
"""

import logging
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.db.models import SentryIssue
from app.services.retrieval_service import ContextForLLM, RetrievalResult, SimilarIssue
from app.utils.token_counter import TokenCounter, PromptBudgetManager, count_tokens

logger = logging.getLogger(__name__)


class CitationRequirement(BaseModel):
    """Citation requirements based on confidence level."""

    level: str  # HIGH, MEDIUM, LOW
    must_cite: bool
    cite_count: int
    disclaimer_required: bool
    disclaimer_text: Optional[str] = None


class RAGPrompt(BaseModel):
    """A RAG-enhanced prompt ready for LLM."""

    system_prompt: str
    user_prompt: str
    context_summary: str
    citation_requirement: CitationRequirement
    similar_issues_count: int
    has_validated_solution: bool
    confidence_level: str


# Citation requirements by confidence level
CITATION_REQUIREMENTS = {
    "HIGH": CitationRequirement(
        level="HIGH",
        must_cite=True,
        cite_count=1,
        disclaimer_required=False,
    ),
    "MEDIUM": CitationRequirement(
        level="MEDIUM",
        must_cite=True,
        cite_count=1,
        disclaimer_required=True,
        disclaimer_text="Note: This solution is based on similar past issues but may need adaptation.",
    ),
    "LOW": CitationRequirement(
        level="LOW",
        must_cite=False,
        cite_count=0,
        disclaimer_required=True,
        disclaimer_text="Note: No highly similar past issues found. This is a general analysis.",
    ),
}


class RAGPromptBuilder:
    """
    Builds RAG-enhanced prompts for LLM explanations.

    Uses similar issues from the knowledge base to:
    - Provide context for better explanations
    - Include validated solutions when available
    - Add appropriate citations and disclaimers

    EPIC P - Story P-2: Enhanced with enrichment context injection.
    """

    # Token budgets
    TOKEN_BUDGET = 6000  # Total available for prompt (reserve 2000 for response)
    MAX_PER_SOURCE = 2000  # Max tokens per enrichment source

    def __init__(self):
        self.citation_requirements = CITATION_REQUIREMENTS

    def build_prompt(
        self,
        error_data: Dict[str, Any],
        retrieval_result: Optional[RetrievalResult] = None,
        context: Optional[ContextForLLM] = None,
    ) -> RAGPrompt:
        """
        Build a RAG-enhanced prompt from error data and retrieval results.

        Args:
            error_data: The current error to explain
            retrieval_result: Results from similarity search
            context: Pre-built LLM context (alternative to retrieval_result)

        Returns:
            RAGPrompt ready for LLM
        """
        # Determine confidence and citation requirements
        confidence = "LOW"
        has_validated = False
        similar_count = 0

        if retrieval_result:
            confidence = retrieval_result.confidence
            has_validated = retrieval_result.has_validated_solution
            similar_count = len(retrieval_result.similar_issues)
        elif context:
            confidence = context.confidence_level
            has_validated = bool(context.validated_solutions)
            similar_count = len(context.similar_issues)

        citation_req = self.citation_requirements.get(
            confidence,
            self.citation_requirements["LOW"],
        )

        # Build system prompt
        system_prompt = self._build_system_prompt(confidence, has_validated)

        # Build user prompt with context
        user_prompt, context_summary = self._build_user_prompt(
            error_data=error_data,
            retrieval_result=retrieval_result,
            context=context,
            citation_req=citation_req,
        )

        return RAGPrompt(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            context_summary=context_summary,
            citation_requirement=citation_req,
            similar_issues_count=similar_count,
            has_validated_solution=has_validated,
            confidence_level=confidence,
        )

    def _build_system_prompt(
        self,
        confidence: str,
        has_validated: bool,
    ) -> str:
        """Build the system prompt based on confidence level."""
        base_prompt = """You are an expert software engineer helping debug errors.
Your task is to explain errors clearly and provide actionable solutions.

Guidelines:
1. Be concise but thorough
2. Explain the root cause first
3. Provide specific, actionable fixes
4. Include code examples when helpful
5. Mention any edge cases or gotchas"""

        if has_validated:
            base_prompt += """

IMPORTANT: You have been provided with validated solutions from past similar issues.
These solutions have been verified by humans. Prioritize these solutions and cite them."""

        if confidence == "HIGH":
            base_prompt += """

The knowledge base has HIGH confidence matches for this error.
Use the provided context heavily and cite the similar issues."""
        elif confidence == "MEDIUM":
            base_prompt += """

The knowledge base has MEDIUM confidence matches.
Use the provided context as guidance but verify applicability."""
        else:
            base_prompt += """

No highly similar issues were found in the knowledge base.
Provide your best analysis based on the error details."""

        return base_prompt

    def _build_user_prompt(
        self,
        error_data: Dict[str, Any],
        retrieval_result: Optional[RetrievalResult],
        context: Optional[ContextForLLM],
        citation_req: CitationRequirement,
    ) -> tuple[str, str]:
        """Build the user prompt with error details and context."""
        parts = []
        context_summary = "No similar issues found"

        # Error details
        error_type = error_data.get("type", error_data.get("exception_type", "Error"))
        error_message = error_data.get(
            "value",
            error_data.get("exception_value", error_data.get("message", "")),
        )
        platform = error_data.get("platform", "unknown")

        parts.append("## Current Error\n")
        parts.append(f"**Type:** {error_type}")
        parts.append(f"**Message:** {error_message}")
        parts.append(f"**Platform:** {platform}")

        # Stack trace if available
        stack_frames = error_data.get("stack_frames", [])
        if stack_frames:
            parts.append("\n**Stack Trace (relevant frames):**")
            for frame in stack_frames[:5]:
                if isinstance(frame, dict):
                    filename = frame.get("filename", "unknown")
                    function = frame.get("function", "unknown")
                    line = frame.get("line", frame.get("lineno", "?"))
                    parts.append(f"  - {filename}:{line} in {function}")

        # Add knowledge base context
        if retrieval_result and retrieval_result.similar_issues:
            context_section, summary = self._format_similar_issues(
                retrieval_result.similar_issues,
                citation_req,
            )
            parts.append(context_section)
            context_summary = summary
        elif context and context.similar_issues:
            context_section, summary = self._format_context(context, citation_req)
            parts.append(context_section)
            context_summary = summary

        # Add citation instruction
        if citation_req.must_cite:
            parts.append(
                f"\n**Important:** Please cite the relevant similar issue(s) in your explanation."
            )

        # Add disclaimer if required
        if citation_req.disclaimer_required and citation_req.disclaimer_text:
            parts.append(f"\n_{citation_req.disclaimer_text}_")

        # Request format
        parts.append("\n## Please Provide\n")
        parts.append("1. **Root Cause:** What caused this error")
        parts.append("2. **Solution:** How to fix it")
        parts.append("3. **Prevention:** How to prevent it in the future")

        return "\n".join(parts), context_summary

    def _format_similar_issues(
        self,
        issues: List[SimilarIssue],
        citation_req: CitationRequirement,
    ) -> tuple[str, str]:
        """Format similar issues for the prompt."""
        parts = ["\n## Similar Past Issues\n"]
        summary_parts = []

        for i, issue in enumerate(issues[:3], 1):
            parts.append(f"### Issue #{i} (Similarity: {issue.similarity_score:.0%})")

            if issue.is_validated:
                parts.append("✓ **Validated Solution**")

            parts.append(f"**Error:** {issue.error_type}: {issue.error_message[:200]}")

            if issue.human_solution:
                parts.append(f"\n**Verified Solution:**\n{issue.human_solution[:500]}")
                summary_parts.append(f"Validated solution from issue #{i}")
            elif issue.ai_explanation:
                parts.append(f"\n**Previous Analysis:**\n{issue.ai_explanation[:500]}")
                summary_parts.append(f"AI analysis from issue #{i}")

            if issue.ai_suggested_fix:
                parts.append(f"\n**Suggested Fix:**\n{issue.ai_suggested_fix[:300]}")

            parts.append("")  # Empty line between issues

        summary = (
            f"{len(issues)} similar issues found. "
            + "; ".join(summary_parts[:2])
            if summary_parts
            else f"{len(issues)} similar issues found"
        )

        return "\n".join(parts), summary

    def _format_context(
        self,
        context: ContextForLLM,
        citation_req: CitationRequirement,
    ) -> tuple[str, str]:
        """Format pre-built context for the prompt."""
        parts = ["\n## Knowledge Base Context\n"]
        summary_parts = []

        # Validated solutions first
        if context.validated_solutions:
            parts.append("### Verified Solutions from Similar Issues\n")
            for i, solution in enumerate(context.validated_solutions, 1):
                parts.append(f"**Solution {i}:**")
                parts.append(solution[:500])
                parts.append("")
            summary_parts.append(f"{len(context.validated_solutions)} validated solutions")

        # Then suggested fixes
        if context.suggested_fixes:
            parts.append("### Suggested Approaches\n")
            for fix in context.suggested_fixes[:2]:
                parts.append(f"- {fix[:300]}")
            summary_parts.append(f"{len(context.suggested_fixes)} suggested fixes")

        # Summary of similar issues
        if context.similar_issues:
            parts.append(f"\n### {len(context.similar_issues)} Similar Issues Found\n")
            for issue in context.similar_issues:
                similarity = issue.get("similarity", 0)
                error_type = issue.get("error_type", "Unknown")
                validated = "✓" if issue.get("is_validated") else ""
                parts.append(f"- {error_type} ({similarity:.0%} match) {validated}")

        summary = "; ".join(summary_parts) if summary_parts else "Context from similar issues"

        return "\n".join(parts), summary

    def build_simple_prompt(
        self,
        error_type: str,
        error_message: str,
        platform: Optional[str] = None,
    ) -> RAGPrompt:
        """
        Build a simple prompt without knowledge base context.

        Used when knowledge base is disabled or unavailable.
        """
        error_data = {
            "type": error_type,
            "value": error_message,
            "platform": platform or "unknown",
        }

        return self.build_prompt(error_data, retrieval_result=None)

    async def build_enriched_prompt(
        self,
        issue: SentryIssue,
        similar_issues: List[SimilarIssue],
        user_query: Optional[str] = None,
    ) -> RAGPrompt:
        """
        Build enriched prompt with full context injection.

        EPIC P - Story P-2: Injects enrichment data into AI prompts.

        Args:
            issue: Current SentryIssue with enrichment data
            similar_issues: Similar issues from retrieval
            user_query: Optional user question

        Returns:
            RAGPrompt with enrichment context and token budget enforcement
        """
        budget = PromptBudgetManager(
            total_budget=self.TOKEN_BUDGET,
            output_reserve=2000
        )

        sections = []

        # 1. User query (if provided)
        if user_query:
            query_section = f"**User Question:** {user_query}\n"
            query_tokens = count_tokens(query_section)
            if budget.allocate("user_query", query_tokens):
                sections.append(query_section)

        # 2. Issue summary
        issue_summary = self._format_issue_summary_from_model(issue)
        summary_tokens = count_tokens(issue_summary)
        if budget.allocate("issue_summary", summary_tokens):
            sections.append(issue_summary)

        # 3. Enrichment context (prioritized by error type)
        enrichment_section = await self._build_enrichment_context(
            issue,
            max_tokens=budget.get_remaining() // 2  # Allocate half of remaining budget
        )
        if enrichment_section:
            enrichment_tokens = count_tokens(enrichment_section)
            if budget.allocate("enrichment", enrichment_tokens):
                sections.append(enrichment_section)

        # 4. Similar issues
        similar_section, summary = self._format_similar_issues(
            similar_issues[:3],
            self.citation_requirements["MEDIUM"]
        )
        similar_tokens = count_tokens(similar_section)
        # Truncate if exceeds remaining budget
        if similar_tokens > budget.get_remaining():
            similar_section = TokenCounter.truncate_to_budget(
                similar_section,
                budget.get_remaining()
            )
            similar_tokens = budget.get_remaining()

        if budget.allocate("similar_issues", similar_tokens):
            sections.append(similar_section)

        # 5. Instructions
        instructions = self._get_analysis_instructions()
        sections.append(instructions)

        user_prompt = "\n\n".join(sections)

        # Build system prompt based on enrichment availability
        has_enrichment = bool(enrichment_section)
        has_validated = any(issue.is_validated for issue in similar_issues)
        confidence = "MEDIUM" if has_enrichment else "LOW"

        system_prompt = self._build_system_prompt(confidence, has_validated)

        # Log budget usage
        usage = budget.get_usage_summary()
        logger.info(
            f"Built enriched prompt with {usage['utilization']:.1%} token utilization",
            extra=usage
        )

        return RAGPrompt(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            context_summary=summary if has_enrichment else "No enrichment data",
            citation_requirement=self.citation_requirements[confidence],
            similar_issues_count=len(similar_issues),
            has_validated_solution=has_validated,
            confidence_level=confidence,
        )

    async def _build_enrichment_context(
        self,
        issue: SentryIssue,
        max_tokens: int = 2000,
    ) -> str:
        """
        Build enrichment context with prioritization and token budget.

        EPIC P - Story P-2: Core enrichment injection logic.

        Args:
            issue: SentryIssue with enrichment data
            max_tokens: Maximum tokens for all enrichment sources

        Returns:
            Formatted enrichment context string
        """
        # Determine priority order based on error type
        priorities = self._determine_enrichment_priorities(issue.error_type)

        blocks = []
        token_count = 0

        for source in priorities:
            if token_count >= max_tokens:
                break

            block = self._format_enrichment_source(issue, source)
            if not block:
                continue

            block_tokens = count_tokens(block)

            # Summarize if too large
            if block_tokens > self.MAX_PER_SOURCE:
                block = TokenCounter.summarize_to_budget(block, self.MAX_PER_SOURCE)
                block_tokens = self.MAX_PER_SOURCE

            # Check if fits in remaining budget
            if token_count + block_tokens > max_tokens:
                # Truncate to fit
                remaining = max_tokens - token_count
                if remaining > 100:  # Only add if meaningful space left
                    block = TokenCounter.truncate_to_budget(block, remaining)
                    blocks.append(block)
                    token_count = max_tokens
                break

            blocks.append(block)
            token_count += block_tokens

        if blocks:
            return "**Enrichment Context:**\n\n" + "\n\n".join(blocks)

        return ""

    def _determine_enrichment_priorities(self, error_type: str) -> List[str]:
        """
        Prioritize enrichment sources by error type.

        EPIC P - Story P-2: Error-type-specific prioritization.

        Args:
            error_type: Error type string

        Returns:
            Ordered list of enrichment source names
        """
        error_lower = error_type.lower()

        # Performance/timeout errors
        if any(keyword in error_lower for keyword in ["timeout", "slow", "performance", "latency"]):
            return [
                "performance_data",
                "profiling_data",
                "measurements",
                "release_context",
                "ownership",
                "alert_context",
                "tag_distributions",
                "session_data",
                "breadcrumbs",
            ]

        # Database errors
        if any(keyword in error_lower for keyword in ["database", "sql", "query", "deadlock"]):
            return [
                "performance_data",
                "profiling_data",
                "breadcrumbs",
                "release_context",
                "ownership",
                "tag_distributions",
            ]

        # Memory errors
        if any(keyword in error_lower for keyword in ["memory", "heap", "oom", "allocation"]):
            return [
                "profiling_data",
                "measurements",
                "breadcrumbs",
                "release_context",
                "session_data",
            ]

        # Default priority
        return [
            "release_context",
            "ownership",
            "alert_context",
            "performance_data",
            "session_data",
            "breadcrumbs",
            "tag_distributions",
            "profiling_data",
            "measurements",
            "grouping_insights",
            "attachments_meta",
        ]

    def _format_enrichment_source(
        self,
        issue: SentryIssue,
        source: str
    ) -> Optional[str]:
        """
        Format a single enrichment source for the prompt.

        Args:
            issue: SentryIssue with enrichment data
            source: Enrichment source name

        Returns:
            Formatted string or None if no data
        """
        if source == "release_context" and issue.release_context:
            return self._format_release_context(issue.release_context)

        if source == "performance_data" and issue.performance_data:
            return self._format_performance_data(issue.performance_data)

        if source == "profiling_data" and issue.profiling_data:
            return self._format_profiling_data(issue.profiling_data)

        if source == "alert_context" and issue.alert_context:
            return self._format_alert_context(issue.alert_context)

        if source == "session_data" and issue.session_data:
            return self._format_session_data(issue.session_data)

        if source == "breadcrumbs" and issue.breadcrumbs:
            return self._format_breadcrumbs(issue.breadcrumbs)

        if source == "ownership" and issue.ownership:
            return self._format_ownership(issue.ownership)

        if source == "tag_distributions" and issue.tag_distributions:
            return self._format_tag_distributions(issue.tag_distributions)

        if source == "measurements" and issue.measurements:
            return self._format_measurements(issue.measurements)

        return None

    def _format_release_context(self, data: dict) -> str:
        """Format release context for prompt."""
        releases = data.get("releases", [])
        if not releases:
            return ""

        latest = releases[0]
        lines = ["**Release Context:**"]
        lines.append(f"- Version: {latest.get('version', 'N/A')}")
        lines.append(f"- Deployed: {latest.get('date_created', 'N/A')}")

        crash_free = latest.get("crash_free_rate")
        if crash_free is not None:
            lines.append(f"- Crash Free Rate: {crash_free:.1f}%")

        health = data.get("health_score")
        if health is not None:
            lines.append(f"- Health Score: {health:.2f}")

        # Suspect commits
        suspects = data.get("suspect_commits", [])
        if suspects:
            lines.append(f"\n**Suspect Commits ({len(suspects)}):**")
            for commit in suspects[:3]:
                author = commit.get("author", {}).get("name", "Unknown")
                message = commit.get("message", "")[:60]
                lines.append(f"- {author}: {message}")

        return "\n".join(lines)

    def _format_performance_data(self, data: dict) -> str:
        """Format performance data for prompt."""
        lines = ["**Performance Data:**"]

        # Problem spans
        problem_spans = data.get("problem_spans", [])
        if problem_spans:
            lines.append(f"\n**Problem Spans ({len(problem_spans)}):**")
            for span in problem_spans[:5]:
                op = span.get("op", "unknown")
                desc = span.get("description", "")[:60]
                duration = span.get("duration_ms", 0)
                severity = span.get("severity", "low")
                lines.append(f"- [{severity.upper()}] {op}: {desc} ({duration}ms)")

        # N+1 patterns
        n_plus_one = data.get("n_plus_one_patterns", [])
        if n_plus_one:
            lines.append(f"\n**N+1 Query Patterns ({len(n_plus_one)}):**")
            for pattern in n_plus_one[:3]:
                query = pattern.get("query_template", "")[:80]
                count = pattern.get("occurrence_count", 0)
                lines.append(f"- {count} occurrences: {query}")

        return "\n".join(lines) if len(lines) > 1 else ""

    def _format_profiling_data(self, data: dict) -> str:
        """Format profiling data for prompt."""
        hot_functions = data.get("hot_functions", [])
        if not hot_functions:
            return ""

        lines = [f"**Profiling Hotspots ({len(hot_functions)}):**"]
        for func in hot_functions[:5]:
            name = func.get("function_name", "unknown")
            file = func.get("file", "")
            time_pct = func.get("time_percentage", 0)
            severity = func.get("severity", "low")
            lines.append(f"- [{severity.upper()}] {name} in {file} ({time_pct:.1f}% time)")

        return "\n".join(lines)

    def _format_alert_context(self, data: dict) -> str:
        """Format alert context for prompt."""
        lines = ["**Alert Context:**"]

        recent_count = data.get("recent_alert_count", 0)
        if recent_count > 0:
            lines.append(f"- Recent Alerts: {recent_count} in last 24h")

        in_incident = data.get("in_active_incident", False)
        if in_incident:
            lines.append("- ⚠️ Currently in Active Incident")

        alert_history = data.get("alert_history", [])
        if alert_history:
            lines.append(f"\n**Recent Alerts ({len(alert_history)}):**")
            for alert in alert_history[:3]:
                rule = alert.get("rule_name", "Unknown rule")
                timestamp = alert.get("timestamp", "")[:19]
                lines.append(f"- {timestamp}: {rule}")

        return "\n".join(lines) if len(lines) > 1 else ""

    def _format_session_data(self, data: dict) -> str:
        """Format session data for prompt."""
        lines = ["**Session Impact:**"]

        crash_free = data.get("crash_free_rate")
        if crash_free is not None:
            lines.append(f"- Crash Free Rate: {crash_free:.1f}%")

        impact_pct = data.get("impact_percentage")
        if impact_pct is not None:
            lines.append(f"- Impact: {impact_pct:.1f}% of sessions")

        replay_count = data.get("replay_count", 0)
        if replay_count > 0:
            lines.append(f"- Session Replays: {replay_count} available")

        return "\n".join(lines) if len(lines) > 1 else ""

    def _format_breadcrumbs(self, data: dict) -> str:
        """Format breadcrumbs for prompt."""
        timeline = data.get("timeline", [])
        if not timeline:
            return ""

        lines = [f"**Breadcrumb Timeline ({len(timeline)} events):**"]
        for crumb in timeline[-5:]:  # Last 5 breadcrumbs
            category = crumb.get("category", "unknown")
            message = crumb.get("message", "")[:60]
            timestamp = crumb.get("timestamp", "")[-8:]  # Time only
            lines.append(f"- [{timestamp}] {category}: {message}")

        return "\n".join(lines)

    def _format_ownership(self, data: dict) -> str:
        """Format ownership for prompt."""
        lines = ["**Ownership:**"]

        teams = data.get("teams", [])
        if teams:
            lines.append(f"- Teams: {', '.join(teams[:3])}")

        primary = data.get("primary_team")
        if primary:
            lines.append(f"- Primary: {primary}")

        return "\n".join(lines) if len(lines) > 1 else ""

    def _format_tag_distributions(self, data: dict) -> str:
        """Format tag distributions for prompt."""
        top_values = data.get("top_values", {})
        if not top_values:
            return ""

        lines = ["**Tag Distributions:**"]
        for tag, values in list(top_values.items())[:5]:
            if isinstance(values, list) and values:
                top_value = values[0]
                if isinstance(top_value, dict):
                    value_str = top_value.get("value", "N/A")
                    count = top_value.get("count", 0)
                    lines.append(f"- {tag}: {value_str} ({count} occurrences)")
                else:
                    lines.append(f"- {tag}: {top_value}")

        return "\n".join(lines) if len(lines) > 1 else ""

    def _format_measurements(self, data: dict) -> str:
        """Format web vitals/measurements for prompt."""
        web_vitals = data.get("web_vitals", {})
        if not web_vitals:
            return ""

        lines = ["**Web Vitals:**"]
        for metric, value in web_vitals.items():
            if isinstance(value, (int, float)):
                lines.append(f"- {metric.upper()}: {value:.0f}ms")

        return "\n".join(lines) if len(lines) > 1 else ""

    def _format_issue_summary_from_model(self, issue: SentryIssue) -> str:
        """Format issue summary from SentryIssue model."""
        lines = ["## Current Error\n"]
        lines.append(f"**Type:** {issue.error_type}")
        lines.append(f"**Message:** {issue.error_message[:500]}")
        lines.append(f"**Platform:** {issue.platform or 'unknown'}")
        lines.append(f"**Level:** {issue.level}")

        if issue.context_tags:
            env = issue.context_tags.get("environment")
            if env:
                lines.append(f"**Environment:** {env}")

        return "\n".join(lines)


# Singleton instance
_rag_prompt_builder: Optional[RAGPromptBuilder] = None


def get_rag_prompt_builder() -> RAGPromptBuilder:
    """Get singleton RAG prompt builder."""
    global _rag_prompt_builder
    if _rag_prompt_builder is None:
        _rag_prompt_builder = RAGPromptBuilder()
    return _rag_prompt_builder
