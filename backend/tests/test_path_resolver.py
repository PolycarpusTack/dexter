import pytest
from app.config.api_paths import ApiPathConfig, PathMapping
from app.utils.path_resolver import PathResolver


class TestPathResolver:
    """Test cases for PathResolver utility."""
    
    def test_resolve_simple_path(self):
        """Test resolving simple paths without parameters."""
        result = PathResolver.resolve('/api/organizations')
        assert result == '/api/organizations'
    
    def test_resolve_path_with_single_parameter(self):
        """Test resolving paths with single parameter."""
        result = PathResolver.resolve('/api/issues/{id}', id='123')
        assert result == '/api/issues/123'
    
    def test_resolve_path_with_multiple_parameters(self):
        """Test resolving paths with multiple parameters."""
        result = PathResolver.resolve(
            '/api/projects/{organization_slug}/{project_slug}/issues/',
            organization_slug='my-org',
            project_slug='my-project'
        )
        assert result == '/api/projects/my-org/my-project/issues/'
    
    def test_resolve_with_parameter_aliases(self):
        """Test parameter aliases are handled correctly."""
        result = PathResolver.resolve(
            '/api/projects/{organization_slug}/{project_slug}/issues/',
            org='my-org',
            project='my-project'
        )
        assert result == '/api/projects/my-org/my-project/issues/'
    
    def test_resolve_missing_parameters_raises_error(self):
        """Test that missing parameters raise ValueError."""
        with pytest.raises(ValueError, match='Missing required path parameters: id'):
            PathResolver.resolve('/api/issues/{id}')
    
    def test_resolve_mapping(self):
        """Test resolving path from PathMapping object."""
        mapping = PathMapping(
            frontend_path='/api/v1/issues/{id}',
            backend_path='/api/events/{id}',
            sentry_path='/issues/{id}/',
            method='GET',
            description='Get issue details'
        )
        
        # Test different path types
        assert PathResolver.resolve_mapping(mapping, 'frontend', id='123') == '/api/v1/issues/123'
        assert PathResolver.resolve_mapping(mapping, 'backend', id='123') == '/api/events/123'
        assert PathResolver.resolve_mapping(mapping, 'sentry', id='123') == '/issues/123/'
    
    def test_extract_parameters(self):
        """Test extracting parameters from paths."""
        # Single parameter
        params = PathResolver.extract_parameters('/api/issues/123', '/api/issues/{id}')
        assert params == {'id': '123'}
        
        # Multiple parameters
        params = PathResolver.extract_parameters(
            '/api/projects/my-org/my-project/issues/',
            '/api/projects/{organization_slug}/{project_slug}/issues/'
        )
        assert params == {
            'organization_slug': 'my-org',
            'project_slug': 'my-project'
        }
        
        # Non-matching path
        params = PathResolver.extract_parameters('/api/users/123', '/api/issues/{id}')
        assert params == {}
    
    def test_validate_path_params(self):
        """Test validating path parameters."""
        # Valid parameters
        is_valid, missing = PathResolver.validate_path_params(
            '/api/issues/{id}',
            {'id': '123'}
        )
        assert is_valid is True
        assert missing == []
        
        # Missing parameters
        is_valid, missing = PathResolver.validate_path_params(
            '/api/issues/{id}',
            {}
        )
        assert is_valid is False
        assert missing == ['id']
        
        # With parameter aliases
        is_valid, missing = PathResolver.validate_path_params(
            '/api/projects/{organization_slug}/{project_slug}/issues/',
            {'org': 'my-org', 'project': 'my-project'}
        )
        assert is_valid is True
        assert missing == []
    
    def test_find_matching_route(self):
        """Test finding matching routes."""
        # Test with real API paths
        result = PathResolver.find_matching_route('/api/events/123')
        assert result is not None
        category, operation, mapping = result
        assert category == 'issues'
        assert operation == 'detail'
        assert mapping.backend_path == '/api/events/{id}'
        
        # Non-matching path
        result = PathResolver.find_matching_route('/api/unknown/123')
        assert result is None
    
    def test_get_sentry_url(self):
        """Test getting full Sentry API URL."""
        # With leading slash
        url = PathResolver.get_sentry_url('/issues/123/')
        assert url.startswith('https://sentry.io/api/0/')
        assert url.endswith('/issues/123/')
        
        # Without leading slash
        url = PathResolver.get_sentry_url('issues/123/')
        assert url.startswith('https://sentry.io/api/0/')
        assert url.endswith('/issues/123/')
