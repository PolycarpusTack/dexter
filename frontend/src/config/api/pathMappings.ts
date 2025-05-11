// Centralized API path mapping configuration for frontend
// Maps between frontend paths, backend paths, and Sentry API paths

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export interface ApiEndpoint {
  name: string;
  frontendPath: string;
  backendPath: string;
  sentryPath: string;
  method: HttpMethod;
  pathParams: string[];
  queryParams: string[];
  requiresAuth: boolean;
  cacheTTL?: number; // Cache TTL in seconds
  description: string;
}

export class ApiEndpointConfig implements ApiEndpoint {
  constructor(
    public name: string,
    public frontendPath: string,
    public backendPath: string,
    public sentryPath: string,
    public method: HttpMethod = HttpMethod.GET,
    public pathParams: string[] = [],
    public queryParams: string[] = [],
    public requiresAuth: boolean = true,
    public cacheTTL?: number,
    public description: string = ''
  ) {}

  resolveFrontendPath(params: Record<string, string>): string {
    let path = this.frontendPath;
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`{${key}}`, value);
    });
    return path;
  }

  resolveBackendPath(params: Record<string, string>): string {
    let path = this.backendPath;
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`{${key}}`, value);
    });
    return path;
  }

  resolveSentryPath(params: Record<string, string>): string {
    let path = this.sentryPath;
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`{${key}}`, value);
    });
    return path;
  }
}

// API Path Mappings
export const API_MAPPINGS: Record<string, ApiEndpointConfig> = {
  // Issues endpoints
  listIssues: new ApiEndpointConfig(
    'listIssues',
    '/api/v1/issues',
    '/organizations/{organization_slug}/projects/{project_slug}/issues',
    '/api/0/projects/{organization_slug}/{project_slug}/issues/',
    HttpMethod.GET,
    ['organization_slug', 'project_slug'],
    ['cursor', 'status', 'query', 'limit'],
    true,
    300, // 5 minutes
    'List project issues'
  ),

  getIssue: new ApiEndpointConfig(
    'getIssue',
    '/api/v1/issues/{issue_id}',
    '/organizations/{organization_slug}/issues/{issue_id}',
    '/api/0/issues/{issue_id}/',
    HttpMethod.GET,
    ['organization_slug', 'issue_id'],
    [],
    true,
    60, // 1 minute
    'Get issue details'
  ),

  updateIssue: new ApiEndpointConfig(
    'updateIssue',
    '/api/v1/issues/{issue_id}',
    '/organizations/{organization_slug}/issues/{issue_id}',
    '/api/0/issues/{issue_id}/',
    HttpMethod.PUT,
    ['organization_slug', 'issue_id'],
    [],
    true,
    undefined,
    'Update issue'
  ),

  bulkUpdateIssues: new ApiEndpointConfig(
    'bulkUpdateIssues',
    '/api/v1/issues/bulk',
    '/organizations/{organization_slug}/projects/{project_slug}/issues/bulk',
    '/api/0/projects/{organization_slug}/{project_slug}/issues/',
    HttpMethod.PUT,
    ['organization_slug', 'project_slug'],
    ['id', 'status'],
    true,
    undefined,
    'Bulk update issues'
  ),

  // Events endpoints
  getEvent: new ApiEndpointConfig(
    'getEvent',
    '/api/v1/events/{event_id}',
    '/organizations/{organization_slug}/projects/{project_slug}/events/{event_id}',
    '/api/0/projects/{organization_slug}/{project_slug}/events/{event_id}/',
    HttpMethod.GET,
    ['organization_slug', 'project_slug', 'event_id'],
    [],
    true,
    600, // 10 minutes
    'Get event details'
  ),

  listIssueEvents: new ApiEndpointConfig(
    'listIssueEvents',
    '/api/v1/issues/{issue_id}/events',
    '/organizations/{organization_slug}/issues/{issue_id}/events',
    '/api/0/issues/{issue_id}/events/',
    HttpMethod.GET,
    ['organization_slug', 'issue_id'],
    ['cursor', 'environment'],
    true,
    60, // 1 minute
    'List issue events'
  ),

  // Tag management
  listIssueTags: new ApiEndpointConfig(
    'listIssueTags',
    '/api/v1/issues/{issue_id}/tags',
    '/organizations/{organization_slug}/issues/{issue_id}/tags',
    '/api/0/issues/{issue_id}/tags/',
    HttpMethod.GET,
    ['organization_slug', 'issue_id'],
    [],
    true,
    300, // 5 minutes
    'List issue tags'
  ),

  addIssueTags: new ApiEndpointConfig(
    'addIssueTags',
    '/api/v1/issues/{issue_id}/tags',
    '/organizations/{organization_slug}/issues/{issue_id}/tags',
    '/api/0/issues/{issue_id}/tags/',
    HttpMethod.POST,
    ['organization_slug', 'issue_id'],
    [],
    true,
    undefined,
    'Add tags to issue'
  ),

  // Assignment
  assignIssue: new ApiEndpointConfig(
    'assignIssue',
    '/api/v1/issues/{issue_id}/assign',
    '/api/v1/issues/{issue_id}/assign',
    '/api/0/issues/{issue_id}/',
    HttpMethod.PUT,
    ['issue_id'],
    [],
    true,
    undefined,
    'Assign issue to user'
  ),

  // Alert rules
  listAlertRules: new ApiEndpointConfig(
    'listAlertRules',
    '/api/v1/alert-rules',
    '/organizations/{organization_slug}/alert-rules',
    '/api/0/organizations/{organization_slug}/alert-rules/',
    HttpMethod.GET,
    ['organization_slug'],
    [],
    true,
    300, // 5 minutes
    'List alert rules'
  ),

  createAlertRule: new ApiEndpointConfig(
    'createAlertRule',
    '/api/v1/alert-rules',
    '/organizations/{organization_slug}/alert-rules',
    '/api/0/organizations/{organization_slug}/alert-rules/',
    HttpMethod.POST,
    ['organization_slug'],
    [],
    true,
    undefined,
    'Create alert rule'
  ),

  // Discover API
  discoverQuery: new ApiEndpointConfig(
    'discoverQuery',
    '/api/v1/discover',
    '/organizations/{organization_slug}/discover',
    '/api/0/organizations/{organization_slug}/events/',
    HttpMethod.GET,
    ['organization_slug'],
    ['field', 'query', 'statsPeriod', 'start', 'end', 'project', 'environment'],
    true,
    60, // 1 minute
    'Query discover events'
  ),
};

