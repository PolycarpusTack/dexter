// File: frontend/src/api/aiApi.js

import axios from 'axios';
import { API_BASE_URL } from './config';

/**
 * Request an AI explanation for an error event
 * 
 * @param {Object} params - Explanation request params
 * @param {Object} params.event_data - Sentry event data
 * @param {string} params.error_type - Error type
 * @param {string} params.error_message - Error message
 * @param {number} params.retry_count - Number of retries (for debugging)
 * @param {string} params.model - Optional model override
 * @returns {Promise<Object>} The explanation response
 */
export const explainError = async (params) => {
  const { event_data, error_type, error_message, retry_count = 0, model } = params;
  
  try {
    const response = await axios.post(`${API_BASE_URL}/explain`, {
      event_data: event_data,
      error_type: error_type,
      error_message: error_message,
      retry_count: retry_count,
      model: model
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting AI explanation:', error);
    throw error;
  }
};
