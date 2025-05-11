// Tests for path mappings
import { ApiPathManager, ApiEndpointConfig, HttpMethod } from '../pathMappings';

describe('ApiPathManager', () => {
  let pathManager: ApiPathManager;

  beforeEach(() => {
    pathManager = new ApiPathManager();
  });

  describe('getEndpoint', () => {
    it('should return endpoint configuration', () => {
      const endpoint = pathManager.getEndpoint('listIssues');
      expect(endpoint).toBeDefined();
      expect(endpoint?.name).toBe('listIssues');
      expect(endpoint?.method).toBe(HttpMethod.GET);
    });

    it('should return undefined for unknown endpoint', () => {
      const endpoint = pathManager.getEndpoint('nonExistent');
      expect(endpoint).toBeUndefined();
    });
  });

  describe('resolveFrontendPath', () => {
    it('should resolve frontend path with parameters', () => {
      const path = pathManager.resolveFrontendPath('getIssue', {
        issue_id: '123'
      });
      expect(path).toBe('/api/v1/issues/123');
    });

    it('should throw error for unknown endpoint', () => {
      expect(() => {
        pathManager.resolveFrontendPath('nonExistent', {});
      }).toThrow('Unknown endpoint: nonExistent');
    });
  });

  describe('resolveBackendPath', () => {
    it('should resolve backend path with parameters', () => {
      const path = pathManager.resolveBackendPath('listIssues', {
        organization_slug: 'test-org',
        project_slug: 'test-project'
      });
      expect(path).toBe('/organizations/test-org/projects/test-project/issues');
    });
  });

  describe('resolveSentryPath', () => {
    it('should resolve Sentry path with parameters', () => {
      const path = pathManager.resolveSentryPath('listIssues', {
        organization_slug: 'test-org',
        project_slug: 'test-project'
      });
      expect(path).toBe('/api/0/projects/test-org/test-project/issues/');
    });
  });

  describe('validateParams', () => {
    it('should validate all required params are present', () => {
      const result = pathManager.validateParams('listIssues', {
        organization_slug: 'test-org',
        project_slug: 'test-project'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.missingParams).toHaveLength(0);
    });

    it('should detect missing required params', () => {
      const result = pathManager.validateParams('listIssues', {
        organization_slug: 'test-org'
        // Missing project_slug
      });
      
      expect(result.isValid).toBe(false);
      expect(result.missingParams).toContain('project_slug');
    });

    it('should handle unknown endpoint', () => {
      const result = pathManager.validateParams('nonExistent', {});
      
      expect(result.isValid).toBe(false);
      expect(result.missingParams[0]).toContain('Unknown endpoint');
    });
  });

  describe('listEndpoints', () => {
    it('should return all endpoint names', () => {
      const endpoints = pathManager.listEndpoints();
      expect(endpoints).toContain('listIssues');
      expect(endpoints).toContain('getIssue');
      expect(endpoints).toContain('updateIssue');
    });
  });

  describe('getEndpointsByMethod', () => {
    it('should return endpoints filtered by HTTP method', () => {
      const getEndpoints = pathManager.getEndpointsByMethod(HttpMethod.GET);
      expect(getEndpoints.length).toBeGreaterThan(0);
      expect(getEndpoints.every(e => e.method === HttpMethod.GET)).toBe(true);
      
      const postEndpoints = pathManager.getEndpointsByMethod(HttpMethod.POST);
      expect(postEndpoints.length).toBeGreaterThan(0);
      expect(postEndpoints.every(e => e.method === HttpMethod.POST)).toBe(true);
    });
  });

  describe('getCachedEndpoints', () => {
    it('should return only endpoints with cache TTL', () => {
      const cachedEndpoints = pathManager.getCachedEndpoints();
      expect(cachedEndpoints.length).toBeGreaterThan(0);
      expect(cachedEndpoints.every(e => e.cacheTTL !== undefined)).toBe(true);
    });
  });
});

describe('ApiEndpointConfig', () => {
  let endpoint: ApiEndpointConfig;

  beforeEach(() => {
    endpoint = new ApiEndpointConfig(
      'testEndpoint',
      '/api/v1/test/{id}',
      '/backend/test/{id}',
      '/sentry/test/{id}/',
      HttpMethod.GET,
      ['id'],
      ['filter'],
      true,
      300,
      'Test endpoint'
    );
  });

  describe('resolveFrontendPath', () => {
    it('should replace path parameters', () => {
      const path = endpoint.resolveFrontendPath({ id: '123' });
      expect(path).toBe('/api/v1/test/123');
    });

    it('should handle multiple parameters', () => {
      const complexEndpoint = new ApiEndpointConfig(
        'complex',
        '/api/v1/{org}/{project}/test/{id}',
        '',
        '',
        HttpMethod.GET
      );
      
      const path = complexEndpoint.resolveFrontendPath({
        org: 'my-org',
        project: 'my-project',
        id: '123'
      });
      
      expect(path).toBe('/api/v1/my-org/my-project/test/123');
    });
  });
});
