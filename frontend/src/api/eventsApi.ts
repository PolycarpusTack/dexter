// File: frontend/src/api/eventsApi.ts

import { apiClient } from './apiClient';
import ErrorFactory from '../utils/errorHandling/errorFactory';
import { createErrorHandler } from '../utils/errorHandling';

/**
 * Interface for event detail query options
 */
export interface EventDetailOptions {
  /** Sentry organization slug */
  organizationSlug: string;
  /** Sentry project slug */
  projectSlug: string;
  /** Sentry event ID */
  eventId: string;
}

/**
 * Interface for issue event query options
 */
export interface IssueEventOptions {
  /** Sentry organization slug */
  organizationSlug: string;
  /** Sentry issue ID */
  issueId: string;
  /** Pagination cursor */
  cursor?: string;
  /** Filter by environment */
  environment?: string;
}

/**
 * Interface for specific issue event query options
 */
export interface SpecificIssueEventOptions extends IssueEventOptions {
  /** Event ID or 'latest', 'oldest', 'recommended' */
  eventId: string;
}

/**
 * Interface for issue status update options
 */
export interface IssueStatusUpdateOptions {
  /** Sentry issue ID */
  issueId: string;
  /** Payload containing the status update */
  statusUpdatePayload: {
    /** New status ('resolved', 'ignored', etc.) */
    status: string;
    /** Optional duration for ignore status */
    ignoreDuration?: number;
  };
}

/**
 * Interface for a basic event object
 */
export interface Event {
  id: string;
  eventID: string;
  issueId: string;
  title: string;
  level: string;
  platform: string;
  timestamp: string;
  message: string;
  contexts: Record<string, any>;
  entries: any[];
  tags: any[];
  _fallback?: boolean;
  _minimal?: boolean;
  _error?: string;
  [key: string]: any;
}

// Create error handlers for the events API
const handleEventError = createErrorHandler('Event API Error', {
  context: {
    apiModule: 'eventsApi'
  }
});

/**
 * Fetch detailed information about a specific Sentry event
 * @param options - Query options
 * @returns Promise that resolves to event detail data
 */
export const getEventDetails = async ({ organizationSlug, projectSlug, eventId }: EventDetailOptions): Promise<Event> => {
  try {
    console.log(`Fetching event details for: ${organizationSlug}/${projectSlug}/events/${eventId}`);
    
    return await apiClient.get<Event>(
      `/organizations/${organizationSlug}/projects/${projectSlug}/events/${eventId}`
    );
  } catch (error) {
    // Use our error handler to show notification and log to Sentry
    handleEventError(error);
    
    // Enhanced error with specific context
    throw ErrorFactory.create(error, {
      category: 'sentry_api_error',
      metadata: {
        operation: 'getEventDetails',
        organizationSlug,
        projectSlug,
        eventId
      }
    });
  }
};

/**
 * Fetch the latest event for a specific issue
 * @param options - Query options
 * @returns Promise that resolves to latest event data
 */
