// File: src/api/errorAnalyticsApi.ts

import { apiClient } from './apiClient';
import ErrorFactory from '../utils/errorHandling/errorFactory';
import { createErrorHandler } from '../utils/errorHandling';

// Create error handler for error analytics API
const handleErrorAnalyticsApiError = createErrorHandler('Error Analytics API Error', {
  context: {
    apiModule: 'errorAnalyticsApi'
  }
});

/**
 * Interface for error count by category
 */
export interface ErrorCountByCategory {
  /** Category name */
  name: string;
  /** Error count */
  count: number;
  /** Color for visualization */
  color: string;
}

/**
 * Interface for error count by time
 */
export interface ErrorCountByTime {
  /** Time period (hour, day, etc.) */
  time: string | number;
  /** Error counts by category */
  [category: string]: string | number;
}

/**
 * Interface for error details
 */
export interface ErrorDetails {
  /** Error ID */
  id: number;
  /** Error type */
  type: string;
  /** Error count */
  count: number;
  /** Error category */
  category: string;
  /** Impact level (High, Medium, Low) */
  impact: string;
  /** First seen timestamp */
  firstSeen: string;
  /** Last seen timestamp */
  lastSeen: string;
  /** User count affected */
  userCount: number;
  /** Error message */
  message: string;
}

/**
 * Interface for error analytics summary
 */
export interface ErrorAnalyticsSummary {
  /** Total error count */
  totalErrors: number;
  /** Unique error count */
  uniqueErrors: number;
  /** User count affected */
  affectedUsers: number;
  /** High impact error count */
  highImpactErrors: number;
  /** Most common category */
  mostCommonCategory: string;
  /** Trending errors */
  trendingErrors: ErrorDetails[];
}

/**
 * Interface for error analytics data
 */
export interface ErrorAnalyticsData {
  /** Error counts by category */
  byCategory: ErrorCountByCategory[];
  /** Error counts by time */
  byTime: ErrorCountByTime[];
  /** Top errors */
  topErrors: ErrorDetails[];
  /** Error analytics summary */
  summary: ErrorAnalyticsSummary;
}

/**
 * Interface for time range options
 */
export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

/**
 * Interface for error analytics query parameters
 */
export interface ErrorAnalyticsParams {
  /** Time range for analytics */
  timeRange?: TimeRange;
  /** Filter by category */
  category?: string;
  /** Filter by impact level */
  impact?: string;
}

/**
 * Get error analytics data
 * 
 * @param params - Query parameters
 * @returns Error analytics data
 */
export const getErrorAnalytics = async (params: ErrorAnalyticsParams = {}): Promise<ErrorAnalyticsData> => {
  try {
    return await apiClient.get<ErrorAnalyticsData>(
      '/analytics/errors',
      { params }
    );
  } catch (error) {
    // Use our error handler to show notification and log to Sentry
    handleErrorAnalyticsApiError(error);
    
    // Enhanced error with specific context
    throw ErrorFactory.create(error, {
      category: 'data_error',
      metadata: {
        operation: 'getErrorAnalytics',
        params
      }
    });
  }
};

/**
 * Get error details
 * 
 * @param errorId - Error ID
 * @returns Error details
 */
export const getErrorDetails = async (errorId: number): Promise<ErrorDetails> => {
  try {
    return await apiClient.get<ErrorDetails>(
      `/analytics/errors/${errorId}`
    );
  } catch (error) {
    // Use our error handler to show notification and log to Sentry
    handleErrorAnalyticsApiError(error);
    
    // Enhanced error with specific context
    throw ErrorFactory.create(error, {
      category: 'data_error',
      metadata: {
        operation: 'getErrorDetails',
        errorId
      }
    });
  }
};

/**
 * Get error occurrences
 * 
 * @param errorId - Error ID
 * @param params - Query parameters
 * @returns Error occurrences
 */
export const getErrorOccurrences = async (
  errorId: number,
  params: { limit?: number; offset?: number } = {}
): Promise<{ occurrences: any[]; total: number }> => {
  try {
    return await apiClient.get<{ occurrences: any[]; total: number }>(
      `/analytics/errors/${errorId}/occurrences`,
      { params }
    );
  } catch (error) {
    // Use our error handler to show notification and log to Sentry
    handleErrorAnalyticsApiError(error);
    
    // Enhanced error with specific context
    throw ErrorFactory.create(error, {
      category: 'data_error',
      metadata: {
        operation: 'getErrorOccurrences',
        errorId,
        params
      }
    });
  }
};

