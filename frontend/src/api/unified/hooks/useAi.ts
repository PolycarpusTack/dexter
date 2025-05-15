// frontend/src/api/unified/hooks/useAi.ts

import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { 
  explainError, 
  fetchModelsList,
  pullModel as pullModelApi,
  selectModel as selectModelApi,
  fetchEnhancedModelsList,
  pullModelEnhanced as pullModelEnhancedApi,
  selectModelEnhanced as selectModelEnhancedApi,
  createFallbackChain as createFallbackChainApi,
  setDefaultFallbackChain as setDefaultFallbackChainApi,
  getUserPreferences as getUserPreferencesApi,
  setUserPreferences as setUserPreferencesApi,
  setProviderConfig,
  testProviderConnection,
  getProviderAvailability
} from '../aiApi';
import { showErrorNotification } from '../errorHandler';
import type { 
  ErrorExplanationRequest, 
  ErrorExplanationResponse,
  Model,
  ModelsResponse,
  ModelRequest,
  ModelResponse,
  ModelPreferences,
  FallbackChain
} from '../types';

// Keys for query cache
export const aiKeys = {
  ollamaModels: () => ['ollama', 'models'] as const,
  ollamaModel: (modelName: string) => ['ollama', 'model', modelName] as const,
  enhancedModels: () => ['enhanced', 'models'] as const,
  userPreferences: (userId: string) => ['user', userId, 'preferences'] as const,
  fallbackChains: () => ['fallback', 'chains'] as const,
  fallbackChain: (chainId: string) => ['fallback', 'chain', chainId] as const,
};

/**
 * Hook for loading Ollama models list
 */
export const useOllamaModels = (
  options?: {
    refetchInterval?: number;
    enabled?: boolean;
    staleTime?: number;
  }
) => {
  return useQuery({
    queryKey: aiKeys.ollamaModels(),
    queryFn: fetchModelsList,
    // Refresh every 30 seconds to update download status by default
    refetchInterval: options?.refetchInterval ?? 30000,
    // Consider stale after 15 seconds by default
    staleTime: options?.staleTime ?? 15000,
    retry: 2,
    enabled: options?.enabled ?? true,
  });
};

/**
 * Hook for loading AI models (backward compatibility function)
 */
export function useAiModels(options?: {
  refetchInterval?: number;
  enabled?: boolean;
  staleTime?: number;
}) {
  // Wrapper around useModelsEnhanced for backward compatibility
  return useModelsEnhanced(options);
}

/**
 * Hook for selecting an active model (alias for the non-enhanced model selector for backwards compatibility)
 */
export function useSetActiveModel() {
  return useSelectModel();
}

/**
 * Hook for loading enhanced models list with multi-provider support
 */
export const useModelsEnhanced = (
  options?: {
    refetchInterval?: number;
    enabled?: boolean;
    staleTime?: number;
  }
) => {
  return useQuery<ModelsResponse>({
    queryKey: aiKeys.enhancedModels(),
    queryFn: fetchEnhancedModelsList,
    // Refresh every 30 seconds to update download status by default
    refetchInterval: options?.refetchInterval ?? 30000,
    // Consider stale after 15 seconds by default
    staleTime: options?.staleTime ?? 15000,
    retry: 2,
    enabled: options?.enabled ?? true,
  });
};

/**
 * Hook for loading user model preferences
 */
export const useUserPreferences = (
  userId: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) => {
  return useQuery<ModelPreferences>({
    queryKey: aiKeys.userPreferences(userId),
    queryFn: () => getUserPreferencesApi(userId),
    staleTime: options?.staleTime ?? 60000,
    retry: 2,
    enabled: options?.enabled ?? true,
  });
};

/**
 * Hook for pulling/downloading a model
 */
