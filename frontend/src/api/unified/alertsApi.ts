/**
 * Alerts API Module
 * 
 * This file provides methods for interacting with the Alerts API.
 * It includes types, validation schemas, and API client methods.
 */

import { z } from 'zod';
import enhancedApiClient from './enhancedApiClient';
import { createErrorHandler } from './errorHandler';
import { validateParams } from './pathResolver.js';

/**
 * Error handler for Alerts API
 */
const handleAlertsError = createErrorHandler({
  module: 'AlertsAPI',
  showNotifications: true,
  logToConsole: true
});

/**
 * Alert rule action validation schema
 */
export const alertRuleActionSchema = z.object({
  type: z.string(),
  targetType: z.string().optional(),
  targetIdentifier: z.string().optional(),
  options: z.record(z.any()).optional()
});

/**
 * Alert rule validation schema
 */
export const alertRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  organizationId: z.string().optional(),
  projectId: z.string().optional(),
  status: z.enum(['active', 'disabled']),
  conditions: z.array(z.record(z.any())),
  filters: z.array(z.record(z.any())).optional(),
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
  conditions: z.array(z.record(z.any())),
  filters: z.array(z.record(z.any())).optional(),
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
  projectIds: z.array(z.string()).optional()
});

// Type inferences from Zod schemas
export type AlertRule = z.infer<typeof alertRuleSchema>;
export type AlertRuleAction = z.infer<typeof alertRuleActionSchema>;
export type AlertRuleInput = z.infer<typeof alertRuleInputSchema>;

/**
 * Get a list of alert rules
 * 
 * @param organizationSlug - Organization slug
 * @param options - API call options
 * @returns Promise with alert rules
 */
export const getAlertRules = async (
  organizationSlug: string,
  options?: Record<string, any>
): Promise<AlertRule[]> => {
  // Validate required parameters
  const validation = validateParams(
    'alerts',
    'listRules',
    { organization_slug: organizationSlug }
  );
  
  if (!validation.isValid) {
    handleAlertsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'getAlertRules', context: { organizationSlug } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'alerts',
      'listRules',
      { organization_slug: organizationSlug },
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
    handleAlertsError(error, {
      operation: 'getAlertRules',
      context: { organizationSlug }
    });
    throw error;
  }
};

/**
 * Get a single alert rule by ID
 * 
 * @param organizationSlug - Organization slug
 * @param ruleId - Alert rule ID
 * @param options - API call options
 * @returns Promise with alert rule
 */
export const getAlertRule = async (
  organizationSlug: string,
  ruleId: string,
  options?: Record<string, any>
): Promise<AlertRule> => {
  // Validate required parameters
  const validation = validateParams(
    'alerts',
    'getRule',
    { organization_slug: organizationSlug, rule_id: ruleId }
  );
  
  if (!validation.isValid) {
    handleAlertsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'getAlertRule', context: { organizationSlug, ruleId } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'alerts',
      'getRule',
      { organization_slug: organizationSlug, rule_id: ruleId },
      {},
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
    handleAlertsError(error, {
      operation: 'getAlertRule',
      context: { organizationSlug, ruleId }
    });
    throw error;
  }
};

/**
 * Create a new alert rule
 * 
 * @param organizationSlug - Organization slug
 * @param data - Alert rule data
 * @param options - API call options
 * @returns Promise with created alert rule
 */
export const createAlertRule = async (
  organizationSlug: string,
  data: AlertRuleInput,
  options?: Record<string, any>
): Promise<AlertRule> => {
  // Validate required parameters
  const validation = validateParams(
    'alerts',
    'createRule',
    { organization_slug: organizationSlug }
  );
  
  if (!validation.isValid) {
    handleAlertsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'createAlertRule', context: { organizationSlug, data } }
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
      'createRule',
      { organization_slug: organizationSlug },
      {},
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
    handleAlertsError(error, {
      operation: 'createAlertRule',
      context: { organizationSlug, data }
    });
    throw error;
  }
};

/**
 * Update an existing alert rule
 * 
 * @param organizationSlug - Organization slug
 * @param ruleId - Alert rule ID
 * @param data - Alert rule data
 * @param options - API call options
 * @returns Promise with updated alert rule
 */
export const updateAlertRule = async (
  organizationSlug: string,
  ruleId: string,
  data: Partial<AlertRuleInput>,
  options?: Record<string, any>
): Promise<AlertRule> => {
  // Validate required parameters
  const validation = validateParams(
    'alerts',
    'updateRule',
    { organization_slug: organizationSlug, rule_id: ruleId }
  );
  
  if (!validation.isValid) {
    handleAlertsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'updateAlertRule', context: { organizationSlug, ruleId, data } }
    );
  }
  
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'alerts',
      'updateRule',
      { organization_slug: organizationSlug, rule_id: ruleId },
      {},
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
    handleAlertsError(error, {
      operation: 'updateAlertRule',
      context: { organizationSlug, ruleId, data }
    });
    throw error;
  }
};

/**
 * Delete an alert rule
 * 
 * @param organizationSlug - Organization slug
 * @param ruleId - Alert rule ID
 * @param options - API call options
 * @returns Promise indicating success
 */
export const deleteAlertRule = async (
  organizationSlug: string,
  ruleId: string,
  options?: Record<string, any>
): Promise<void> => {
  // Validate required parameters
  const validation = validateParams(
    'alerts',
    'deleteRule',
    { organization_slug: organizationSlug, rule_id: ruleId }
  );
  
  if (!validation.isValid) {
    handleAlertsError(
      new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`),
      { operation: 'deleteAlertRule', context: { organizationSlug, ruleId } }
    );
  }
  
  try {
    // Call the API
    await enhancedApiClient.callEndpoint(
      'alerts',
      'deleteRule',
      { organization_slug: organizationSlug, rule_id: ruleId },
      {},
      null,
      options
    );
  } catch (error) {
    handleAlertsError(error, {
      operation: 'deleteAlertRule',
      context: { organizationSlug, ruleId }
    });
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