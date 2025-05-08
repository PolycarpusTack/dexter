// File: frontend/src/api/issuesApi.ts

import { apiClient } from './apiClient';
import ErrorFactory from '../utils/errorFactory';
import { createErrorHandler } from '../utils/errorHandling';

/**
 * Interface for issue list query options
 */
export interface IssueListOptions {
  /** Filter by status ('unresolved', 'resolved', 'ignored', 'all') */
  status?: string;
  /** Text search term */
  query?: string;
  /** Pagination cursor */
  cursor?: string;
}

/**
 * Interface for issue status update options
 */
export interface IssueStatusUpdateOptions {
  /** New status ('resolved', 'unresolved', 'ignored') */
  status: string;
  /** If status is 'ignored', duration in minutes */
  ignoreDuration?: number;
}

/**
 * Interface for issue export options
 */
export interface IssueExportOptions {
  /** Export format ('csv' or 'json') */
  format?: 'csv' | 'json';
  /** Filter by status */
  status?: string;
  /** Text search term */
  query?: string;
}

/**
 * Interface for the issue data structure
 */
export interface Issue {
  id: string;
  shortId?: string;
  title: string;
  culprit?: string;
  level: string;
  status: string;
  count: number;
  userCount: number;
  lastSeen: string;
  firstSeen: string;
  [key: string]: any;
}

/**
 * Interface for pagination information
 */
export interface Pagination {
  next: string | null;
  previous: string | null;
}

/**
 * Interface for issue list response
 */
export interface IssueListResponse {
  data: Issue[];
  pagination: Pagination;
}

// Error handler factory for issues API
const handleIssuesError = createErrorHandler('Issue API Error');

/**
 * Fetches a list of issues for a project
 * 
 * @param organizationSlug - Organization slug
 * @param projectSlug - Project slug
 * @param options - Query options
 * @returns Promise resolving to the API response
 */
export const getProjectIssues = async (
  organizationSlug: string, 
  projectSlug: string, 
  options: IssueListOptions = {}
): Promise<IssueListResponse> => {
  try {
    const { status, query, cursor } = options;
    
    // Log the request to help with debugging
    console.log(`Fetching issues for ${organizationSlug}/${projectSlug} with params:`, { status, query, cursor });
    
    // Use the enhanced API client with automatic retry
    const response = await apiClient.get<IssueListResponse>(
      `/organizations/${organizationSlug}/projects/${projectSlug}/issues`, 
      { params: { status, query, cursor } }
    );
    
    return response;
  } catch (error) {
    console.error('Error fetching project issues:', error);
    
    // Return mock data if there's an error and in development mode
    if (import.meta.env.DEV) {
      console.log('Returning mock data in development mode');
      const mockResponse: IssueListResponse = {
        data: [
          {
            id: 'mock-issue-1',
            shortId: 'MOCK-1',
            title: 'Mock Issue 1',
            level: 'error',
            status: 'unresolved',
            count: 5,
            userCount: 2,
            lastSeen: new Date().toISOString(),
            firstSeen: new Date().toISOString(),
          },
          {
            id: 'mock-issue-2',
            shortId: 'MOCK-2',
            title: 'Mock Issue 2',
            level: 'warning',
            status: 'unresolved',
            count: 3,
            userCount: 1,
            lastSeen: new Date().toISOString(),
            firstSeen: new Date().toISOString(),
          }
        ],
        pagination: {
          next: null,
          previous: null
        }
      };
      return mockResponse;
    }
    
    // Use our error handler which will show a notification and log to Sentry
    handleIssuesError(error);
    
    // Convert the error to an EnhancedError and rethrow
    throw ErrorFactory.create(error, {
      category: 'client_error',
      metadata: {
        organizationSlug,
        projectSlug,
        options
      }
    });
  }
};

/**
 * Interface for React Query parameters
 */
export interface FetchIssuesQueryParams {
  /** Organization slug */
  organizationSlug: string;
  /** Project slug */
  projectSlug: string;
  /** Status filter */
  statusFilter?: string;
  /** Search query */
  searchQuery?: string;
  /** Pagination cursor */
  cursor?: string;
}

/**
 * Function used by EventTable component for React Query
 */
export const fetchIssuesList = async (params: FetchIssuesQueryParams): Promise<IssueListResponse> => {
  const { organizationSlug, projectSlug, statusFilter, searchQuery, cursor } = params;
  
  try {
    const response = await getProjectIssues(
      organizationSlug, 
      projectSlug, 
      {
        status: statusFilter,
        query: searchQuery,
        cursor: cursor
      }
    );
    
    return response;
  } catch (error) {
    console.error('Error in fetchIssuesList:', error);
    throw error; // React Query will handle this error
  }
};

/**
 * Updates the status of an issue
 * 
 * @param issueId - The ID of the issue to update
 * @param options - Status update options
 * @returns Promise resolving to the API response
 */
export const updateIssueStatus = async (
  issueId: string, 
  options: IssueStatusUpdateOptions
): Promise<any> => {
  try {
    const { status, ignoreDuration } = options;
    const payload: IssueStatusUpdateOptions = { status };
    
    if (status === 'ignored' && ignoreDuration) {
      payload.ignoreDuration = ignoreDuration;
    }
    
    const response = await apiClient.put(
      `/issues/${issueId}/status`,
      payload
    );
    
    return response;
  } catch (error) {
    console.error('Error updating issue status:', error);
    
    // Use our error handler
    handleIssuesError(error);
    
    // Convert the error to an EnhancedError and rethrow
    throw ErrorFactory.create(error, {
      category: 'client_error',
      metadata: {
        issueId,
        options
      }
    });
  }
};

/**
 * Exports issues as CSV or JSON
 * 
 * @param organizationSlug - Organization slug
 * @param projectSlug - Project slug
 * @param options - Export options
 * @returns Promise resolving to the file data
 */
export const exportIssues = async (
  organizationSlug: string, 
  projectSlug: string, 
  options: IssueExportOptions = {}
): Promise<Blob> => {
  const { format = 'csv', status, query } = options;
  
  try {
    // For file downloads, we need to use the raw axios instance
    const response = await apiClient.getAxiosInstance().get(
      `/${organizationSlug}/projects/${projectSlug}/issues/export`,
      {
        params: { format, status, query },
        responseType: 'blob', // Important for file downloads
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error exporting issues:', error);
    
    // Use our error handler
    handleIssuesError(error);
    
    // Convert the error to an EnhancedError and rethrow
    throw ErrorFactory.create(error, {
      category: 'client_error',
      metadata: {
        organizationSlug,
        projectSlug,
        options
      }
    });
  }
};

export default {
  getProjectIssues,
  fetchIssuesList,
  updateIssueStatus,
  exportIssues
};
