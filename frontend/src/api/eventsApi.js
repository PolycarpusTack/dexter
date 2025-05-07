// File: frontend/src/api/eventsApi.js

import axios from 'axios';
import { API_BASE_URL, axiosConfig } from './config';

/**
 * Fetch detailed information about a specific Sentry event
 * @param {Object} options - Query options
 * @param {string} options.organizationSlug - Sentry organization slug
 * @param {string} options.projectSlug - Sentry project slug
 * @param {string} options.eventId - Sentry event ID
 * @returns {Promise<Object>} - Promise that resolves to event detail data
 */
export const getEventDetails = async ({ organizationSlug, projectSlug, eventId }) => {
  try {
    console.log(`Fetching event details for: ${organizationSlug}/${projectSlug}/events/${eventId}`);
    
    const response = await axios.get(
      `${API_BASE_URL}/organizations/${organizationSlug}/projects/${projectSlug}/events/${eventId}`,
      axiosConfig
    );
    
    console.log(`Successfully received event details for ${eventId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching event details:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to fetch event details'
    );
  }
};

/**
 * Fetch the latest event for a specific issue
 * @param {Object} options - Query options
 * @param {string} options.organizationSlug - Sentry organization slug
 * @param {string} options.projectSlug - Sentry project slug
 * @param {string} options.issueId - Sentry issue ID
 * @returns {Promise<Object>} - Promise that resolves to latest event data
 */
export const getLatestEventForIssue = async ({ organizationSlug, projectSlug, issueId }) => {
  try {
    console.log(`Fetching latest event for issue: ${issueId}`);
    
    // Try using the new dedicated endpoint for the latest event
    try {
      console.log(`Trying latest-event endpoint...`);
      const response = await axios.get(
        `${API_BASE_URL}/organizations/${organizationSlug}/issues/${issueId}/latest-event`,
        axiosConfig
      );
      
      if (response.data) {
        console.log(`Successfully fetched latest event for issue ${issueId}`);
        return response.data;
      }
    } catch (error) {
      console.warn(`Error fetching latest event via dedicated endpoint: ${error.message}`);
      // Continue to alternative approaches
    }

    // Try using the events endpoint with 'latest' as event ID
    try {
      console.log(`Trying events/latest endpoint...`);
      const response = await axios.get(
        `${API_BASE_URL}/organizations/${organizationSlug}/issues/${issueId}/events/latest`,
        axiosConfig
      );
      
      if (response.data) {
        console.log(`Successfully fetched latest event via events/latest endpoint`);
        return response.data;
      }
    } catch (error) {
      console.warn(`Error fetching latest event via events/latest endpoint: ${error.message}`);
      // Continue to alternative approaches
    }

    // Try listing events and taking the first one
    try {
      console.log(`Trying to list events and use the first one...`);
      const response = await axios.get(
        `${API_BASE_URL}/organizations/${organizationSlug}/issues/${issueId}/events`,
        axiosConfig
      );
      
      if (response.data?.data && response.data.data.length > 0) {
        console.log(`Using first event from events list as latest`);
        return response.data.data[0];
      }
    } catch (error) {
      console.warn(`Error fetching events list: ${error.message}`);
      // Continue to final fallback
    }

    // Final attempt: try to get issue details directly
    try {
      console.log(`Trying direct issue details endpoint...`);
      const response = await axios.get(
        `${API_BASE_URL}/organizations/${organizationSlug}/issues/${issueId}`,
        axiosConfig
      );
      
      if (response.data) {
        console.log(`Creating fallback event from issue details`);
        
        // Create a minimal event from the issue data
        return {
          id: issueId,
          eventID: issueId,
          issueId: issueId,
          title: response.data.title || 'Unknown Error',
          level: response.data.level || 'error',
          platform: response.data.platform || 'unknown',
          timestamp: response.data.lastSeen,
          message: response.data.culprit || response.data.title || 'No details available',
          contexts: {},
          entries: [],
          tags: response.data.tags || [],
          _fallback: true // Mark this as fallback data
        };
      }
    } catch (error) {
      console.warn(`Error fetching issue details: ${error.message}`);
    }
    
    // As a last resort, create a minimal event object with the information we have
    console.log(`All API attempts failed. Creating minimal fallback event object.`);
    
    return {
      id: issueId,
      eventID: issueId,
      issueId: issueId,
      title: 'Error Details Unavailable',
      level: 'error',
      platform: 'unknown',
      timestamp: new Date().toISOString(),
      message: 'Could not retrieve event details from Sentry API.',
      contexts: {},
      entries: [],
      tags: [],
      _fallback: true,
      _minimal: true
    };
  } catch (error) {
    console.error('Error fetching latest event for issue:', error);
    
    // Return a minimal fallback object even in the case of a catastrophic error
    return {
      id: issueId,
      eventID: issueId,
      issueId: issueId,
      title: 'Error Retrieving Data',
      level: 'error',
      platform: 'unknown',
      timestamp: new Date().toISOString(),
      message: `Failed to retrieve event: ${error.message || 'Unknown error'}`,
      contexts: {},
      entries: [],
      tags: [],
      _fallback: true,
      _minimal: true,
      _error: error.message
    };
  }
};

/**
 * Fetch a list of events for a specific issue
 * @param {Object} options - Query options
 * @param {string} options.organizationSlug - Sentry organization slug
 * @param {string} options.issueId - Sentry issue ID
 * @param {string} [options.cursor] - Pagination cursor
 * @param {string} [options.environment] - Filter by environment
 * @returns {Promise<Object>} - Promise that resolves to event list data
 */
export const getIssueEvents = async ({ organizationSlug, issueId, cursor, environment }) => {
  try {
    console.log(`Fetching events for issue: ${issueId}`);
    
    const params = {};
    if (cursor) params.cursor = cursor;
    if (environment) params.environment = environment;
    
    const response = await axios.get(
      `${API_BASE_URL}/organizations/${organizationSlug}/issues/${issueId}/events`,
      { 
        ...axiosConfig,
        params
      }
    );
    
    console.log(`Successfully fetched events for issue ${issueId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching issue events:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to fetch issue events'
    );
  }
};

/**
 * Fetch a specific event for an issue
 * @param {Object} options - Query options
 * @param {string} options.organizationSlug - Sentry organization slug
 * @param {string} options.issueId - Sentry issue ID
 * @param {string} options.eventId - Event ID or 'latest', 'oldest', 'recommended'
 * @param {string} [options.environment] - Filter by environment
 * @returns {Promise<Object>} - Promise that resolves to event data
 */
export const getIssueEvent = async ({ organizationSlug, issueId, eventId, environment }) => {
  try {
    console.log(`Fetching event ${eventId} for issue: ${issueId}`);
    
    const params = {};
    if (environment) params.environment = environment;
    
    const response = await axios.get(
      `${API_BASE_URL}/organizations/${organizationSlug}/issues/${issueId}/events/${eventId}`,
      { 
        ...axiosConfig,
        params
      }
    );
    
    console.log(`Successfully fetched event ${eventId} for issue ${issueId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching issue event:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to fetch issue event'
    );
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
    
    const response = await axios.put(
      `${API_BASE_URL}/issues/${issueId}/status`,
      statusUpdatePayload,
      axiosConfig
    );
    
    console.log(`Successfully updated issue status`);
    return response.data;
  } catch (error) {
    console.error('Error updating issue status:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to update issue status'
    );
  }
};