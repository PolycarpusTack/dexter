import pytest
from pathlib import Path
import tempfile
import yaml
import os
from app.config.api.path_mappings import ApiPathManager
from app.config.api.models import ApiEndpoint, ApiCategory, ApiPathConfig


@pytest.fixture
def api_manager():
    """Create a fresh ApiPathManager instance for testing."""
    return ApiPathManager()


@pytest.fixture
def sample_config():
    """Create a sample API configuration for testing."""
    return {
        "version": "1.0",
        "base_url": "https://sentry.example.com",
        "categories": {
            "issues": {
                "name": "Issues",
                "base_path": "/api/0/projects/{organization_slug}/{project_slug}",
                "endpoints": {
                    "list": {
                        "path": "/issues/",
                        "method": "GET",
                        "description": "List project issues",
                        "cache_ttl": 300
                    },
                    "detail": {
                        "path": "/issues/{issue_id}/",
                        "method": "GET",
                        "description": "Get issue details",
                        "cache_ttl": 300
                    }
                }
            }
        }
    }


@pytest.fixture
def config_file(sample_config):
    """Create a temporary YAML file with the sample configuration."""
    with tempfile.NamedTemporaryFile(suffix=".yaml", delete=False) as f:
        yaml.dump(sample_config, f)
        temp_filename = f.name
    
    yield temp_filename
    
    # Cleanup
    os.unlink(temp_filename)


def test_load_from_yaml(api_manager, config_file):
    """Test loading configuration from a YAML file."""
    api_manager.load_from_yaml(config_file)
    
    # Check that config was loaded
    assert api_manager.config is not None
    assert api_manager.config.version == "1.0"
    assert api_manager.config.base_url == "https://sentry.example.com"
    
    # Check that categories were loaded
    assert "issues" in api_manager.config.categories
    assert api_manager.config.categories["issues"].name == "Issues"
    
    # Check that endpoints were loaded
    assert "list" in api_manager.config.categories["issues"].endpoints
    assert "detail" in api_manager.config.categories["issues"].endpoints
    
    # Check endpoint details
    list_endpoint = api_manager.config.categories["issues"].endpoints["list"]
    assert list_endpoint.path == "/issues/"
    assert list_endpoint.method == "GET"
    assert list_endpoint.cache_ttl == 300


def test_merge_configs(api_manager, sample_config):
    """Test merging multiple configurations."""
    # Create first config file
    with tempfile.NamedTemporaryFile(suffix=".yaml", delete=False) as f1:
        yaml.dump(sample_config, f1)
        file1 = f1.name
    
    # Create second config with additional category
    second_config = {
        "version": "1.0",
        "base_url": "https://sentry.example.com",
        "categories": {
            "events": {
                "name": "Events",
                "base_path": "/api/0/projects/{organization_slug}/{project_slug}",
                "endpoints": {
                    "list": {
                        "path": "/events/",
                        "method": "GET",
                        "description": "List project events",
                        "cache_ttl": 60
                    }
                }
            }
        }
    }
    
    with tempfile.NamedTemporaryFile(suffix=".yaml", delete=False) as f2:
        yaml.dump(second_config, f2)
        file2 = f2.name
    
    try:
        # Load both configs
        api_manager.load_from_yaml(file1)
        api_manager.load_from_yaml(file2)
        
        # Check that both categories are present
        assert "issues" in api_manager.config.categories
        assert "events" in api_manager.config.categories
        
        # Check endpoints from both configs
        assert "list" in api_manager.config.categories["issues"].endpoints
        assert "list" in api_manager.config.categories["events"].endpoints
    finally:
        # Cleanup
        os.unlink(file1)
        os.unlink(file2)


def test_get_endpoint(api_manager, config_file):
    """Test retrieving endpoint configurations."""
    api_manager.load_from_yaml(config_file)
    
    # Get existing endpoint
    endpoint = api_manager.get_endpoint("issues", "list")
    assert endpoint is not None
    assert endpoint.path == "/issues/"
    assert endpoint.method == "GET"
    
    # Get non-existent endpoint
    endpoint = api_manager.get_endpoint("issues", "non_existent")
    assert endpoint is None
    
    # Get endpoint from non-existent category
    endpoint = api_manager.get_endpoint("non_existent", "list")
    assert endpoint is None


def test_resolve_path(api_manager, config_file):
    """Test path resolution with parameters."""
    api_manager.load_from_yaml(config_file)
    
    # Resolve path with parameters
    path = api_manager.resolve_path(
        "issues", "list",
        organization_slug="test-org",
        project_slug="test-project"
    )
    
    expected = "/api/0/projects/test-org/test-project/issues/"
    assert path == expected
    
    # Resolve path with issue ID
    path = api_manager.resolve_path(
        "issues", "detail",
        organization_slug="test-org",
        project_slug="test-project",
        issue_id="12345"
    )
    
    expected = "/api/0/projects/test-org/test-project/issues/12345/"
    assert path == expected


def test_get_full_url(api_manager, config_file):
    """Test getting complete URLs."""
    api_manager.load_from_yaml(config_file)
    
    # Get full URL
    url = api_manager.get_full_url(
        "issues", "list",
        organization_slug="test-org",
        project_slug="test-project"
    )
    
    expected = "https://sentry.example.com/api/0/projects/test-org/test-project/issues/"
    assert url == expected


def test_missing_parameters(api_manager, config_file):
    """Test error handling for missing parameters."""
    api_manager.load_from_yaml(config_file)
    
    # Missing required parameter
    with pytest.raises(ValueError) as excinfo:
        api_manager.resolve_path(
            "issues", "list",
            organization_slug="test-org"
            # Missing project_slug
        )
    
    assert "Missing required parameter" in str(excinfo.value)


def test_cached_full_url(api_manager, config_file):
    """Test caching of full URLs."""
    api_manager.load_from_yaml(config_file)
    
    # Get URL multiple times
    url1 = api_manager.get_cached_full_url(
        "issues", "list",
        organization_slug="test-org",
        project_slug="test-project"
    )
    
    url2 = api_manager.get_cached_full_url(
        "issues", "list",
        organization_slug="test-org",
        project_slug="test-project"
    )
    
    # Should be the same object
    assert url1 == url2
    
    # Different parameters should give different URL
    url3 = api_manager.get_cached_full_url(
        "issues", "list",
        organization_slug="another-org",
        project_slug="test-project"
    )
    
    assert url1 != url3
