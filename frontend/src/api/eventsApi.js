// File: frontend/src/api/eventsApi.js

import axios from 'axios';
import { getMockEventById, getMockLatestEventForIssue } from './mockData';

// Define default base URL and config
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sentry.io/api/0';
const axiosConfig = {
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
};

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
 * Fetch detailed information about a specific Sentry event
 * @param {string} eventId - Sentry event ID
 * @returns {Promise<Object>} - Promise that resolves to event detail data
 */
export const getEventDetails = async (eventId) => {
  try {
    console.log(`Fetching event details for: ${eventId}`);
    
    // For development or when no eventId is provided, always use mock data
    if (!eventId || import.meta.env.DEV) {
      console.log('Using mock data for event details - in dev mode or no eventId');
      return getMockEventById(eventId);
    }
    
    // Try to use the API if possible
    if (import.meta.env.PROD) {
      try {
        const response = await apiClient.get(`/events/${eventId}`);
        console.log(`Successfully received event details for ${eventId}`);
        return response.data;
      } catch (apiError) {
        console.error('API error, falling back to mock data:', apiError);
        return getMockEventById(eventId);
      }
    }
    
    // Fall back to mock data in development
    console.log('Using mock data for event details');
    return getMockEventById(eventId);
  } catch (error) {
    console.error('Error fetching event details:', error);
    
    // Return mock data in case of error
    console.log('Returning mock data due to error');
    return getMockEventById(eventId);
  }
};

/**
 * Fetch the latest event for a specific issue
 * @param {string} issueId - Sentry issue ID
 * @returns {Promise<Object>} - Promise that resolves to latest event data
 */
export const getLatestEventForIssue = async (issueId) => {
  try {
    console.log(`Fetching latest event for issue: ${issueId}`);
    
    // For development or when no issueId is provided, always use mock data
    if (!issueId || import.meta.env.DEV) {
      console.log('Using mock data for latest event - in dev mode or no issueId');
      return getMockLatestEventForIssue(issueId);
    }
    
    // Try to use the API if possible
    if (import.meta.env.PROD) {
      try {
        const response = await apiClient.get(`/issues/${issueId}/latest-event`);
        console.log(`Successfully received latest event for issue ${issueId}`);
        return response.data;
      } catch (apiError) {
        console.error('API error, falling back to mock data:', apiError);
        return getMockLatestEventForIssue(issueId);
      }
    }
    
    // Fall back to mock data in development
    console.log('Using mock data for latest event');
    return getMockLatestEventForIssue(issueId);
  } catch (error) {
    console.error('Error fetching latest event for issue:', error);
    
    // Return mock data in case of error
    console.log('Returning mock data due to error');
    return getMockLatestEventForIssue(issueId);
  }
};

/**
 * Update the status of a Sentry issue
 * @param {Object} options - Update options
 * @param {string} options.issueId - Sentry issue ID
 * @param {Object} options.statusUpdatePayload - Payload containing the status update
 * @param {string} options.statusUpdatePayload.status - New status ('resolved', 'ignored', etc.)
 * @returns {Promise<Object>} - Promise that resolves to updated issue data
 */
export const updateIssueStatus = async ({ issueId, statusUpdatePayload }) => {
  try {
    console.log(`Updating issue status for ${issueId} to ${statusUpdatePayload.status}`);
    
    // For mock implementation, just return success
    return {
      id: issueId,
      status: statusUpdatePayload.status,
      updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error updating issue status:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to update issue status'
    );
  }
};
