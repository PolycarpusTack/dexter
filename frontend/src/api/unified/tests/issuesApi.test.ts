/**
 * Tests for Issues API
 * 
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as issuesApi from '../issuesApi';
import enhancedApiClient from '../enhancedApiClient';
import { validateParams } from '../pathResolver';

// Mock the API client and path resolver
vi.mock('../enhancedApiClient', () => ({
  default: {
    callEndpoint: vi.fn()
  }
}));

vi.mock('../pathResolver', () => ({
  validateParams: vi.fn()
}));

describe('Issues API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('getIssues', () => {
    beforeEach(() => {
      // Mock validateParams to return valid result
      (validateParams as any).mockReturnValue({ isValid: true, missingParams: [] });
    });
    
    it('should call the API with correct parameters', async () => {
      // Setup mock response
      (enhancedApiClient.callEndpoint as any).mockResolvedValueOnce({
        items: [{ id: '1', title: 'Test Issue' }]
      });
      
      // Call the function
      const result = await issuesApi.getIssues({
        organizationSlug: 'org1',
        projectSlug: 'proj1',
        status: 'unresolved',
        query: 'test',
        limit: 10
      });
      
      // Verify API call
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'issues',
        'list',
        { organization_slug: 'org1', project_slug: 'proj1' },
        { status: 'unresolved', query: 'test', cursor: undefined, limit: 10 },
        null,
        undefined
      );
      
      // Verify result
      expect(result.items).toEqual([{ id: '1', title: 'Test Issue' }]);
    });
    
    it('should handle invalid parameters', async () => {
      // Setup mock validation error
      (validateParams as any).mockReturnValue({ 
        isValid: false, 
        missingParams: ['project_slug'] 
      });
      
      // Expect error
      await expect(issuesApi.getIssues({
        organizationSlug: 'org1',
        projectSlug: '', // Invalid
      })).rejects.toThrow('Missing required parameters');
      
      // Verify API call was not made
      expect(enhancedApiClient.callEndpoint).not.toHaveBeenCalled();
    });
    
    it('should handle API errors', async () => {
      // Setup mock API error
      (enhancedApiClient.callEndpoint as any).mockRejectedValueOnce(
        new Error('API error')
      );
      
      // Expect error
      await expect(issuesApi.getIssues({
        organizationSlug: 'org1',
        projectSlug: 'proj1',
      })).rejects.toThrow('API error');
    });
    
    it('should handle validation errors gracefully', async () => {
      // Setup mock response with invalid data
      (enhancedApiClient.callEndpoint as any).mockResolvedValueOnce({
        // Missing 'items' and 'issues' arrays
        something: 'else'
      });
      
      // Call the function (should not throw)
      const result = await issuesApi.getIssues({
        organizationSlug: 'org1',
        projectSlug: 'proj1',
      });
      
      // Verify result has been normalized
      expect(result.items).toEqual([]);
    });
  });
  
  describe('getIssue', () => {
    beforeEach(() => {
      // Mock validateParams to return valid result
      (validateParams as any).mockReturnValue({ isValid: true, missingParams: [] });
    });
    
    it('should call the API with correct parameters', async () => {
      // Setup mock response
      (enhancedApiClient.callEndpoint as any).mockResolvedValueOnce({
        id: '123',
        title: 'Test Issue',
        status: 'unresolved'
      });
      
      // Call the function
      const result = await issuesApi.getIssue('org1', '123');
      
      // Verify API call
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'issues',
        'detail',
        { organization_slug: 'org1', issue_id: '123' },
        {},
        null,
        undefined
      );
      
      // Verify result
      expect(result).toEqual({
        id: '123',
        title: 'Test Issue',
        status: 'unresolved'
      });
    });
  });
  
  describe('updateIssue', () => {
    beforeEach(() => {
      // Mock validateParams to return valid result
      (validateParams as any).mockReturnValue({ isValid: true, missingParams: [] });
    });
    
    it('should call the API with correct parameters', async () => {
      // Setup mock response
      (enhancedApiClient.callEndpoint as any).mockResolvedValueOnce({
        id: '123',
        title: 'Test Issue',
        status: 'resolved'
      });
      
      // Call the function
      const result = await issuesApi.updateIssue('org1', '123', { status: 'resolved' });
      
      // Verify API call
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'issues',
        'update',
        { organization_slug: 'org1', issue_id: '123' },
        {},
        { status: 'resolved' },
        undefined
      );
      
      // Verify result
      expect(result).toEqual({
        id: '123',
        title: 'Test Issue',
        status: 'resolved'
      });
    });
  });
  
  describe('bulkUpdateIssues', () => {
    beforeEach(() => {
      // Mock validateParams to return valid result
      (validateParams as any).mockReturnValue({ isValid: true, missingParams: [] });
    });
    
    it('should call the API with correct parameters', async () => {
      // Setup mock response
      (enhancedApiClient.callEndpoint as any).mockResolvedValueOnce({
        issueIds: ['123', '456']
      });
      
      // Call the function
      const result = await issuesApi.bulkUpdateIssues({
        organizationSlug: 'org1',
        projectSlug: 'proj1',
        issueIds: ['123', '456'],
        data: { status: 'resolved' }
      });
      
      // Verify API call
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'issues',
        'bulk',
        { organization_slug: 'org1', project_slug: 'proj1' },
        {},
        { 
          ids: ['123', '456'],
          status: 'resolved'
        },
        undefined
      );
      
      // Verify result
      expect(result).toEqual({
        issueIds: ['123', '456']
      });
    });
  });
});