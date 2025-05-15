// File: src/api/eventsApi.ts

/**
 * @deprecated This API module is deprecated and will be removed in v1.0.0 (Q4 2025).
 * Please use the unified API modules from 'src/api/unified' instead.
 * 
 * Migration Guide: 
 * - Replace imports from this file with imports from the unified API
 * - Refer to the migration guide at 'docs/consolidated/API_MIGRATION_MASTER_GUIDE.md'
 * 
 * Recommended replacement: import { eventsApi } from 'src/api/unified'
 * @see API_CLIENT_CONSOLIDATION_STATUS.md for migration timeline
 * @see docs/consolidated/API_MIGRATION_GUIDE_EVENTTABLE.md for specific migration instructions
 */

import apiClient from './apiClient';
import { SentryEvent } from '../types/deadlock';
import { createErrorHandler } from '../utils/errorHandling';

// Error handler for events API
const handleEventsError = createErrorHandler('Events API Error', {
  context: { apiModule: 'eventsApi' }
});

/**
 * Options for fetching events
 */
export interface FetchEventsOptions {
  /** Number of events to fetch */
  limit?: number;
  /** Cursor for pagination */
  cursor?: string;
  /** Query parameters for filtering */
  query?: string;
  /** Project ID to filter by */
  projectId?: string;
  /** Organization ID to filter by */
  organizationId?: string;
  /** Environment to filter by */
  environment?: string;
  /** Start time for events */
  statsPeriod?: string | null;
  /** Sort field */
  sort?: string;
}

/**
 * Events response from the API
 */
export interface EventsResponse {
  events: SentryEvent[];
  links?: {
    previous?: {
      cursor: string;
      [key: string]: any;
    };
    next?: {
      cursor: string;
      [key: string]: any;
    };
  };
  meta?: Record<string, any>;
}

/**
 * Fetch Sentry event details
 * 
 * @param eventId - Event ID to fetch
 * @param projectId - Optional project ID
 * @returns Promise with event details
 */
export const fetchEventDetails = async (
  eventId: string, 
  projectId?: string
): Promise<SentryEvent> => {
  try {
    return await apiClient.get<SentryEvent>(
      `/event/${eventId}`, 
      { params: { project_id: projectId } }
    );
  } catch (error) {
    handleEventsError(error, { 
      operation: 'fetchEventDetails',
      eventId,
      projectId
    });
    throw error;
  }
};

/**
 * Fetch events for an issue
 * 
 * @param issueId - Issue ID to fetch events for
 * @param options - Fetch options
 * @returns Promise with events response
 */
export const fetchIssueEvents = async (
  issueId: string,
  options: FetchEventsOptions = {}
): Promise<EventsResponse> => {
  try {
    return await apiClient.get<EventsResponse>(
      `/issue/${issueId}/events`,
      { params: options }
    );
  } catch (error) {
    handleEventsError(error, {
      operation: 'fetchIssueEvents',
      issueId,
      ...options
    });
    throw error;
  }
};

/**
 * Fetch events with filtering
 * 
 * @param options - Fetch options
 * @returns Promise with events response
 */
export const fetchEvents = async (
  options: FetchEventsOptions = {}
): Promise<EventsResponse> => {
  try {
    return await apiClient.get<EventsResponse>(
      '/events',
      { params: options }
    );
  } catch (error) {
    handleEventsError(error, {
      operation: 'fetchEvents',
      ...options
    });
    throw error;
  }
};

/**
 * Fetch the latest event for an issue
 * 
 * @param issueId - Issue ID
 * @param projectId - Optional project ID
 * @returns Promise with event details
 */
export const fetchLatestEvent = async (
  issueId: string,
  projectId?: string
): Promise<SentryEvent> => {
  try {
    // Fetch the latest event
    const response = await fetchIssueEvents(issueId, {
      limit: 1,
      sort: '-timestamp',
      projectId
    });
    
    if (!response.events || response.events.length === 0) {
      throw new Error('No events found for this issue');
    }
    
    return response.events[0] || {} as SentryEvent;
  } catch (error) {
    handleEventsError(error, {
      operation: 'fetchLatestEvent',
      issueId,
      projectId
    });
    throw error;
  }
};

/**
 * Fetch events for a user
 * 
 * @param userId - User ID to fetch events for
 * @param options - Fetch options
 * @returns Promise with events response
 */
export const fetchUserEvents = async (
  userId: string,
  options: FetchEventsOptions = {}
): Promise<EventsResponse> => {
  try {
    return await apiClient.get<EventsResponse>(
      `/user/${userId}/events`,
      { params: options }
    );
  } catch (error) {
    handleEventsError(error, {
      operation: 'fetchUserEvents',
      userId,
      ...options
    });
    throw error;
  }
};

/**
 * Fetch events by tag value
 * 
 * @param tag - Tag key
 * @param value - Tag value
 * @param options - Fetch options
 * @returns Promise with events response
 */
export const fetchEventsByTag = async (
  tag: string,
  value: string,
  options: FetchEventsOptions = {}
): Promise<EventsResponse> => {
  try {
    return await apiClient.get<EventsResponse>(
      '/events',
      { 
        params: {
          ...options,
          query: `${tag}:"${value}"`
        }
      }
    );
  } catch (error) {
    handleEventsError(error, {
      operation: 'fetchEventsByTag',
      tag,
      value,
      ...options
    });
    throw error;
  }
};

export default {
  fetchEventDetails,
  fetchIssueEvents,
  fetchEvents,
  fetchLatestEvent,
  fetchUserEvents,
  fetchEventsByTag
};
