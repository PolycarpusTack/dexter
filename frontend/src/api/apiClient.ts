/**
 * API Client export file
 * 
 * This file re-exports the apiClient from the unified API.
 * It exists to support backwards compatibility with existing code.
 */

import enhancedApiClient, { EnhancedApiClient } from './unified/enhancedApiClient';

// Export as apiClient for backward compatibility
export const apiClient = enhancedApiClient;
export { EnhancedApiClient };
export default apiClient;

// Additional exports that tests might need
export const createApiClient = () => new EnhancedApiClient();
export const uncachedClient = enhancedApiClient;
export const persistentClient = enhancedApiClient;