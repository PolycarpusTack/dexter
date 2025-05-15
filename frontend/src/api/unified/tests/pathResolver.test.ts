/**
 * Tests for Path Resolver
 * 
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  categoryExists,
  endpointExists,
  resolvePath,
  replacePlaceholders,
  getFullUrl,
  getMethod,
  validateParams,
  PathResolutionError
} from '../pathResolver';
import { HttpMethod } from '../types';

// Test configuration
const testConfig = {
  baseUrl: 'https://api.example.com',
  categories: {
    issues: {
      basePath: '/organizations/{organization_slug}/projects/{project_slug}',
      endpoints: {
        list: {
          name: 'listIssues',
          path: '/issues',
          method: HttpMethod.GET,
          description: 'List issues'
        },
        detail: {
          name: 'getIssue',
          path: '/issues/{issue_id}',
          method: HttpMethod.GET,
          description: 'Get issue details'
        }
      }
    },
    users: {
      basePath: '/users',
      endpoints: {
        detail: {
          name: 'getUser',
          path: '/{user_id}',
          method: HttpMethod.GET,
          description: 'Get user details'
        }
      }
    }
  }
};

describe('Path Resolver', () => {
  describe('categoryExists', () => {
    it('should return true for existing categories', () => {
      expect(categoryExists('issues', testConfig)).toBe(true);
      expect(categoryExists('users', testConfig)).toBe(true);
    });
    
    it('should return false for non-existent categories', () => {
      expect(categoryExists('nonexistent', testConfig)).toBe(false);
    });
  });
  
  describe('endpointExists', () => {
    it('should return true for existing endpoints', () => {
      expect(endpointExists('issues', 'list', testConfig)).toBe(true);
      expect(endpointExists('issues', 'detail', testConfig)).toBe(true);
      expect(endpointExists('users', 'detail', testConfig)).toBe(true);
    });
    
    it('should return false for non-existent endpoints', () => {
      expect(endpointExists('issues', 'nonexistent', testConfig)).toBe(false);
      expect(endpointExists('nonexistent', 'list', testConfig)).toBe(false);
    });
  });
  
  describe('replacePlaceholders', () => {
    it('should replace placeholders with provided values', () => {
      const template = '/users/{user_id}/posts/{post_id}';
      const params = { user_id: '123', post_id: '456' };
      
      expect(replacePlaceholders(template, params)).toBe('/users/123/posts/456');
    });
    
    it('should URL encode parameter values', () => {
      const template = '/users/{user_name}';
      const params = { user_name: 'John Doe' };
      
      expect(replacePlaceholders(template, params)).toBe('/users/John%20Doe');
    });
    
    it('should throw an error if a parameter is missing', () => {
      const template = '/users/{user_id}';
      const params = { not_user_id: '123' };
      
      expect(() => replacePlaceholders(template, params)).toThrow('Missing required parameter: user_id');
    });
  });
  
  describe('resolvePath', () => {
    it('should resolve path with base path and endpoint path', () => {
      const path = resolvePath('issues', 'list', {
        organization_slug: 'org1',
        project_slug: 'proj1'
      }, testConfig);
      
      expect(path).toBe('/organizations/org1/projects/proj1/issues');
    });
    
    it('should resolve path with additional path parameters', () => {
      const path = resolvePath('issues', 'detail', {
        organization_slug: 'org1',
        project_slug: 'proj1',
        issue_id: '123'
      }, testConfig);
      
      expect(path).toBe('/organizations/org1/projects/proj1/issues/123');
    });
    
    it('should throw an error for unknown category', () => {
      expect(() => resolvePath('unknown', 'list', {}, testConfig))
        .toThrow(PathResolutionError);
    });
    
    it('should throw an error for unknown endpoint', () => {
      expect(() => resolvePath('issues', 'unknown', {}, testConfig))
        .toThrow(PathResolutionError);
    });
    
    it('should throw an error for missing parameters', () => {
      expect(() => resolvePath('issues', 'list', {}, testConfig))
        .toThrow();
    });
  });
  
  describe('getFullUrl', () => {
    it('should combine base URL with resolved path', () => {
      const url = getFullUrl('issues', 'list', {
        organization_slug: 'org1',
        project_slug: 'proj1'
      }, testConfig);
      
      expect(url).toBe('https://api.example.com/organizations/org1/projects/proj1/issues');
    });
  });
  
  describe('getMethod', () => {
    it('should return the correct HTTP method', () => {
      expect(getMethod('issues', 'list', testConfig)).toBe(HttpMethod.GET);
    });
    
    it('should throw an error for unknown category', () => {
      expect(() => getMethod('unknown', 'list', testConfig))
        .toThrow(PathResolutionError);
    });
    
    it('should throw an error for unknown endpoint', () => {
      expect(() => getMethod('issues', 'unknown', testConfig))
        .toThrow(PathResolutionError);
    });
  });
  
  describe('validateParams', () => {
    it('should validate required parameters correctly', () => {
      const result = validateParams('issues', 'list', {
        organization_slug: 'org1',
        project_slug: 'proj1'
      }, testConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.missingParams).toEqual([]);
    });
    
    it('should detect missing parameters', () => {
      const result = validateParams('issues', 'list', {
        organization_slug: 'org1'
        // Missing project_slug
      }, testConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.missingParams).toContain('project_slug');
    });
    
    it('should detect unknown endpoint', () => {
      const result = validateParams('unknown', 'list', {}, testConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.missingParams[0]).toContain('Unknown endpoint');
    });
  });
});