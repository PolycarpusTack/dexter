// File: frontend/src/api/analyticsApi.js

import axios from 'axios';
import { API_BASE_URL, axiosConfig } from './config';

// Create an axios instance with our configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  ...axiosConfig,
  headers: {
    ...axiosConfig.headers,
    'Accept': 'application/json',
  }
});

/**
 * Fetch event frequency data for a specific issue
 * @param {Object} options - Query options
 * @param {string} options.organizationSlug - Sentry organization slug
 * @param {string} options.projectSlug - Sentry project slug
 * @param {string} options.issueId - Sentry issue ID
 * @param {string} options.timeRange - Time range ('24h', '7d', '30d')
 * @returns {Promise<Object>} - Promise that resolves to event frequency data
 */
export const getEventFrequency = async ({ 
  organizationSlug, 
  projectSlug, 
  issueId, 
  timeRange = '24h' 
}) => {
  try {
    console.log(`Fetching event frequency for issue: ${issueId}, timeRange: ${timeRange}`);
    
    const response = await apiClient.get(
      `/organizations/${organizationSlug}/issues/${issueId}/stats`,
      { params: { timeRange } }
    );
    
    console.log(`Successfully fetched event frequency for issue ${issueId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching event frequency:', error);
    
    // If API fails, generate mock data for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Generating mock frequency data for development');
      return generateMockFrequencyData(timeRange);
    }
    
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to fetch event frequency'
    );
  }
};

/**
 * Generate mock frequency data for development
 * @param {string} timeRange - Time range ('24h', '7d', '30d')
 * @returns {Object} - Mock frequency data
 */
function generateMockFrequencyData(timeRange) {
  // Determine number of data points based on time range
  let dataPoints;
  switch (timeRange) {
    case '7d':
      dataPoints = 7;
      break;
    case '30d':
      dataPoints = 30;
      break;
    case '24h':
    default:
      dataPoints = 24;
      break;
  }
  
  // Generate data points
  const now = new Date();
  const data = [];
  
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = new Date(now);
    
    // Adjust timestamp based on time range
    if (timeRange === '24h') {
      timestamp.setHours(now.getHours() - (dataPoints - i - 1));
    } else {
      timestamp.setDate(now.getDate() - (dataPoints - i - 1));
    }
    
    // Generate random count with trend
    let count;
    if (i < dataPoints / 3) {
      // Lower counts at beginning
      count = Math.floor(Math.random() * 5) + 1;
    } else if (i < dataPoints * 2 / 3) {
      // Higher counts in middle
      count = Math.floor(Math.random() * 10) + 5;
    } else {
      // Variable counts at end to show trend
      const trend = Math.random() > 0.7 ? 1 : -1;
      const prevCount = data[i - 1]?.count || 7;
      count = Math.max(1, Math.floor(prevCount + trend * (Math.random() * 3)));
    }
    
    data.push({
      timestamp: timestamp.toISOString(),
      count
    });
  }
  
  // Calculate trend
  const firstCount = data[0].count;
  const lastCount = data[data.length - 1].count;
  const trend = firstCount === 0 ? 0 : Math.round(((lastCount - firstCount) / firstCount) * 100);
  
  return {
    data,
    trend,
    timeRange
  };
}

/**
 * Fetch issue impact data (users affected over time)
 * @param {Object} options - Query options
 * @param {string} options.organizationSlug - Sentry organization slug
 * @param {string} options.projectSlug - Sentry project slug
 * @param {string} options.issueId - Sentry issue ID
 * @param {string} options.timeRange - Time range ('24h', '7d', '30d')
 * @returns {Promise<Object>} - Promise that resolves to user impact data
 */
export const getIssueImpact = async ({ 
  organizationSlug, 
  projectSlug, 
  issueId, 
  timeRange = '24h' 
}) => {
  try {
    console.log(`Fetching issue impact for issue: ${issueId}, timeRange: ${timeRange}`);
    
    const response = await apiClient.get(
      `/organizations/${organizationSlug}/issues/${issueId}/impact`,
      { params: { timeRange } }
    );
    
    console.log(`Successfully fetched issue impact for issue ${issueId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching issue impact:', error);
    
    // If API fails, generate mock data for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Generating mock impact data for development');
      return generateMockImpactData(timeRange);
    }
    
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to fetch issue impact'
    );
  }
};

/**
 * Generate mock impact data for development
 * @param {string} timeRange - Time range ('24h', '7d', '30d')
 * @returns {Object} - Mock impact data
 */
function generateMockImpactData(timeRange) {
  // Generate random user impact stats
  const totalUsers = Math.floor(Math.random() * 1000) + 100;
  const affectedUsers = Math.floor(Math.random() * (totalUsers / 2)) + 10;
  const affectedPercentage = Math.round((affectedUsers / totalUsers) * 100);
  
  // Generate user distribution data
  const userDistribution = {
    browser: {
      'Chrome': Math.floor(Math.random() * 70) + 30,
      'Firefox': Math.floor(Math.random() * 30) + 10,
      'Safari': Math.floor(Math.random() * 20) + 5,
      'Edge': Math.floor(Math.random() * 10) + 1,
    },
    os: {
      'Windows': Math.floor(Math.random() * 60) + 20,
      'macOS': Math.floor(Math.random() * 40) + 10,
      'Linux': Math.floor(Math.random() * 20) + 5,
      'iOS': Math.floor(Math.random() * 10) + 1,
      'Android': Math.floor(Math.random() * 10) + 1,
    },
    country: {
      'US': Math.floor(Math.random() * 50) + 30,
      'UK': Math.floor(Math.random() * 20) + 10,
      'Germany': Math.floor(Math.random() * 15) + 5,
      'France': Math.floor(Math.random() * 10) + 5,
      'Japan': Math.floor(Math.random() * 10) + 5,
      'Other': Math.floor(Math.random() * 15) + 5,
    }
  };
  
  return {
    totalUsers,
    affectedUsers,
    affectedPercentage,
    userDistribution,
    timeRange
  };
}