export class ApiPathManager {
  constructor(private mappings: Record<string, ApiEndpointConfig> = API_MAPPINGS) {}

  getEndpoint(name: string): ApiEndpointConfig | undefined {
    return this.mappings[name];
  }

  resolveFrontendPath(name: string, params: Record<string, string>): string {
    const endpoint = this.getEndpoint(name);
    if (!endpoint) {
      throw new Error(`Unknown endpoint: ${name}`);
    }
    return endpoint.resolveFrontendPath(params);
  }

  resolveBackendPath(name: string, params: Record<string, string>): string {
    const endpoint = this.getEndpoint(name);
    if (!endpoint) {
      throw new Error(`Unknown endpoint: ${name}`);
    }
    return endpoint.resolveBackendPath(params);
  }

  resolveSentryPath(name: string, params: Record<string, string>): string {
    const endpoint = this.getEndpoint(name);
    if (!endpoint) {
      throw new Error(`Unknown endpoint: ${name}`);
    }
    return endpoint.resolveSentryPath(params);
  }

  listEndpoints(): string[] {
    return Object.keys(this.mappings);
  }

  getEndpointsByMethod(method: HttpMethod): ApiEndpointConfig[] {
    return Object.values(this.mappings).filter(endpoint => endpoint.method === method);
  }

  getCachedEndpoints(): ApiEndpointConfig[] {
    return Object.values(this.mappings).filter(endpoint => endpoint.cacheTTL !== undefined);
  }

  validateParams(name: string, params: Record<string, any>): { isValid: boolean; missingParams: string[] } {
    const endpoint = this.getEndpoint(name);
    if (!endpoint) {
      return { isValid: false, missingParams: [`Unknown endpoint: ${name}`] };
    }

    const missingParams: string[] = [];
    
    // Check path parameters
    for (const param of endpoint.pathParams) {
      if (!(param in params)) {
        missingParams.push(param);
      }
    }

    return {
      isValid: missingParams.length === 0,
      missingParams,
    };
  }
}

// Default instance
export const apiPathManager = new ApiPathManager();
