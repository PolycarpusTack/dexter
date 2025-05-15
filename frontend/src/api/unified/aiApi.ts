// frontend/src/api/unified/aiApi.ts

import { z } from 'zod';
import { enhancedApiClient } from './enhancedApiClient';
import type { 
  ErrorExplanationRequest, 
  ErrorExplanationResponse,
  ModelRequest,
  ModelResponse,
  ModelsResponse,
  Model,
  ModelPreferences,
  FallbackChain
} from './types';

// API endpoints
const AI_ENDPOINTS = {
  // Legacy endpoints
  models: 'ai/models',
  pullModel: 'ai/models/pull/:modelName',
  selectModel: 'ai/models/select',
  explainError: 'ai/explain',
  
  // Enhanced endpoints with multi-model support
  enhancedModels: 'ai-enhanced/models',
  pullModelEnhanced: 'ai-enhanced/models/pull/:modelId',
  selectModelEnhanced: 'ai-enhanced/models/select',
  userPreferences: 'ai-enhanced/user/:userId/preferences',
  createFallbackChain: 'ai-enhanced/fallback-chains',
  setDefaultFallbackChain: 'ai-enhanced/fallback-chains/:chainId/set-default',
  explainErrorEnhanced: 'ai-enhanced/explain',
  
  // Provider management
  providerConfig: 'ai-enhanced/providers/:provider/config',
  testConnection: 'ai-enhanced/providers/:provider/test-connection',
  getProviderAvailability: 'ai-enhanced/providers/availability'
};

// Validation schemas
const explainResponseSchema = z.object({
  explanation: z.string(),
  model: z.string().optional(),
  processing_time: z.number().optional(),
  debug: z.record(z.any()).optional()
});

/**
 * Fetch list of available models from Ollama (legacy)
 */
export const fetchModelsList = async (): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'ai',
    'models',
    {},
    {},
    undefined,
    { cache: 'stale-while-revalidate' }
  );
};

/**
 * Fetch list of available models from all providers (enhanced)
 */
export const fetchEnhancedModelsList = async (): Promise<ModelsResponse> => {
  try {
    // Try the API call with error suppression
    return await enhancedApiClient.callEndpoint<ModelsResponse>(
      'ai',
      'models',
      {},
      {},
      undefined,
      { 
        cache: 'stale-while-revalidate',
        errorHandling: {
          suppressNotifications: true,
          logToConsole: false
        }
      }
    );
  } catch (error) {
    // If the endpoint fails, return an empty models response
    console.debug('Models API endpoint not available - returning empty list');
    return { models: [] } as ModelsResponse;
  }
};

/**
 * Pull/download a model from Ollama (legacy)
 */
export const pullModel = async (modelName: string): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'ai',
    'pullModel',
    { modelName },
    {},
    undefined,
    { method: 'POST' }
  );
};

/**
 * Pull/download a model from any provider (enhanced)
 */
export const pullModelEnhanced = async (modelId: string): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'ai-enhanced',
    'pullModelEnhanced',
    { modelId },
    {},
    undefined,
    { method: 'POST' }
  );
};

/**
 * Select active model (legacy)
 */
export const selectModel = async (modelName: string): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'ai',
    'selectModel',
    {},
    {},
    { model: modelName },
    { method: 'POST' }
  );
};

/**
 * Select active model (enhanced)
 */
export const selectModelEnhanced = async (request: ModelRequest): Promise<ModelResponse> => {
  return enhancedApiClient.callEndpoint<ModelResponse>(
    'ai-enhanced',
    'selectModelEnhanced',
    {},
    {},
    request,
    { method: 'POST' }
  );
};

/**
 * Create a fallback chain
 */
export const createFallbackChain = async (chain: FallbackChain): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'ai-enhanced',
    'createFallbackChain',
    {},
    {},
    chain,
    { method: 'POST' }
  );
};

/**
 * Set default fallback chain
 */
export const setDefaultFallbackChain = async (chainId: string): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'ai-enhanced',
    'setDefaultFallbackChain',
    { chainId },
    {},
    undefined,
    { method: 'POST' }
  );
};

/**
 * Get user preferences
 */
export const getUserPreferences = async (userId: string): Promise<ModelPreferences> => {
  return enhancedApiClient.callEndpoint<ModelPreferences>(
    'ai-enhanced',
    'userPreferences',
    { userId },
    {},
    undefined
  );
};

/**
 * Set user preferences
 */
export const setUserPreferences = async (
  userId: string, 
  preferences: ModelPreferences
): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'ai-enhanced',
    'userPreferences',
    { userId },
    {},
    preferences,
    { method: 'POST' }
  );
};

/**
 * Get AI explanation for an error event
 */
export const explainError = async (
  request: ErrorExplanationRequest,
  options?: Record<string, any>
): Promise<ErrorExplanationResponse> => {
  // Validate at least one error source is provided
  if (!request.eventId && !request.issueId && !request.errorText && 
      (!request.context || !request.context.eventData)) {
    throw new Error('At least one of eventId, issueId, errorText, or eventData must be provided');
  }
  
  // Determine if we should use the enhanced endpoint
  const useEnhancedEndpoint = request.context?.useEnhancedEndpoint === true ||
                               options?.useEnhancedEndpoint === true;
  
  // Call the API with model override if specified
  const endpoint = useEnhancedEndpoint ? 'explainErrorEnhanced' : 'explainError';
  const group = useEnhancedEndpoint ? 'ai-enhanced' : 'ai';
  
  const response = await enhancedApiClient.callEndpoint<unknown>(
    group,
    endpoint,
    {},
    { debug: options?.debug ? 'true' : 'false' },
    request,
    {
      ...options,
      // AI requests may take longer, increase timeout
      timeout: options?.timeout || 60000,
      method: 'POST'
    }
  );
  
  // Validate response
  const validated = explainResponseSchema.safeParse(response);
  if (!validated.success) {
    console.error('Invalid response from AI explanation API', validated.error);
    throw new Error('Invalid response from AI explanation API');
  }
  
  return validated.data;
};

/**
 * Set provider configuration
 */
export const setProviderConfig = async (
  provider: string,
  config: Record<string, any>
): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'ai-enhanced',
    'providerConfig',
    { provider },
    {},
    config,
    { method: 'POST' }
  );
};

/**
 * Test provider connection
 */
export const testProviderConnection = async (
  provider: string,
  apiKey: string,
  baseUrl?: string
): Promise<any> => {
  return enhancedApiClient.callEndpoint(
    'ai-enhanced',
    'testConnection',
    { provider },
    {},
    { apiKey, baseUrl },
    { method: 'POST' }
  );
};

/**
 * Get provider availability status
 */
export const getProviderAvailability = async (): Promise<Record<string, boolean>> => {
  return enhancedApiClient.callEndpoint(
    'ai-enhanced',
    'getProviderAvailability',
    {},
    {},
    undefined,
    { cache: 'stale-while-revalidate' }
  );
};

// Default export with all functions
export default {
  fetchModelsList,
  fetchEnhancedModelsList,
  pullModel,
  pullModelEnhanced,
  selectModel,
  selectModelEnhanced,
  createFallbackChain,
  setDefaultFallbackChain,
  getUserPreferences,
  setUserPreferences,
  explainError,
  setProviderConfig,
  testProviderConnection,
  getProviderAvailability,
  // Constants
  AI_ENDPOINTS
};