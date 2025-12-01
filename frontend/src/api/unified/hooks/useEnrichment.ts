/**
 * React Query Hooks for Enrichment API
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { EnrichmentData } from '../../../types/enrichment';
import enhancedApiClient from '../enhancedApiClient';
import { ApiError } from '../types';

/**
 * Hook to fetch enrichment data for a specific issue
 */
export const useEnrichmentData = (
  issueId: string | number,
  options?: Omit<UseQueryOptions<EnrichmentData, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<EnrichmentData, ApiError>({
    queryKey: ['enrichment', issueId],
    queryFn: async () => {
      const response = await enhancedApiClient.get<EnrichmentData>(
        `/api/v1/issues/${issueId}/enrichment`
      );
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    enabled: !!issueId,
    ...options,
  });
};

/**
 * Hook to fetch just the enrichment status (lightweight)
 */
export const useEnrichmentStatus = (
  issueId: string | number,
  options?: Omit<UseQueryOptions<{ enrichmentStatus: EnrichmentData['enrichmentStatus'] }, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<{ enrichmentStatus: EnrichmentData['enrichmentStatus'] }, ApiError>({
    queryKey: ['enrichment-status', issueId],
    queryFn: async () => {
      const response = await enhancedApiClient.get<{ enrichmentStatus: EnrichmentData['enrichmentStatus'] }>(
        `/api/v1/issues/${issueId}/enrichment/status`
      );
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: !!issueId,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for freshness
    ...options,
  });
};

/**
 * Hook to trigger manual refresh of enrichment data
 */
export const useRefreshEnrichment = () => {
  return async (issueId: string | number): Promise<void> => {
    await enhancedApiClient.post(`/api/v1/issues/${issueId}/enrichment/refresh`);
  };
};
