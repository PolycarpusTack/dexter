/**
 * Issues API Module
 * 
 * This file provides methods for interacting with the Issues API.
 * It includes types, validation schemas, and API client methods.
 */

import { z } from 'zod';
import enhancedApiClient from './enhancedApiClient';
import { createErrorHandler } from './errorHandler';
import { validateParams } from './pathResolver.js';

/**
 * Error handler for Issues API
 */
const handleIssuesError = createErrorHandler({
  module: 'IssuesAPI',
  showNotifications: true,
  logToConsole: true
});

/**
 * Issue model validation schema
 */
export const issueSchema = z.object({
  id: z.string(),
  title: z.string(),
  shortId: z.string().optional(),
  status: z.string(),
  level: z.string().optional(),
  project: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string().optional()
  }).optional(),
  culprit: z.string().optional(),
  firstSeen: z.string().optional(),
  lastSeen: z.string().optional(),
  count: z.number().optional(),
  userCount: z.number().optional(),
  permalink: z.string().optional(),
  type: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Issues response validation schema
 */
export const issuesResponseSchema = z.object({
  items: z.array(issueSchema).or(z.array(z.any())),
  issues: z.array(issueSchema).or(z.array(z.any())).optional(),
  links: z.object({
    previous: z.object({ cursor: z.string() }).optional(),
    next: z.object({ cursor: z.string() }).optional()
  }).optional(),
  pagination: z.object({
    next: z.string().optional().nullable(),
    previous: z.string().optional().nullable(),
    total: z.number().optional()
  }).optional()
});

/**
 * Issue comment validation schema
 */
export const issueCommentSchema = z.object({
  id: z.string(),
  text: z.string(),
  dateCreated: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional()
  }).optional()
});

// Type inferences from Zod schemas
export type Issue = z.infer<typeof issueSchema>;
export type IssuesResponse = z.infer<typeof issuesResponseSchema>;
export type IssueComment = z.infer<typeof issueCommentSchema>;

/**
 * Interface for issue fetch options
 */
export interface FetchIssuesOptions {
  /** Organization slug */
  organizationSlug: string;
  /** Project slug */
  projectSlug: string;
  /** Status filter (resolved, unresolved, ignored, all) */
  status?: string;
  /** Search query */
  query?: string;
  /** Pagination cursor */
  cursor?: string;
  /** Number of items per page */
  limit?: number;
  /** Custom API call options */
  options?: Record<string, any>;
}

/**
 * Interface for issue update data
 */
export interface IssueUpdateData {
  /** New status for the issue (resolved, unresolved, ignored) */
  status?: string;
  /** Assignee ID or null to unassign */
  assignee?: string | null;
  /** Whether the issue is subscribed */
  isSubscribed?: boolean;
  /** Whether the issue is bookmarked */
  isBookmarked?: boolean;
  /** Whether the issue is public */
  isPublic?: boolean;
  /** Whether the issue has seen */
  hasSeen?: boolean;
}

/**
 * Interface for bulk update options
 */
export interface BulkUpdateOptions {
  /** Organization slug */
  organizationSlug: string;
  /** Project slug */
  projectSlug: string;
  /** Issue IDs to update */
  issueIds: string[];
  /** Update data */
  data: IssueUpdateData;
  /** Custom API call options */
  options?: Record<string, any>;
}

/**
 * Get a list of issues
 * 
 * @param options - Fetch options
 * @returns Promise with issues response
 */
export const getIssues = async (options: FetchIssuesOptions): Promise<IssuesResponse> => {
  const { organizationSlug, projectSlug, status, query, cursor, limit, options: apiOptions } = options;
  
  // Validate required parameters
  const validation = validateParams(
    'issues',
    'list',
    { organization_slug: organizationSlug, project_slug: projectSlug }
  );
  
  if (!validation.isValid) {
    handleIssuesError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'getIssues', context: options }
    );
  }
  
  try {
    // Build query parameters
    const queryParams = {
      status,
      query,
      cursor,
      limit
    };
    
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'issues',
      'list',
      { organization_slug: organizationSlug, project_slug: projectSlug },
      queryParams,
      null,
      apiOptions
    );
    
    // Validate and transform response
    try {
      const validated = issuesResponseSchema.parse(response);
      
      // Ensure we have items for consistency
      if (!validated.items && validated.issues) {
        validated.items = validated.issues;
      } else if (!validated.items) {
        validated.items = [];
      }
      
      return validated;
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Issues response validation failed:', validationError);
      return response as IssuesResponse;
    }
  } catch (error) {
    handleIssuesError(error, {
      operation: 'getIssues',
      context: { organizationSlug, projectSlug, status, query }
    });
    throw error; // Error handler will rethrow
  }
};

/**
 * Get a single issue by ID
 * 
 * @param organizationSlug - Organization slug
 * @param issueId - Issue ID
 * @param options - API call options
 * @returns Promise with issue data
 */
