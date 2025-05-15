// File: frontend/src/api/aiApi.ts

/**
 * @deprecated This API module is deprecated and will be removed in v1.0.0 (Q4 2025).
 * Please use the unified API modules from 'src/api/unified' instead.
 * 
 * Migration Guide: 
 * - Replace imports from this file with imports from the unified API
 * - Refer to the migration guide at 'docs/consolidated/API_MIGRATION_MASTER_GUIDE.md'
 * 
 * Recommended replacement: import { aiApi } from 'src/api/unified'
 * @see API_CLIENT_CONSOLIDATION_STATUS.md for migration timeline
 * @see docs/consolidated/API_MIGRATION_GUIDE_EXPLAINERROR.md for specific migration instructions
 */

import { apiClient } from './apiClient';
import ErrorFactory from '../utils/errorFactory';
import { createErrorHandler } from '../utils/errorHandling';
import { createPromptBundle } from '../utils/promptEngineering';
import { EventDetails } from '../types/eventDetails';

// Configure a longer timeout for AI requests (20 minutes)
const AI_REQUEST_TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds, overriding LLM_TIMEOUT from config if needed

// Create error handler for AI API
const handleAiError = createErrorHandler('AI Explanation Failed', {
  context: {
    apiModule: 'aiApi'
  }
});

/**
 * Interface for AI explanation request parameters
 */
export interface ExplainErrorParams {
  /** Sentry event data */
  event_data: EventDetails;
  /** Error type */
  error_type: string;
  /** Error message */
  error_message: string;
  /** Number of retries (for debugging) */
  retry_count?: number;
  /** Optional model override */
  model?: string;
  /** Whether to generate only a summary */
  summarize_only?: boolean;
  /** Optional custom system prompt */
  system_prompt?: string;
  /** Optional custom user prompt */
  user_prompt?: string;
  /** Whether to use context-aware prompting */
  use_context_aware_prompting?: boolean;
}

/**
 * Interface for AI explanation response
 */
export interface ExplainErrorResponse {
  /** AI-generated explanation */
  explanation: string;
  /** Model used for generation */
  model: string;
  /** Processing time in ms */
  processing_time: number;
  /** Whether the generation was truncated */
  truncated: boolean;
  /** Format of the explanation (markdown, text, json) */
  format: string;
}

/**
 * Request an AI explanation for an error event
 * 
 * @param params - Explanation request params
 * @returns The explanation response
 */
export const explainError = async (params: ExplainErrorParams): Promise<ExplainErrorResponse> => {
  const { 
    event_data, 
    error_type, 
    error_message, 
    retry_count = 0, 
    model,
    summarize_only = false,
    system_prompt,
    user_prompt,
    use_context_aware_prompting = true
  } = params;
  
  try {
    // When context-aware prompting is enabled, generate specialized prompts
    let requestParams: Record<string, any> = {
      event_data,
      error_type,
      error_message,
      retry_count,
      model,
      summarize_only
    };

    // If context-aware prompting is enabled and no custom prompts provided
    if (use_context_aware_prompting && !system_prompt && !user_prompt) {
      // Generate prompts based on error context
      const { systemPrompt, userPrompt, errorContext } = createPromptBundle(event_data);
      
      // Add the generated prompts to the request
      requestParams.system_prompt = systemPrompt;
      requestParams.user_prompt = userPrompt;
      
      // Add context for analytics
      requestParams.error_category = errorContext.category;
      requestParams.error_context = {
        category: errorContext.category,
        subtype: errorContext.subtype,
        severity: errorContext.severity,
        hasSufficientDetails: errorContext.hasSufficientDetails
      };
    } 
    // If custom prompts are provided, use them instead
    else if (system_prompt || user_prompt) {
      if (system_prompt) requestParams.system_prompt = system_prompt;
      if (user_prompt) requestParams.user_prompt = user_prompt;
    }
    
    return await apiClient.post<ExplainErrorResponse>(
      `/explain`,
      requestParams,
      { 
        // Set a much longer timeout for AI explanation requests
        timeout: AI_REQUEST_TIMEOUT 
      }, // Axios config
      {
        maxRetries: 2, // Retry configuration
        retryableCheck: (error: any) => {
          // Special retry check for AI service
          // If the service is busy, retry
          const isBusy = error.response?.status === 503 && 
            error.response?.data?.detail?.includes('busy');
            
          return isBusy || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';
        }
      }
    );
  } catch (error) {
    // Use our error handler to show notification and log to Sentry
    handleAiError(error);
    
    // Enhanced error with specific context
    throw ErrorFactory.create(error as Error, {
      category: 'llm_api_error',
      metadata: {
        operation: 'explainError',
        errorType: error_type,
        modelRequested: model,
        useContextAwarePrompting: use_context_aware_prompting
      }
    });
  }
};

/**
 * Get available AI models
 * 
 * @returns List of available models
 */
export const getAvailableModels = async (): Promise<string[]> => {
  try {
    const response = await apiClient.get<{ models: string[] }>('/explain/models');
    return response.models || [];
  } catch (error) {
    // Use our error handler to show notification and log to Sentry
    handleAiError(error);
    
    // Enhanced error with specific context
    throw ErrorFactory.create(error as Error, {
      category: 'llm_api_error',
      metadata: {
        operation: 'getAvailableModels'
      }
    });
  }
};

export default {
  explainError,
  getAvailableModels
};