// Mock data for development
// This will be used when the backend API is not available
const MOCK_COLORS = {
  'network': '#FF6B6B',
  'timeout': '#FF9E7A',
  'client_error': '#FFD166',
  'server_error': '#F72585',
  'validation_error': '#7209B7',
  'auth_error': '#4CC9F0', 
  'data_error': '#4361EE',
  'sentry_api_error': '#3A0CA3',
  'llm_api_error': '#7678ED',
  'deadlock_parsing_error': '#F7B801',
  'unknown': '#B8B8B8'
};

/**
 * Generate mock error analytics data
 * 
 * @param params - Query parameters
 * @returns Mock error analytics data
 */
export const generateMockErrorAnalytics = (params: ErrorAnalyticsParams = {}): ErrorAnalyticsData => {
  // Generate error counts by category
  const byCategory: ErrorCountByCategory[] = [
    { name: 'network', count: 45, color: MOCK_COLORS['network'] },
    { name: 'client_error', count: 32, color: MOCK_COLORS['client_error'] },
    { name: 'server_error', count: 18, color: MOCK_COLORS['server_error'] },
    { name: 'timeout', count: 12, color: MOCK_COLORS['timeout'] },
    { name: 'validation_error', count: 8, color: MOCK_COLORS['validation_error'] },
    { name: 'auth_error', count: 6, color: MOCK_COLORS['auth_error'] },
    { name: 'llm_api_error', count: 5, color: MOCK_COLORS['llm_api_error'] },
    { name: 'unknown', count: 4, color: MOCK_COLORS['unknown'] }
  ];
  
  // Generate error counts by time
  const timePoints = params.timeRange === '1h' ? 12 : // 5-minute intervals
                   params.timeRange === '6h' ? 24 : // 15-minute intervals
                   params.timeRange === '24h' ? 24 : // 1-hour intervals
                   params.timeRange === '7d' ? 28 : // 6-hour intervals
                   30; // 1-day intervals
  
  const byTime: ErrorCountByTime[] = Array.from({ length: timePoints }).map((_, i) => {
    const time = i;
    return {
      time,
      network: Math.floor(Math.random() * 10),
      client_error: Math.floor(Math.random() * 8),
      server_error: Math.floor(Math.random() * 5),
      timeout: Math.floor(Math.random() * 4),
      validation_error: Math.floor(Math.random() * 3),
      auth_error: Math.floor(Math.random() * 2),
      llm_api_error: Math.floor(Math.random() * 2),
      unknown: Math.floor(Math.random() * 1),
    };
  });
  
  // Generate top errors
  const topErrors: ErrorDetails[] = [
    {
      id: 1,
      type: 'Network Timeout',
      count: 28,
      category: 'timeout',
      impact: 'High',
      firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      lastSeen: new Date().toISOString(),
      userCount: 156,
      message: 'Failed to connect to API server: timeout'
    },
    {
      id: 2,
      type: 'API Not Found',
      count: 24,
      category: 'client_error',
      impact: 'Medium',
      firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      lastSeen: new Date().toISOString(),
      userCount: 87,
      message: 'Endpoint /api/v1/users/123 not found'
    },
    {
      id: 3,
      type: 'Server Error',
      count: 18,
      category: 'server_error',
      impact: 'High',
      firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      lastSeen: new Date().toISOString(),
      userCount: 203,
      message: 'Internal server error: database connection failed'
    },
    {
      id: 4,
      type: 'React Rendering',
      count: 12,
      category: 'client_error',
      impact: 'Medium',
      firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      lastSeen: new Date().toISOString(),
      userCount: 45,
      message: 'Cannot read property \'data\' of undefined'
    },
    {
      id: 5,
      type: 'Authentication',
      count: 8,
      category: 'auth_error',
      impact: 'High',
      firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
      lastSeen: new Date().toISOString(),
      userCount: 122,
      message: 'JWT token expired'
    },
    {
      id: 6,
      type: 'LLM API Error',
      count: 5,
      category: 'llm_api_error',
      impact: 'Low',
      firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      lastSeen: new Date().toISOString(),
      userCount: 23,
      message: 'Failed to generate explanation: model not available'
    }
  ];
  
  // Generate summary
  const summary: ErrorAnalyticsSummary = {
    totalErrors: 130,
    uniqueErrors: 24,
    affectedUsers: 457,
    highImpactErrors: 3,
    mostCommonCategory: 'network',
    trendingErrors: topErrors.slice(0, 3)
  };
  
  return {
    byCategory,
    byTime,
    topErrors,
    summary
  };
};

export default {
  getErrorAnalytics,
  getErrorDetails,
  getErrorOccurrences,
  generateMockErrorAnalytics
};
