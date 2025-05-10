// Type definitions for configApi.js

export interface ConfigPayload {
  organization_slug: string;
  project_slug: string;
}

export interface ConfigResponse {
  organization_slug: string;
  project_slug: string;
  [key: string]: any;
}

export interface HealthStatus {
  status: string;
  sentry_connected: boolean;
  ollama_available: boolean;
  [key: string]: any;
}

export declare function checkConfig(config: ConfigPayload): Promise<ConfigResponse>;
export declare function getConfig(): Promise<ConfigResponse>;
export declare function checkHealth(): Promise<HealthStatus>;
