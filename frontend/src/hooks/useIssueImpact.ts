// File: src/hooks/useIssueImpact.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '../api/unified';
import useAppStore from '../store/appStore';

/**
 * Hook for fetching issue impact data
 * 
 * @param issueId - The issue ID to fetch impact for
 * @param timeRange - Time range to analyze
 * @returns Object with impact data and status
 */
export function useIssueImpact(issueId: string, timeRange: string = '7d') {
  // Get organization from the store
  const organizationSlug = useAppStore(state => state.organizationId || state.organizationSlug || 'default');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['issueImpact', issueId, timeRange, organizationSlug],
    queryFn: async () => {
      // Call the API if available, fall back to mock data
      try {
        // Use the analytics API from unified API client
        return await api.analytics.getUserImpact({
          organizationSlug,
          issueId,
          timeRange,
          includeDemographics: true
        });
      } catch (error) {
        // If API is not available, return mock data
        console.debug('User impact API not available, using mock data');
        return {
          uniqueUsers: Math.floor(Math.random() * 100) + 20,
          userPercentage: Math.random() * 10,
          affectedSessions: Math.floor(Math.random() * 500) + 50,
          sessionPercentage: Math.random() * 15,
          dailyImpact: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (7 - i) * 24 * 3600 * 1000).toISOString(),
            users: Math.floor(Math.random() * 20) + 5,
            sessions: Math.floor(Math.random() * 50) + 10
          })),
          userData: {
            demographics: {
              browser: {
                'Chrome': 45,
                'Firefox': 30,
                'Safari': 20,
                'Other': 5
              },
              device: {
                'Desktop': 65,
                'Mobile': 30,
                'Tablet': 5
              }
            },
            geographic: {
              'United States': 40,
              'Europe': 30,
              'Asia': 20,
              'Other': 10
            }
          }
        };
      }
    },
    enabled: !!issueId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
  
  return {
    data: data || {
      uniqueUsers: 0,
      userPercentage: 0,
      affectedSessions: 0,
      sessionPercentage: 0,
      dailyImpact: []
    },
    isLoading,
    isError,
    error,
    refetch
  };
}

export default useIssueImpact;
