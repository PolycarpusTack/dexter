import { PathMapping, ResolvePathOptions } from '../config/apiPaths';

export class PathResolver {
  /**
   * Resolve a path template with provided parameters
   */
  static resolve(template: string, params: ResolvePathOptions = {}): string {
    // Find all placeholders in the template
    const placeholders = template.match(/{([^}]+)}/g) || [];
    const placeholderNames = placeholders.map(p => p.slice(1, -1));
    
    // Prepare parameters with fallbacks
    const resolvedParams = { ...params };
    
    // Handle common parameter mappings
    if (params.org && !params.organization_slug) {
      resolvedParams.organization_slug = params.org;
    }
    
    if (params.project && !params.project_slug) {
      resolvedParams.project_slug = params.project;
    }
    
    if (params.team && !params.team_slug) {
      resolvedParams.team_slug = params.team;
    }
    
    // Check for missing required placeholders
    const missing: string[] = [];
    placeholderNames.forEach(placeholder => {
      if (!(placeholder in resolvedParams) || resolvedParams[placeholder] === undefined) {
        missing.push(placeholder);
      }
    });
    
    if (missing.length > 0) {
      throw new Error(`Missing required path parameters: ${missing.join(', ')}`);
    }
    
    // Perform substitution
    let resolved = template;
    placeholderNames.forEach(placeholder => {
      const value = resolvedParams[placeholder];
      if (value !== undefined) {
        resolved = resolved.replace(`{${placeholder}}`, String(value));
      }
    });
    
    return resolved;
  }
  
  /**
   * Resolve a path from a PathMapping object
   */
  static resolveMapping(
    mapping: PathMapping,
    pathType: 'frontend' | 'backend' | 'sentry' = 'sentry',
    params: ResolvePathOptions = {}
  ): string {
    let template: string;
    
    switch (pathType) {
      case 'frontend':
        template = mapping.frontendPath;
        break;
      case 'backend':
        template = mapping.backendPath;
        break;
      case 'sentry':
        template = mapping.sentryPath;
        break;
      default:
        throw new Error(`Invalid path type: ${pathType}`);
    }
    
    return PathResolver.resolve(template, params);
  }
  
  /**
   * Extract parameters from a path based on a template
   */
  static extractParameters(path: string, template: string): Record<string, string> {
    // Convert template to regex pattern
    let pattern = template;
    const placeholders = template.match(/{([^}]+)}/g) || [];
    const placeholderNames = placeholders.map(p => p.slice(1, -1));
    
    // Replace placeholders with regex capture groups
    placeholderNames.forEach(placeholder => {
      pattern = pattern.replace(`{${placeholder}}`, `(?<${placeholder}>[^/]+)`);
    });
    
    // Escape special regex characters in the rest of the pattern
    pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Unescape the named groups we just added
    pattern = pattern.replace(/\\\(\\\?<([^>]+)>\\\[([^\]]+)\\\]\\\+\\\)/g, '(?<$1>$2)');
    
    // Add anchors
    pattern = `^${pattern}$`;
    
    // Try to match
    const regex = new RegExp(pattern);
    const match = path.match(regex);
    
    if (match && match.groups) {
      return match.groups;
    }
    
    return {};
  }
  
  /**
   * Find a matching route for a given path
   */
  static findMatchingRoute(
    path: string,
    allPaths: Record<string, Record<string, PathMapping>>
  ): { category: string; operation: string; mapping: PathMapping } | null {
    for (const [category, operations] of Object.entries(allPaths)) {
      for (const [operation, mapping] of Object.entries(operations)) {
        // Try matching against frontend, backend, and sentry paths
        const pathTypes: Array<keyof PathMapping> = ['frontendPath', 'backendPath', 'sentryPath'];
        
        for (const pathType of pathTypes) {
          const template = mapping[pathType];
          if (typeof template === 'string') {
            const params = PathResolver.extractParameters(path, template);
            if (Object.keys(params).length > 0) {
              return { category, operation, mapping };
            }
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Validate that all required parameters for a path template are provided
   */
  static validatePathParams(
    template: string,
    params: ResolvePathOptions
  ): { isValid: boolean; missingParams: string[] } {
    const placeholders = template.match(/{([^}]+)}/g) || [];
    const placeholderNames = placeholders.map(p => p.slice(1, -1));
    
    // Prepare parameters with fallbacks
    const resolvedParams = { ...params };
    
    // Handle common parameter mappings
    if (params.org && !params.organization_slug) {
      resolvedParams.organization_slug = params.org;
    }
    
    if (params.project && !params.project_slug) {
      resolvedParams.project_slug = params.project;
    }
    
    if (params.team && !params.team_slug) {
      resolvedParams.team_slug = params.team;
    }
    
    // Check for missing parameters
    const missing: string[] = [];
    placeholderNames.forEach(placeholder => {
      if (!(placeholder in resolvedParams) || resolvedParams[placeholder] === undefined) {
        missing.push(placeholder);
      }
    });
    
    return {
      isValid: missing.length === 0,
      missingParams: missing
    };
  }
  
  /**
   * Build a URL with query parameters
   */
  static buildUrlWithParams(path: string, queryParams?: Record<string, any>): string {
    if (!queryParams || Object.keys(queryParams).length === 0) {
      return path;
    }
    
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, String(v)));
        } else {
          params.append(key, String(value));
        }
      }
    });
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  }
}

// Export convenience functions that use the PathResolver class
export const resolvePath = (template: string, params?: ResolvePathOptions) => 
  PathResolver.resolve(template, params);

export const resolveMapping = (
  mapping: PathMapping,
  pathType: 'frontend' | 'backend' | 'sentry' = 'sentry',
  params?: ResolvePathOptions
) => PathResolver.resolveMapping(mapping, pathType, params);

export const extractParameters = (path: string, template: string) =>
  PathResolver.extractParameters(path, template);

export const validatePathParams = (template: string, params: ResolvePathOptions) =>
  PathResolver.validatePathParams(template, params);

export const buildUrlWithParams = (path: string, queryParams?: Record<string, any>) =>
  PathResolver.buildUrlWithParams(path, queryParams);
