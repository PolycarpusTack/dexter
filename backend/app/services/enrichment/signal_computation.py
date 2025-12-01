"""
Signal computation for multi-signal ranking.

This module provides functions to compute various ranking signals
from enrichment data, including ownership match scores, release recency,
alert frequency, and other derived metrics.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Set
import logging
import math

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.db.models import SentryIssue, EnrichmentSignal

logger = logging.getLogger(__name__)


async def compute_ownership_match_score(
    db: AsyncSession,
    issue_id: int,
    user_teams: Optional[Set[str]] = None
) -> Optional[float]:
    """
    Compute ownership match score (0.0 to 1.0).

    The score indicates how relevant an issue is to a user based on team ownership:
    - 1.0: User's team is the primary owner
    - 0.7: User's team is a suggested owner (but not primary)
    - 0.5: User's team appears in suggested owners list
    - 0.0: No team match

    Args:
        db: Database session
        issue_id: ID of the issue to score
        user_teams: Set of team names the user belongs to

    Returns:
        Ownership match score between 0.0 and 1.0, or None if no ownership data
    """
    result = await db.execute(
        select(SentryIssue).where(SentryIssue.id == issue_id)
    )
    issue = result.scalar_one_or_none()

    if not issue or not issue.ownership:
        return None

    if not user_teams:
        return 0.0  # No user context provided

    ownership = issue.ownership
    issue_teams = set(ownership.get("teams", []))
    primary_team = ownership.get("primary_team")

    # Check for exact team match
    matching_teams = user_teams & issue_teams

    if not matching_teams:
        # Check suggested owners for weaker match
        suggested = ownership.get("suggested_owners", [])
        for suggestion in suggested:
            if suggestion.get("type") == "team" and suggestion.get("owner") in user_teams:
                # Found in suggestions but not in primary teams
                return 0.5

        return 0.0

    # We have team overlap
    # Bonus if primary team matches
    if primary_team in user_teams:
        return 1.0
    else:
        # User's team is involved but not primary
        return 0.7


async def compute_release_recency_score(
    db: AsyncSession,
    issue_id: int,
    max_hours: float = 168.0  # 1 week
) -> Optional[float]:
    """
    Compute release recency score based on deployment time.

    Scores decay exponentially:
    - 1.0: Deployed in the last hour
    - 0.5: Deployed ~24 hours ago
    - 0.1: Deployed ~1 week ago
    - 0.0: Deployed more than max_hours ago

    Args:
        db: Database session
        issue_id: ID of the issue
        max_hours: Maximum hours for scoring (default: 1 week)

    Returns:
        Release recency score between 0.0 and 1.0, or None if no release data
    """
    result = await db.execute(
        select(SentryIssue).where(SentryIssue.id == issue_id)
    )
    issue = result.scalar_one_or_none()

    if not issue or not issue.release_context:
        return None

    release_context = issue.release_context

    # Extract deployment timestamp from latest release
    releases = release_context.get("releases", [])
    if not releases:
        return None

    # Get the most recent release
    latest_release = releases[0]  # Releases are sorted by date_created desc
    deploy_time_str = latest_release.get("date_created")
    if not deploy_time_str:
        return None

    try:
        deploy_time = datetime.fromisoformat(deploy_time_str.replace("Z", "+00:00"))
        # Make sure we use timezone-aware datetime for comparison
        now = datetime.now(timezone.utc)

        hours_since_deploy = (now - deploy_time).total_seconds() / 3600

        if hours_since_deploy < 0:
            # Future deployment (clock skew)
            return 1.0

        if hours_since_deploy >= max_hours:
            return 0.0

        # Exponential decay: score = e^(-hours / decay_constant)
        # We want score ~0.5 at 24 hours, so decay_constant ~= 24 / ln(2) ~= 34.6
        decay_constant = max_hours / 5  # Decay to ~0.007 at max_hours
        score = math.exp(-hours_since_deploy / decay_constant)

        return max(0.0, min(1.0, score))

    except (ValueError, TypeError) as e:
        logger.warning(f"Failed to parse deploy time for issue {issue_id}: {e}")
        return None


async def compute_alert_frequency_score(
    db: AsyncSession,
    issue_id: int,
    window_hours: float = 24.0,
    max_alerts: int = 10
) -> Optional[float]:
    """
    Compute alert frequency score based on recent alert activity.

    Scores based on alert density:
    - 1.0: >= max_alerts alerts in window
    - 0.5: max_alerts/2 alerts in window
    - 0.0: No alerts in window

    Args:
        db: Database session
        issue_id: ID of the issue
        window_hours: Time window to consider (default: 24 hours)
        max_alerts: Alert count for max score (default: 10)

    Returns:
        Alert frequency score between 0.0 and 1.0, or None if no alert data
    """
    result = await db.execute(
        select(SentryIssue).where(SentryIssue.id == issue_id)
    )
    issue = result.scalar_one_or_none()

    if not issue or not issue.alert_context:
        return None

    alert_context = issue.alert_context

    # Count recent alerts
    recent_alerts = alert_context.get("recent_alert_count", 0)
    alert_history = alert_context.get("alert_history", [])

    # Filter alerts within time window
    cutoff = datetime.now(timezone.utc) - timedelta(hours=window_hours)
    recent_count = 0

    for alert in alert_history:
        alert_time_str = alert.get("timestamp")
        if alert_time_str:
            try:
                alert_time = datetime.fromisoformat(alert_time_str.replace("Z", "+00:00"))
                if alert_time >= cutoff:
                    recent_count += 1
            except (ValueError, TypeError):
                continue

    # Use the maximum of the two counts
    alert_count = max(recent_alerts, recent_count)

    # Normalize to 0-1 range
    score = min(1.0, alert_count / max_alerts)

    return score


async def compute_replay_impact_score(
    db: AsyncSession,
    issue_id: int
) -> Optional[float]:
    """
    Compute replay impact score based on session crash rate.

    Scores based on session impact:
    - 1.0: 100% crash rate (all sessions affected)
    - 0.5: 50% crash rate
    - 0.0: 0% crash rate

    Args:
        db: Database session
        issue_id: ID of the issue

    Returns:
        Replay impact score between 0.0 and 1.0, or None if no session data
    """
    result = await db.execute(
        select(SentryIssue).where(SentryIssue.id == issue_id)
    )
    issue = result.scalar_one_or_none()

    if not issue or not issue.session_data:
        return None

    session_data = issue.session_data

    # Extract crash-free rate
    crash_free_rate = session_data.get("crash_free_rate")
    if crash_free_rate is None:
        # Try impact percentage
        impact_pct = session_data.get("impact_percentage")
        if impact_pct is not None:
            return min(1.0, max(0.0, impact_pct / 100.0))
        return None

    # Convert crash-free rate to impact score
    # crash_free_rate of 100% = 0% impact = score 0.0
    # crash_free_rate of 0% = 100% impact = score 1.0
    impact_score = 1.0 - (crash_free_rate / 100.0)

    return max(0.0, min(1.0, impact_score))


async def compute_tag_overlap_score(
    db: AsyncSession,
    issue_id: int,
    query_tags: Optional[Dict[str, str]] = None
) -> Optional[float]:
    """
    Compute tag overlap score based on context tag similarity.

    Scores based on tag matching:
    - 1.0: All query tags match issue tags exactly
    - 0.5: 50% of query tags match
    - 0.0: No tag overlap

    Args:
        db: Database session
        issue_id: ID of the issue
        query_tags: Dictionary of tags to match against (e.g., {"environment": "production"})

    Returns:
        Tag overlap score between 0.0 and 1.0, or None if no tag data
    """
    result = await db.execute(
        select(SentryIssue).where(SentryIssue.id == issue_id)
    )
    issue = result.scalar_one_or_none()

    if not issue or not issue.tag_distributions:
        return None

    if not query_tags:
        return 0.0  # No query context

    tag_distributions = issue.tag_distributions

    # Count exact matches
    matches = 0
    total_query_tags = len(query_tags)

    for tag_key, tag_value in query_tags.items():
        # Check if this tag exists in issue's top values
        top_values = tag_distributions.get("top_values", {}).get(tag_key, [])

        if isinstance(top_values, list):
            # List of value objects
            issue_values = {v.get("value") for v in top_values if isinstance(v, dict)}
        else:
            # Simple list of values
            issue_values = set(top_values) if isinstance(top_values, list) else set()

        if tag_value in issue_values:
            matches += 1

    if total_query_tags == 0:
        return 0.0

    score = matches / total_query_tags

    return score


async def compute_composite_score(
    db: AsyncSession,
    issue_id: int,
    vector_similarity: float = 0.0,
    user_teams: Optional[Set[str]] = None,
    query_tags: Optional[Dict[str, str]] = None,
    weights: Optional[Dict[str, float]] = None
) -> float:
    """
    Compute weighted composite score for multi-signal ranking.

    Default weights:
    - vector_similarity: 40%
    - release_recency: 15%
    - ownership_match: 12%
    - alert_frequency: 10%
    - replay_impact: 10%
    - tag_overlap: 8%
    - profiling_hotspot: 5%

    Args:
        db: Database session
        issue_id: ID of the issue
        vector_similarity: Cosine similarity score from vector search
        user_teams: User's team memberships for ownership scoring
        query_tags: Query context tags for tag overlap scoring
        weights: Optional custom weights (must sum to 1.0)

    Returns:
        Composite score between 0.0 and 1.0
    """
    if weights is None:
        weights = {
            "vector_similarity": 0.40,
            "release_recency": 0.15,
            "ownership_match": 0.12,
            "alert_frequency": 0.10,
            "replay_impact": 0.10,
            "tag_overlap": 0.08,
            "profiling_hotspot": 0.05,
        }

    # Compute all signals
    signals = {
        "vector_similarity": vector_similarity,
        "release_recency": await compute_release_recency_score(db, issue_id) or 0.0,
        "ownership_match": await compute_ownership_match_score(db, issue_id, user_teams) or 0.0,
        "alert_frequency": await compute_alert_frequency_score(db, issue_id) or 0.0,
        "replay_impact": await compute_replay_impact_score(db, issue_id) or 0.0,
        "tag_overlap": await compute_tag_overlap_score(db, issue_id, query_tags) or 0.0,
        "profiling_hotspot": await compute_profiling_hotspot_score(db, issue_id) or 0.0,
    }

    # Compute weighted sum
    composite = sum(
        signals.get(key, 0.0) * weight
        for key, weight in weights.items()
    )

    return max(0.0, min(1.0, composite))


async def update_enrichment_signals(
    db: AsyncSession,
    issue_id: int,
    user_teams: Optional[Set[str]] = None,
    query_tags: Optional[Dict[str, str]] = None,
    vector_similarity: float = 0.0
) -> None:
    """
    Update or create enrichment signals for an issue.

    This should be called whenever enrichment data changes or
    when computing signals for ranking.

    Args:
        db: Database session
        issue_id: ID of the issue
        user_teams: User's team memberships (optional)
        query_tags: Query context tags (optional)
        vector_similarity: Vector similarity score from search
    """
    # Compute all signals
    release_recency = await compute_release_recency_score(db, issue_id) or 0.0
    ownership_match = await compute_ownership_match_score(db, issue_id, user_teams) or 0.0
    alert_frequency = await compute_alert_frequency_score(db, issue_id) or 0.0
    replay_impact = await compute_replay_impact_score(db, issue_id) or 0.0
    tag_overlap = await compute_tag_overlap_score(db, issue_id, query_tags) or 0.0

    composite = await compute_composite_score(
        db, issue_id, vector_similarity, user_teams, query_tags
    )

    # Check if signals record exists
    result = await db.execute(
        select(EnrichmentSignal).where(EnrichmentSignal.issue_id == issue_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Update existing record
        await db.execute(
            update(EnrichmentSignal)
            .where(EnrichmentSignal.issue_id == issue_id)
            .values(
                release_recency_score=release_recency,
                alert_frequency_score=alert_frequency,
                replay_impact_score=replay_impact,
                tag_overlap_score=tag_overlap,
                ownership_match_score=ownership_match,
                composite_score=composite,
                updated_at=datetime.now(timezone.utc),
            )
        )
    else:
        # Create new record
        signal = EnrichmentSignal(
            issue_id=issue_id,
            release_recency_score=release_recency,
            alert_frequency_score=alert_frequency,
            replay_impact_score=replay_impact,
            tag_overlap_score=tag_overlap,
            ownership_match_score=ownership_match,
            composite_score=composite,
        )
        db.add(signal)

    await db.flush()

    logger.debug(
        f"Updated enrichment signals for issue {issue_id}",
        extra={
            "issue_id": issue_id,
            "composite_score": round(composite, 3),
            "release_recency": round(release_recency, 3),
            "ownership_match": round(ownership_match, 3),
            "alert_frequency": round(alert_frequency, 3),
        }
    )


# ======================================================================
# PERFORMANCE IMPACT SCORING (EPIC E - Performance Span Integration)
# ======================================================================


async def compute_performance_impact_score(
    db: AsyncSession,
    issue_id: int
) -> Optional[float]:
    """
    Compute performance impact score (0.0 to 1.0).

    Based on number of problem spans and their severity.

    Args:
        db: Database session
        issue_id: Database ID of the issue

    Returns:
        Performance impact score (0.0 to 1.0) or None if no data available
    """
    try:
        result = await db.execute(
            select(SentryIssue).where(SentryIssue.id == issue_id)
        )
        issue = result.scalar_one_or_none()

        if not issue or not issue.performance_data:
            return None

        problem_spans = issue.performance_data.get("problem_spans", [])
        if not problem_spans:
            return 0.0

        # Weight by severity
        severity_weights = {
            "critical": 1.0,
            "high": 0.7,
            "medium": 0.4,
            "low": 0.2
        }

        total_weight = sum(
            severity_weights.get(span.get("severity", "low"), 0.2)
            for span in problem_spans
        )

        # Normalize to 0-1 scale (cap at 5 critical problems = 1.0)
        score = min(total_weight / 5.0, 1.0)

        logger.debug(
            f"Computed performance impact score for issue {issue_id}: {score}",
            extra={
                "issue_id": issue_id,
                "problem_spans": len(problem_spans),
                "score": score
            }
        )

        return score

    except Exception as e:
        logger.error(
            f"Failed to compute performance impact score for issue {issue_id}: {e}",
            exc_info=True
        )
        return None


async def compute_n_plus_one_severity_score(
    db: AsyncSession,
    issue_id: int
) -> Optional[float]:
    """
    Compute N+1 pattern severity score (0.0 to 1.0).

    Based on number of N+1 patterns detected and their impact.

    Args:
        db: Database session
        issue_id: Database ID of the issue

    Returns:
        N+1 severity score (0.0 to 1.0) or None if no data available
    """
    try:
        result = await db.execute(
            select(SentryIssue).where(SentryIssue.id == issue_id)
        )
        issue = result.scalar_one_or_none()

        if not issue or not issue.performance_data:
            return None

        n_plus_one_patterns = issue.performance_data.get("n_plus_one_patterns", [])
        if not n_plus_one_patterns:
            return 0.0

        # Weight by severity and occurrence count
        severity_weights = {"high": 1.0, "medium": 0.6, "low": 0.3}

        total_weight = 0.0
        for pattern in n_plus_one_patterns:
            severity = pattern.get("severity", "low")
            occurrence_count = pattern.get("occurrence_count", 0)

            # Base weight from severity
            base_weight = severity_weights.get(severity, 0.3)

            # Amplify by occurrence count (more queries = worse)
            # 5 queries = 1.0x, 10 queries = 1.5x, 20+ queries = 2.0x
            occurrence_multiplier = min(1.0 + (occurrence_count - 5) / 20.0, 2.0)

            total_weight += base_weight * occurrence_multiplier

        # Normalize (3 high-severity N+1 patterns with 10 occurrences each = 1.0)
        score = min(total_weight / 3.0, 1.0)

        logger.debug(
            f"Computed N+1 severity score for issue {issue_id}: {score}",
            extra={
                "issue_id": issue_id,
                "patterns": len(n_plus_one_patterns),
                "score": score
            }
        )

        return score

    except Exception as e:
        logger.error(
            f"Failed to compute N+1 severity score for issue {issue_id}: {e}",
            exc_info=True
        )
        return None


async def compute_composite_performance_score(
    db: AsyncSession,
    issue_id: int
) -> Optional[float]:
    """
    Compute composite performance score combining all performance signals.

    Combines:
    - Performance impact score (70% weight)
    - N+1 severity score (30% weight)

    Args:
        db: Database session
        issue_id: Database ID of the issue

    Returns:
        Composite performance score (0.0 to 1.0) or None if no data available
    """
    try:
        impact_score = await compute_performance_impact_score(db, issue_id)
        n_plus_one_score = await compute_n_plus_one_severity_score(db, issue_id)

        if impact_score is None and n_plus_one_score is None:
            return None

        # Use 0.0 if either score is missing
        impact_score = impact_score or 0.0
        n_plus_one_score = n_plus_one_score or 0.0

        # Weighted composite
        composite = (impact_score * 0.7) + (n_plus_one_score * 0.3)

        logger.debug(
            f"Computed composite performance score for issue {issue_id}: {composite}",
            extra={
                "issue_id": issue_id,
                "impact_score": impact_score,
                "n_plus_one_score": n_plus_one_score,
                "composite_score": composite
            }
        )

        return composite

    except Exception as e:
        logger.error(
            f"Failed to compute composite performance score for issue {issue_id}: {e}",
            exc_info=True
        )
        return None


# ======================================================================
# PROFILING HOTSPOT SCORING (EPIC H - Profiling Hotspots)
# ======================================================================


async def compute_profiling_hotspot_score(
    db: AsyncSession,
    issue_id: int
) -> Optional[float]:
    """
    Compute profiling hotspot score (0.0 to 1.0).

    Based on:
    - Number of hot functions detected (1-3 = 0.5, 4+ = 1.0)
    - Total time spent in hot functions (>50% = high score)

    Args:
        db: Database session
        issue_id: Database ID of the issue

    Returns:
        Profiling hotspot score (0.0 to 1.0) or None if no data available
    """
    try:
        result = await db.execute(
            select(SentryIssue).where(SentryIssue.id == issue_id)
        )
        issue = result.scalar_one_or_none()

        if not issue or not issue.profiling_data:
            return None

        profiling_data = issue.profiling_data
        hot_functions = profiling_data.get("hot_functions", [])

        if not hot_functions:
            return 0.0

        # Component 1: Number of hotspots (50% weight)
        hotspot_count = len(hot_functions)
        if hotspot_count >= 4:
            count_score = 1.0
        elif hotspot_count >= 1:
            count_score = 0.5 + (hotspot_count - 1) * 0.167  # Linear from 0.5 to ~1.0
        else:
            count_score = 0.0

        # Component 2: Total time in hot functions (50% weight)
        total_time_pct = sum(
            func.get("time_percentage", 0) for func in hot_functions
        )

        if total_time_pct >= 50:
            time_score = 1.0
        else:
            time_score = total_time_pct / 50.0  # Linear from 0 to 1.0

        # Component 3: Severity bonus
        severity_weights = {
            "critical": 1.0,
            "high": 0.7,
            "medium": 0.4,
            "low": 0.2
        }

        max_severity_weight = max(
            severity_weights.get(func.get("severity", "low"), 0.2)
            for func in hot_functions
        )

        # Weighted composite
        score = (count_score * 0.4) + (time_score * 0.4) + (max_severity_weight * 0.2)

        logger.debug(
            f"Computed profiling hotspot score for issue {issue_id}: {score}",
            extra={
                "issue_id": issue_id,
                "hotspot_count": hotspot_count,
                "total_time_pct": total_time_pct,
                "score": score
            }
        )

        return min(1.0, max(0.0, score))

    except Exception as e:
        logger.error(
            f"Failed to compute profiling hotspot score for issue {issue_id}: {e}",
            exc_info=True
        )
        return None
