// File: frontend/src/api/issuesApi.js

import axios from 'axios';
import { API_BASE_URL, axiosConfig } from './config';

// Create an axios instance with our configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  ...axiosConfig,
  headers: {
    ...axiosConfig.headers,
    'Accept': 'application/json',
  }
});

// Add response interceptor to handle common errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    
    // Check for CORS errors
    if (error.message === 'Network Error') {
      console.warn('Possible CORS issue detected');
      // You could add custom CORS error handling here
    }
    
    return Promise.reject(error);
  }
);

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
  try {
    const { status, query, cursor } = options;
    
    // Log the request to help with debugging
    console.log(`Fetching issues for ${organizationSlug}/${projectSlug} with params:`, { status, query, cursor });
    
    const response = await apiClient.get(
      `/organizations/${organizationSlug}/projects/${projectSlug}/issues`, 
      { params: { status, query, cursor } }
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
    
    // Return mock data if there's an error (for development)
    if (import.meta.env.DEV) {
      console.log('Returning mock data in development mode');
      return {
        data: [
          {
            id: 'mock-issue-1',
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
    }
    
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
    
    const response = await apiClient.put(
      `/issues/${issueId}/status`,
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
    const response = await apiClient.get(
      `/${organizationSlug}/projects/${projectSlug}/issues/export`,
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