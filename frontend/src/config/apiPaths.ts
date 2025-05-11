export interface PathMapping {
  frontendPath: string;
  backendPath: string;
  sentryPath: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
}

export interface ApiPaths {
  [category: string]: {
    [operation: string]: PathMapping;
  };
}

// Base URLs - can be overridden by environment variables
export const SENTRY_API_BASE = import.meta.env.VITE_SENTRY_API_BASE || 'https://sentry.io/api/0';
export const BACKEND_API_BASE = import.meta.env.VITE_BACKEND_API_BASE || '/api';

// Path mappings organized by feature area
export const API_PATHS: ApiPaths = {
  issues: {
    list: {
      frontendPath: '/api/v1/issues',
      backendPath: '/api/events',
      sentryPath: '/projects/{organization_slug}/{project_slug}/issues/',
      method: 'GET',
      description: 'List project issues'
    },
    detail: {
      frontendPath: '/api/v1/issues/{id}',
      backendPath: '/api/events/{id}',
      sentryPath: '/issues/{id}/',
      method: 'GET',
      description: 'Get issue details'
    },
    bulkMutate: {
      frontendPath: '/api/v1/issues/bulk',
      backendPath: '/api/events/bulk',
      sentryPath: '/projects/{organization_slug}/{project_slug}/issues/',
      method: 'PUT',
      description: 'Bulk mutate issues'
    },
    delete: {
      frontendPath: '/api/v1/issues/{id}',
      backendPath: '/api/events/{id}',
      sentryPath: '/issues/{id}/',
      method: 'DELETE',
      description: 'Delete an issue'
    },
    update: {
      frontendPath: '/api/v1/issues/{id}',
      backendPath: '/api/events/{id}',
      sentryPath: '/issues/{id}/',
      method: 'PUT',
      description: 'Update an issue'
    },
    tags: {
      frontendPath: '/api/v1/issues/{id}/tags/{key}',
      backendPath: '/api/events/{id}/tags/{key}',
      sentryPath: '/issues/{id}/tags/{key}/',
      method: 'GET',
      description: 'Get tag details for issue'
    },
    tagValues: {
      frontendPath: '/api/v1/issues/{id}/tags/{key}/values',
      backendPath: '/api/events/{id}/tags/{key}/values',
      sentryPath: '/issues/{id}/tags/{key}/values/',
      method: 'GET',
      description: 'Get tag values for issue'
    },
    comments: {
      frontendPath: '/api/v1/issues/{id}/comments',
      backendPath: '/api/events/{id}/comments',
      sentryPath: '/issues/{id}/comments/',
      method: 'GET',
      description: 'Get issue comments'
    },
    userFeedback: {
      frontendPath: '/api/v1/projects/{project}/feedback',
      backendPath: '/api/projects/{organization_slug}/{project_slug}/feedback',
      sentryPath: '/projects/{organization_slug}/{project_slug}/user-feedback/',
      method: 'GET',
      description: 'Get user feedback'
    },
    events: {
      frontendPath: '/api/v1/issues/{id}/events',
      backendPath: '/api/events/{id}/events',
      sentryPath: '/issues/{id}/events/',
      method: 'GET',
      description: 'Get issue events'
    },
    hashes: {
      frontendPath: '/api/v1/issues/{id}/hashes',
      backendPath: '/api/events/{id}/hashes',
      sentryPath: '/issues/{id}/hashes/',
      method: 'GET',
      description: 'Get issue hashes'
    },
    latestEvent: {
      frontendPath: '/api/v1/issues/{id}/events/latest',
      backendPath: '/api/events/{id}/events/latest',
      sentryPath: '/issues/{id}/events/latest/',
      method: 'GET',
      description: 'Get latest event for issue'
    },
    oldestEvent: {
      frontendPath: '/api/v1/issues/{id}/events/oldest',
      backendPath: '/api/events/{id}/events/oldest',
      sentryPath: '/issues/{id}/events/oldest/',
      method: 'GET',
      description: 'Get oldest event for issue'
    },
    assignIssue: {
      frontendPath: '/api/v1/issues/{id}/assign',
      backendPath: '/api/v1/issues/{id}/assign',
      sentryPath: '/issues/{id}/',
      method: 'PUT',
      description: 'Assign issue to user'
    }
  },
  projects: {
    list: {
      frontendPath: '/api/v1/projects',
      backendPath: '/api/projects',
      sentryPath: '/organizations/{organization_slug}/projects/',
      method: 'GET',
      description: 'List organization projects'
    },
    detail: {
      frontendPath: '/api/v1/projects/{project}',
      backendPath: '/api/projects/{organization_slug}/{project_slug}',
      sentryPath: '/projects/{organization_slug}/{project_slug}/',
      method: 'GET',
      description: 'Get project details'
    },
    create: {
      frontendPath: '/api/v1/projects',
      backendPath: '/api/projects',
      sentryPath: '/teams/{organization_slug}/{team_slug}/projects/',
      method: 'POST',
      description: 'Create new project'
    },
    update: {
      frontendPath: '/api/v1/projects/{project}',
      backendPath: '/api/projects/{organization_slug}/{project_slug}',
      sentryPath: '/projects/{organization_slug}/{project_slug}/',
      method: 'PUT',
      description: 'Update project'
    },
    delete: {
      frontendPath: '/api/v1/projects/{project}',
      backendPath: '/api/projects/{organization_slug}/{project_slug}',
      sentryPath: '/projects/{organization_slug}/{project_slug}/',
      method: 'DELETE',
      description: 'Delete project'
    },
    keys: {
      frontendPath: '/api/v1/projects/{project}/keys',
      backendPath: '/api/projects/{organization_slug}/{project_slug}/keys',
      sentryPath: '/projects/{organization_slug}/{project_slug}/keys/',
      method: 'GET',
      description: 'List project client keys'
    },
    stats: {
      frontendPath: '/api/v1/projects/{project}/stats',
      backendPath: '/api/projects/{organization_slug}/{project_slug}/stats',
      sentryPath: '/projects/{organization_slug}/{project_slug}/stats/',
      method: 'GET',
      description: 'Get project stats'
    },
    events: {
      frontendPath: '/api/v1/projects/{project}/events',
      backendPath: '/api/projects/{organization_slug}/{project_slug}/events',
      sentryPath: '/projects/{organization_slug}/{project_slug}/events/',
      method: 'GET',
      description: 'List project events'
    },
    eventDetail: {
      frontendPath: '/api/v1/projects/{project}/events/{event_id}',
      backendPath: '/api/projects/{organization_slug}/{project_slug}/events/{event_id}',
      sentryPath: '/projects/{organization_slug}/{project_slug}/events/{event_id}/',
      method: 'GET',
      description: 'Get event detail'
    },
    users: {
      frontendPath: '/api/v1/projects/{project}/users',
      backendPath: '/api/projects/{organization_slug}/{project_slug}/users',
      sentryPath: '/projects/{organization_slug}/{project_slug}/users/',
      method: 'GET',
      description: 'List project users'
    },
    tags: {
      frontendPath: '/api/v1/projects/{project}/tags/{key}/values',
      backendPath: '/api/projects/{organization_slug}/{project_slug}/tags/{key}/values',
      sentryPath: '/projects/{organization_slug}/{project_slug}/tags/{key}/values/',
      method: 'GET',
      description: 'Get project tag values'
    }
  },
  organizations: {
    list: {
      frontendPath: '/api/v1/organizations',
      backendPath: '/api/organizations',
      sentryPath: '/organizations/',
      method: 'GET',
      description: 'List organizations'
    },
    detail: {
      frontendPath: '/api/v1/organizations/{org}',
      backendPath: '/api/organizations/{organization_slug}',
      sentryPath: '/organizations/{organization_slug}/',
      method: 'GET',
      description: 'Get organization details'
    },
    members: {
      frontendPath: '/api/v1/organizations/{org}/members',
      backendPath: '/api/organizations/{organization_slug}/members',
      sentryPath: '/organizations/{organization_slug}/members/',
      method: 'GET',
      description: 'List organization members'
    },
    stats: {
      frontendPath: '/api/v1/organizations/{org}/stats',
      backendPath: '/api/organizations/{organization_slug}/stats_v2',
      sentryPath: '/organizations/{organization_slug}/stats_v2/',
      method: 'GET',
      description: 'Get organization stats'
    },
    discover: {
      frontendPath: '/api/v1/organizations/{org}/discover',
      backendPath: '/api/organizations/{organization_slug}/events',
      sentryPath: '/organizations/{organization_slug}/events/',
      method: 'GET',
      description: 'Query discover events'
    },
    releases: {
      frontendPath: '/api/v1/organizations/{org}/releases',
      backendPath: '/api/organizations/{organization_slug}/releases',
      sentryPath: '/organizations/{organization_slug}/releases/',
      method: 'GET',
      description: 'List organization releases'
    },
    releaseDetail: {
      frontendPath: '/api/v1/organizations/{org}/releases/{version}',
      backendPath: '/api/organizations/{organization_slug}/releases/{version}',
      sentryPath: '/organizations/{organization_slug}/releases/{version}/',
      method: 'GET',
      description: 'Get release details'
    },
    alerts: {
      frontendPath: '/api/v1/organizations/{org}/alerts',
      backendPath: '/api/organizations/{organization_slug}/alert-rules',
      sentryPath: '/organizations/{organization_slug}/alert-rules/',
      method: 'GET',
      description: 'List alert rules'
    }
  },
  teams: {
    list: {
      frontendPath: '/api/v1/organizations/{org}/teams',
      backendPath: '/api/organizations/{organization_slug}/teams',
      sentryPath: '/organizations/{organization_slug}/teams/',
      method: 'GET',
      description: 'List organization teams'
    },
    detail: {
      frontendPath: '/api/v1/teams/{team}',
      backendPath: '/api/teams/{organization_slug}/{team_slug}',
      sentryPath: '/teams/{organization_slug}/{team_slug}/',
      method: 'GET',
      description: 'Get team details'
    },
    create: {
      frontendPath: '/api/v1/organizations/{org}/teams',
      backendPath: '/api/organizations/{organization_slug}/teams',
      sentryPath: '/organizations/{organization_slug}/teams/',
      method: 'POST',
      description: 'Create new team'
    },
    update: {
      frontendPath: '/api/v1/teams/{team}',
      backendPath: '/api/teams/{organization_slug}/{team_slug}',
      sentryPath: '/teams/{organization_slug}/{team_slug}/',
      method: 'PUT',
      description: 'Update team'
    },
    delete: {
      frontendPath: '/api/v1/teams/{team}',
      backendPath: '/api/teams/{organization_slug}/{team_slug}',
      sentryPath: '/teams/{organization_slug}/{team_slug}/',
      method: 'DELETE',
      description: 'Delete team'
    },
    projects: {
      frontendPath: '/api/v1/teams/{team}/projects',
      backendPath: '/api/teams/{organization_slug}/{team_slug}/projects',
      sentryPath: '/teams/{organization_slug}/{team_slug}/projects/',
      method: 'GET',
      description: 'List team projects'
    }
  },
  authentication: {
    apiTokens: {
      frontendPath: '/api/v1/api-tokens',
      backendPath: '/api/api-tokens',
      sentryPath: '/api-tokens/',
      method: 'GET',
      description: 'List API tokens'
    }
  }
};

