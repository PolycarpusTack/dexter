/**
 * Events API Module
 * 
 * This file provides methods for interacting with the Events API.
 * It includes types, validation schemas, and API client methods.
 * This module integrates both events and issues functionality to support
 * the EventTable components and provide a comprehensive API interface.
 */

import { z } from 'zod';
import enhancedApiClient from './enhancedApiClient';
import { createErrorHandler } from './errorHandler';
import { validateParams } from './apiResolver';

/**
 * Error handler for Events API
 */
const handleEventsError = createErrorHandler({
  module: 'EventsAPI',
  showNotifications: true,
  logToConsole: true
});

/**
 * Event model validation schema
 */
export const eventSchema = z.object({
  id: z.string(),
  eventID: z.string().optional(),
  groupID: z.string().optional(),
  projectID: z.string().optional(),
  platform: z.string().optional(),
  message: z.string(),
  dateCreated: z.string().optional(),
  timestamp: z.string().optional(),
  dateReceived: z.string().optional(),
  tags: z.array(
    z.object({
      key: z.string(),
      value: z.string()
    }).or(z.string())
  ).optional(),
  entries: z.array(z.object({
    type: z.string(),
    data: z.record(z.any())
  })).optional(),
  user: z.object({
    id: z.string().optional(),
    username: z.string().optional(),
    email: z.string().optional(),
    ip_address: z.string().optional()
  }).optional(),
  metadata: z.record(z.any()).optional(),
  // Additional fields for compatibility with Issue types
  title: z.string().optional(),
  count: z.number().optional(),
  level: z.string().optional(),
  lastSeen: z.string().optional(),
  firstSeen: z.string().optional(),
  status: z.string().optional(),
  project: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    slug: z.string().optional()
  }).optional()
});

/**
 * Issue model validation schema
 */
export const issueSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  count: z.number().optional(),
  status: z.string().optional(),
  firstSeen: z.string().optional(),
  lastSeen: z.string().optional(),
  level: z.string().optional(),
  project: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    slug: z.string().optional()
  }).optional(),
  tags: z.array(
    z.object({
      key: z.string(),
      value: z.string()
    }).or(z.string())
  ).optional(),
  assignee: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional()
  }).optional().nullable()
});

/**
 * Response validation schema (works for both events and issues)
 */
export const responseSchema = z.object({
  items: z.array(eventSchema).or(z.array(issueSchema)).or(z.array(z.any())),
  events: z.array(eventSchema).or(z.array(z.any())).optional(),
  issues: z.array(issueSchema).or(z.array(z.any())).optional(),
  count: z.number().optional(),
  links: z.object({
    previous: z.object({ cursor: z.string() }).optional(),
    next: z.object({ cursor: z.string() }).optional()
  }).optional(),
  pagination: z.object({
    next: z.string().optional().nullable(),
    previous: z.string().optional().nullable(),
    total: z.number().optional()
  }).optional(),
  meta: z.record(z.any()).optional(),
  hasMore: z.boolean().optional()
});

/**
 * Event details validation schema
 */
export const eventDetailsSchema = eventSchema.extend({
  contexts: z.record(z.any()).optional(),
  packages: z.record(z.string()).optional(),
  sdk: z.object({
    name: z.string(),
    version: z.string()
  }).optional(),
  breadcrumbs: z.array(z.object({
    timestamp: z.string(),
    category: z.string().optional(),
    message: z.string().optional(),
    data: z.record(z.any()).optional(),
    level: z.string().optional(),
    type: z.string().optional()
  })).optional(),
  exception: z.object({
    values: z.array(z.object({
      type: z.string(),
      value: z.string(),
      stacktrace: z.object({
        frames: z.array(z.object({
          filename: z.string().optional(),
          function: z.string().optional(),
          module: z.string().optional(),
          lineno: z.number().optional(),
          colno: z.number().optional(),
          in_app: z.boolean().optional(),
          context_line: z.string().optional(),
          pre_context: z.array(z.string()).optional(),
          post_context: z.array(z.string()).optional()
        }))
      }).optional()
    }))
  }).optional(),
  request: z.object({
    url: z.string().optional(),
    method: z.string().optional(),
    headers: z.record(z.string()).optional(),
    env: z.record(z.string()).optional(),
    data: z.any().optional()
  }).optional()
});

// Type inferences from Zod schemas
export type Event = z.infer<typeof eventSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type EventsResponse = z.infer<typeof responseSchema>;
export type IssuesResponse = z.infer<typeof responseSchema>;
export type EventDetails = z.infer<typeof eventDetailsSchema>;

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Interface for event fetch options
 */
