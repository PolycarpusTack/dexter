// Enhanced issues API using path resolution
import { enhancedApiClient } from './enhancedApiClient';
import { Issue, IssuesResponse, FetchIssuesOptions } from './issuesApi';
import { createErrorHandler } from '../utils/errorHandling';

// Error handler for issues API
const handleIssuesError = createErrorHandler('Enhanced Issues API Error', {
  context: { apiModule: 'enhancedIssuesApi' }
});

/**
 * Enhanced Issues API with path resolution and standardized calls
 */
export const enhancedIssuesApi = {
  /**
   * Fetch issues with filtering using path resolution
   */
  async fetchIssues(options: FetchIssuesOptions & { 
    organization_slug: string; 
    project_slug: string 
  }): Promise<IssuesResponse> {
    try {
      const params = {
        organization_slug: options.organization_slug,
        project_slug: options.project_slug,
        limit: options.limit,
        cursor: options.cursor,
        query: options.query,
        status: options.status,
        environment: options.environment,
      };

      const response = await enhancedApiClient.listIssues(params);
      
      // Ensure response structure
      return {
        ...response,
        issues: response.issues || response.items || response.data || [],
        items: response.items || response.issues || response.data || [],
        count: response.count || response.meta?.total || 0,
      };
    } catch (error) {
      handleIssuesError(error, {
        operation: 'fetchIssues',
        ...options
      });
      throw error;
    }
  },

  /**
   * Fetch a single issue by ID using path resolution
   */
  async fetchIssue(params: {
    organization_slug: string;
    issue_id: string;
  }): Promise<Issue> {
    try {
      return await enhancedApiClient.getIssue(params);
    } catch (error) {
      handleIssuesError(error, {
        operation: 'fetchIssue',
        ...params
      });
      throw error;
    }
  },

  /**
   * Update an issue's status using path resolution
   */
  async updateIssueStatus(params: {
    organization_slug: string;
    issue_id: string;
    status: string;
  }) {
    try {
      return await enhancedApiClient.updateIssue(
        { 
          organization_slug: params.organization_slug, 
          issue_id: params.issue_id 
        },
        { status: params.status }
      );
    } catch (error) {
      handleIssuesError(error, {
        operation: 'updateIssueStatus',
        ...params
      });
      throw error;
    }
  },

  /**
   * Bulk update issues using path resolution
   */
  async bulkUpdateIssues(params: {
    organization_slug: string;
    project_slug: string;
    issueIds?: string[];
    status?: string;
    updates: any;
  }) {
    try {
      return await enhancedApiClient.bulkUpdateIssues(
        {
          organization_slug: params.organization_slug,
          project_slug: params.project_slug,
          id: params.issueIds,
          status: params.status,
        },
        params.updates
      );
    } catch (error) {
      handleIssuesError(error, {
        operation: 'bulkUpdateIssues',
        ...params
      });
      throw error;
    }
  },

  /**
   * Assign an issue to a user using path resolution
   */
  async assignIssue(params: {
    organization_slug: string;
    issue_id: string;
    assignee_id: string | null;
  }) {
    try {
      return await enhancedApiClient.assignIssue(
        {
          organization_slug: params.organization_slug,
          issue_id: params.issue_id,
        },
        { assignee: params.assignee_id }
      );
    } catch (error) {
      handleIssuesError(error, {
        operation: 'assignIssue',
        ...params
      });
      throw error;
    }
  },

  /**
   * List tags for an issue using path resolution
   */
  async listIssueTags(params: {
    organization_slug: string;
    issue_id: string;
  }) {
    try {
      return await enhancedApiClient.listIssueTags(params);
    } catch (error) {
      handleIssuesError(error, {
        operation: 'listIssueTags',
        ...params
      });
      throw error;
    }
  },

  /**
   * Add tags to an issue using path resolution
   */
  async addIssueTags(params: {
    organization_slug: string;
    issue_id: string;
    tags: string[];
  }) {
    try {
      return await enhancedApiClient.addIssueTags(
        {
          organization_slug: params.organization_slug,
          issue_id: params.issue_id,
        },
        { tags: params.tags }
      );
    } catch (error) {
      handleIssuesError(error, {
        operation: 'addIssueTags',
        ...params
      });
      throw error;
    }
  },

  /**
   * Get endpoint information
   */
  getEndpointInfo(endpointName: string) {
    return enhancedApiClient.getEndpointInfo(endpointName);
  },

  /**
   * List available endpoints
   */
  listEndpoints() {
    return enhancedApiClient.listEndpoints();
  },
};

export default enhancedIssuesApi;
