/**
 * Custom type declarations
 */

// Add module declaration for @mantine/styles to fix import compatibility
declare module '@mantine/styles' {
  // Re-export all exports from @mantine/core
  export * from '@mantine/core';
  
  // Explicitly define useTheme as an alias for useMantineTheme
  export const useTheme: typeof import('@mantine/core').useMantineTheme;
}

// Allow importing JS modules from TS files
declare module '*.js' {
  const content: any;
  export default content;
  export * from content;
}

// Allow importing TS modules from JS files
declare module '*.ts' {
  const content: any;
  export default content;
  export * from content;
}

// Declare configApiMock module
declare module '*/configApiMock' {
  import { z } from 'zod';

  export const configSchema: z.ZodSchema<any>;
  export const healthStatusSchema: z.ZodSchema<any>;
  
  export type Config = {
    organization_slug: string;
    project_slug: string;
    ai_models?: {
      name: string;
      status: string;
      size?: number;
      quantization?: string;
      family?: string;
    }[];
    current_model?: string;
    [key: string]: any;
  };
  
  export type HealthStatus = {
    status: string;
    sentry_connected: boolean;
    ollama_available: boolean;
    [key: string]: any;
  };
  
  export interface ConfigParams {
    organization_slug: string;
    project_slug: string;
  }
  
  export function getConfig(): Promise<Config>;
  export function updateConfig(config: Partial<Config>): Promise<Config>;
  export function checkConfig(config: ConfigParams): Promise<Config>;
  export function checkHealth(): Promise<HealthStatus>;
  
  const configApi: {
    getConfig: typeof getConfig;
    updateConfig: typeof updateConfig;
    checkConfig: typeof checkConfig;
    checkHealth: typeof checkHealth;
  };
  
  export default configApi;
}