export interface FetchEventsOptions {
  /** Organization slug or ID */
  organization: string;
  /** Project slug or ID */
  projectId?: string;
  /** Search query */
  query?: string;
  /** Pagination cursor */
  cursor?: string;
  /** Number of items per page */
  limit?: number;
  /** Sort field */
  sort?: string;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Environment */
  environment?: string;
  /** Time range (e.g., '24h', '7d') */
  timeRange?: string;
  /** Level filter */
  level?: string;
  /** Page number */
  page?: number;
  /** Items per page */
  perPage?: number;
  /** Additional options */
  options?: Record<string, any>;
}

/**
 * Get a list of events
 * 
 * @param options - Fetch options
 * @returns Promise with events response
 */
export const getEvents = async (options: FetchEventsOptions): Promise<EventsResponse> => {
  const { 
    organization, 
    projectId, 
    query, 
    cursor, 
    limit, 
    sort, 
    sortDirection,
    environment,
    timeRange,
    level,
    page,
    perPage,
    options: apiOptions 
  } = options;
  
  // Use organization as both slug or ID
  const organizationSlug = organization;
  const projectSlug = projectId;
  
  // Validate required parameters
  const validation = validateParams(
    'events',
    'list',
    { organization_slug: organizationSlug, project_slug: projectSlug }
  );
  
  if (!validation.isValid) {
    handleEventsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'getEvents', context: options }
    );
  }
  
  try {
    // Build query parameters
    const queryParams = {
      query,
      cursor,
      limit: limit || perPage,
      sort,
      sort_direction: sortDirection,
      environment,
      statsPeriod: timeRange,
      level,
      page
    };
    
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'events',
      'list',
      { organization_slug: organizationSlug, project_slug: projectSlug },
      queryParams,
      null,
      apiOptions
    );
    
    // Validate and transform response
    try {
      const validated = responseSchema.parse(response);
      
      // Ensure we have items for consistency
      if (!validated.items && validated.events) {
        validated.items = validated.events;
      } else if (!validated.items) {
        validated.items = [];
      }
      
      // Add hasMore flag if we can determine it
      if (validated.links?.next && !validated.hasMore) {
        validated.hasMore = true;
      }
      
      return validated;
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Events response validation failed:', validationError);
      return {
        ...response as any,
        items: (response as any).events || (response as any).items || []
      };
    }
  } catch (error) {
    handleEventsError(error, {
      operation: 'getEvents',
      context: { organizationSlug, projectSlug, query }
    });
    throw error; // Error handler will rethrow
  }
};

/**
 * Get a single event by ID
 * 
 * @param organizationSlug - Organization slug
 * @param projectSlug - Project slug
 * @param eventId - Event ID
 * @param options - API call options
 * @returns Promise with event details
 */
export const getEvent = async (
  organizationSlug: string,
  projectSlug: string,
  eventId: string,
  options?: Record<string, any>
): Promise<EventDetails> => {
  // Validate required parameters
  const validation = validateParams(
    'events',
    'detail',
    { organization_slug: organizationSlug, project_slug: projectSlug, event_id: eventId }
  );
  
  if (!validation.isValid) {
    handleEventsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'getEvent', context: { organizationSlug, projectSlug, eventId } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'events',
      'detail',
      { organization_slug: organizationSlug, project_slug: projectSlug, event_id: eventId },
      {},
      null,
      options
    );
    
    // Validate and return
    try {
      return eventDetailsSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Event details validation failed:', validationError);
      return response as EventDetails;
    }
  } catch (error) {
    handleEventsError(error, {
      operation: 'getEvent',
      context: { organizationSlug, projectSlug, eventId }
    });
    throw error;
  }
};

/**
 * Get event tags
 * 
 * @param organizationSlug - Organization slug
 * @param projectSlug - Project slug
 * @param eventId - Event ID
 * @param options - API call options
 * @returns Promise with event tags
 */
export const getEventTags = async (
  organizationSlug: string,
  projectSlug: string,
  eventId: string,
  options?: Record<string, any>
): Promise<Array<{ key: string; value: string }>> => {
  // Validate required parameters
  const validation = validateParams(
    'events',
    'tags',
    { organization_slug: organizationSlug, project_slug: projectSlug, event_id: eventId }
  );
  
  if (!validation.isValid) {
    handleEventsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'getEventTags', context: { organizationSlug, projectSlug, eventId } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'events',
      'tags',
      { organization_slug: organizationSlug, project_slug: projectSlug, event_id: eventId },
      {},
      null,
      options
    );
    
    // Basic validation
    if (Array.isArray(response)) {
      return response as Array<{ key: string; value: string }>;
    }
    
    console.warn('Event tags response is not an array:', response);
    return [];
  } catch (error) {
    handleEventsError(error, {
      operation: 'getEventTags',
      context: { organizationSlug, projectSlug, eventId }
    });
    throw error;
  }
};

