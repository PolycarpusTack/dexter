// Enhanced API client with path resolution
import { AxiosRequestConfig } from 'axios';
import { apiClient, EnhancedApiClient } from './apiClient';
import { apiPathManager, HttpMethod } from '../config/api/pathMappings';
import ErrorFactory from '../utils/errorFactory';

// Define interfaces for better type safety
interface PathParamsMap {
  [key: string]: string | number | boolean;
}

// Interface for resolved path details
interface Resolved {
  path: string;
  pathParams: PathParamsMap;
  queryParams: Record<string, any>;
  originalPath?: string;
}

export interface ApiCallOptions extends AxiosRequestConfig {
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: ((retryCount: number, error: unknown) => number);
  };
}

export class PathAwareApiClient extends EnhancedApiClient {
  private pathManager = apiPathManager;

  constructor(
    baseURL?: string,
    config?: AxiosRequestConfig,
    retryConfig?: any
  ) {
    super(baseURL, config, retryConfig);
    // No need to override axiosInstance as it's now protected in the parent class
  }

  async callEndpoint<T = any>(
    endpointName: string,
    params: Record<string, any> = {},
    data?: any,
    options: ApiCallOptions = {}
  ): Promise<T> {
    // Get endpoint configuration
    const endpoint = this.pathManager.getEndpoint(endpointName);
    if (!endpoint) {
      throw ErrorFactory.create(new Error(`Unknown endpoint: ${endpointName}`));
    }

    // Validate parameters
    const validation = this.pathManager.validateParams(endpointName, params);
    if (!validation.isValid) {
      throw ErrorFactory.create(
        new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`)
      );
    }

    // Resolve the path
    const path = endpoint.resolveBackendPath(params);

    // Separate path and query parameters with proper type assertions
    const pathParamsMap: PathParamsMap = {};
    const queryParams: Record<string, any> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (endpoint.pathParams.includes(key)) {
        pathParamsMap[key] = value;
      } else if (endpoint.queryParams.includes(key)) {
        queryParams[key] = value;
      }
    });

    // Build request config
    const requestConfig: AxiosRequestConfig = {
      ...options,
      params: queryParams,
    };

    // Create a resolved path object using our Resolved interface
    const resolved: Resolved = {
      path,
      pathParams: pathParamsMap,
      queryParams,
      originalPath: endpoint.backendPath
    };

    // Log resolved path details for debugging
    console.debug('Resolved endpoint path:', resolved);

    // Make the request based on method
    switch (endpoint.method) {
      case HttpMethod.GET:
        return await this.get<T>(path, requestConfig, options.retryConfig);
      
      case HttpMethod.POST:
        return await this.post<T>(path, data, requestConfig, options.retryConfig);
      
      case HttpMethod.PUT:
        return await this.put<T>(path, data, requestConfig, options.retryConfig);
      
      case HttpMethod.DELETE:
        return await this.delete<T>(path, requestConfig, options.retryConfig);
      
      case HttpMethod.PATCH:
        return await this.patch<T>(path, data, requestConfig, options.retryConfig);
      
      default:
        throw ErrorFactory.create(new Error(`Unsupported HTTP method: ${endpoint.method}`));
    }
  }

  // Convenience methods for common endpoints
  async listIssues(params: {
    organization_slug: string;
    project_slug: string;
    status?: string;
    query?: string;
    cursor?: string;
    limit?: number;
  }, options?: ApiCallOptions) {
    return this.callEndpoint('listIssues', params, undefined, options);
  }

  async getIssue(params: {
    organization_slug: string;
    issue_id: string;
  }, options?: ApiCallOptions) {
    return this.callEndpoint('getIssue', params, undefined, options);
  }

  async updateIssue(params: {
    organization_slug: string;
    issue_id: string;
  }, data: any, options?: ApiCallOptions) {
    return this.callEndpoint('updateIssue', params, data, options);
  }

  async bulkUpdateIssues(params: {
    organization_slug: string;
    project_slug: string;
    id?: string[];
    status?: string;
  }, data: any, options?: ApiCallOptions) {
    return this.callEndpoint('bulkUpdateIssues', params, data, options);
  }

  async getEvent(params: {
    organization_slug: string;
    project_slug: string;
    event_id: string;
  }, options?: ApiCallOptions) {
    return this.callEndpoint('getEvent', params, undefined, options);
  }

  async listIssueEvents(params: {
    organization_slug: string;
    issue_id: string;
    cursor?: string;
    environment?: string;
  }, options?: ApiCallOptions) {
    return this.callEndpoint('listIssueEvents', params, undefined, options);
  }

  async assignIssue(params: {
    organization_slug: string;
    issue_id: string;
  }, data: { assignee: string | null }, options?: ApiCallOptions) {
    return this.callEndpoint('assignIssue', params, data, options);
  }

  async listIssueTags(params: {
    organization_slug: string;
    issue_id: string;
  }, options?: ApiCallOptions) {
    return this.callEndpoint('listIssueTags', params, undefined, options);
  }

  async addIssueTags(params: {
    organization_slug: string;
    issue_id: string;
  }, data: { tags: string[] }, options?: ApiCallOptions) {
    return this.callEndpoint('addIssueTags', params, data, options);
  }

  // Get endpoint information
  getEndpointInfo(endpointName: string) {
    const endpoint = this.pathManager.getEndpoint(endpointName);
    if (!endpoint) {
      return null;
    }

    return {
      name: endpoint.name,
      method: endpoint.method,
      frontendPath: endpoint.frontendPath,
      backendPath: endpoint.backendPath,
      sentryPath: endpoint.sentryPath,
      pathParams: endpoint.pathParams,
      queryParams: endpoint.queryParams,
      requiresAuth: endpoint.requiresAuth,
      cacheTTL: endpoint.cacheTTL,
      description: endpoint.description,
    };
  }

  // List available endpoints
  listEndpoints() {
    return this.pathManager.listEndpoints();
  }

  // Get cached endpoints
  getCachedEndpoints() {
    return this.pathManager.getCachedEndpoints();
  }
  
  // Use direct API call via the base apiClient
  // This allows fallback to the standard API client when needed
  async fallbackApiCall<T = any>(
    method: HttpMethod,
    path: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    switch (method) {
      case HttpMethod.GET:
        return apiClient.get<T>(path, config);
      case HttpMethod.POST:
        return apiClient.post<T>(path, data, config);
      case HttpMethod.PUT:
        return apiClient.put<T>(path, data, config);
      case HttpMethod.DELETE:
        return apiClient.delete<T>(path, config);
      case HttpMethod.PATCH:
        return apiClient.patch<T>(path, data, config);
      default:
        throw ErrorFactory.create(new Error(`Unsupported HTTP method: ${method}`));
    }
  }
  
  // This method uses the axiosInstance for direct access
  async makeDirectRequest<T = any>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.request<T>(config);
      return response.data;
    } catch (error) {
      throw ErrorFactory.create(error as Error);
    }
  }
}

// Create default enhanced API client
export const enhancedApiClient = new PathAwareApiClient();

// Export factory function
export function createPathAwareApiClient(
  baseURL?: string,
  config?: AxiosRequestConfig,
  retryConfig?: { maxRetries?: number; retryDelay?: number }
): PathAwareApiClient {
  return new PathAwareApiClient(baseURL, config, retryConfig);
}

export default enhancedApiClient;
