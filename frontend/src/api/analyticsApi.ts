// File: src/api/analyticsApi.ts

import apiClient from './apiClient';
import { createErrorHandler } from '../utils/errorHandling';

// Error handler for analytics API
const handleAnalyticsError = createErrorHandler('Analytics API Error', {
  context: { apiModule: 'analyticsApi' }
});

/**
 * Options for fetching issue trends
 */
export interface IssueTrendsOptions {
  /** Time period to analyze */
  statsPeriod?: string;
  /** Start date (ISO format) */
  start?: string;
  /** End date (ISO format) */
  end?: string;
  /** Project ID to filter by */
  projectId?: string;
  /** Organization ID to filter by */
  organizationId?: string;
  /** Environment to filter by */
  environment?: string;
  /** Group by field */
  groupBy?: string;
  /** Categories to include */
  categories?: string[];
  /** Interval (e.g., '1d', '1h') */
  interval?: string;
}

/**
 * Response for issue trends
 */
export interface IssueTrendsResponse {
  /** Trend data points */
  trends: Array<{
    /** Timestamp */
    timestamp: string;
    /** Count of issues */
    count: number;
    /** Group name (if grouped) */
    group?: string;
    /** Additional data */
    [key: string]: any;
  }>;
  /** Total count across all periods */
  totalCount: number;
  /** Percent change compared to previous period */
  percentChange: number;
  /** Time period used */
  period: string;
  /** Metadata about the analysis */
  meta?: Record<string, any>;
}

/**
 * Get issue trends over time
 * 
 * @param options - Trend options
 * @returns Promise with trend data
 */
export const getIssueTrends = async (
  options: IssueTrendsOptions = {}
): Promise<IssueTrendsResponse> => {
  try {
    return await apiClient.get<IssueTrendsResponse>(
      '/analytics/issues/trends',
      { params: options }
    );
  } catch (error) {
    handleAnalyticsError(error, {
      operation: 'getIssueTrends',
      ...options
    });
    throw error;
  }
};

/**
 * Options for fetching issue distribution
 */
export interface IssueDistributionOptions {
  /** Field to group by */
  groupBy: string;
  /** Time period to analyze */
  statsPeriod?: string;
  /** Start date (ISO format) */
  start?: string;
  /** End date (ISO format) */
  end?: string;
  /** Project ID to filter by */
  projectId?: string;
  /** Organization ID to filter by */
  organizationId?: string;
  /** Environment to filter by */
  environment?: string;
  /** Maximum number of groups to return */
  limit?: number;
}

/**
 * Response for issue distribution
 */
export interface IssueDistributionResponse {
  /** Distribution data */
  distribution: Array<{
    /** Group name */
    name: string;
    /** Count of issues */
    count: number;
    /** Percentage of total */
    percentage: number;
    /** Additional data */
    [key: string]: any;
  }>;
  /** Total count across all groups */
  totalCount: number;
  /** Period used for analysis */
  period: string;
  /** Metadata about the analysis */
  meta?: Record<string, any>;
}

/**
 * Get issue distribution by category
 * 
 * @param options - Distribution options
 * @returns Promise with distribution data
 */
export const getIssueDistribution = async (
  options: IssueDistributionOptions
): Promise<IssueDistributionResponse> => {
  if (!options.groupBy) {
    throw new Error('groupBy parameter is required');
  }

  try {
    return await apiClient.get<IssueDistributionResponse>(
      '/analytics/issues/distribution',
      { params: options }
    );
  } catch (error) {
    handleAnalyticsError(error, {
      operation: 'getIssueDistribution',
      ...options
    });
    throw error;
  }
};

/**
 * Options for user impact analysis
 */
export interface UserImpactOptions {
  /** Issue ID to analyze */
  issueId: string;
  /** Time period to analyze */
  statsPeriod?: string;
  /** Start date (ISO format) */
  start?: string;
  /** End date (ISO format) */
  end?: string;
  /** Project ID */
  projectId?: string;
}

/**
 * Response for user impact analysis
 */
export interface UserImpactResponse {
  /** Number of unique users affected */
  uniqueUsers: number;
  /** Percent of total users affected */
  userPercentage: number;
  /** Total user sessions affected */
  affectedSessions: number;
  /** Percent of sessions affected */
  sessionPercentage: number;
  /** Session impact by day */
  dailyImpact: Array<{
    /** Date */
    date: string;
    /** Users affected */
    users: number;
    /** Sessions affected */
    sessions: number;
  }>;
  /** User data breakdown (optional) */
  userData?: {
    /** User demographics */
    demographics?: Record<string, any>;
    /** Geographic distribution */
    geographic?: Record<string, any>;
    /** Device distribution */
    devices?: Record<string, any>;
  };
}

/**
 * Get user impact analysis for an issue
 * 
 * @param options - User impact analysis options
 * @returns Promise with user impact data
 */
export const getUserImpact = async (
  options: UserImpactOptions
): Promise<UserImpactResponse> => {
  if (!options.issueId) {
    throw new Error('issueId parameter is required');
  }

  try {
    return await apiClient.get<UserImpactResponse>(
      `/analytics/issues/${options.issueId}/impact`,
      {
        params: {
          stats_period: options.statsPeriod,
          start: options.start,
          end: options.end,
          project_id: options.projectId
        }
      }
    );
  } catch (error) {
    handleAnalyticsError(error, {
      operation: 'getUserImpact',
      ...options
    });
    throw error;
  }
};

export default {
  getIssueTrends,
  getIssueDistribution,
  getUserImpact
};
