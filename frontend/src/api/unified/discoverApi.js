// Unified Discover API client

import { callEndpoint } from './apiClient';

/**
 * Execute a Discover query
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {Object} queryParams - Query parameters
 * @returns {Promise} - Promise resolving to the query results
 */
export const executeQuery = async (organizationSlug, queryParams) => {
  return callEndpoint(
    'discover',
    'query',
    { organization_slug: organizationSlug },
    queryParams
  );
};

/**
 * Get saved Discover queries
 * 
 * @param {string} organizationSlug - Organization slug
 * @returns {Promise} - Promise resolving to the list of saved queries
 */
export const getSavedQueries = async (organizationSlug) => {
  return callEndpoint(
    'discover',
    'saved_queries',
    { organization_slug: organizationSlug }
  );
};

/**
 * Create a saved Discover query
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {Object} queryData - Query definition
 * @returns {Promise} - Promise resolving to the created query
 */
export const createSavedQuery = async (organizationSlug, queryData) => {
  return callEndpoint(
    'discover',
    'create_saved_query',
    { organization_slug: organizationSlug },
    {},
    queryData
  );
};

/**
 * Update a saved Discover query
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} queryId - Query ID
 * @param {Object} queryData - Updated query definition
 * @returns {Promise} - Promise resolving to the updated query
 */
export const updateSavedQuery = async (organizationSlug, queryId, queryData) => {
  return callEndpoint(
    'discover',
    'update_saved_query',
    { organization_slug: organizationSlug, query_id: queryId },
    {},
    queryData
  );
};

/**
 * Delete a saved Discover query
 * 
 * @param {string} organizationSlug - Organization slug
 * @param {string} queryId - Query ID
 * @returns {Promise} - Promise resolving to the deletion result
 */
export const deleteSavedQuery = async (organizationSlug, queryId) => {
  return callEndpoint(
    'discover',
    'delete_saved_query',
    { organization_slug: organizationSlug, query_id: queryId }
  );
};

export default {
  executeQuery,
  getSavedQueries,
  createSavedQuery,
  updateSavedQuery,
  deleteSavedQuery
};