export const getIssue = async (
  organizationSlug: string,
  issueId: string,
  options?: Record<string, any>
): Promise<Issue> => {
  // Validate required parameters
  const validation = validateParams(
    'issues',
    'detail',
    { organization_slug: organizationSlug, issue_id: issueId }
  );
  
  if (!validation.isValid) {
    handleIssuesError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'getIssue', context: { organizationSlug, issueId } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'issues',
      'detail',
      { organization_slug: organizationSlug, issue_id: issueId },
      {},
      null,
      options
    );
    
    // Validate and return
    try {
      return issueSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Issue response validation failed:', validationError);
      return response as Issue;
    }
  } catch (error) {
    handleIssuesError(error, {
      operation: 'getIssue',
      context: { organizationSlug, issueId }
    });
    throw error;
  }
};

/**
 * Update an issue
 * 
 * @param organizationSlug - Organization slug
 * @param issueId - Issue ID
 * @param data - Update data
 * @param options - API call options
 * @returns Promise with updated issue
 */
export const updateIssue = async (
  organizationSlug: string,
  issueId: string,
  data: IssueUpdateData,
  options?: Record<string, any>
): Promise<Issue> => {
  // Validate required parameters
  const validation = validateParams(
    'issues',
    'update',
    { organization_slug: organizationSlug, issue_id: issueId }
  );
  
  if (!validation.isValid) {
    handleIssuesError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'updateIssue', context: { organizationSlug, issueId, data } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'issues',
      'update',
      { organization_slug: organizationSlug, issue_id: issueId },
      {},
      data,
      options
    );
    
    // Validate and return
    try {
      return issueSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Issue update response validation failed:', validationError);
      return response as Issue;
    }
  } catch (error) {
    handleIssuesError(error, {
      operation: 'updateIssue',
      context: { organizationSlug, issueId, data }
    });
    throw error;
  }
};

/**
 * Bulk update issues
 * 
 * @param options - Bulk update options
 * @returns Promise with bulk update result
 */
export const bulkUpdateIssues = async (options: BulkUpdateOptions): Promise<{ issueIds: string[] }> => {
  const { organizationSlug, projectSlug, issueIds, data, options: apiOptions } = options;
  
  // Validate required parameters
  const validation = validateParams(
    'issues',
    'bulk',
    { organization_slug: organizationSlug, project_slug: projectSlug }
  );
  
  if (!validation.isValid) {
    handleIssuesError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'bulkUpdateIssues', context: options }
    );
  }
  
  try {
    // Call the API
    return await enhancedApiClient.callEndpoint<{ issueIds: string[] }>(
      'issues',
      'bulk',
      { organization_slug: organizationSlug, project_slug: projectSlug },
      {},
      { 
        ids: issueIds,
        ...data
      },
      apiOptions
    );
  } catch (error) {
    handleIssuesError(error, {
      operation: 'bulkUpdateIssues',
      context: { organizationSlug, projectSlug, issueIds, data }
    });
    throw error;
  }
};

/**
 * Assign an issue to a user
 * 
 * @param organizationSlug - Organization slug
 * @param issueId - Issue ID
 * @param assigneeId - User ID or null to unassign
 * @param options - API call options
 * @returns Promise with updated issue
 */
export const assignIssue = async (
  organizationSlug: string,
  issueId: string,
  assigneeId: string | null,
  options?: Record<string, any>
): Promise<Issue> => {
  return updateIssue(
    organizationSlug,
    issueId,
    { assignee: assigneeId },
    options
  );
};

/**
 * Mark an issue as resolved
 * 
 * @param organizationSlug - Organization slug
 * @param issueId - Issue ID
 * @param options - API call options
 * @returns Promise with updated issue
 */
export const resolveIssue = async (
  organizationSlug: string,
  issueId: string,
  options?: Record<string, any>
): Promise<Issue> => {
  return updateIssue(
    organizationSlug,
    issueId,
    { status: 'resolved' },
    options
  );
};

/**
 * Mark an issue as ignored
 * 
 * @param organizationSlug - Organization slug
 * @param issueId - Issue ID
 * @param options - API call options
 * @returns Promise with updated issue
 */
export const ignoreIssue = async (
  organizationSlug: string,
  issueId: string,
  options?: Record<string, any>
): Promise<Issue> => {
  return updateIssue(
    organizationSlug,
    issueId,
    { status: 'ignored' },
    options
  );
};

/**
 * Mark multiple issues as resolved
 * 
 * @param organizationSlug - Organization slug
 * @param projectSlug - Project slug
 * @param issueIds - Issue IDs
 * @param options - API call options
 * @returns Promise with bulk update result
 */
export const resolveIssues = async (
  organizationSlug: string,
  projectSlug: string,
  issueIds: string[],
  options?: Record<string, any>
): Promise<{ issueIds: string[] }> => {
  return bulkUpdateIssues({
    organizationSlug,
    projectSlug,
    issueIds,
    data: { status: 'resolved' },
    options
  });
};

// Export all functions
export default {
  getIssues,
  getIssue,
  updateIssue,
  bulkUpdateIssues,
  assignIssue,
  resolveIssue,
  ignoreIssue,
  resolveIssues
};