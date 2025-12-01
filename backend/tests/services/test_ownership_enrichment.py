"""
Unit tests for ownership enrichment service.

Tests coverage:
- Ownership data fetching
- Code owner extraction from stack traces
- Team suggestion scoring
- Auto-assignment eligibility
- PII scrubbing in ownership data
- Error handling
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.enrichment.ownership_enrichment import (
    OwnershipEnrichmentService,
    get_ownership_enrichment_service,
)
from app.services.sentry.ownership import OwnershipSuggestion
from app.db.models import SentryIssue


@pytest.fixture
def mock_db():
    """Mock database session."""
    db = AsyncMock(spec=AsyncSession)
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.flush = AsyncMock()
    return db


@pytest.fixture
def mock_ownership_client():
    """Mock ownership client."""
    client = MagicMock()
    client.get_ownership_rules = AsyncMock()
    client.get_ownership_suggestions = AsyncMock()
    return client


@pytest.fixture
def mock_settings():
    """Mock settings."""
    settings = MagicMock()
    settings.ENABLE_OWNERSHIP = True
    settings.ORGANIZATION_SLUG = "test-org"
    settings.SENTRY_ORG = "test-org"
    settings.PROJECT_SLUG = "test-project"
    return settings


@pytest.fixture
def sample_issue():
    """Sample Sentry issue."""
    return SentryIssue(
        id=1,
        sentry_issue_id="ISSUE-123",
        sentry_event_id="EVENT-456",
        error_type="ValueError",
        error_message="Test error",
        cleaned_stack={
            "frames": [
                {"filename": "/src/backend/api/users.py", "lineno": 42},
                {"filename": "/src/frontend/components/Dashboard.tsx", "lineno": 10},
            ]
        },
        enrichment_status={},
    )


@pytest.fixture
def sample_ownership_suggestions():
    """Sample ownership suggestions."""
    return [
        OwnershipSuggestion(
            type="suspectCommit",
            owner={
                "type": "team",
                "name": "team-backend",
                "id": "team1",
            },
        ),
        OwnershipSuggestion(
            type="codeowners",
            owner={
                "type": "team",
                "name": "team-frontend",
                "id": "team2",
            },
        ),
    ]


class TestOwnershipEnrichmentService:
    """Tests for OwnershipEnrichmentService."""

    @pytest.mark.asyncio
    async def test_enrich_issue_success(
        self, mock_db, mock_ownership_client, mock_settings, sample_issue, sample_ownership_suggestions
    ):
        """Test successful ownership enrichment."""
        # Setup
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_issue
        mock_db.execute.return_value = mock_result

        mock_ownership_client.get_ownership_rules.return_value = {"rules": []}
        mock_ownership_client.get_ownership_suggestions.return_value = sample_ownership_suggestions

        with patch("app.services.enrichment.ownership_enrichment.get_settings", return_value=mock_settings):
            with patch("app.services.enrichment.ownership_enrichment.get_pii_scrubber") as mock_scrubber:
                mock_scrubber.return_value.scrub_dict = lambda x: x

                service = OwnershipEnrichmentService(mock_db, mock_ownership_client)
                result = await service.enrich_issue(1)

        # Assertions
        assert result["status"] == "success"
        assert result["owners_count"] == 2
        assert result["teams_count"] > 0
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_enrich_issue_disabled(self, mock_db, mock_ownership_client, mock_settings):
        """Test enrichment when feature is disabled."""
        mock_settings.ENABLE_OWNERSHIP = False

        with patch("app.services.enrichment.ownership_enrichment.get_settings", return_value=mock_settings):
            service = OwnershipEnrichmentService(mock_db, mock_ownership_client)
            result = await service.enrich_issue(1)

        assert result["status"] == "skipped"
        assert result["reason"] == "feature disabled"
        mock_db.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_enrich_issue_not_found(self, mock_db, mock_ownership_client, mock_settings):
        """Test enrichment when issue doesn't exist."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        with patch("app.services.enrichment.ownership_enrichment.get_settings", return_value=mock_settings):
            service = OwnershipEnrichmentService(mock_db, mock_ownership_client)
            result = await service.enrich_issue(999)

        assert result["status"] == "error"
        assert result["reason"] == "issue not found"

    @pytest.mark.asyncio
    async def test_extract_code_owners_from_stack(self, mock_db, mock_ownership_client, mock_settings):
        """Test code owner extraction from stack traces."""
        with patch("app.services.enrichment.ownership_enrichment.get_settings", return_value=mock_settings):
            service = OwnershipEnrichmentService(mock_db, mock_ownership_client)

            # Test various file patterns
            stack = {
                "frames": [
                    {"filename": "/src/backend/api/handlers.py"},
                    {"filename": "/src/frontend/components/Dashboard.tsx"},
                    {"filename": "/src/auth/oauth/google.py"},
                    {"filename": "/src/payment/checkout/process.js"},
                ]
            }

            owners = service._extract_code_owners_from_stack(stack)

            assert "team-backend" in owners
            assert "team-frontend" in owners
            assert "team-auth" in owners
            assert "team-payments" in owners

    @pytest.mark.asyncio
    async def test_extract_code_owners_team_marker(self, mock_db, mock_ownership_client, mock_settings):
        """Test code owner extraction with explicit team markers in path."""
        with patch("app.services.enrichment.ownership_enrichment.get_settings", return_value=mock_settings):
            service = OwnershipEnrichmentService(mock_db, mock_ownership_client)

            stack = {
                "frames": [
                    {"filename": "/src/teams/platform/core.py"},
                    {"filename": "/app/team/infrastructure/db.py"},
                ]
            }

            owners = service._extract_code_owners_from_stack(stack)

            assert "team-platform" in owners
            assert "team-infrastructure" in owners

    @pytest.mark.asyncio
    async def test_build_ownership_data_with_teams(
        self, mock_db, mock_ownership_client, mock_settings, sample_ownership_suggestions
    ):
        """Test building ownership data structure with team suggestions."""
        with patch("app.services.enrichment.ownership_enrichment.get_settings", return_value=mock_settings):
            service = OwnershipEnrichmentService(mock_db, mock_ownership_client)

            ownership_data = service._build_ownership_data(
                rules={"rules": [{"matcher": "path", "identifier": "*.py"}]},
                suggested=sample_ownership_suggestions,
                code_owners=["team-analytics"],
            )

            assert "suggested_owners" in ownership_data
            assert "teams" in ownership_data
            assert "primary_team" in ownership_data
            assert len(ownership_data["suggested_owners"]) <= 5
            assert "team-analytics" in ownership_data["teams"]
            assert ownership_data["ownership_rules_count"] == 1

    @pytest.mark.asyncio
    async def test_build_ownership_data_auto_assignment(
        self, mock_db, mock_ownership_client, mock_settings
    ):
        """Test auto-assignment eligibility logic."""
        with patch("app.services.enrichment.ownership_enrichment.get_settings", return_value=mock_settings):
            service = OwnershipEnrichmentService(mock_db, mock_ownership_client)

            # High confidence suggestion (should enable auto-assignment)
            high_confidence = [
                OwnershipSuggestion(
                    type="suspectCommit",  # 0.9 confidence
                    owner={"type": "team", "name": "team-backend", "id": "team1"},
                )
            ]

            ownership_data = service._build_ownership_data(
                rules={}, suggested=high_confidence, code_owners=[]
            )

            assert ownership_data["auto_assignment_eligible"] is True

            # Low confidence suggestion (should not enable auto-assignment)
            low_confidence = [
                OwnershipSuggestion(
                    type="ownership",  # 0.7 confidence
                    owner={"type": "team", "name": "team-backend", "id": "team1"},
                )
            ]

            ownership_data = service._build_ownership_data(
                rules={}, suggested=low_confidence, code_owners=[]
            )

            assert ownership_data["auto_assignment_eligible"] is False

    @pytest.mark.asyncio
    async def test_calculate_confidence(self, mock_db, mock_ownership_client, mock_settings):
        """Test confidence score calculation."""
        with patch("app.services.enrichment.ownership_enrichment.get_settings", return_value=mock_settings):
            service = OwnershipEnrichmentService(mock_db, mock_ownership_client)

            suspect_commit = OwnershipSuggestion(
                type="suspectCommit",
                owner={"type": "team", "name": "test"},
            )
            assert service._calculate_confidence(suspect_commit) == 0.9

            codeowners = OwnershipSuggestion(
                type="codeowners",
                owner={"type": "team", "name": "test"},
            )
            assert service._calculate_confidence(codeowners) == 0.8

            ownership_rule = OwnershipSuggestion(
                type="ownership",
                owner={"type": "team", "name": "test"},
            )
            assert service._calculate_confidence(ownership_rule) == 0.7

    @pytest.mark.asyncio
    async def test_pii_scrubbing(
        self, mock_db, mock_ownership_client, mock_settings, sample_issue, sample_ownership_suggestions
    ):
        """Test that PII scrubbing is applied to ownership data."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_issue
        mock_db.execute.return_value = mock_result

        mock_ownership_client.get_ownership_rules.return_value = {}
        mock_ownership_client.get_ownership_suggestions.return_value = sample_ownership_suggestions

        scrub_called = False

        def mock_scrub(data):
            nonlocal scrub_called
            scrub_called = True
            return data

        with patch("app.services.enrichment.ownership_enrichment.get_settings", return_value=mock_settings):
            with patch("app.services.enrichment.ownership_enrichment.get_pii_scrubber") as mock_scrubber:
                mock_scrubber.return_value.scrub_dict = mock_scrub

                service = OwnershipEnrichmentService(mock_db, mock_ownership_client)
                await service.enrich_issue(1)

        assert scrub_called, "PII scrubber should be called on ownership data"

    @pytest.mark.asyncio
    async def test_error_handling(
        self, mock_db, mock_ownership_client, mock_settings, sample_issue
    ):
        """Test error handling and marking failed enrichment."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_issue
        mock_db.execute.return_value = mock_result

        # Simulate API error
        mock_ownership_client.get_ownership_rules.side_effect = Exception("API error")

        with patch("app.services.enrichment.ownership_enrichment.get_settings", return_value=mock_settings):
            service = OwnershipEnrichmentService(mock_db, mock_ownership_client)
            result = await service.enrich_issue(1)

        assert result["status"] == "error"
        assert "API error" in result["reason"]

    @pytest.mark.asyncio
    async def test_factory_function(self, mock_db):
        """Test the factory function."""
        with patch("app.services.enrichment.ownership_enrichment.get_settings") as mock_get_settings:
            mock_settings = MagicMock()
            mock_settings.get_sentry_token.return_value = "test-token"
            mock_get_settings.return_value = mock_settings

            with patch("app.services.enrichment.ownership_enrichment.OwnershipClient"):
                service = await get_ownership_enrichment_service(mock_db)

                assert isinstance(service, OwnershipEnrichmentService)


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_empty_stack_trace(self, mock_db, mock_ownership_client, mock_settings):
        """Test with empty stack trace."""
        with patch("app.services.enrichment.ownership_enrichment.get_settings", return_value=mock_settings):
            service = OwnershipEnrichmentService(mock_db, mock_ownership_client)

            owners = service._extract_code_owners_from_stack({})
            assert owners == []

            owners = service._extract_code_owners_from_stack({"frames": []})
            assert owners == []

    @pytest.mark.asyncio
    async def test_missing_org_or_project(
        self, mock_db, mock_ownership_client, mock_settings, sample_issue
    ):
        """Test when organization or project slug is missing."""
        mock_settings.ORGANIZATION_SLUG = None
        mock_settings.SENTRY_ORG = None
        mock_settings.PROJECT_SLUG = None

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_issue
        mock_db.execute.return_value = mock_result

        with patch("app.services.enrichment.ownership_enrichment.get_settings", return_value=mock_settings):
            service = OwnershipEnrichmentService(mock_db, mock_ownership_client)
            result = await service.enrich_issue(1)

        assert result["status"] == "error"
        assert "missing org or project slug" in result["reason"]

    @pytest.mark.asyncio
    async def test_no_team_suggestions_only_users(
        self, mock_db, mock_ownership_client, mock_settings
    ):
        """Test when only user suggestions are available (no teams)."""
        with patch("app.services.enrichment.ownership_enrichment.get_settings", return_value=mock_settings):
            service = OwnershipEnrichmentService(mock_db, mock_ownership_client)

            user_only_suggestions = [
                OwnershipSuggestion(
                    type="suspectCommit",
                    owner={
                        "type": "user",
                        "name": "John Doe",
                        "email": "john@example.com",
                    },
                )
            ]

            ownership_data = service._build_ownership_data(
                rules={}, suggested=user_only_suggestions, code_owners=[]
            )

            # Should not have teams or primary team
            assert len(ownership_data["teams"]) == 0
            assert ownership_data["primary_team"] is None
