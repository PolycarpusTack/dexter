/**
 * Discover hooks for React components
 * 
 * This module provides React hooks for working with Sentry's Discover data.
 */
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { DiscoverApi } from '../api';

/**
 * Hook for executing a Discover query
 */
export const useDiscoverQuery = (org, queryData, options = {}) => {
  const {
    enabled = true,
    staleTime = 60000, // 1 minute
    refetchInterval = false,
    cacheTime = 300000 // 5 minutes
  } = options;

  // Create a stable query key based on query parameters
  const queryKey = JSON.stringify(queryData);
  
  return useQuery(
    ['discover-query', org, queryKey],
    () => DiscoverApi.query(org, queryData),
    {
      enabled,
      staleTime,
      refetchInterval,
      cacheTime,
      keepPreviousData: true
    }
  );
};

/**
 * Hook for executing a Discover query with pagination
 */
export const useDiscoverPaginatedQuery = (org, queryData, options = {}) => {
  const {
    enabled = true,
    staleTime = 60000, // 1 minute
    refetchInterval = false,
    pageSize = 100,
    maxPages = 10
  } = options;

  // Create a stable query key based on query parameters
  const queryKey = JSON.stringify(queryData);
  
  return useQuery(
    ['discover-paginated-query', org, queryKey, pageSize, maxPages],
    () => DiscoverApi.queryWithPagination(org, queryData, { pageSize, maxPages }),
    {
      enabled,
      staleTime,
      refetchInterval,
      keepPreviousData: true
    }
  );
};

/**
 * Hook for fetching saved queries
 */
export const useSavedQueries = (org, options = {}) => {
  const {
    enabled = true,
    staleTime = 300000 // 5 minutes
  } = options;

  return useQuery(
    ['discover-saved-queries', org],
    () => DiscoverApi.getSavedQueries(org),
    {
      enabled,
      staleTime
    }
  );
};

/**
 * Hook for fetching a specific saved query
 */
export const useSavedQuery = (org, queryId, options = {}) => {
  const {
    enabled = Boolean(queryId),
    staleTime = 300000 // 5 minutes
  } = options;

  return useQuery(
    ['discover-saved-query', org, queryId],
    () => DiscoverApi.getSavedQuery(org, queryId),
    {
      enabled,
      staleTime
    }
  );
};

/**
 * Hook for creating a saved query
 */
export const useCreateSavedQuery = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ org, queryData }) => DiscoverApi.createSavedQuery(org, queryData),
    {
      onSuccess: (data, variables) => {
        // Invalidate saved queries list
        queryClient.invalidateQueries(['discover-saved-queries', variables.org]);
      }
    }
  );
};

/**
 * Hook for updating a saved query
 */
export const useUpdateSavedQuery = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ org, queryId, queryData }) => DiscoverApi.updateSavedQuery(org, queryId, queryData),
    {
      onSuccess: (data, variables) => {
        // Invalidate specific saved query
        queryClient.invalidateQueries(['discover-saved-query', variables.org, variables.queryId]);
        
        // Invalidate saved queries list
        queryClient.invalidateQueries(['discover-saved-queries', variables.org]);
      }
    }
  );
};

/**
 * Hook for deleting a saved query
 */
export const useDeleteSavedQuery = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ org, queryId }) => DiscoverApi.deleteSavedQuery(org, queryId),
    {
      onSuccess: (data, variables) => {
        // Invalidate saved queries list
        queryClient.invalidateQueries(['discover-saved-queries', variables.org]);
      }
    }
  );
};

/**
 * Hook for prebuilt queries
 */
export const usePrebuiltQueries = (org, options = {}) => {
  const {
    enabled = true,
    staleTime = 3600000 // 1 hour (these rarely change)
  } = options;

  return useQuery(
    ['discover-prebuilt-queries', org],
    () => DiscoverApi.getPrebuiltQueries(org),
    {
      enabled,
      staleTime
    }
  );
};
