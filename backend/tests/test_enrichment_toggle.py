"""
Tests for enrichment toggle logic.

Tests Issue 3 fix: Inverted enrichment master toggle logic.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import AppSettings
from app.core.factory import create_app


@pytest.fixture
def app_with_master_enabled():
    """Create app with master enrichment toggle enabled."""
    settings = AppSettings(
        DEBUG=True,
        ENABLE_ALL_ENRICHMENTS=True,
        ENABLE_RELEASES=True,
        ENABLE_PERFORMANCE_SPANS=True,
        ENABLE_PROFILING=False,
        ENABLE_BREADCRUMBS=True,
    )
    return create_app(settings)


@pytest.fixture
def app_with_master_disabled():
    """Create app with master enrichment toggle disabled."""
    settings = AppSettings(
        DEBUG=True,
        ENABLE_ALL_ENRICHMENTS=False,  # Master switch OFF
        ENABLE_RELEASES=True,  # Individual flags are ON
        ENABLE_PERFORMANCE_SPANS=True,
        ENABLE_BREADCRUMBS=True,
    )
    return create_app(settings)


@pytest.fixture
def app_with_individual_flags_off():
    """Create app with master ON but individual flags OFF."""
    settings = AppSettings(
        DEBUG=True,
        ENABLE_ALL_ENRICHMENTS=True,  # Master switch ON
        ENABLE_RELEASES=False,  # Individual flags OFF
        ENABLE_PERFORMANCE_SPANS=False,
        ENABLE_BREADCRUMBS=False,
    )
    return create_app(settings)


def test_master_toggle_enables_individual_sources(app_with_master_enabled):
    """Test ENABLE_ALL_ENRICHMENTS=True allows individual flags to work."""
    client = TestClient(app_with_master_enabled)
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()

    enrichments = data["features"]["enrichments"]

    # Master is enabled
    assert enrichments["master_override"] is True

    # Individual sources that are enabled should be "ready"
    assert enrichments["sources"]["releases"]["enabled"] is True
    assert enrichments["sources"]["releases"]["status"] == "ready"

    assert enrichments["sources"]["performance_spans"]["enabled"] is True
    assert enrichments["sources"]["performance_spans"]["status"] == "ready"

    assert enrichments["sources"]["breadcrumbs"]["enabled"] is True
    assert enrichments["sources"]["breadcrumbs"]["status"] == "ready"

    # Profiling is OFF (individual flag is False)
    assert enrichments["sources"]["profiling"]["enabled"] is False
    assert enrichments["sources"]["profiling"]["status"] == "disabled"


def test_master_toggle_disables_all_sources(app_with_master_disabled):
    """Test ENABLE_ALL_ENRICHMENTS=False disables all sources regardless of individual flags."""
    client = TestClient(app_with_master_disabled)
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()

    enrichments = data["features"]["enrichments"]

    # Master is disabled
    assert enrichments["master_override"] is False

    # All sources should be disabled, even though individual flags are True
    assert enrichments["sources"]["releases"]["enabled"] is False
    assert enrichments["sources"]["releases"]["status"] == "disabled"

    assert enrichments["sources"]["performance_spans"]["enabled"] is False
    assert enrichments["sources"]["performance_spans"]["status"] == "disabled"

    assert enrichments["sources"]["breadcrumbs"]["enabled"] is False
    assert enrichments["sources"]["breadcrumbs"]["status"] == "disabled"

    # Enabled count should be 0
    assert enrichments["enabled_count"] == 0


def test_individual_flags_control_when_master_enabled(app_with_individual_flags_off):
    """Test that individual flags control sources when master is ON."""
    client = TestClient(app_with_individual_flags_off)
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()

    enrichments = data["features"]["enrichments"]

    # Master is enabled
    assert enrichments["master_override"] is True

    # But individual flags are OFF, so sources should be disabled
    assert enrichments["sources"]["releases"]["enabled"] is False
    assert enrichments["sources"]["releases"]["status"] == "disabled"

    assert enrichments["sources"]["performance_spans"]["enabled"] is False
    assert enrichments["sources"]["performance_spans"]["status"] == "disabled"

    assert enrichments["sources"]["breadcrumbs"]["enabled"] is False
    assert enrichments["sources"]["breadcrumbs"]["status"] == "disabled"

    # Enabled count should be 0
    assert enrichments["enabled_count"] == 0


def test_enrichment_logic_requires_both_flags():
    """Test that enrichment requires BOTH master AND individual flag to be True."""
    # Test all combinations
    test_cases = [
        # (master, individual, expected_enabled)
        (True, True, True),    # Both ON -> enabled
        (True, False, False),  # Master ON, individual OFF -> disabled
        (False, True, False),  # Master OFF, individual ON -> disabled
        (False, False, False), # Both OFF -> disabled
    ]

    for master, individual, expected in test_cases:
        settings = AppSettings(
            DEBUG=True,
            ENABLE_ALL_ENRICHMENTS=master,
            ENABLE_RELEASES=individual,
        )
        app = create_app(settings)
        client = TestClient(app)
        response = client.get("/health")

        data = response.json()
        actual_enabled = data["features"]["enrichments"]["sources"]["releases"]["enabled"]

        assert actual_enabled == expected, \
            f"Failed for master={master}, individual={individual}: " \
            f"expected {expected}, got {actual_enabled}"


def test_default_master_toggle_is_true():
    """Test that the default value for ENABLE_ALL_ENRICHMENTS is True."""
    settings = AppSettings(DEBUG=True)
    assert settings.ENABLE_ALL_ENRICHMENTS is True


def test_all_eleven_sources_respect_master_toggle():
    """Test that all 11 enrichment sources respect the master toggle."""
    # All individual flags ON
    settings = AppSettings(
        DEBUG=True,
        ENABLE_ALL_ENRICHMENTS=False,  # Master OFF
        ENABLE_RELEASES=True,
        ENABLE_PERFORMANCE_SPANS=True,
        ENABLE_PROFILING=True,
        ENABLE_SESSIONS_REPLAYS=True,
        ENABLE_BREADCRUMBS=True,
        ENABLE_ALERTS=True,
        ENABLE_ATTACHMENTS=True,
        ENABLE_TAG_DISTRIBUTIONS=True,
        ENABLE_OWNERSHIP=True,
        ENABLE_MEASUREMENTS=True,
        ENABLE_GROUPING_INSIGHTS=True,
    )

    app = create_app(settings)
    client = TestClient(app)
    response = client.get("/health")

    data = response.json()
    sources = data["features"]["enrichments"]["sources"]

    # All 11 sources should be disabled because master is OFF
    expected_sources = [
        "releases",
        "performance_spans",
        "profiling",
        "sessions_replays",
        "breadcrumbs",
        "alerts",
        "attachments",
        "tag_distributions",
        "ownership",
        "measurements",
        "grouping_insights",
    ]

    for source in expected_sources:
        assert source in sources, f"Source {source} not found"
        assert sources[source]["enabled"] is False, \
            f"Source {source} should be disabled when master toggle is OFF"
        assert sources[source]["status"] == "disabled", \
            f"Source {source} status should be 'disabled'"

    # Total count should be 11 sources
    assert len(sources) == 11

    # Enabled count should be 0
    assert data["features"]["enrichments"]["enabled_count"] == 0


def test_enabled_count_matches_actual_enabled_sources():
    """Test that enabled_count accurately reflects the number of enabled sources."""
    settings = AppSettings(
        DEBUG=True,
        ENABLE_ALL_ENRICHMENTS=True,  # Master ON
        # Enable exactly 3 sources
        ENABLE_RELEASES=True,
        ENABLE_BREADCRUMBS=True,
        ENABLE_ALERTS=True,
        # Disable the rest
        ENABLE_PERFORMANCE_SPANS=False,
        ENABLE_PROFILING=False,
        ENABLE_SESSIONS_REPLAYS=False,
        ENABLE_ATTACHMENTS=False,
        ENABLE_TAG_DISTRIBUTIONS=False,
        ENABLE_OWNERSHIP=False,
        ENABLE_MEASUREMENTS=False,
        ENABLE_GROUPING_INSIGHTS=False,
    )

    app = create_app(settings)
    client = TestClient(app)
    response = client.get("/health")

    data = response.json()
    enrichments = data["features"]["enrichments"]

    # Should have exactly 3 enabled sources
    assert enrichments["enabled_count"] == 3

    # Verify the specific sources
    assert enrichments["sources"]["releases"]["enabled"] is True
    assert enrichments["sources"]["breadcrumbs"]["enabled"] is True
    assert enrichments["sources"]["alerts"]["enabled"] is True


def test_master_toggle_field_description():
    """Test that the master toggle has correct field description."""
    settings = AppSettings(DEBUG=True)

    # Get the field info
    field_info = AppSettings.model_fields.get("ENABLE_ALL_ENRICHMENTS")

    assert field_info is not None
    assert "Master switch" in field_info.description
    assert "individual flags control" in field_info.description or \
           "when OFF, all disabled" in field_info.description