export const getLatestEventForIssue = async ({ organizationSlug, projectSlug, issueId }: EventDetailOptions): Promise<Event> => {
  try {
    console.log(`Fetching latest event for issue: ${issueId}`);
    
    // Try using the new dedicated endpoint for the latest event
    try {
      console.log(`Trying latest-event endpoint...`);
      return await apiClient.get<Event>(
        `/organizations/${organizationSlug}/issues/${issueId}/latest-event`
      );
    } catch (latestEndpointError) {
      console.warn(`Error fetching latest event via dedicated endpoint: ${latestEndpointError instanceof Error ? latestEndpointError.message : 'Unknown error'}`);
      // Continue to alternative approaches
    }

    // Try using the events endpoint with 'latest' as event ID
    try {
      console.log(`Trying events/latest endpoint...`);
      return await apiClient.get<Event>(
        `/organizations/${organizationSlug}/issues/${issueId}/events/latest`
      );
    } catch (eventsLatestError) {
      console.warn(`Error fetching latest event via events/latest endpoint: ${eventsLatestError instanceof Error ? eventsLatestError.message : 'Unknown error'}`);
      // Continue to alternative approaches
    }

    // Try listing events and taking the first one
    try {
      console.log(`Trying to list events and use the first one...`);
      const response = await apiClient.get<{ data: Event[] }>(
        `/organizations/${organizationSlug}/issues/${issueId}/events`
      );
      
      if (response?.data && response.data.length > 0) {
        console.log(`Using first event from events list as latest`);
        return response.data[0];
      }
    } catch (eventsListError) {
      console.warn(`Error fetching events list: ${eventsListError instanceof Error ? eventsListError.message : 'Unknown error'}`);
      // Continue to final fallback
    }

    // Final attempt: try to get issue details directly
    try {
      console.log(`Trying direct issue details endpoint...`);
      const response = await apiClient.get<any>(
        `/organizations/${organizationSlug}/issues/${issueId}`
      );
      
      if (response) {
        console.log(`Creating fallback event from issue details`);
        
        // Create a minimal event from the issue data
        return {
          id: issueId,
          eventID: issueId,
          issueId: issueId,
          title: response.title || 'Unknown Error',
          level: response.level || 'error',
          platform: response.platform || 'unknown',
          timestamp: response.lastSeen,
          message: response.culprit || response.title || 'No details available',
          contexts: {},
          entries: [],
          tags: response.tags || [],
          _fallback: true // Mark this as fallback data
        };
      }
    } catch (issueDetailsError) {
      console.warn(`Error fetching issue details: ${issueDetailsError instanceof Error ? issueDetailsError.message : 'Unknown error'}`);
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
    
    // Show notification but don't throw since we return a fallback
    handleEventError(error);
    
    // Return a minimal fallback object even in the case of a catastrophic error
    return {
      id: issueId,
      eventID: issueId,
      issueId: issueId,
      title: 'Error Retrieving Data',
      level: 'error',
      platform: 'unknown',
      timestamp: new Date().toISOString(),
      message: `Failed to retrieve event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      contexts: {},
      entries: [],
      tags: [],
      _fallback: true,
      _minimal: true,
      _error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Interface for event list response
 */
export interface EventListResponse {
  data: Event[];
  pagination: {
    next?: string;
    previous?: string;
  };
}

/**
 * Fetch a list of events for a specific issue
 * @param options - Query options
 * @returns Promise that resolves to event list data
 */
export const getIssueEvents = async ({ 
  organizationSlug, 
  issueId, 
  cursor, 
  environment 
}: IssueEventOptions): Promise<EventListResponse> => {
  try {
    console.log(`Fetching events for issue: ${issueId}`);
    
    const params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;
    if (environment) params.environment = environment;
    
    return await apiClient.get<EventListResponse>(
      `/organizations/${organizationSlug}/issues/${issueId}/events`,
      { params }
    );
  } catch (error) {
    // Use our error handler to show notification and log to Sentry
    handleEventError(error);
    
    // Enhanced error with specific context
    throw ErrorFactory.create(error, {
      category: 'sentry_api_error',
      metadata: {
        operation: 'getIssueEvents',
        organizationSlug,
        issueId,
        cursor,
        environment
      }
    });
  }
};

/**
 * Fetch a specific event for an issue
 * @param options - Query options
 * @returns Promise that resolves to event data
 */
export const getIssueEvent = async ({ 
  organizationSlug, 
  issueId, 
  eventId, 
  environment 
}: SpecificIssueEventOptions): Promise<Event> => {
  try {
    console.log(`Fetching event ${eventId} for issue: ${issueId}`);
    
    const params: Record<string, string> = {};
    if (environment) params.environment = environment;
    
    return await apiClient.get<Event>(
      `/organizations/${organizationSlug}/issues/${issueId}/events/${eventId}`,
      { params }
    );
  } catch (error) {
    // Use our error handler to show notification and log to Sentry
    handleEventError(error);
    
    // Enhanced error with specific context
    throw ErrorFactory.create(error, {
      category: 'sentry_api_error',
      metadata: {
        operation: 'getIssueEvent',
        organizationSlug,
        issueId,
        eventId,
        environment
      }
    });
  }
};

/**
 * Update the status of a Sentry issue
 * @param options - Update options
 * @returns Promise that resolves to updated issue data
 */
export const updateIssueStatus = async ({ 
  issueId, 
  statusUpdatePayload 
}: IssueStatusUpdateOptions): Promise<any> => {
  try {
    console.log(`Updating issue status for ${issueId} to ${statusUpdatePayload.status}`);
    
    return await apiClient.put<any>(
      `/issues/${issueId}/status`,
      statusUpdatePayload
    );
  } catch (error) {
    // Use our error handler to show notification and log to Sentry
    handleEventError(error);
    
    // Enhanced error with specific context
    throw ErrorFactory.create(error, {
      category: 'sentry_api_error',
      metadata: {
        operation: 'updateIssueStatus',
        issueId,
        status: statusUpdatePayload.status
      }
    });
  }
};

export default {
  getEventDetails,
  getLatestEventForIssue,
  getIssueEvents,
  getIssueEvent,
  updateIssueStatus
};
