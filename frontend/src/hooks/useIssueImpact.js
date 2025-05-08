// File: frontend/src/hooks/useIssueImpact.js

import { useQuery } from '@tanstack/react-query';
import { getIssueImpact } from '../api/analyticsApi';
import useAppStore from '../store/appStore';

/**
 * Hook to fetch and manage issue impact data
 * @param {string} issueId - Sentry issue ID
 * @param {string} timeRange - Time range ('24h', '7d', '30d')
 * @returns {Object} - Query result with issue impact data
 */
function useIssueImpact(issueId, timeRange = '24h') {
  const { organizationSlug, projectSlug } = useAppStore();
  
  return useQuery({
    queryKey: ['issueImpact', { organizationSlug, projectSlug, issueId, timeRange }],
    queryFn: () => getIssueImpact({ 
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

export default useIssueImpact;