// Utility functions
export function getPath(category: string, operation: string): PathMapping | undefined {
  return API_PATHS[category]?.[operation];
}

export function getAllPaths(): ApiPaths {
  return { ...API_PATHS };
}

export function getCategoryPaths(category: string): { [operation: string]: PathMapping } | undefined {
  return API_PATHS[category] ? { ...API_PATHS[category] } : undefined;
}

export interface ResolvePathOptions {
  org?: string;
  organization_slug?: string;
  project?: string;
  project_slug?: string;
  team?: string;
  team_slug?: string;
  id?: string;
  key?: string;
  event_id?: string;
  version?: string;
  [key: string]: string | undefined;
}

export function resolvePath(template: string, params: ResolvePathOptions = {}): string {
  let resolved = template;
  
  // Handle special cases for path resolution
  const resolvedParams = { ...params };
  
  // Replace organization_slug if org is provided
  if (params.org && !params.organization_slug) {
    resolvedParams.organization_slug = params.org;
  }
  
  // Replace project_slug if project is provided
  if (params.project && !params.project_slug) {
    resolvedParams.project_slug = params.project;
  }
  
  // Replace team_slug if team is provided
  if (params.team && !params.team_slug) {
    resolvedParams.team_slug = params.team;
  }
  
  // Perform substitution
  Object.entries(resolvedParams).forEach(([key, value]) => {
    if (value !== undefined) {
      const placeholder = `{${key}}`;
      resolved = resolved.replace(placeholder, value);
    }
  });
  
  return resolved;
}

export function getSentryUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${SENTRY_API_BASE}/${cleanPath}`;
}

export function getBackendUrl(path: string): string {
  // Ensure path starts with slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_API_BASE}${cleanPath}`;
}

// Type guard function
export function isValidCategory(category: string): category is keyof typeof API_PATHS {
  return category in API_PATHS;
}

// Export types for use in other files
export type ApiCategory = keyof typeof API_PATHS;
export type IssueOperation = keyof typeof API_PATHS.issues;
export type ProjectOperation = keyof typeof API_PATHS.projects;
export type OrganizationOperation = keyof typeof API_PATHS.organizations;
export type TeamOperation = keyof typeof API_PATHS.teams;
export type AuthOperation = keyof typeof API_PATHS.authentication;
