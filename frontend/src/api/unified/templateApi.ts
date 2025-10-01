/**
 * Template API client for managing prompt templates.
 */
import enhancedApiClient from './enhancedApiClient';
import { handleApiError } from './errorHandler';
import { validateParams } from './apiResolver';
import { AxiosRequestConfig } from 'axios';
import { ApiCallOptions } from './types';
import { Metadata, ModelConfig } from './interfaces';
import { pathResolver } from './apiResolver';

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
  model_specific?: ModelConfig;
  provider_specific?: Metadata;
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
  model_specific?: ModelConfig;
  provider_specific?: Metadata;
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
  model_specific?: ModelConfig;
  provider_specific?: Metadata;
}

export interface TemplateSearchParams {
  query?: string;
  category?: TemplateCategory;
  type?: TemplateType;
  is_default?: boolean;
  is_public?: boolean;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
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
  config?: ApiCallOptions
): Promise<TemplateListResponse> => {
  try {
    const path = pathResolver.resolve('templates');
    const response = await enhancedApiClient.get<TemplateListResponse>(path, { 
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
  config?: ApiCallOptions
): Promise<TemplateResponse> => {
  try {
    const path = pathResolver.resolve(`templates/${templateId}`);
    const response = await enhancedApiClient.get<TemplateResponse>(path, {
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
  config?: ApiCallOptions
): Promise<TemplateResponse> => {
  try {
    const path = pathResolver.resolve('templates');
    const response = await enhancedApiClient.post<TemplateResponse>(path, template, config);
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
  config?: ApiCallOptions
): Promise<TemplateResponse> => {
  try {
    const path = pathResolver.resolve(`templates/${templateId}`);
    const response = await enhancedApiClient.put<TemplateResponse>(path, template, config);
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
  config?: ApiCallOptions
): Promise<void> => {
  try {
    const path = pathResolver.resolve(`templates/${templateId}`);
    await enhancedApiClient.delete(path, config);
  } catch (error) {
    throw handleApiError(error, `Failed to delete template with ID ${templateId}`);
  }
};

/**
 * Render a template with variables
 */
export const renderTemplate = async (
  templateId: string,
  variables: { [key: string]: string | number | boolean | null | undefined },
  version?: string,
  config?: ApiCallOptions
): Promise<RenderTemplateResponse> => {
  try {
    const path = pathResolver.resolve(`templates/${templateId}/render`);
    const response = await enhancedApiClient.post<RenderTemplateResponse>(path, 
      { variables, version },
      config
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error, `Failed to render template with ID ${templateId}`);
  }
};

/**
 * Get default templates for a category
 */
export const getDefaultTemplates = async (
  category?: TemplateCategory,
  config?: ApiCallOptions
): Promise<TemplateListResponse> => {
  try {
    const params: TemplateSearchParams = {
      is_default: true,
      category,
    };
    return await listTemplates(params, config);
  } catch (error) {
    throw handleApiError(error, 'Failed to get default templates');
  }
};

/**
 * Search templates by query
 */
export const searchTemplates = async (
  query: string,
  params?: Omit<TemplateSearchParams, 'query'>,
  config?: ApiCallOptions
): Promise<TemplateListResponse> => {
  try {
    const searchParams: TemplateSearchParams = {
      ...params,
      query,
    };
    return await listTemplates(searchParams, config);
  } catch (error) {
    throw handleApiError(error, `Failed to search templates with query: ${query}`);
  }
};

/**
 * Get all versions of a template
 */
export const getTemplateVersions = async (
  templateId: string,
  config?: ApiCallOptions
): Promise<TemplateVersion[]> => {
  try {
    const path = pathResolver.resolve(`templates/${templateId}/versions`);
    const response = await enhancedApiClient.get<{ versions: TemplateVersion[] }>(path, config);
    return response.data.versions;
  } catch (error) {
    throw handleApiError(error, `Failed to get versions for template with ID ${templateId}`);
  }
};

/**
 * Set a template as the default for its category
 */
export const setTemplateAsDefault = async (
  templateId: string,
  config?: ApiCallOptions
): Promise<TemplateResponse> => {
  try {
    const path = pathResolver.resolve(`templates/${templateId}/default`);
    const response = await enhancedApiClient.post<TemplateResponse>(path, {}, config);
    return response.data;
  } catch (error) {
    throw handleApiError(error, `Failed to set template with ID ${templateId} as default`);
  }
};

// Export the template API client as default
export default {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  renderTemplate,
  getDefaultTemplates,
  searchTemplates,
  getTemplateVersions,
  setTemplateAsDefault,
};