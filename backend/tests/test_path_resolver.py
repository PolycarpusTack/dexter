import pytest
from app.utils.path_resolver import resolve_path, get_full_url, legacy_resolve_path
from app.config.api.path_mappings import api_path_manager
import os


class TestNewPathResolver:
    """Test cases for the new path resolver system."""
    
    def test_resolve_path(self):
        """Test resolving a path with parameters."""
        path = resolve_path(
            "issues", "list",
            organization_slug="my-org",
            project_slug="my-project"
        )
        assert "/projects/my-org/my-project/issues/" in path
    
    def test_get_full_url(self):
        """Test getting a full URL with base URL and path."""
        url = get_full_url(
            "issues", "list",
            organization_slug="my-org",
            project_slug="my-project",
            sentry_base_url="https://sentry.example.com"
        )
        assert url.startswith("https://sentry.example.com")
        assert "/projects/my-org/my-project/issues/" in url
    
    def test_missing_parameters(self):
        """Test that missing parameters raise ValueError."""
        with pytest.raises(ValueError, match="Missing required parameter"):
            resolve_path(
                "issues", "list",
                organization_slug="my-org"
                # Missing project_slug
            )
    
    def test_unknown_category(self):
        """Test that an unknown category raises an appropriate error."""
        with pytest.raises(ValueError, match="Failed to resolve path"):
            resolve_path("unknown_category", "list")
    
    def test_unknown_endpoint(self):
        """Test that an unknown endpoint raises an appropriate error."""
        with pytest.raises(ValueError, match="Failed to resolve path"):
            resolve_path("issues", "unknown_endpoint")


class TestLegacyPathResolver:
    """Test cases for the legacy path resolver system (backwards compatibility)."""
    
    def test_legacy_resolve_path(self):
        """Test that the legacy resolver maps to the new system correctly."""
        path = legacy_resolve_path(
            "ISSUES_LIST",
            org="my-org",
            project="my-project"
        )
        # This should use the mapping to call resolve_path("issues", "list", ...)
        assert path == resolve_path(
            "issues", "list",
            organization_slug="my-org",
            project_slug="my-project"
        )
    
    def test_unknown_legacy_path(self):
        """Test that an unknown legacy path raises ValueError."""
        with pytest.raises(ValueError, match="Unknown legacy path key"):
            legacy_resolve_path("UNKNOWN_PATH")
