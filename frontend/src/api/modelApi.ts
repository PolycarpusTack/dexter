// File: frontend/src/api/modelApi.ts

import apiClient from './apiClient';

// Type definitions for model data
export interface OllamaModel {
  name: string;
  status: 'available' | 'unavailable' | 'downloading' | 'error';
  size?: number;
  modified_at?: string;
  details?: any;
  error?: string;
}

export interface ModelsResponse {
  models: OllamaModel[];
  current_model?: string;
  ollama_status: 'available' | 'error';
  error?: string;
}

export interface PullModelResponse {
  status: string;
  message: string;
  name: string;
  estimated_time?: string;
}

export interface SelectModelResponse {
  status: string;
  model: string;
  message: string;
}

/**
 * Fetch list of available Ollama models and their status
 * @returns Promise with models data and status
 */
export const fetchModelsList = async (): Promise<ModelsResponse> => {
  try {
    return await apiClient.get<ModelsResponse>('/models');
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    throw error;
  }
};

/**
 * Start downloading a model in Ollama
 * @param modelName - Model name to pull
 * @returns Promise with status of the pull request
 */
export const pullModel = async (modelName: string): Promise<PullModelResponse> => {
  try {
    return await apiClient.post<PullModelResponse>(`/models/pull/${modelName}`);
  } catch (error) {
    console.error(`Error pulling model ${modelName}:`, error);
    throw error;
  }
};

/**
 * Select the active model for explanations
 * @param modelName - Model to use for explanations
 * @returns Promise with result of the selection
 */
export const setActiveModel = async (modelName: string): Promise<SelectModelResponse> => {
  try {
    return await apiClient.post<SelectModelResponse>('/models/select', {
      model_name: modelName
    });
  } catch (error) {
    console.error(`Error setting active model to ${modelName}:`, error);
    throw error;
  }
};