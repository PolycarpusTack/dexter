/**
 * Events API Module
 * 
 * This module provides methods for interacting with event-related endpoints.
 */
import client from './client';
import { resolveApiPath, loadApiConfig } from './config';

/**
 * Events API class
 */
export class EventsApi {
  /**
   * Get a list of events
   */
  static async getEvents(org, project, options = {}) {
    const path = await resolveApiPath('events.list', { org, project });
    
    return client.get(path, {
      params: options,
      deduplicate: !options.refresh
    });
  }

  /**
   * Get details for a specific event
   */
  static async getEventDetails(org, project, eventId, options = {}) {
    const path = await resolveApiPath('events.detail', { org, project, id: eventId });
    
    return client.get(path, {
      params: options,
      deduplicate: !options.refresh
    });
  }

  /**
   * Get events for a specific issue
   */
  static async getIssueEvents(org, issueId, options = {}) {
    const path = await resolveApiPath('events.issue_events', { org, issue_id: issueId });
    
    return client.get(path, {
      params: options,
      deduplicate: !options.refresh
    });
  }

  /**
   * Get the latest event for an issue
   */
  static async getLatestEvent(org, issueId) {
    const path = await resolveApiPath('events.latest', { org, issue_id: issueId });
    
    return client.get(path);
  }

  /**
   * Get the oldest event for an issue
   */
  static async getOldestEvent(org, issueId) {
    const path = await resolveApiPath('events.oldest', { org, issue_id: issueId });
    
    return client.get(path);
  }

  /**
   * Get tag values for a project
   */
  static async getTagValues(org, project, tagKey, options = {}) {
    const path = await resolveApiPath('events.tag_values', { org, project, key: tagKey });
    
    return client.get(path, {
      params: options,
      deduplicate: !options.refresh
    });
  }

  /**
   * Get the distribution of a tag across events
   */
  static async getTagDistribution(org, project, tagKey, options = {}) {
    const path = await resolveApiPath('events.tag_distribution', { org, project, key: tagKey });
    
    return client.get(path, {
      params: options,
      deduplicate: !options.refresh
    });
  }

  /**
   * Search event tags with a prefix
   */
  static async searchTags(org, project, query, options = {}) {
    const path = await resolveApiPath('events.search_tags', { org, project });
    
    return client.get(path, {
      params: {
        query,
        ...options
      }
    });
  }

  /**
   * Get stacktrace for a specific event
   */
  static async getEventStacktrace(org, project, eventId) {
    const path = await resolveApiPath('events.stacktrace', { org, project, id: eventId });
    
    return client.get(path);
  }

  /**
   * Get event attachments
   */
  static async getEventAttachments(org, project, eventId) {
    const path = await resolveApiPath('events.attachments', { org, project, id: eventId });
    
    return client.get(path);
  }
}

// Initialize config when module is loaded
loadApiConfig();

// Export default instance
export default EventsApi;
