// File: frontend/src/api/exportApi.js

import axios from 'axios';
import { API_BASE_URL } from './config';

/**
 * Download file from the export endpoint
 * @param {Object} options
 * @param {string} options.organizationSlug - Sentry organization slug
 * @param {string} options.projectSlug - Sentry project slug
 * @param {string} options.format - Export format ('csv' or 'json')
 * @param {string} [options.status] - Status filter
 * @param {string} [options.query] - Text search query
 * @returns {Promise} - Promise that resolves when download is complete
 */
export const downloadFile = async ({ 
  organizationSlug, 
  projectSlug, 
  format = 'csv',
  status,
  query
}) => {
  try {
    // Construct query parameters
    const params = new URLSearchParams();
    params.append('format', format);
    if (status) params.append('status', status);
    if (query) params.append('query', query);
    
    const response = await axios({
      url: `${API_BASE_URL}/organizations/${organizationSlug}/projects/${projectSlug}/issues/export`,
      method: 'GET',
      params,
      responseType: 'blob', // Important for file download
    });

    // Create a blob URL and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Get filename from Content-Disposition header or create a default one
    const contentDisposition = response.headers['content-disposition'];
    let filename;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      filename = filenameMatch ? filenameMatch[1] : null;
    }
    
    if (!filename) {
      // Create a default filename if not provided by the server
      const date = new Date().toISOString().split('T')[0];
      filename = `sentry_issues_${projectSlug}_${date}.${format}`;
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to export issues'
    );
  }
};
