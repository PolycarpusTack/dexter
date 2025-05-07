// File: frontend/src/api/configApi.js

import axios from 'axios';
import { API_BASE_URL, axiosConfig } from './config';

/**
 * Check and save Sentry configuration
 * 
 * @param {Object} config - Sentry configuration object
 * @param {string} config.organization_slug - Sentry organization slug
 * @param {string} config.project_slug - Sentry project slug
 * @returns {Promise<Object>} - Promise that resolves to the result
 */
export const checkConfig = async ({ organization_slug, project_slug }) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/config`,
      {
        organization_slug,
        project_slug,
      },
      axiosConfig
    );
    
    return response.data;
  } catch (error) {
    console.error('Error checking configuration:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to check configuration'
    );
  }
};

/**
 * Get current configuration status
 * 
 * @returns {Promise<Object>} - Promise that resolves to the current config
 */
export const getConfig = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/config`,
      axiosConfig
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting configuration:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to get configuration'
    );
  }
};

/**
 * Check the health of the backend and connected services
 * 
 * @returns {Promise<Object>} - Promise that resolves to the health status
 */
export const checkHealth = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/status`,
      axiosConfig
    );
    
    return response.data;
  } catch (error) {
    console.error('Error checking health:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to check health status'
    );
  }
};
