/**
 * API Client export file
 * 
 * This file re-exports the apiClient from enhancedApiClient.ts.
 * It exists to support imports from './apiClient' within the unified directory.
 */

import enhancedApiClient from './enhancedApiClient';
export const apiClient = enhancedApiClient;
export default apiClient;