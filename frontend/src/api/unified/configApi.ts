/**
 * Configuration API Module
 * 
 * This file provides methods for interacting with the application configuration API.
 * It includes types, validation schemas, and API client methods.
 */

import { z } from 'zod';
import enhancedApiClient from './enhancedApiClient';
import { createErrorHandler } from './errorHandler';
import { validateParams } from './pathResolver';

/**
 * Error handler for Config API
 */
const handleConfigError = createErrorHandler({
  module: 'ConfigAPI',
  showNotifications: true,
  logToConsole: true
});

/**
 * Configuration validation schema
 */
export const configSchema = z.object({
  organization_slug: z.string().min(1),
  project_slug: z.string().min(1),
  ai_models: z.array(z.object({
    name: z.string(),
    status: z.string(),
    size: z.number().optional(),
    quantization: z.string().optional(),
    family: z.string().optional()
  })).optional(),
  current_model: z.string().optional(),
  // Additional config fields can be added here
}).catchall(z.unknown());

/**
 * Health status validation schema
 */
export const healthStatusSchema = z.object({
  status: z.string(),
  sentry_connected: z.boolean(),
  ollama_available: z.boolean()
}).catchall(z.unknown());

// Type inferences from Zod schemas
export type Config = z.infer<typeof configSchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;

// Config request parameters
export interface ConfigParams {
  organization_slug: string;
  project_slug: string;
}

/**
 * Get current application configuration
 * 
 * @param options - API call options
 * @returns Promise with configuration
 */
export const getConfig = async (options?: Record<string, any>): Promise<Config> => {
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'config',
      'getConfig',
      {},
      {},
      null,
      options
    );
    
    // Validate and return
    try {
      return configSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Config validation failed:', validationError);
      return response as Config;
    }
  } catch (error) {
    handleConfigError(error, {
      operation: 'getConfig',
      context: {}
    });
    throw error;
  }
};

/**
 * Update application configuration
 * 
 * @param config - Configuration to update
 * @param options - API call options
 * @returns Promise with updated configuration
 */
export const updateConfig = async (
  config: Partial<Config>,
  options?: Record<string, any>
): Promise<Config> => {
  try {
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'config',
      'updateConfig',
      {},
      {},
      config,
      options
    );
    
    // Validate and return
    try {
      return configSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Config validation failed:', validationError);
      return response as Config;
    }
  } catch (error) {
    handleConfigError(error, {
      operation: 'updateConfig',
      context: config
    });
    throw error;
  }
};

/**
 * Check configuration validity
 * 
 * @param config - Configuration to check
 * @param options - API call options
 * @returns Promise with validated configuration
 */
export const checkConfig = async (
  config: ConfigParams,
  options?: Record<string, any>
): Promise<Config> => {
  try {
    // Validate parameters
    const validParams = z.object({
      organization_slug: z.string().min(1),
      project_slug: z.string().min(1)
    }).parse(config);
    
    // Call the API
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'config',
      'updateConfig',
      {},
      {},
      validParams,
      options
    );
    
    // Validate and return
    try {
      return configSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Config validation failed:', validationError);
      return response as Config;
    }
  } catch (error) {
    handleConfigError(error, {
      operation: 'checkConfig',
      context: config
    });
    throw error;
  }
};

/**
 * Check system health status
 * 
 * @param options - API call options
 * @returns Promise with health status
 */
export const checkHealth = async (options?: Record<string, any>): Promise<HealthStatus> => {
  try {
    // Call the API (using direct call for now as health endpoint isn't in apiConfig)
    const response = await enhancedApiClient.get<unknown>(
      '/health',
      options
    );
    
    // Validate and return
    try {
      return healthStatusSchema.parse(response);
    } catch (validationError) {
      // Log validation error but return unvalidated response
      console.warn('Health status validation failed:', validationError);
      return response as HealthStatus;
    }
  } catch (error) {
    handleConfigError(error, {
      operation: 'checkHealth',
      context: {}
    });
    throw error;
  }
};

// Export all functions
export default {
  getConfig,
  updateConfig,
  checkConfig,
  checkHealth
};