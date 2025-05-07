// File: frontend/src/api/modelApi.js

import axios from 'axios';
import { API_BASE_URL } from './config';

/**
 * Fetch list of available Ollama models and their status
 * @returns {Promise<Object>} Available models and their status
 */
export const fetchModelsList = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/models`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    throw error;
  }
};

/**
 * Start downloading a model in Ollama
 * @param {string} modelName - Model name to pull
 * @returns {Promise<Object>} Status of the pull request
 */
export const pullModel = async (modelName) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/models/pull/${modelName}`);
    return response.data;
  } catch (error) {
    console.error(`Error pulling model ${modelName}:`, error);
    throw error;
  }
};

/**
 * Select the active model for explanations
 * @param {string} modelName - Model to use for explanations
 * @returns {Promise<Object>} Result of the selection
 */
export const setActiveModel = async (modelName) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/models/select`, {
      model_name: modelName
    });
    return response.data;
  } catch (error) {
    console.error(`Error setting active model to ${modelName}:`, error);
    throw error;
  }
};