export const usePullModel = () => {
  return useMutation({
    mutationFn: (modelName: string) => pullModelApi(modelName),
    onSuccess: () => {
      // No need to invalidate query as we'll rely on polling for status updates
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Error downloading model',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for pulling/downloading a model with enhanced API
 */
export const usePullModelEnhanced = () => {
  return useMutation({
    mutationFn: (modelId: string) => pullModelEnhancedApi(modelId),
    onSuccess: () => {
      // No need to invalidate query as we'll rely on polling for status updates
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Error downloading model',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for selecting an active model
 */
export const useSelectModel = () => {
  return useMutation({
    mutationFn: (modelName: string) => selectModelApi(modelName),
    onSuccess: () => {
      // Invalidate models query to update active model
      return [{
        queryKey: aiKeys.ollamaModels(),
      }];
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Error selecting model',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for selecting an active model with enhanced API
 */
export const useSelectModelEnhanced = () => {
  return useMutation({
    mutationFn: (request: ModelRequest) => selectModelEnhancedApi(request),
    onSuccess: () => {
      // Invalidate models query to update active model
      return [{
        queryKey: aiKeys.enhancedModels(),
      }];
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Error selecting model',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for creating a fallback chain
 */
export const useCreateFallbackChain = () => {
  return useMutation({
    mutationFn: (chain: FallbackChain) => createFallbackChainApi(chain),
    onSuccess: () => {
      // Invalidate models query to update fallback chains
      return [{
        queryKey: aiKeys.enhancedModels(),
      }];
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Error creating fallback chain',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for setting the default fallback chain
 */
export const useSetDefaultFallbackChain = () => {
  return useMutation({
    mutationFn: (chainId: string) => setDefaultFallbackChainApi(chainId),
    onSuccess: () => {
      // Invalidate models query to update default fallback chain
      return [{
        queryKey: aiKeys.enhancedModels(),
      }];
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Error setting default fallback chain',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for setting user model preferences
 */
export const useSetUserPreferences = () => {
  return useMutation({
    mutationFn: ({ 
      userId, 
      preferences 
    }: { 
      userId: string; 
      preferences: ModelPreferences 
    }) => setUserPreferencesApi(userId, preferences),
    onSuccess: (_, { userId }) => {
      // Invalidate user preferences query
      return [{
        queryKey: aiKeys.userPreferences(userId),
      }];
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Error setting user preferences',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for explaining an error
 */
export const useExplainError = () => {
  return useMutation({
    mutationFn: ({
      request,
      options
    }: {
      request: ErrorExplanationRequest;
      options?: Record<string, any>;
    }) => explainError(request, options),
    
    onError: (error) => {
      showErrorNotification({
        title: 'Error explanation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for explaining an error in an issue
 */
export const useIssueErrorExplanation = () => {
  return useMutation({
    mutationFn: ({
      issueId,
      options
    }: {
      issueId: string;
      options?: Record<string, any>;
    }) => {
      // Get the latest event for this issue and then explain it
      return explainError({
        type: 'issue',
        id: issueId
      }, options);
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Issue error explanation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for explaining an error in an event
 */
export const useEventErrorExplanation = () => {
  return useMutation({
    mutationFn: ({
      eventId,
      options
    }: {
      eventId: string;
      options?: Record<string, any>;
    }) => {
      return explainError({
        type: 'event',
        id: eventId
      }, options);
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Event error explanation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for explaining error text
 */
export const useExplainErrorText = () => {
  return useMutation({
    mutationFn: ({
      errorText,
      options
    }: {
      errorText: string;
      options?: Record<string, any>;
    }) => {
      return explainError({
        type: 'text',
        content: errorText
      }, options);
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Error text explanation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Types for provider configuration
 */
export interface ProviderConfig {
  [key: string]: any;
}

export interface SetProviderConfigRequest {
  provider: string;
  config: ProviderConfig;
}

export interface ConnectionTestRequest {
  provider: string;
  apiKey: string;
  baseUrl?: string;
}

export interface ConnectionTestResponse {
  success: boolean;
  message?: string;
  provider: string;
  details?: any;
}

// Add to queryKeys
aiKeys.providerAvailability = () => ['providers', 'availability'] as const;

/**
 * Hook to set provider configuration
 */
export const useSetProviderConfig = () => {
  return useMutation({
    mutationFn: ({ 
      provider, 
      config 
    }: SetProviderConfigRequest) => setProviderConfig(provider, config),
    onSuccess: () => {
      // Invalidate models to reflect new config
      return [{
        queryKey: aiKeys.enhancedModels(),
      }];
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Error updating provider configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook to test provider connection
 */
export const useTestProviderConnection = () => {
  return useMutation({
    mutationFn: ({ 
      provider, 
      apiKey, 
      baseUrl 
    }: ConnectionTestRequest) => testProviderConnection(provider, apiKey, baseUrl),
    onError: (error) => {
      showErrorNotification({
        title: 'Error testing provider connection',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook to get provider availability
 */
export const useProviderAvailability = (
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) => {
  return useQuery({
    queryKey: aiKeys.providerAvailability(),
    queryFn: () => getProviderAvailability(),
    staleTime: options?.staleTime ?? 60000, // 1 minute
    retry: 2,
    enabled: options?.enabled ?? true,
  });
};

// Export all hooks
export default {
  useOllamaModels,
  useModelsEnhanced,
  useAiModels,
  useUserPreferences,
  usePullModel,
  usePullModelEnhanced,
  useSelectModel,
  useSelectModelEnhanced,
  useSetActiveModel,
  useCreateFallbackChain,
  useSetDefaultFallbackChain,
  useSetUserPreferences,
  useExplainError,
  useIssueErrorExplanation,
  useEventErrorExplanation,
  useExplainErrorText,
  useSetProviderConfig,
  useTestProviderConnection,
  useProviderAvailability
};