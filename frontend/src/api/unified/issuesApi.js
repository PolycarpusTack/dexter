// Unified Issues API client

import { callEndpoint } from './apiClient';

/**
 * Fetches a list of issues for a project
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} projectSlug - Project slug
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status ('unresolved', 'resolved', 'ignored', 'all')
 * @param {string} options.query - Text search term
 * @param {string} options.cursor - Pagination cursor
 * @returns {Promise} - Promise resolving to the API response
 */
export const getProjectIssues = async (organizationSlug, projectSlug, options = {}) => {
  const { status, query, cursor } = options;
  
  return callEndpoint(
    'issues',
    'list',
    { organization_slug: organizationSlug, project_slug: projectSlug },
    { status, query, cursor }
  );
};

/**
 * Function used by EventTable component for React Query
 */
export const fetchIssuesList = ({ organizationSlug, projectSlug, statusFilter, searchQuery, cursor }) => {
  return getProjectIssues(
    organizationSlug, 
    projectSlug, 
    {
      status: statusFilter,
      query: searchQuery,
      cursor: cursor
    }
  );
};

/**
 * Get details for a specific issue
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} issueId - Issue ID
 * @returns {Promise} - Promise resolving to the API response
 */
export const getIssueDetails = async (organizationSlug, issueId) => {
  return callEndpoint(
    'issues',
    'detail',
    { organization_slug: organizationSlug, issue_id: issueId }
  );
};

/**
 * Updates the status of an issue
 * 
 * @param {string} issueId - The ID of the issue to update
 * @param {string} status - New status ('resolved', 'unresolved', 'ignored')
 * @param {string} organizationSlug - Organization slug (optional)
 * @returns {Promise} - Promise resolving to the API response
 */
export const updateIssueStatus = async (issueId, status, organizationSlug = null) => {
  const pathParams = { issue_id: issueId };
  if (organizationSlug) {
    pathParams.organization_slug = organizationSlug;
  }
  
  return callEndpoint(
    'issues',
    'update',
    pathParams,
    {},
    { status }
  );
};

/**
 * Assign an issue to a user
 * 
 * @param {string} issueId - Issue ID
 * @param {string} assignee - User ID or email to assign to (null to unassign)
 * @param {string} organizationSlug - Organization slug
 * @returns {Promise} - Promise resolving to the API response
 */
export const assignIssue = async (issueId, assignee, organizationSlug) => {
  return callEndpoint(
    'organization_issues',
    'assign',
    { organization_slug: organizationSlug, issue_id: issueId },
    {},
    { assignee }
  );
};

/**
 * Exports issues as CSV or JSON
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} projectSlug - Project slug
 * @param {Object} options - Export options
 * @param {string} options.format - 'csv' or 'json'
 * @param {string} options.status - Filter by status
 * @param {string} options.query - Text search term
 * @returns {Promise} - Promise resolving to the file data
 */
export const exportIssues = async (organizationSlug, projectSlug, options = {}) => {
  const { format = 'csv', status, query } = options;
  
  return callEndpoint(
    'organization_issues',
    'export',
    { organization_slug: organizationSlug, project_slug: projectSlug },
    { format, status, query },
    null,
    { responseType: 'blob' } // Important for file downloads
  );
};

/**
 * Perform bulk update on multiple issues
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} projectSlug - Project slug
 * @param {Array<string>} issueIds - List of issue IDs to update
 * @param {Object} updateData - Data to update (status, etc.)
 * @returns {Promise} - Promise resolving to the API response
 */
export const bulkUpdateIssues = async (organizationSlug, projectSlug, issueIds, updateData) => {
  return callEndpoint(
    'issues',
    'bulk',
    { organization_slug: organizationSlug, project_slug: projectSlug },
    {},
    { ids: issueIds, ...updateData }
  );
};

export default {
  getProjectIssues,
  fetchIssuesList,
  getIssueDetails,
  updateIssueStatus,
  assignIssue,
  exportIssues,
  bulkUpdateIssues
};
