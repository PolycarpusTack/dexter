import { describe, it, expect } from 'vitest';
import { PathResolver, resolvePath, validatePathParams, extractParameters } from '../pathResolver';
import { API_PATHS } from '../../config/apiPaths';

describe('PathResolver', () => {
  describe('resolve', () => {
    it('should resolve simple paths without parameters', () => {
      const result = PathResolver.resolve('/api/organizations');
      expect(result).toBe('/api/organizations');
    });
    
    it('should resolve paths with single parameter', () => {
      const result = PathResolver.resolve('/api/issues/{id}', { id: '123' });
      expect(result).toBe('/api/issues/123');
    });
    
    it('should resolve paths with multiple parameters', () => {
      const result = PathResolver.resolve(
        '/api/projects/{organization_slug}/{project_slug}/issues/',
        { organization_slug: 'my-org', project_slug: 'my-project' }
      );
      expect(result).toBe('/api/projects/my-org/my-project/issues/');
    });
    
    it('should handle parameter aliases', () => {
      const result = PathResolver.resolve(
        '/api/projects/{organization_slug}/{project_slug}/issues/',
        { org: 'my-org', project: 'my-project' }
      );
      expect(result).toBe('/api/projects/my-org/my-project/issues/');
    });
    
    it('should throw error for missing parameters', () => {
      expect(() => {
        PathResolver.resolve('/api/issues/{id}', {});
      }).toThrow('Missing required path parameters: id');
    });
    
    it('should throw error for multiple missing parameters', () => {
      expect(() => {
        PathResolver.resolve('/api/projects/{organization_slug}/{project_slug}/issues/', { organization_slug: 'my-org' });
      }).toThrow('Missing required path parameters: project_slug');
    });
  });
  
  describe('resolveMapping', () => {
    const mapping = API_PATHS.issues.detail;
    
    it('should resolve frontend path', () => {
      const result = PathResolver.resolveMapping(mapping, 'frontend', { id: '123' });
      expect(result).toBe('/api/v1/issues/123');
    });
    
    it('should resolve backend path', () => {
      const result = PathResolver.resolveMapping(mapping, 'backend', { id: '123' });
      expect(result).toBe('/api/events/123');
    });
    
    it('should resolve sentry path (default)', () => {
      const result = PathResolver.resolveMapping(mapping, 'sentry', { id: '123' });
      expect(result).toBe('/issues/123/');
    });
  });
  
  describe('extractParameters', () => {
    it('should extract single parameter', () => {
      const params = PathResolver.extractParameters('/api/issues/123', '/api/issues/{id}');
      expect(params).toEqual({ id: '123' });
    });
    
    it('should extract multiple parameters', () => {
      const params = PathResolver.extractParameters(
        '/api/projects/my-org/my-project/issues/',
        '/api/projects/{organization_slug}/{project_slug}/issues/'
      );
      expect(params).toEqual({
        organization_slug: 'my-org',
        project_slug: 'my-project'
      });
    });
    
    it('should return empty object for non-matching paths', () => {
      const params = PathResolver.extractParameters('/api/users/123', '/api/issues/{id}');
      expect(params).toEqual({});
    });
    
    it('should handle paths with query parameters', () => {
      const params = PathResolver.extractParameters(
        '/api/issues/123?expand=stacktrace',
        '/api/issues/{id}'
      );
      expect(params).toEqual({});  // Should not match due to query string
    });
  });
  
  describe('validatePathParams', () => {
    it('should validate correct parameters', () => {
      const result = PathResolver.validatePathParams('/api/issues/{id}', { id: '123' });
      expect(result.isValid).toBe(true);
      expect(result.missingParams).toEqual([]);
    });
    
    it('should detect missing parameters', () => {
      const result = PathResolver.validatePathParams('/api/issues/{id}', {});
      expect(result.isValid).toBe(false);
      expect(result.missingParams).toEqual(['id']);
    });
    
    it('should handle parameter aliases in validation', () => {
      const result = PathResolver.validatePathParams(
        '/api/projects/{organization_slug}/{project_slug}/issues/',
        { org: 'my-org', project: 'my-project' }
      );
      expect(result.isValid).toBe(true);
      expect(result.missingParams).toEqual([]);
    });
  });
  
  describe('findMatchingRoute', () => {
    it('should find matching route for frontend path', () => {
      const result = PathResolver.findMatchingRoute('/api/v1/issues/123', API_PATHS);
      expect(result).not.toBeNull();
      expect(result?.category).toBe('issues');
      expect(result?.operation).toBe('detail');
    });
    
    it('should find matching route for backend path', () => {
      const result = PathResolver.findMatchingRoute('/api/events/123', API_PATHS);
      expect(result).not.toBeNull();
      expect(result?.category).toBe('issues');
      expect(result?.operation).toBe('detail');
    });
    
    it('should return null for non-matching path', () => {
      const result = PathResolver.findMatchingRoute('/api/unknown/123', API_PATHS);
      expect(result).toBeNull();
    });
  });
  
  describe('buildUrlWithParams', () => {
    it('should build URL without query params', () => {
      const result = PathResolver.buildUrlWithParams('/api/issues');
      expect(result).toBe('/api/issues');
    });
    
    it('should build URL with single query param', () => {
      const result = PathResolver.buildUrlWithParams('/api/issues', { status: 'resolved' });
      expect(result).toBe('/api/issues?status=resolved');
    });
    
    it('should build URL with multiple query params', () => {
      const result = PathResolver.buildUrlWithParams('/api/issues', { 
        status: 'resolved',
        sort: 'date',
        limit: 10
      });
      expect(result).toBe('/api/issues?status=resolved&sort=date&limit=10');
    });
    
    it('should handle array query params', () => {
      const result = PathResolver.buildUrlWithParams('/api/issues', { 
        project: ['frontend', 'backend']
      });
      expect(result).toBe('/api/issues?project=frontend&project=backend');
    });
    
    it('should ignore null and undefined values', () => {
      const result = PathResolver.buildUrlWithParams('/api/issues', { 
        status: 'resolved',
        sort: null,
        limit: undefined
      });
      expect(result).toBe('/api/issues?status=resolved');
    });
  });
});
