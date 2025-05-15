/**
 * Discover API Module
 * 
 * This file provides methods for interacting with the Discover API.
 * It includes types, validation schemas, and API client methods.
 */

import { z } from 'zod';
import enhancedApiClient from './enhancedApiClient';
import { createErrorHandler } from './errorHandler';
import { validateParams } from './pathResolver';

/**
 * Error handler for Discover API
 */
const handleDiscoverError = createErrorHandler({
  module: 'DiscoverAPI',
  showNotifications: true,
  logToConsole: true
});

/**
 * Discover query validation schema
 */
export const discoverQuerySchema = z.object({
  field: z.array(z.string()),
  query: z.string().optional(),
  dataset: z.enum(['events', 'transactions']).optional(),
  aggregations: z.array(
    z.object({
      function: z.string(),
      column: z.string().optional()
    })
  ).optional(),
  conditions: z.array(
    z.object({
      column: z.string(),
      operator: z.string(),
      value: z.union([z.string(), z.number(), z.boolean(), z.array(z.any())])
    })
  ).optional(),
  orderby: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  projects: z.array(z.number()).optional(),
  version: z.number().optional(),
  range: z.string().optional(),
  statsPeriod: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional()
});

/**
 * Discover result validation schema
 */
export const discoverResultSchema = z.object({
  data: z.array(z.record(z.any())),
  meta: z.object({
    fields: z.record(z.object({
      name: z.string().optional(),
      type: z.string().optional(),
      isSortable: z.boolean().optional()
    })).optional()
  }).optional(),
  pagination: z.object({
    next: z.string().optional().nullable(),
    previous: z.string().optional().nullable(),
    total: z.number().optional()
  }).optional()
});

/**
 * Saved query validation schema
 */
export const savedQuerySchema = z.object({
  id: z.string(),
  name: z.string(),
  query: discoverQuerySchema,
  dateCreated: z.string(),
  dateUpdated: z.string().optional(),
  createdBy: z.object({
    id: z.string(),
    name: z.string()
  }).optional(),
  isPublic: z.boolean().optional()
});

// Type inferences from Zod schemas
export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;
export type DiscoverResult = z.infer<typeof discoverResultSchema>;
export type SavedQuery = z.infer<typeof savedQuerySchema>;

/**
 * Interface for discover query options
 */
export interface DiscoverQueryOptions {
  /** Organization slug */
  organizationSlug: string;
  /** Query parameters */
  query: DiscoverQuery;
  /** Custom API call options */
  options?: Record<string, any>;
}

/**
 * Interface for saved query options
 */
export interface SavedQueryOptions {
  /** Organization slug */
  organizationSlug: string;
  /** Custom API call options */
  options?: Record<string, any>;
}

/**
 * Execute a Discover query
 * 
 * @param options - Query options
 * @returns Promise with query results
 */
export const executeQuery = async (options: DiscoverQueryOptions): Promise<DiscoverResult> => {
  const { organizationSlug, query, options: apiOptions } = options;
  
  // Validate required parameters
  const validation = validateParams(
    'discover',
    'query',
    { organization_slug: organizationSlug }
  );
  
  if (!validation.isValid) {
    handleDiscoverError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'executeQuery', context: options }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'discover',
      'query',
      { organization_slug: organizationSlug },
      query, // Pass query as query parameters
      null,
      apiOptions
    );
    
    // Validate and return
    try {
      return discoverResultSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Discover query result validation failed:', validationError);
      return response as DiscoverResult;
    }
  } catch (error) {
    handleDiscoverError(error, {
      operation: 'executeQuery',
      context: { organizationSlug, query }
    });
    throw error;
  }
};

/**
 * Get saved Discover queries
 * 
 * @param options - Saved query options
 * @returns Promise with saved queries
 */
export const getSavedQueries = async (options: SavedQueryOptions): Promise<SavedQuery[]> => {
  const { organizationSlug, options: apiOptions } = options;
  
  // Validate required parameters
  const validation = validateParams(
    'discover',
    'savedQueries',
    { organization_slug: organizationSlug }
  );
  
  if (!validation.isValid) {
    handleDiscoverError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'getSavedQueries', context: options }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'discover',
      'savedQueries',
      { organization_slug: organizationSlug },
      {},
      null,
      apiOptions
    );
    
    // Validate and return
    if (Array.isArray(response)) {
      try {
        return z.array(savedQuerySchema).parse(response);
      } catch (validationError) {
        // Log validation error but return unvalidated response
        console.warn('Saved queries validation failed:', validationError);
        return response as SavedQuery[];
      }
    }
    
    console.warn('Saved queries response is not an array:', response);
    return [];
  } catch (error) {
    handleDiscoverError(error, {
      operation: 'getSavedQueries',
      context: { organizationSlug }
    });
    throw error;
  }
};

/**
 * Save a Discover query
 * 
 * @param organizationSlug - Organization slug
 * @param name - Query name
 * @param query - Query parameters
 * @param isPublic - Whether the query is public
 * @param options - API call options
 * @returns Promise with saved query
 */
export const saveQuery = async (
  organizationSlug: string,
  name: string,
  query: DiscoverQuery,
  isPublic: boolean = false,
  options?: Record<string, any>
): Promise<SavedQuery> => {
  // Validate required parameters
  const validation = validateParams(
    'discover',
    'saveQuery',
    { organization_slug: organizationSlug }
  );
  
  if (!validation.isValid) {
    handleDiscoverError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'saveQuery', context: { organizationSlug, name, query } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'discover',
      'saveQuery',
      { organization_slug: organizationSlug },
      {},
      { name, query, isPublic },
      options
    );
    
    // Validate and return
    try {
      return savedQuerySchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Save query response validation failed:', validationError);
      return response as SavedQuery;
    }
  } catch (error) {
    handleDiscoverError(error, {
      operation: 'saveQuery',
      context: { organizationSlug, name, query }
    });
    throw error;
  }
};

// Export all functions
export default {
  executeQuery,
  getSavedQueries,
  saveQuery
};