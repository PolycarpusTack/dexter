// Unified Events API client

import { callEndpoint } from './apiClient';

/**
 * Fetch events for a project
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} projectSlug - Project slug
 * @param {Object} options - Query options
 * @param {string} options.query - Search query
 * @param {string} options.cursor - Pagination cursor
 * @returns {Promise} - Promise resolving to the API response
 */
export const getProjectEvents = async (organizationSlug, projectSlug, options = {}) => {
  const { query, cursor } = options;
  
  return callEndpoint(
    'events',
    'list',
    { organization_slug: organizationSlug, project_slug: projectSlug },
    { query, cursor }
  );
};

/**
 * Fetch detailed information about a specific event
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} projectSlug - Project slug
 * @param {string} eventId - Event ID
 * @returns {Promise} - Promise resolving to the API response
 */
export const getEventDetails = async (organizationSlug, projectSlug, eventId) => {
  return callEndpoint(
    'events',
    'detail',
    {
      organization_slug: organizationSlug,
      project_slug: projectSlug,
      event_id: eventId
    }
  );
};

/**
 * Fetch events for a specific issue
 * 
 * @param {string} issueId - Issue ID
 * @param {Object} options - Query options
 * @param {string} options.cursor - Pagination cursor
 * @param {string} options.environment - Filter by environment
 * @returns {Promise} - Promise resolving to the API response
 */
export const getIssueEvents = async (issueId, options = {}) => {
  const { cursor, environment } = options;
  
  return callEndpoint(
    'issue_events',
    'list',
    { issue_id: issueId },
    { cursor, environment }
  );
};

/**
 * Fetch a specific event for an issue
 * 
 * @param {string} issueId - Issue ID
 * @param {string} eventId - Event ID
 * @param {string} environment - Filter by environment (optional)
 * @returns {Promise} - Promise resolving to the API response
 */
export const getIssueEvent = async (issueId, eventId, environment = null) => {
  const queryParams = environment ? { environment } : {};
  
  return callEndpoint(
    'issue_events',
    'detail',
    { issue_id: issueId, event_id: eventId },
    queryParams
  );
};

/**
 * Fetch the latest event for a specific issue
 * 
 * @param {string} issueId - Issue ID
 * @param {string} environment - Filter by environment (optional)
 * @returns {Promise} - Promise resolving to the API response
 */
export const getLatestEventForIssue = async (issueId, environment = null) => {
  const queryParams = environment ? { environment } : {};
  
  return callEndpoint(
    'issue_events',
    'latest',
    { issue_id: issueId },
    queryParams
  );
};

/**
 * Fetch the oldest event for a specific issue
 * 
 * @param {string} issueId - Issue ID
 * @param {string} environment - Filter by environment (optional)
 * @returns {Promise} - Promise resolving to the API response
 */
export const getOldestEventForIssue = async (issueId, environment = null) => {
  const queryParams = environment ? { environment } : {};
  
  return callEndpoint(
    'issue_events',
    'oldest',
    { issue_id: issueId },
    queryParams
  );
};

/**
 * Fetch available tags
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} projectSlug - Project slug
 * @returns {Promise} - Promise resolving to the API response
 */
export const getTags = async (organizationSlug, projectSlug) => {
  return callEndpoint(
    'events',
    'tags',
    { organization_slug: organizationSlug, project_slug: projectSlug }
  );
};

/**
 * Fetch values for a specific tag
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} projectSlug - Project slug
 * @param {string} key - Tag key
 * @returns {Promise} - Promise resolving to the API response
 */
export const getTagValues = async (organizationSlug, projectSlug, key) => {
  return callEndpoint(
    'events',
    'tag_values',
    {
      organization_slug: organizationSlug,
      project_slug: projectSlug,
      key: key
    }
  );
};

export default {
  getProjectEvents,
  getEventDetails,
  getIssueEvents,
  getIssueEvent,
  getLatestEventForIssue,
  getOldestEventForIssue,
  getTags,
  getTagValues
};
