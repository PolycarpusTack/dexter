// File: src/api/errorAnalyticsApi.ts

import { createErrorHandler } from '../utils/errorHandling';
import errorAnalyticsService from '../services/errorAnalyticsService';
import { 
  ErrorAnalyticsData, 
  ErrorCountByCategory, 
  ErrorCountByTime, 
  ErrorDetails,
  ErrorAnalyticsParams 
} from '../types/index';

// Error handler for error analytics API
const handleErrorAnalyticsError = createErrorHandler('Error Analytics API Error', {
  context: { apiModule: 'errorAnalyticsApi' }
});

/**
 * Get error analytics data
 * 
 * @param params - Query parameters
 * @returns Promise with error analytics data
 */
export const getErrorAnalytics = async (
  params: ErrorAnalyticsParams = {}
): Promise<ErrorAnalyticsData> => {
  try {
    // In a real implementation, this would be an API call
    // For now, use the service's mock data generation
    return await errorAnalyticsService.getErrorAnalytics(params);
    
    // When backend is available, use this instead:
    // return await apiClient.get<ErrorAnalyticsData>(
    //   '/analytics/errors',
    //   { params }
    // );
  } catch (error) {
    handleErrorAnalyticsError(error, {
      operation: 'getErrorAnalytics',
      ...params
    });
    throw error;
  }
};

/**
 * Get error occurrences for a specific error
 * 
 * @param errorId - Error ID
 * @param options - Query options
 * @returns Promise with error occurrences
 */
export const getErrorOccurrences = async (
  errorId: string,
  options: { limit?: number } = {}
): Promise<{ occurrences: any[] }> => {
  try {
    // In a real implementation, this would be an API call
    // For now, use the service's mock data generation
    return await errorAnalyticsService.getErrorOccurrences(errorId, options);
    
    // When backend is available, use this instead:
    // return await apiClient.get<{ occurrences: any[] }>(
    //   `/analytics/errors/${errorId}/occurrences`,
    //   { params: options }
    // );
  } catch (error) {
    handleErrorAnalyticsError(error, {
      operation: 'getErrorOccurrences',
      errorId,
      ...options
    });
    throw error;
  }
};

/**
 * Get error trend data
 * 
 * @param params - Query parameters
 * @returns Promise with error trend data
 */
export const getErrorTrends = async (
  params: ErrorAnalyticsParams = {}
): Promise<ErrorCountByTime[]> => {
  try {
    // In a real implementation, this would be an API call
    // For now, return part of the mock data
    const data = await errorAnalyticsService.getErrorAnalytics(params);
    return data.byTime;
    
    // When backend is available, use this instead:
    // return await apiClient.get<ErrorCountByTime[]>(
    //   '/analytics/errors/trends',
    //   { params }
    // );
  } catch (error) {
    handleErrorAnalyticsError(error, {
      operation: 'getErrorTrends',
      ...params
    });
    throw error;
  }
};

/**
 * Get error distribution by category
 * 
 * @param params - Query parameters
 * @returns Promise with error distribution data
 */
export const getErrorDistribution = async (
  params: ErrorAnalyticsParams = {}
): Promise<ErrorCountByCategory[]> => {
  try {
    // In a real implementation, this would be an API call
    // For now, return part of the mock data
    const data = await errorAnalyticsService.getErrorAnalytics(params);
    return data.byCategory;
    
    // When backend is available, use this instead:
    // return await apiClient.get<ErrorCountByCategory[]>(
    //   '/analytics/errors/distribution',
    //   { params }
    // );
  } catch (error) {
    handleErrorAnalyticsError(error, {
      operation: 'getErrorDistribution',
      ...params
    });
    throw error;
  }
};

/**
 * Get top errors
 * 
 * @param params - Query parameters
 * @returns Promise with top errors data
 */
export const getTopErrors = async (
  params: ErrorAnalyticsParams & { 
    limit?: number,
    offset?: number 
  } = {}
): Promise<ErrorDetails[]> => {
  try {
    // In a real implementation, this would be an API call
    // For now, return part of the mock data
    const data = await errorAnalyticsService.getErrorAnalytics(params);
    const { limit = 10, offset = 0 } = params;
    return data.topErrors.slice(offset, offset + limit);
    
    // When backend is available, use this instead:
    // return await apiClient.get<ErrorDetails[]>(
    //   '/analytics/errors/top',
    //   { params }
    // );
  } catch (error) {
    handleErrorAnalyticsError(error, {
      operation: 'getTopErrors',
      ...params
    });
    throw error;
  }
};

/**
 * Access to the mock data generator for development
 */
export const generateMockErrorAnalytics = errorAnalyticsService.generateMockErrorAnalytics.bind(errorAnalyticsService);

export default {
  getErrorAnalytics,
  getErrorOccurrences,
  getErrorTrends,
  getErrorDistribution,
  getTopErrors,
  generateMockErrorAnalytics
};
