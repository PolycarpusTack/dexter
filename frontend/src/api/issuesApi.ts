// File: src/api/issuesApi.ts

import apiClient from './apiClient';
import { createErrorHandler } from '../utils/errorHandling';

// Error handler for issues API
const handleIssuesError = createErrorHandler('Issues API Error', {
  context: { apiModule: 'issuesApi' }
});

/**
 * Interface for issue data
 */
export interface Issue {
  id: string;
  title: string;
  count: number;
  status: string;
  firstSeen: string;
  lastSeen: string;
  project: {
    id: string;
    name: string;
    slug?: string;
  };
  [key: string]: any;
}

/**
 * Interface for issues response from API
 */
export interface IssuesResponse {
  issues: Issue[];
  links?: {
    previous?: {
      cursor: string;
      [key: string]: any;
    };
    next?: {
      cursor: string;
      [key: string]: any;
    };
  };
  meta?: Record<string, any>;
}

/**
 * Options for fetching issues
 */
export interface FetchIssuesOptions {
  /** Number of issues to fetch */
  limit?: number;
  /** Cursor for pagination */
  cursor?: string;
  /** Query parameters for filtering */
  query?: string;
  /** Project IDs to filter by */
  project?: string | string[];
  /** Organization ID to filter by */
  organization?: string;
  /** Environment to filter by */
  environment?: string;
  /** Status to filter by */
  status?: string;
  /** Sort field */
  sort?: string;
  /** Stats period */
  statsPeriod?: string;
  /** Start date */
  start?: string;
  /** End date */
  end?: string;
}

/**
 * Interface for issue update response
 */
export interface IssueUpdateResponse {
  id: string;
  status: string;
  [key: string]: any;
}

/**
 * Interface for issue assignment response
 */
export interface IssueAssignmentResponse {
  id: string;
  assignee: {
    id: string;
    name: string;
    email?: string;
  } | null;
  [key: string]: any;
}

/**
 * Interface for issue comment response
 */
export interface IssueCommentResponse {
  id: string;
  comment: string;
  user: {
    id: string;
    name: string;
    email?: string;
  };
  dateCreated: string;
  [key: string]: any;
}

/**
 * Fetch issues with filtering
 * 
 * @param options - Filter and pagination options
 * @returns Promise with issues response
 */
export const fetchIssues = async (
  options: FetchIssuesOptions = {}
): Promise<IssuesResponse> => {
  try {
    return await apiClient.get<IssuesResponse>(
      '/issues',
      { params: options }
    );
  } catch (error) {
    handleIssuesError(error, {
      operation: 'fetchIssues',
      ...options
    });
    throw error;
  }
};

/**
 * Fetch a single issue by ID
 * 
 * @param issueId - Issue ID to fetch
 * @param projectId - Optional project ID
 * @returns Promise with issue data
 */
export const fetchIssue = async (
  issueId: string,
  projectId?: string
): Promise<Issue> => {
  try {
    return await apiClient.get<Issue>(
      `/issue/${issueId}`,
      { params: { project_id: projectId } }
    );
  } catch (error) {
    handleIssuesError(error, {
      operation: 'fetchIssue',
      issueId,
      projectId
    });
    throw error;
  }
};

/**
 * Update an issue's status
 * 
 * @param issueId - Issue ID to update
 * @param status - New status
 * @param projectId - Optional project ID
 * @returns Promise with updated issue data
 */
export const updateIssueStatus = async (
  issueId: string,
  status: string,
  projectId?: string
): Promise<IssueUpdateResponse> => {
  try {
    return await apiClient.put<IssueUpdateResponse>(
      `/issue/${issueId}/status`,
      { status },
      { params: { project_id: projectId } }
    );
  } catch (error) {
    handleIssuesError(error, {
      operation: 'updateIssueStatus',
      issueId,
      status,
      projectId
    });
    throw error;
  }
};

/**
 * Assign an issue to a user
 * 
 * @param issueId - Issue ID to assign
 * @param assigneeId - User ID to assign to (empty for unassign)
 * @param projectId - Optional project ID
 * @returns Promise with assignment response
 */
export const assignIssue = async (
  issueId: string,
  assigneeId: string,
  projectId?: string
): Promise<IssueAssignmentResponse> => {
  try {
    return await apiClient.put<IssueAssignmentResponse>(
      `/issue/${issueId}/assign`,
      { assignee: assigneeId || null },
      { params: { project_id: projectId } }
    );
  } catch (error) {
    handleIssuesError(error, {
      operation: 'assignIssue',
      issueId,
      assigneeId,
      projectId
    });
    throw error;
  }
};

/**
 * Add a comment to an issue
 * 
 * @param issueId - Issue ID to comment on
 * @param comment - Comment text
 * @param projectId - Optional project ID
 * @returns Promise with comment response
 */
export const addIssueComment = async (
  issueId: string,
  comment: string,
  projectId?: string
): Promise<IssueCommentResponse> => {
  try {
    return await apiClient.post<IssueCommentResponse>(
      `/issue/${issueId}/comments`,
      { comment },
      { params: { project_id: projectId } }
    );
  } catch (error) {
    handleIssuesError(error, {
      operation: 'addIssueComment',
      issueId,
      projectId
    });
    throw error;
  }
};

/**
 * Add tags to an issue
 * 
 * @param issueId - Issue ID to tag
 * @param tags - Array of tags to add
 * @param projectId - Optional project ID
 * @returns Promise with updated issue data
 */
export const addIssueTags = async (
  issueId: string,
  tags: string[],
  projectId?: string
): Promise<Issue> => {
  try {
    return await apiClient.post<Issue>(
      `/issue/${issueId}/tags`,
      { tags },
      { params: { project_id: projectId } }
    );
  } catch (error) {
    handleIssuesError(error, {
      operation: 'addIssueTags',
      issueId,
      tags,
      projectId
    });
    throw error;
  }
};

/**
 * Merge issues together
 * 
 * @param targetIssueId - Target issue ID
 * @param issueIds - Issue IDs to merge
 * @param projectId - Optional project ID
 * @returns Promise with merged issue data
 */
export const mergeIssues = async (
  targetIssueId: string,
  issueIds: string[],
  projectId?: string
): Promise<Issue> => {
  try {
    return await apiClient.post<Issue>(
      `/issues/merge`,
      { 
        target: targetIssueId, 
        issues: issueIds 
      },
      { params: { project_id: projectId } }
    );
  } catch (error) {
    handleIssuesError(error, {
      operation: 'mergeIssues',
      targetIssueId,
      issueIds,
      projectId
    });
    throw error;
  }
};

export default {
  fetchIssues,
  fetchIssue,
  updateIssueStatus,
  assignIssue,
  addIssueComment,
  addIssueTags,
  mergeIssues
};
