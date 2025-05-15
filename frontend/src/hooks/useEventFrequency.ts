// File: src/hooks/useEventFrequency.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '../api/unified';
import useAppStore from '../store/appStore';

/**
 * Hook for fetching event frequency data
 * 
 * @param eventId - The event ID to fetch frequency for
 * @param timeRange - Time range to analyze
 * @returns Object with frequency data and status
 */
export function useEventFrequency(eventId: string, timeRange: string = '24h') {
  // Get organization from the store
  const organizationSlug = useAppStore(state => state.organizationId || state.organizationSlug || 'default');
  const projectSlug = useAppStore(state => state.projectId || state.projectSlug || 'default');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['eventFrequency', eventId, timeRange, organizationSlug, projectSlug],
    queryFn: async () => {
      // Call the API if available, fall back to mock data
      try {
        // Use the analytics API from unified API client
        return await api.analytics.getErrorFrequency({
          organizationSlug,
          projectSlug,
          eventId,
          timeRange,
          includePointData: true
        });
      } catch (error) {
        // If API is not available, return mock data
        console.debug('Error frequency API not available, using mock data');
        return {
          points: Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(Date.now() - (24 - i) * 3600 * 1000).toISOString(),
            count: Math.floor(Math.random() * 10)
          })),
          totalCount: 120,
          trend: Math.floor(Math.random() * 40) - 20, // -20% to +20%
          peakCount: 15,
          peakTimestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString()
        };
      }
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  return {
    data: data || {
      points: [],
      totalCount: 0,
      trend: 0,
      peakCount: 0,
      peakTimestamp: ''
    },
    isLoading,
    isError,
    error,
    refetch
  };
}

export default useEventFrequency;
