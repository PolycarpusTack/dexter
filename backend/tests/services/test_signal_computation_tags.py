"""
Tests for Tag Overlap Scoring in Signal Computation (EPIC G).

Tests:
- Tag overlap score computation
- Query context matching
- Edge cases (no data, no query)
"""

import pytest
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.enrichment.signal_computation import compute_tag_overlap_score
from app.db.models import SentryIssue


@pytest.fixture
async def issue_with_tag_distributions(db_session: AsyncSession):
    """Create issue with tag distributions."""
    issue = SentryIssue(
        sentry_issue_id="SENTRY-TAG-1",
        sentry_event_id="event-tag-1",
        error_type="ValueError",
        error_message="Test error with tags",
        platform="python",
        level="error",
        tag_distributions={
            "environment_analysis": {
                "dominant_environment": "production",
                "dominant_device": "Desktop",
                "dominant_browser": "Chrome"
            },
            "top_tags": [
                {
                    "tag": "environment",
                    "unique_values": 2,
                    "top_values": [
                        {"value": "production", "count": 85},
                        {"value": "staging", "count": 15}
                    ]
                },
                {
                    "tag": "browser",
                    "unique_values": 3,
                    "top_values": [
                        {"value": "Chrome", "count": 50},
                        {"value": "Firefox", "count": 30}
                    ]
                }
            ]
        }
    )
    db_session.add(issue)
    await db_session.commit()
    await db_session.refresh(issue)
    return issue


@pytest.mark.asyncio
async def test_compute_tag_overlap_score_full_match(
    db_session: AsyncSession,
    issue_with_tag_distributions
):
    """Test tag overlap score with full match."""
    query_tags = {
        "environment": "production",
        "device": "Desktop",
        "browser": "Chrome"
    }

    score = await compute_tag_overlap_score(
        db_session,
        issue_with_tag_distributions.id,
        query_tags
    )

    # All 3 tags match = 1.0
    assert score == 1.0


@pytest.mark.asyncio
async def test_compute_tag_overlap_score_partial_match(
    db_session: AsyncSession,
    issue_with_tag_distributions
):
    """Test tag overlap score with partial match."""
    query_tags = {
        "environment": "production",  # Matches
        "device": "Mobile",  # Doesn't match (issue has Desktop)
        "browser": "Chrome"  # Matches
    }

    score = await compute_tag_overlap_score(
        db_session,
        issue_with_tag_distributions.id,
        query_tags
    )

    # 2 out of 3 tags match = 0.666...
    assert abs(score - 0.666666) < 0.01


@pytest.mark.asyncio
async def test_compute_tag_overlap_score_no_match(
    db_session: AsyncSession,
    issue_with_tag_distributions
):
    """Test tag overlap score with no matches."""
    query_tags = {
        "environment": "staging",  # Doesn't match
        "device": "Mobile",  # Doesn't match
        "browser": "Safari"  # Doesn't match
    }

    score = await compute_tag_overlap_score(
        db_session,
        issue_with_tag_distributions.id,
        query_tags
    )

    # 0 out of 3 tags match = 0.0
    assert score == 0.0


@pytest.mark.asyncio
async def test_compute_tag_overlap_score_no_query_tags(
    db_session: AsyncSession,
    issue_with_tag_distributions
):
    """Test tag overlap score with no query tags."""
    score = await compute_tag_overlap_score(
        db_session,
        issue_with_tag_distributions.id,
        query_tags=None
    )

    # No query context = 0.0
    assert score == 0.0


@pytest.mark.asyncio
async def test_compute_tag_overlap_score_empty_query_tags(
    db_session: AsyncSession,
    issue_with_tag_distributions
):
    """Test tag overlap score with empty query tags."""
    score = await compute_tag_overlap_score(
        db_session,
        issue_with_tag_distributions.id,
        query_tags={}
    )

    # Empty query = 0.0
    assert score == 0.0


@pytest.mark.asyncio
async def test_compute_tag_overlap_score_no_tag_data(
    db_session: AsyncSession
):
    """Test tag overlap score when issue has no tag data."""
    # Create issue without tag_distributions
    issue = SentryIssue(
        sentry_issue_id="SENTRY-NO-TAGS",
        sentry_event_id="event-no-tags",
        error_type="ValueError",
        error_message="Test error without tags",
        platform="python",
        level="error"
    )
    db_session.add(issue)
    await db_session.commit()
    await db_session.refresh(issue)

    query_tags = {"environment": "production"}

    score = await compute_tag_overlap_score(
        db_session,
        issue.id,
        query_tags
    )

    # No tag data available = None
    assert score is None


@pytest.mark.asyncio
async def test_compute_tag_overlap_score_single_tag_match(
    db_session: AsyncSession,
    issue_with_tag_distributions
):
    """Test tag overlap score with single tag query."""
    query_tags = {"environment": "production"}

    score = await compute_tag_overlap_score(
        db_session,
        issue_with_tag_distributions.id,
        query_tags
    )

    # 1 out of 1 tags match = 1.0
    assert score == 1.0


@pytest.mark.asyncio
async def test_compute_tag_overlap_score_single_tag_no_match(
    db_session: AsyncSession,
    issue_with_tag_distributions
):
    """Test tag overlap score with single non-matching tag."""
    query_tags = {"environment": "staging"}

    score = await compute_tag_overlap_score(
        db_session,
        issue_with_tag_distributions.id,
        query_tags
    )

    # 0 out of 1 tags match = 0.0
    assert score == 0.0


@pytest.mark.asyncio
async def test_compute_tag_overlap_score_case_sensitive(
    db_session: AsyncSession,
    issue_with_tag_distributions
):
    """Test that tag matching is case-sensitive."""
    query_tags = {
        "environment": "Production",  # Note capital P
    }

    score = await compute_tag_overlap_score(
        db_session,
        issue_with_tag_distributions.id,
        query_tags
    )

    # Case mismatch = no match = 0.0
    assert score == 0.0


@pytest.mark.asyncio
async def test_compute_tag_overlap_score_unknown_tag_key(
    db_session: AsyncSession,
    issue_with_tag_distributions
):
    """Test tag overlap with unknown tag keys."""
    query_tags = {
        "unknown_tag": "some_value",
        "another_unknown": "another_value"
    }

    score = await compute_tag_overlap_score(
        db_session,
        issue_with_tag_distributions.id,
        query_tags
    )

    # Unknown tags don't match = 0.0
    assert score == 0.0


@pytest.mark.asyncio
async def test_compute_tag_overlap_score_mixed_known_unknown(
    db_session: AsyncSession,
    issue_with_tag_distributions
):
    """Test tag overlap with mix of known and unknown tags."""
    query_tags = {
        "environment": "production",  # Known, matches
        "unknown_tag": "some_value"  # Unknown, doesn't match
    }

    score = await compute_tag_overlap_score(
        db_session,
        issue_with_tag_distributions.id,
        query_tags
    )

    # 1 out of 2 match = 0.5
    assert score == 0.5
