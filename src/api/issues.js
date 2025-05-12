/**
 * Issues API Module
 * 
 * This module provides methods for interacting with issue-related endpoints.
 */
import client from './client';
import { resolveApiPath, loadApiConfig } from './config';

/**
 * Issues API class
 */
export class IssuesApi {
  /**
   * Get a list of issues
   */
  static async getIssues(org, project, options = {}) {
    const path = await resolveApiPath('issues.list', { org, project });
    
    return client.get(path, {
      params: options,
      deduplicate: !options.refresh
    });
  }

  /**
   * Get details for a specific issue
   */
  static async getIssueDetails(org, issueId, options = {}) {
    const path = await resolveApiPath('issues.detail', { org, id: issueId });
    
    return client.get(path, {
      params: options,
      deduplicate: !options.refresh
    });
  }

  /**
   * Update an issue
   */
  static async updateIssue(org, issueId, data) {
    const path = await resolveApiPath('issues.update', { org, id: issueId });
    
    return client.put(path, data);
  }

  /**
   * Delete an issue
   */
  static async deleteIssue(org, issueId) {
    const path = await resolveApiPath('issues.delete', { org, id: issueId });
    
    return client.delete(path);
  }

  /**
   * Assign an issue to a user
   */
  static async assignIssue(org, issueId, assignee) {
    const path = await resolveApiPath('issues.assign', { org, id: issueId });
    
    return client.put(path, { assignee });
  }

  /**
   * Mark issue as resolved
   */
  static async resolveIssue(org, issueId, resolution = 'fixed') {
    const path = await resolveApiPath('issues.update', { org, id: issueId });
    
    return client.put(path, { status: 'resolved', resolution });
  }

  /**
   * Mark issue as ignored
   */
  static async ignoreIssue(org, issueId, ignoreDuration = null, ignoreCount = null) {
    const path = await resolveApiPath('issues.update', { org, id: issueId });
    
    const data = { status: 'ignored' };
    
    if (ignoreDuration) {
      data.ignoreDuration = ignoreDuration;
    }
    
    if (ignoreCount) {
      data.ignoreCount = ignoreCount;
    }
    
    return client.put(path, data);
  }

  /**
   * Get issue tags
   */
  static async getIssueTags(org, issueId) {
    const path = await resolveApiPath('issues.tags', { org, id: issueId });
    
    return client.get(path);
  }

  /**
   * Merge issues
   */
  static async mergeIssues(org, target, sources) {
    const path = await resolveApiPath('issues.merge', { org });
    
    return client.post(path, {
      target,
      sources
    });
  }

  /**
   * Bulk update issues
   */
  static async bulkUpdate(org, issueIds, data) {
    const path = await resolveApiPath('issues.bulk_update', { org });
    
    return client.post(path, {
      issues: issueIds,
      ...data
    });
  }

  /**
   * Get issue comments
   */
  static async getIssueComments(org, issueId) {
    const path = await resolveApiPath('issues.comments', { org, id: issueId });
    
    return client.get(path);
  }

  /**
   * Add a comment to an issue
   */
  static async addIssueComment(org, issueId, comment) {
    const path = await resolveApiPath('issues.add_comment', { org, id: issueId });
    
    return client.post(path, { comment });
  }
}

// Initialize config when module is loaded
loadApiConfig();

// Export default instance
export default IssuesApi;
