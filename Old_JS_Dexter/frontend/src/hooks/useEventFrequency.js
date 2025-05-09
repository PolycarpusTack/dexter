// File: frontend/src/hooks/useEventFrequency.js

import { useQuery } from '@tanstack/react-query';
import { getEventFrequency } from '../api/analyticsApi';
import useAppStore from '../store/appStore';

/**
 * Hook to fetch and manage event frequency data
 * @param {string} issueId - Sentry issue ID
 * @param {string} timeRange - Time range ('24h', '7d', '30d')
 * @returns {Object} - Query result with event frequency data
 */
function useEventFrequency(issueId, timeRange = '24h') {
  const { organizationSlug, projectSlug } = useAppStore();
  
  return useQuery({
    queryKey: ['eventFrequency', { organizationSlug, projectSlug, issueId, timeRange }],
    queryFn: () => getEventFrequency({ 
      organizationSlug, 
      projectSlug, 
      issueId, 
      timeRange 
    }),
    enabled: !!organizationSlug && !!projectSlug && !!issueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export default useEventFrequency;