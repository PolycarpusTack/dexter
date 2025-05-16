/**
 * Mock implementation of configApi for development and build
 * This file provides a simple mock implementation of the configApi to avoid MIME type issues.
 */

import { z } from 'zod';

// Configuration validation schema
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
}).catchall(z.unknown());

// Health status validation schema
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

// Mock data
const mockConfig: Config = {
  organization_slug: 'default-org',
  project_slug: 'default-project',
  ai_models: [
    {
      name: 'gpt-3.5-turbo',
      status: 'available',
      size: 0,
      quantization: 'float16',
      family: 'OpenAI'
    },
    {
      name: 'llama2-7b',
      status: 'available',
      size: 7000000000,
      quantization: 'q4_k_m',
      family: 'Meta'
    }
  ],
  current_model: 'gpt-3.5-turbo'
};

/**
 * Get current application configuration
 * @returns Promise with configuration
 */
export const getConfig = async (): Promise<Config> => {
  console.debug('Using mock config implementation');
  return mockConfig;
};

/**
 * Update application configuration
 * @param config - Configuration to update
 * @returns Promise with updated configuration
 */
export const updateConfig = async (config: Partial<Config>): Promise<Config> => {
  console.debug('Using mock updateConfig implementation');
  return { ...mockConfig, ...config };
};

/**
 * Check configuration validity
 * @param config - Configuration to check
 * @returns Promise with validated configuration
 */
export const checkConfig = async (config: ConfigParams): Promise<Config> => {
  console.debug('Using mock checkConfig implementation');
  return { ...mockConfig, ...config };
};

/**
 * Check system health status
 * @returns Promise with health status
 */
export const checkHealth = async (): Promise<HealthStatus> => {
  console.debug('Using mock checkHealth implementation');
  return {
    status: 'healthy',
    sentry_connected: true,
    ollama_available: true
  };
};

// Export default object
export default {
  getConfig,
  updateConfig,
  checkConfig,
  checkHealth
};
