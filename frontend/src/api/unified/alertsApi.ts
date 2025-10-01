/**
 * Alerts API Module
 * 
 * This file provides methods for interacting with the Alerts API.
 * It includes types, validation schemas, and API client methods.
 */

import { z } from 'zod';

import { createErrorHandler } from './errorHandler';
import { validateParams } from './apiResolver';
import enhancedApiClient from './enhancedApiClient';
import { ApiCallOptions } from './types';

/**
 * Error handler for Alerts API
 */
const handleAlertsError = createErrorHandler('AlertsAPI');

/**
 * Alert rule action validation schema
 */
export const alertRuleActionSchema = z.object({
  type: z.string(),
  targetType: z.string().optional(),
  targetIdentifier: z.string().optional(),
  options: z.record(z.unknown()).optional()
});

/**
 * Alert rule validation schema
 */
export const alertRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  organizationId: z.string().optional(),
  projectSlug: z.string().optional(),
  status: z.enum(['active', 'disabled']),
  conditions: z.array(z.object({
    type: z.string(),
    field: z.string().optional(),
    operator: z.string().optional(),
    value: z.union([z.string(), z.number()]).optional(),
    params: z.record(z.unknown()).optional()
  })),
  filters: z.array(z.object({
    type: z.string(),
    field: z.string().optional(),
    operator: z.string().optional(),
    value: z.unknown().optional()
  })).optional(),
  actions: z.array(alertRuleActionSchema),
  dateCreated: z.string(),
  dateModified: z.string().optional(),
  createdBy: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional()
  }).optional(),
  aggregation: z.string().optional(),
  timeWindow: z.number().optional(),
  environment: z.string().optional().nullable(),
  frequency: z.number().optional(),
  dataset: z.string().optional(),
  queryType: z.string().optional(),
  query: z.string().optional(),
  includeAllProjects: z.boolean().optional(),
  owner: z.string().optional().nullable()
});

/**
 * Alert rule create/update input validation schema
 */
export const alertRuleInputSchema = z.object({
  name: z.string(),
  status: z.enum(['active', 'disabled']).optional(),
  conditions: z.array(z.object({
    type: z.string(),
    field: z.string().optional(),
    operator: z.string().optional(),
    value: z.union([z.string(), z.number()]).optional(),
    params: z.record(z.unknown()).optional()
  })),
  filters: z.array(z.object({
    type: z.string(),
    field: z.string().optional(),
    operator: z.string().optional(),
    value: z.unknown().optional()
  })).optional(),
  actions: z.array(alertRuleActionSchema),
  aggregation: z.string().optional(),
  timeWindow: z.number().optional(),
  environment: z.string().optional().nullable(),
  frequency: z.number().optional(),
  dataset: z.string().optional(),
  queryType: z.string().optional(),
  query: z.string().optional(),
  includeAllProjects: z.boolean().optional(),
  owner: z.string().optional().nullable(),
  projectSlugs: z.array(z.string()).optional()
});

// Type inferences from Zod schemas
export type AlertRule = z.infer<typeof alertRuleSchema>;
export type AlertRuleAction = z.infer<typeof alertRuleActionSchema>;
export type AlertRuleInput = z.infer<typeof alertRuleInputSchema>;

/**
 * Get a list of alert rules
 *
 * @param projectSlug - Project slug
 * @param options - API call options
 * @returns Promise with alert rules
 */
