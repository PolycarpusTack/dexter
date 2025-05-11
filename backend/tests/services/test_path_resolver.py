# Tests for path resolver service
import pytest
from app.services.path_resolver_service import PathResolverService, path_resolver
from app.config.api.path_mappings import ApiEndpoint, HttpMethod


class TestPathResolverService:
    def setup_method(self):
        self.resolver = PathResolverService()
    
    def test_resolve_sentry_path(self):
        """Test resolving Sentry API paths"""
        path = self.resolver.build_sentry_url('list_issues', 
            organization_slug='test-org',
            project_slug='test-project'
        )
        
        assert '/api/0/projects/test-org/test-project/issues/' in path
    
    def test_resolve_frontend_path(self):
        """Test resolving frontend paths"""
        path = self.resolver.build_frontend_url('get_issue',
            issue_id='123'
        )
        
        assert path == '/api/v1/issues/123'
    
    def test_validate_params_success(self):
        """Test parameter validation with all required params"""
        is_valid, missing = self.resolver.validate_params('list_issues', {
            'organization_slug': 'test-org',
            'project_slug': 'test-project'
        })
        
        assert is_valid
        assert len(missing) == 0
    
    def test_validate_params_missing(self):
        """Test parameter validation with missing params"""
        is_valid, missing = self.resolver.validate_params('list_issues', {
            'organization_slug': 'test-org'
            # Missing project_slug
        })
        
        assert not is_valid
        assert 'project_slug' in missing
    
    def test_get_cache_ttl(self):
        """Test getting cache TTL for endpoints"""
        ttl = self.resolver.get_cache_ttl('list_issues')
        assert ttl == 300  # 5 minutes
        
        ttl = self.resolver.get_cache_ttl('update_issue')
        assert ttl is None  # No caching for updates
    
    def test_get_endpoint_info(self):
        """Test getting endpoint information"""
        info = self.resolver.get_endpoint_info('list_issues')
        
        assert info['name'] == 'list_issues'
        assert info['method'] == 'GET'
        assert 'organization_slug' in info['path_params']
        assert 'project_slug' in info['path_params']
        assert info['cache_ttl'] == 300
    
    def test_unknown_endpoint(self):
        """Test handling of unknown endpoints"""
        with pytest.raises(ValueError, match="Unknown endpoint"):
            self.resolver.build_sentry_url('non_existent_endpoint')
    
    def test_path_pattern_matching(self):
        """Test path pattern matching"""
        params = {}
        
        # Test exact match
        matched = self.resolver._match_path_pattern(
            '/organizations/my-org/issues/123',
            '/organizations/{organization_slug}/issues/{issue_id}',
            params
        )
        
        assert matched
        assert params['organization_slug'] == 'my-org'
        assert params['issue_id'] == '123'
    
    def test_path_pattern_mismatch(self):
        """Test path pattern mismatch"""
        params = {}
        
        # Different number of segments
        matched = self.resolver._match_path_pattern(
            '/organizations/my-org',
            '/organizations/{organization_slug}/issues/{issue_id}',
            params
        )
        
        assert not matched
        
        # Different static segment
        matched = self.resolver._match_path_pattern(
            '/orgs/my-org/issues/123',
            '/organizations/{organization_slug}/issues/{issue_id}',
            params
        )
        
        assert not matched
