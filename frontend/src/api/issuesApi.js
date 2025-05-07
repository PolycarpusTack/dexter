// File: frontend/src/api/issuesApi.js

import axios from 'axios';
import { API_BASE_URL } from './config';
// Don't import the store hook directly - we'll use a different approach

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
  
  try {
    // Log the request to help with debugging
    console.log(`Fetching issues for ${organizationSlug}/${projectSlug} with params:`, { status, query, cursor });
    
    const response = await axios.get(
      `${API_BASE_URL}/organizations/${organizationSlug}/projects/${projectSlug}/issues`, 
      { 
        params: { 
          status, 
          query,
          cursor
        } 
      }
    );
    // Log the response structure
    console.log(`Received issues response:`, { 
      status: response.status, 
      dataType: typeof response.data, 
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : null
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching project issues:', error);
    throw error;
  }
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
  ).then(response => {
    try {
      // Simply return the response now - we'll handle event ID storage in the component
      // using the useQuery onSuccess callback instead
      return response;
    } catch (error) {
      console.error('Error processing issue data:', error);
      return response;
    }
  });
};

/**
 * Updates the status of an issue
 * 
 * @param {string} issueId - The ID of the issue to update
 * @param {string} status - New status ('resolved', 'unresolved', 'ignored')
 * @param {number} ignoreDuration - Optional. If status is 'ignored', duration in minutes
 * @returns {Promise} - Promise resolving to the API response
 */
export const updateIssueStatus = async (issueId, status, ignoreDuration = null) => {
  try {
    const payload = { status };
    
    if (status === 'ignored' && ignoreDuration) {
      payload.ignoreDuration = ignoreDuration;
    }
    
    const response = await axios.put(
      `${API_BASE_URL}/issues/${issueId}/status`,
      payload
    );
    
    return response.data;
  } catch (error) {
    console.error('Error updating issue status:', error);
    throw error;
  }
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
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/${organizationSlug}/projects/${projectSlug}/issues/export`,
      {
        params: { format, status, query },
        responseType: 'blob', // Important for file downloads
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error exporting issues:', error);
    throw error;
  }
};

export default {
  getProjectIssues,
  fetchIssuesList,
  updateIssueStatus,
  exportIssues
};