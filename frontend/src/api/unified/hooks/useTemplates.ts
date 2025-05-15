/**
 * React Query hooks for the template API.
 */
import { useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { 
  templateApi, 
  TemplateCategory, 
  TemplateType,
  PromptTemplate,
  TemplateListResponse,
  TemplateResponse,
  TemplateVersion,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateSearchParams,
  RenderTemplateResponse
} from '../templateApi';

// Query key factory
const queryKeys = {
  templates: ['templates'] as const,
  template: (id: string, version?: string) => ['template', id, version] as const,
  templateVersions: (id: string) => ['template-versions', id] as const,
  defaultTemplates: (category: TemplateCategory, type?: TemplateType) => 
    ['default-templates', category, type] as const,
};

/**
 * Hook to fetch a list of templates with optional filtering
 */
export const useTemplates = (
  params?: TemplateSearchParams,
  options?: UseQueryOptions<TemplateListResponse>
) => {
  return useQuery<TemplateListResponse>(
    [...queryKeys.templates, params],
    () => templateApi.listTemplates(params),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      ...options
    }
  );
};

/**
 * Hook to fetch a template by ID
 */
export const useTemplate = (
  templateId: string,
  version?: string,
  options?: UseQueryOptions<TemplateResponse>
) => {
  return useQuery<TemplateResponse>(
    queryKeys.template(templateId, version),
    () => templateApi.getTemplate(templateId, version),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!templateId,
      ...options
    }
  );
};

/**
 * Hook to fetch all versions of a template
 */
export const useTemplateVersions = (
  templateId: string,
  options?: UseQueryOptions<TemplateVersion[]>
) => {
  return useQuery<TemplateVersion[]>(
    queryKeys.templateVersions(templateId),
    () => templateApi.getTemplateVersions(templateId),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!templateId,
      ...options
    }
  );
};

/**
 * Hook to fetch default templates for a category
 */
export const useDefaultTemplates = (
  category: TemplateCategory,
  type?: TemplateType,
  options?: UseQueryOptions<PromptTemplate[]>
) => {
  return useQuery<PromptTemplate[]>(
    queryKeys.defaultTemplates(category, type),
    () => templateApi.getDefaultTemplates(category, type),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!category,
      ...options
    }
  );
};

/**
 * Hook to create a new template
 */
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation<TemplateResponse, Error, CreateTemplateRequest>(
    (template) => templateApi.createTemplate(template),
    {
      onSuccess: (data) => {
        // Invalidate templates list
        queryClient.invalidateQueries(queryKeys.templates);
        
        // Invalidate default templates for the category
        if (data.template.is_default) {
          queryClient.invalidateQueries(
            queryKeys.defaultTemplates(data.template.category)
          );
        }
      },
    }
  );
};

/**
 * Hook to update an existing template
 */
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation<
    TemplateResponse, 
    Error, 
    { templateId: string; template: UpdateTemplateRequest }
  >(
    ({ templateId, template }) => templateApi.updateTemplate(templateId, template),
    {
      onSuccess: (data, variables) => {
        // Invalidate the specific template
        queryClient.invalidateQueries(
          queryKeys.template(variables.templateId)
        );
        
        // Invalidate template versions
        queryClient.invalidateQueries(
          queryKeys.templateVersions(variables.templateId)
        );
        
        // Invalidate templates list
        queryClient.invalidateQueries(queryKeys.templates);
        
        // Invalidate default templates for the category if is_default is changed
        if (variables.template.is_default !== undefined) {
          queryClient.invalidateQueries(
            queryKeys.defaultTemplates(data.template.category)
          );
        }
      },
    }
  );
};

/**
 * Hook to delete a template
 */
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>(
    (templateId) => templateApi.deleteTemplate(templateId),
    {
      onSuccess: (_, templateId) => {
        // Get the template from cache to know its category
        const template = queryClient.getQueryData<TemplateResponse>(
          queryKeys.template(templateId)
        )?.template;
        
        // Invalidate the specific template
        queryClient.removeQueries(queryKeys.template(templateId));
        
        // Invalidate template versions
        queryClient.removeQueries(queryKeys.templateVersions(templateId));
        
        // Invalidate templates list
        queryClient.invalidateQueries(queryKeys.templates);
        
        // Invalidate default templates for the category if it was a default template
        if (template?.is_default) {
          queryClient.invalidateQueries(
            queryKeys.defaultTemplates(template.category)
          );
        }
      },
    }
  );
};

/**
 * Hook to render a template with variables
 */
export const useRenderTemplate = () => {
  return useMutation<
    RenderTemplateResponse, 
    Error, 
    { templateId: string; variables: Record<string, any>; version?: string }
  >(
    ({ templateId, variables, version }) => 
      templateApi.renderTemplate(templateId, variables, version)
  );
};

/**
 * Hook to set a template as the default for its category
 */
export const useSetTemplateAsDefault = () => {
  const queryClient = useQueryClient();
  
  return useMutation<TemplateResponse, Error, string>(
    (templateId) => templateApi.setTemplateAsDefault(templateId),
    {
      onSuccess: (data, templateId) => {
        // Invalidate the specific template
        queryClient.invalidateQueries(
          queryKeys.template(templateId)
        );
        
        // Invalidate templates list
        queryClient.invalidateQueries(queryKeys.templates);
        
        // Invalidate default templates for the category
        queryClient.invalidateQueries(
          queryKeys.defaultTemplates(data.template.category)
        );
      },
    }
  );
};

// Re-export types
export type {
  TemplateCategory,
  TemplateType,
  PromptTemplate,
  TemplateListResponse,
  TemplateResponse,
  TemplateVersion,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateSearchParams,
  RenderTemplateResponse
};