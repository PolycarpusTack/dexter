// File: src/api/eventApi.ts

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

// Error handler for event API
const handleEventError = createErrorHandler('Event API Error', {
  context: { apiModule: 'eventApi' }
});

/**
 * Options for fetching event data
 */
export interface FetchEventOptions {
  /** Include rich data like environment and request info */
  includeRich?: boolean;
  /** Include raw event data */
  includeRaw?: boolean;
  /** Include stack trace details */
  includeStackTrace?: boolean;
  /** Project ID (for organization-scoped requests) */
  projectId?: string;
}

/**
 * Fetch event details by ID
 * 
 * @param eventId - The event ID to fetch
 * @param options - Options for fetching event data
 * @returns Promise with event details
 */
export const fetchEvent = async (
  eventId: string,
  options: FetchEventOptions = {}
): Promise<SentryEvent> => {
  try {
    return await apiClient.get<SentryEvent>(
      `/event/${eventId}`,
      {
        params: {
          include_rich: options.includeRich,
          include_raw: options.includeRaw,
          include_stack_trace: options.includeStackTrace,
          project_id: options.projectId
        }
      }
    );
  } catch (error) {
    handleEventError(error, {
      operation: 'fetchEvent',
      eventId,
      ...options
    });
    throw error;
  }
};

/**
 * Get related events by similar error type
 * 
 * @param eventId - Event ID to find related events for
 * @param options - Options for fetching related events
 * @returns Promise with array of related events
 */
export const getRelatedEvents = async (
  eventId: string,
  options: {
    limit?: number;
    projectId?: string;
  } = {}
): Promise<SentryEvent[]> => {
  try {
    return await apiClient.get<SentryEvent[]>(
      `/event/${eventId}/related`,
      {
        params: {
          limit: options.limit || 10,
          project_id: options.projectId
        }
      }
    );
  } catch (error) {
    handleEventError(error, {
      operation: 'getRelatedEvents',
      eventId,
      ...options
    });
    throw error;
  }
};

/**
 * Get event tags for an event
 * 
 * @param eventId - Event ID to get tags for
 * @param projectId - Optional project ID
 * @returns Promise with array of tags
 */
export const getEventTags = async (
  eventId: string,
  projectId?: string
): Promise<Array<{ key: string, value: string }>> => {
  try {
    return await apiClient.get<Array<{ key: string, value: string }>>(
      `/event/${eventId}/tags`,
      {
        params: {
          project_id: projectId
        }
      }
    );
  } catch (error) {
    handleEventError(error, {
      operation: 'getEventTags',
      eventId,
      projectId
    });
    throw error;
  }
};

/**
 * Get metadata for an event
 * 
 * @param eventId - Event ID to get metadata for
 * @param projectId - Optional project ID
 * @returns Promise with metadata object
 */
export const getEventMetadata = async (
  eventId: string,
  projectId?: string
): Promise<Record<string, any>> => {
  try {
    return await apiClient.get<Record<string, any>>(
      `/event/${eventId}/metadata`,
      {
        params: {
          project_id: projectId
        }
      }
    );
  } catch (error) {
    handleEventError(error, {
      operation: 'getEventMetadata',
      eventId,
      projectId
    });
    throw error;
  }
};

/**
 * Get context data for an event
 * 
 * @param eventId - Event ID to get context for
 * @param type - Context type to retrieve (optional, gets all if not specified)
 * @param projectId - Optional project ID
 * @returns Promise with context data
 */
export const getEventContext = async (
  eventId: string,
  type?: string,
  projectId?: string
): Promise<Record<string, any>> => {
  try {
    return await apiClient.get<Record<string, any>>(
      `/event/${eventId}/context${type ? `/${type}` : ''}`,
      {
        params: {
          project_id: projectId
        }
      }
    );
  } catch (error) {
    handleEventError(error, {
      operation: 'getEventContext',
      eventId,
      type,
      projectId
    });
    throw error;
  }
};

export default {
  fetchEvent,
  getRelatedEvents,
  getEventTags,
  getEventMetadata,
  getEventContext
};
