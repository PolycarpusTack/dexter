/**
 * Template API client for managing prompt templates.
 */
import { apiClient } from './apiClient';
import { handleApiError } from './errorHandler';
import { validateParams } from './apiResolver';
import { AxiosRequestConfig } from 'axios';

// Type definitions
export enum TemplateCategory {
  GENERAL = 'general',
  DATABASE = 'database',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  SYNTAX = 'syntax',
  REFERENCE = 'reference',
  TYPE = 'type',
  MEMORY = 'memory',
  DEADLOCK = 'deadlock',
  TIMEOUT = 'timeout',
  CONFIGURATION = 'configuration',
  DEPENDENCY = 'dependency',
  CUSTOM = 'custom',
}

export enum TemplateType {
  SYSTEM = 'system',
  USER = 'user',
  COMBINED = 'combined',
}

export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  default_value?: string;
  example?: string;
}

export interface TemplateVersion {
  version: string;
  created_at: string;
  updated_at?: string;
  content: string;
  changes?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  type: TemplateType;
  variables: TemplateVariable[];
  versions: TemplateVersion[];
  latest_version: string;
  author?: string;
  created_at: string;
  updated_at?: string;
  is_default: boolean;
  is_public: boolean;
  tags: string[];
  model_specific?: Record<string, any>;
  provider_specific?: Record<string, any>;
}

export interface TemplateListResponse {
  templates: PromptTemplate[];
  total: number;
  categories: Record<TemplateCategory, number>;
}

export interface TemplateResponse {
  template: PromptTemplate;
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: TemplateCategory;
  type: TemplateType;
  content: string;
  variables?: TemplateVariable[];
  author?: string;
  is_default?: boolean;
  is_public?: boolean;
  tags?: string[];
  model_specific?: Record<string, any>;
  provider_specific?: Record<string, any>;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  type?: TemplateType;
  content?: string;
  version_changes?: string;
  variables?: TemplateVariable[];
  is_default?: boolean;
  is_public?: boolean;
  tags?: string[];
  model_specific?: Record<string, any>;
  provider_specific?: Record<string, any>;
}

export interface TemplateSearchParams {
  query?: string;
  category?: TemplateCategory;
  type?: TemplateType;
  is_default?: boolean;
  is_public?: boolean;
  limit?: number;
  offset?: number;
}

export interface RenderTemplateResponse {
  rendered_content: string;
  template_id: string;
  template_name: string;
  version: string;
}

/**
 * List templates with optional filtering
 */
export const listTemplates = async (
  params?: TemplateSearchParams,
  config?: AxiosRequestConfig
): Promise<TemplateListResponse> => {
  try {
    const path = pathResolver.resolve('templates');
    const response = await apiClient.get<TemplateListResponse>(path, { 
      params,
      ...config
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to list templates');
  }
};

/**
 * Get a template by ID
 */
export const getTemplate = async (
  templateId: string,
  version?: string,
  config?: AxiosRequestConfig
): Promise<TemplateResponse> => {
  try {
    const path = pathResolver.resolve(`templates/${templateId}`);
    const response = await apiClient.get<TemplateResponse>(path, {
      params: { version },
      ...config
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, `Failed to get template with ID ${templateId}`);
  }
};

/**
 * Create a new template
 */
export const createTemplate = async (
  template: CreateTemplateRequest,
  config?: AxiosRequestConfig
): Promise<TemplateResponse> => {
  try {
    const path = pathResolver.resolve('templates');
    const response = await apiClient.post<TemplateResponse>(path, template, config);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to create template');
  }
};

/**
 * Update an existing template
 */
export const updateTemplate = async (
  templateId: string,
  template: UpdateTemplateRequest,
  config?: AxiosRequestConfig
): Promise<TemplateResponse> => {
  try {
    const path = pathResolver.resolve(`templates/${templateId}`);
    const response = await apiClient.put<TemplateResponse>(path, template, config);
    return response.data;
  } catch (error) {
    throw handleApiError(error, `Failed to update template with ID ${templateId}`);
  }
};

/**
 * Delete a template
 */
export const deleteTemplate = async (
  templateId: string,
  config?: AxiosRequestConfig
): Promise<void> => {
  try {
    const path = pathResolver.resolve(`templates/${templateId}`);
    await apiClient.delete(path, config);
  } catch (error) {
    throw handleApiError(error, `Failed to delete template with ID ${templateId}`);
  }
};

/**
 * Render a template with variables
 */
export const renderTemplate = async (
  templateId: string,
  variables: Record<string, any>,
  version?: string,
  config?: AxiosRequestConfig
): Promise<RenderTemplateResponse> => {
  try {
    const path = pathResolver.resolve(`templates/${templateId}/render`);
    const response = await apiClient.post<RenderTemplateResponse>(
      path, 
      variables, 
      {
        params: { version },
        ...config
      }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error, `Failed to render template with ID ${templateId}`);
  }
};

/**
 * Get all versions of a template
 */
export const getTemplateVersions = async (
  templateId: string,
  config?: AxiosRequestConfig
): Promise<TemplateVersion[]> => {
  try {
    const path = pathResolver.resolve(`templates/${templateId}/versions`);
    const response = await apiClient.get<TemplateVersion[]>(path, config);
    return response.data;
  } catch (error) {
    throw handleApiError(error, `Failed to get versions for template with ID ${templateId}`);
  }
};

/**
 * Get default templates for a category
 */
export const getDefaultTemplates = async (
  category: TemplateCategory,
  type?: TemplateType,
  config?: AxiosRequestConfig
): Promise<PromptTemplate[]> => {
  try {
    const path = pathResolver.resolve(`templates/categories/${category}/defaults`);
    const response = await apiClient.get<PromptTemplate[]>(path, {
      params: { type },
      ...config
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, `Failed to get default templates for category ${category}`);
  }
};

/**
 * Set a template as the default for its category
 */
export const setTemplateAsDefault = async (
  templateId: string,
  config?: AxiosRequestConfig
): Promise<TemplateResponse> => {
  try {
    const path = pathResolver.resolve(`templates/${templateId}/set-as-default`);
    const response = await apiClient.post<TemplateResponse>(path, {}, config);
    return response.data;
  } catch (error) {
    throw handleApiError(error, `Failed to set template ${templateId} as default`);
  }
};

// Export all functions
export const templateApi = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  renderTemplate,
  getTemplateVersions,
  getDefaultTemplates,
  setTemplateAsDefault,
};

export default templateApi;