/**
 * Get related events for an issue
 * 
 * @param organizationSlug - Organization slug
 * @param issueId - Issue ID
 * @param options - API call options
 * @returns Promise with related events
 */
export const getRelatedEvents = async (
  organizationSlug: string,
  issueId: string,
  options?: Record<string, any>
): Promise<EventsResponse> => {
  // Validate required parameters
  const validation = validateParams(
    'issueEvents',
    'list',
    { organization_slug: organizationSlug, issue_id: issueId }
  );
  
  if (!validation.isValid) {
    handleEventsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'getRelatedEvents', context: { organizationSlug, issueId } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'issueEvents',
      'list',
      { organization_slug: organizationSlug, issue_id: issueId },
      {},
      null,
      options
    );
    
    // Validate and return
    try {
      const validated = responseSchema.parse(response);
      
      // Ensure we have items for consistency
      if (!validated.items && validated.events) {
        validated.items = validated.events;
      } else if (!validated.items) {
        validated.items = [];
      }
      
      return validated;
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Related events validation failed:', validationError);
      return {
        ...response as any,
        items: (response as any).events || (response as any).items || []
      };
    }
  } catch (error) {
    handleEventsError(error, {
      operation: 'getRelatedEvents',
      context: { organizationSlug, issueId }
    });
    throw error;
  }
};

/**
 * Get latest event for an issue
 * 
 * @param organizationSlug - Organization slug
 * @param issueId - Issue ID
 * @param options - API call options
 * @returns Promise with event details
 */
export const getLatestEvent = async (
  organizationSlug: string,
  issueId: string,
  options?: Record<string, any>
): Promise<EventDetails> => {
  // Validate required parameters
  const validation = validateParams(
    'issueEvents',
    'latest',
    { organization_slug: organizationSlug, issue_id: issueId }
  );
  
  if (!validation.isValid) {
    handleEventsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'getLatestEvent', context: { organizationSlug, issueId } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'issueEvents',
      'latest',
      { organization_slug: organizationSlug, issue_id: issueId },
      {},
      null,
      options
    );
    
    // Validate and return
    try {
      return eventDetailsSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Latest event validation failed:', validationError);
      return response as EventDetails;
    }
  } catch (error) {
    handleEventsError(error, {
      operation: 'getLatestEvent',
      context: { organizationSlug, issueId }
    });
    throw error;
  }
};

/**
 * Fetch issues with comprehensive filtering options
 * This is a unified method that supports the EventTable components
 * 
 * @param options - Options for fetching issues
 * @returns Promise with issues response
 */
export const getIssues = async (options: FetchEventsOptions): Promise<IssuesResponse> => {
  const { 
    organization, 
    projectId, 
    query, 
    cursor, 
    limit, 
    sort, 
    sortDirection,
    environment,
    timeRange,
    level,
    page,
    perPage,
    options: apiOptions 
  } = options;
  
  // Use organization as both slug or ID
  const organizationSlug = organization;
  const projectSlug = projectId;
  
  // Validate required parameters
  const validation = validateParams(
    'issues',
    'list',
    { organization_slug: organizationSlug }
  );
  
  if (!validation.isValid) {
    handleEventsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'getIssues', context: options }
    );
  }
  
  try {
    // Map from the internal option names to API parameter names
    const queryParams = {
      query,
      cursor,
      limit: limit || perPage,
      project: projectSlug,
      environment,
      status: options.options?.status,
      sort,
      sort_direction: sortDirection,
      stats_period: timeRange,
      level,
      page
    };
    
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'issues',
      'list',
      { organization_slug: organizationSlug },
      queryParams,
      null,
      apiOptions
    );
    
    // Validate and transform response
    try {
      const validated = responseSchema.parse(response);
      
      // Ensure we have items for consistency
      if (!validated.items && validated.issues) {
        validated.items = validated.issues;
      } else if (!validated.items) {
        validated.items = [];
      }
      
      // Add hasMore flag if we can determine it
      if (validated.links?.next && !validated.hasMore) {
        validated.hasMore = true;
      }
      
      return validated;
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Issues response validation failed:', validationError);
      return {
        ...response as any,
        items: (response as any).issues || (response as any).items || []
      };
    }
  } catch (error) {
    handleEventsError(error, {
      operation: 'getIssues',
      context: { organizationSlug, projectSlug, query }
    });
    throw error;
  }
};

