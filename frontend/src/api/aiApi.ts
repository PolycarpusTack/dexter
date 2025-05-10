// File: frontend/src/api/aiApi.ts

import { apiClient } from './apiClient';
import ErrorFactory from '../utils/errorFactory';
import { createErrorHandler } from '../utils/errorHandling';

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
  event_data: any;
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
  const { event_data, error_type, error_message, retry_count = 0, model } = params;
  
  try {
    return await apiClient.post<ExplainErrorResponse>(
      `/explain`,
      {
        event_data,
        error_type,
        error_message,
        retry_count,
        model
      },
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
        modelRequested: model
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
