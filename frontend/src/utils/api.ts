/**
 * API utility functions for the Dexter frontend
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { QueryClient } from '@tanstack/react-query';

// Create axios instance with base configuration
export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Query client for React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 404) return false;
        return failureCount < 3;
      },
    },
  },
});

// Generic API request function
export async function makeRequest<T>(
  config: AxiosRequestConfig
): Promise<T> {
  const response: AxiosResponse<T> = await apiClient(config);
  return response.data;
}

// Discover API
export const discoverApi = {
  async query(payload: DiscoverQuery): Promise<DiscoverQueryResponse> {
    return makeRequest({
      method: 'POST',
      url: '/discover/query',
      data: payload,
    });
  },

  async getFieldSuggestions(): Promise<FieldSuggestion[]> {
    return makeRequest({
      method: 'GET',
      url: '/discover/fields',
    });
  },

  async getQueryExamples(): Promise<QueryExample[]> {
    return makeRequest({
      method: 'GET',
      url: '/discover/examples',
    });
  },

  async saveQuery(query: SavedQuery): Promise<void> {
    return makeRequest({
      method: 'POST',
      url: '/discover/queries',
      data: query,
    });
  },

  async getProjects(): Promise<SentryProject[]> {
    return makeRequest({
      method: 'GET',
      url: '/sentry/projects',
    });
  },
};

// Alert Rules API
export const alertRulesApi = {
  async list(org: string, project: string): Promise<AlertRule[]> {
    return makeRequest({
      method: 'GET',
      url: `/organizations/${org}/projects/${project}/alert-rules`,
    });
  },

  async create(rule: AlertRulePayload): Promise<AlertRule> {
    return makeRequest({
      method: 'POST',
      url: '/alert-rules',
      data: rule,
    });
  },

  async update(ruleId: string, rule: Partial<AlertRulePayload>): Promise<AlertRule> {
    return makeRequest({
      method: 'PUT',
      url: `/alert-rules/${ruleId}`,
      data: rule,
    });
  },

  async delete(ruleId: string): Promise<void> {
    return makeRequest({
      method: 'DELETE',
      url: `/alert-rules/${ruleId}`,
    });
  },

  async test(rule: AlertRulePayload): Promise<TestResult> {
    return makeRequest({
      method: 'POST',
      url: '/alert-rules/test',
      data: rule,
    });
  },
};

// Type definitions
export interface DiscoverQuery {
  query: string;
  fields?: string[];
  sort?: string;
  limit?: number;
  start?: string;
  end?: string;
  project?: string[];
  environment?: string[];
}

export interface DiscoverQueryResponse {
  data: any[];
  meta: {
    fields: Record<string, string>;
    units?: Record<string, string>;
  };
  _pagination?: {
    hasMore: boolean;
    next?: string;
    previous?: string;
  };
  executedAt?: string;
}

export interface FieldSuggestion {
  field: string;
  type: string;
  description?: string;
}

export interface QueryExample {
  title: string;
  description: string;
  query: string;
  category: string;
}

export interface SavedQuery {
  name: string;
  query: string;
  fields?: string[];
  sort?: string;
  project?: string[];
}

export interface SentryProject {
  id: string;
  slug: string;
  name: string;
  platform?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  type: 'issue' | 'metric';
  conditions: any[];
  filters: any[];
  actions: any[];
  dataset?: string;
  query?: string;
  aggregate?: string;
  timeWindow?: number;
  thresholdType?: string;
  resolveThreshold?: number;
  triggers?: any[];
  projects?: string[];
  owner?: string;
  dateCreated?: string;
  dateModified?: string;
}

export interface AlertRulePayload {
  name: string;
  type: 'issue' | 'metric';
  conditions?: any[];
  filters?: any[];
  actions?: any[];
  dataset?: string;
  query?: string;
  aggregate?: string;
  timeWindow?: number;
  thresholdType?: string;
  resolveThreshold?: number;
  triggers?: any[];
  projects?: string[];
  owner?: string;
}

export interface TestResult {
  success: boolean;
  message?: string;
  data?: any;
}