export const getAlertRules = async (
  projectSlug: string,
  options?: ApiCallOptions
): Promise<AlertRule[]> => {
  // Validate required parameters
  const validation = validateParams(
    'alerts',
    'list',
    { project: projectSlug }
  );
  
  if (!validation.isValid) {
    throw new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`);
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'alerts',
      'list',
      { project: projectSlug },
      {},
      null,
      options
    );
    
    // Validate and return
    if (Array.isArray(response)) {
      try {
        return z.array(alertRuleSchema).parse(response);
      } catch (validationError) {
        // Log validation error but return unvalidated response
        console.warn('Alert rules validation failed:', validationError);
        return response as AlertRule[];
      }
    }
    
    console.warn('Alert rules response is not an array:', response);
    return [];
  } catch (error) {
    handleAlertsError(error);
    throw error;
  }
};

/**
 * Get a single alert rule by ID
 * 
 * @param projectSlug - Project slug
 * @param ruleId - Alert rule ID
 * @param ruleType - Rule type ('issue' | 'metric')
 * @param options - API call options
 * @returns Promise with alert rule
 */
export const getAlertRule = async (
  projectSlug: string,
  ruleId: string,
  ruleType: 'issue' | 'metric',
  options?: ApiCallOptions
): Promise<AlertRule> => {
  // Validate required parameters
  const validation = validateParams(
    'alerts',
    'get',
    { id: ruleId }
  );
  
  if (!validation.isValid) {
    handleAlertsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'getAlertRule', context: { projectSlug, ruleId, ruleType } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'alerts',
      'get',
      { project: projectSlug, id: ruleId },
      { rule_type: ruleType },
      null,
      options
    );
    
    // Validate and return
    try {
      return alertRuleSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Alert rule validation failed:', validationError);
      return response as AlertRule;
    }
  } catch (error) {
    handleAlertsError(error);
    throw error;
  }
};

/**
 * Create a new alert rule
 * 
 * @param projectSlug - Project slug
 * @param data - Alert rule data
 * @param ruleType - Rule type ('issue' | 'metric')
 * @param options - API call options
 * @returns Promise with created alert rule
 */
export const createAlertRule = async (
  projectSlug: string,
  data: AlertRuleInput,
  ruleType: 'issue' | 'metric',
  options?: ApiCallOptions
): Promise<AlertRule> => {
  // Validate required parameters
  const validation = validateParams(
    'alerts',
    'create',
    { }
  );
  
  if (!validation.isValid) {
    handleAlertsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
    );
  }
  
  try {
    // Validate input data
    try {
      alertRuleInputSchema.parse(data);
    } catch (validationError) {
      throw new Error(`Invalid alert rule data: ${(validationError as Error).message}`);
    }
    
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'alerts',
      'create',
      { project: projectSlug },
      { rule_type: ruleType },
      data,
      options
    );
    
    // Validate and return
    try {
      return alertRuleSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Created alert rule validation failed:', validationError);
      return response as AlertRule;
    }
  } catch (error) {
    handleAlertsError(error);
    throw error;
  }
};

/**
 * Update an existing alert rule
 * 
 * @param projectSlug - Project slug
 * @param ruleId - Alert rule ID
 * @param data - Alert rule data
 * @param ruleType - Rule type ('issue' | 'metric')
 * @param options - API call options
 * @returns Promise with updated alert rule
 */
export const updateAlertRule = async (
  projectSlug: string,
  ruleId: string,
  data: Partial<AlertRuleInput>,
  ruleType: 'issue' | 'metric',
  options?: ApiCallOptions
): Promise<AlertRule> => {
  // Validate required parameters
  const validation = validateParams(
    'alerts',
    'update',
    { id: ruleId }
  );
  
  if (!validation.isValid) {
    handleAlertsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'alerts',
      'update',
      { project: projectSlug, id: ruleId },
      { rule_type: ruleType },
      data,
      options
    );
    
    // Validate and return
    try {
      return alertRuleSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Updated alert rule validation failed:', validationError);
      return response as AlertRule;
    }
  } catch (error) {
    handleAlertsError(error);
    throw error;
  }
};

/**
 * Delete an alert rule
 * 
 * @param projectSlug - Project slug
 * @param ruleId - Alert rule ID
 * @param ruleType - Rule type ('issue' | 'metric')
 * @param options - API call options
 * @returns Promise indicating success
 */
export const deleteAlertRule = async (
  projectSlug: string,
  ruleId: string,
  ruleType: 'issue' | 'metric',
  options?: ApiCallOptions
): Promise<void> => {
  // Validate required parameters
  const validation = validateParams(
    'alerts',
    'delete',
    { id: ruleId }
  );
  
  if (!validation.isValid) {
    handleAlertsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
    );
  }
  
  try {
    // Call the API
    await enhancedApiClient.callEndpoint(
      'alerts',
      'delete',
      { project: projectSlug, id: ruleId },
      { rule_type: ruleType },
      null,
      options
    );
  } catch (error) {
    handleAlertsError(error);
    throw error;
  }
};

// Export all functions
export default {
  getAlertRules,
  getAlertRule,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule
};
