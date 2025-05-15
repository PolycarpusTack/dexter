/**
 * Tests for Events API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as eventsApi from '../eventsApi';
import enhancedApiClient from '../enhancedApiClient';
import { validateParams } from '../pathResolver';

// Mock the enhanced API client
vi.mock('../enhancedApiClient', () => ({
  default: {
    callEndpoint: vi.fn()
  }
}));

// Mock the path resolver validation
vi.mock('../pathResolver', () => ({
  validateParams: vi.fn()
}));

// Mock error handler
vi.mock('../errorHandler', () => ({
  createErrorHandler: () => vi.fn().mockImplementation((error) => {
    throw error;
  })
}));

describe('Events API', () => {
  const mockEvent = {
    id: 'event123',
    eventID: 'event123',
    message: 'Test event',
    dateCreated: '2023-01-01T00:00:00Z',
    platform: 'javascript'
  };

  const mockEventsResponse = {
    items: [mockEvent],
    pagination: {
      next: 'cursor123',
      previous: null,
      total: 100
    }
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('getEvents', () => {
    it('should fetch events successfully', async () => {
      // Mock validation to return valid
      (validateParams as any).mockReturnValue({ isValid: true, missingParams: [] });
      
      // Mock API client to return events
      (enhancedApiClient.callEndpoint as any).mockResolvedValue(mockEventsResponse);
      
      const result = await eventsApi.getEvents({
        organizationSlug: 'org1',
        projectSlug: 'proj1',
        limit: 10
      });
      
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'events',
        'list',
        { organization_slug: 'org1', project_slug: 'proj1' },
        { query: undefined, cursor: undefined, limit: 10, sort: undefined },
        null,
        undefined
      );
      
      expect(result).toEqual(mockEventsResponse);
    });

    it('should throw an error when validation fails', async () => {
      // Mock validation to return invalid
      (validateParams as any).mockReturnValue({ 
        isValid: false, 
        missingParams: ['project_slug']
      });
      
      await expect(eventsApi.getEvents({
        organizationSlug: 'org1',
        projectSlug: '', // Invalid project slug
      })).rejects.toThrow('Missing required parameter');
    });

    it('should handle API errors', async () => {
      // Mock validation to return valid
      (validateParams as any).mockReturnValue({ isValid: true, missingParams: [] });
      
      // Mock API client to throw an error
      const apiError = new Error('API error');
      (enhancedApiClient.callEndpoint as any).mockRejectedValue(apiError);
      
      await expect(eventsApi.getEvents({
        organizationSlug: 'org1',
        projectSlug: 'proj1',
      })).rejects.toThrow('API error');
    });
  });

  describe('getEvent', () => {
    it('should fetch a single event successfully', async () => {
      // Mock validation to return valid
      (validateParams as any).mockReturnValue({ isValid: true, missingParams: [] });
      
      // Mock API client to return an event
      (enhancedApiClient.callEndpoint as any).mockResolvedValue(mockEvent);
      
      const result = await eventsApi.getEvent('org1', 'proj1', 'event123');
      
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'events',
        'detail',
        { organization_slug: 'org1', project_slug: 'proj1', event_id: 'event123' },
        {},
        null,
        undefined
      );
      
      expect(result).toEqual(mockEvent);
    });

    it('should throw an error when validation fails', async () => {
      // Mock validation to return invalid
      (validateParams as any).mockReturnValue({ 
        isValid: false, 
        missingParams: ['event_id']
      });
      
      await expect(eventsApi.getEvent('org1', 'proj1', '')).rejects.toThrow('Missing required parameter');
    });
  });

  describe('getEventTags', () => {
    it('should fetch event tags successfully', async () => {
      // Mock validation to return valid
      (validateParams as any).mockReturnValue({ isValid: true, missingParams: [] });
      
      // Mock API client to return tags
      const mockTags = [
        { key: 'browser', value: 'Chrome' },
        { key: 'os', value: 'Windows' }
      ];
      (enhancedApiClient.callEndpoint as any).mockResolvedValue(mockTags);
      
      const result = await eventsApi.getEventTags('org1', 'proj1', 'event123');
      
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'events',
        'tags',
        { organization_slug: 'org1', project_slug: 'proj1', event_id: 'event123' },
        {},
        null,
        undefined
      );
      
      expect(result).toEqual(mockTags);
    });
  });

  describe('getRelatedEvents', () => {
    it('should fetch related events successfully', async () => {
      // Mock validation to return valid
      (validateParams as any).mockReturnValue({ isValid: true, missingParams: [] });
      
      // Mock API client to return events
      (enhancedApiClient.callEndpoint as any).mockResolvedValue(mockEventsResponse);
      
      const result = await eventsApi.getRelatedEvents('org1', 'issue123');
      
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'issueEvents',
        'list',
        { organization_slug: 'org1', issue_id: 'issue123' },
        {},
        null,
        undefined
      );
      
      expect(result).toEqual(mockEventsResponse);
    });
  });

  describe('getLatestEvent', () => {
    it('should fetch the latest event successfully', async () => {
      // Mock validation to return valid
      (validateParams as any).mockReturnValue({ isValid: true, missingParams: [] });
      
      // Mock API client to return an event
      (enhancedApiClient.callEndpoint as any).mockResolvedValue(mockEvent);
      
      const result = await eventsApi.getLatestEvent('org1', 'issue123');
      
      expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
        'issueEvents',
        'latest',
        { organization_slug: 'org1', issue_id: 'issue123' },
        {},
        null,
        undefined
      );
      
      expect(result).toEqual(mockEvent);
    });
  });
});