/**
 * Fetch a single issue by ID
 * 
 * @param organizationSlug - Organization slug
 * @param issueId - Issue ID
 * @param options - API call options
 * @returns Promise with issue details
 */
export const getIssue = async (
  organizationSlug: string,
  issueId: string,
  options?: Record<string, any>
): Promise<Issue> => {
  // Validate required parameters
  const validation = validateParams(
    'issues',
    'detail',
    { organization_slug: organizationSlug, issue_id: issueId }
  );
  
  if (!validation.isValid) {
    handleEventsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'getIssue', context: { organizationSlug, issueId } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'issues',
      'detail',
      { organization_slug: organizationSlug, issue_id: issueId },
      {},
      null,
      options
    );
    
    // Validate and return
    try {
      return issueSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Issue details validation failed:', validationError);
      return response as Issue;
    }
  } catch (error) {
    handleEventsError(error, {
      operation: 'getIssue',
      context: { organizationSlug, issueId }
    });
    throw error;
  }
};

/**
 * Update issue status
 * 
 * @param organizationSlug - Organization slug
 * @param issueId - Issue ID
 * @param status - New status (resolved, unresolved, ignored)
 * @param options - API call options
 * @returns Promise with updated issue
 */
export const updateIssueStatus = async (
  organizationSlug: string,
  issueId: string,
  status: string,
  options?: Record<string, any>
): Promise<Issue> => {
  // Validate required parameters
  const validation = validateParams(
    'issues',
    'update',
    { organization_slug: organizationSlug, issue_id: issueId }
  );
  
  if (!validation.isValid) {
    handleEventsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'updateIssueStatus', context: { organizationSlug, issueId, status } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'issues',
      'update',
      { organization_slug: organizationSlug, issue_id: issueId },
      {},
      { status },
      options
    );
    
    // Validate and return
    try {
      return issueSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Issue update validation failed:', validationError);
      return response as Issue;
    }
  } catch (error) {
    handleEventsError(error, {
      operation: 'updateIssueStatus',
      context: { organizationSlug, issueId, status }
    });
    throw error;
  }
};

/**
 * Assign issue to a user
 * 
 * @param organizationSlug - Organization slug
 * @param issueId - Issue ID
 * @param assigneeId - Assignee ID (empty to unassign)
 * @param options - API call options
 * @returns Promise with updated issue
 */
export const assignIssue = async (
  organizationSlug: string,
  issueId: string,
  assigneeId: string,
  options?: Record<string, any>
): Promise<Issue> => {
  // Validate required parameters
  const validation = validateParams(
    'issues',
    'assign',
    { organization_slug: organizationSlug, issue_id: issueId }
  );
  
  if (!validation.isValid) {
    handleEventsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'assignIssue', context: { organizationSlug, issueId, assigneeId } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'issues',
      'assign',
      { organization_slug: organizationSlug, issue_id: issueId },
      {},
      { assignee: assigneeId || null },
      options
    );
    
    // Validate and return
    try {
      return issueSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Issue assignment validation failed:', validationError);
      return response as Issue;
    }
  } catch (error) {
    handleEventsError(error, {
      operation: 'assignIssue',
      context: { organizationSlug, issueId, assigneeId }
    });
    throw error;
  }
};

/**
 * Simplified function to fetch events for the EventTable components
 * This is an adapter that maintains backward compatibility
 * 
 * @param options - Fetch options
 * @returns Promise with events response compatible with EventTable
 */
export const fetchEvents = async (options: FetchEventsOptions): Promise<EventsResponse> => {
  try {
    // Use getEvents for raw events or getIssues based on configuration
    const useIssues = options.options?.useIssues === true;
    
    if (useIssues) {
      return await getIssues(options);
    } else {
      return await getEvents(options);
    }
  } catch (error) {
    handleEventsError(error, {
      operation: 'fetchEvents',
      context: options
    });
    throw error;
  }
};

// Export all functions
export default {
  // Core events API
  getEvents,
  getEvent,
  getEventTags,
  getRelatedEvents,
  getLatestEvent,
  
  // Issues API integration
  getIssues,
  getIssue,
  updateIssueStatus,
  assignIssue,
  
  // Compatibility functions
  fetchEvents
};