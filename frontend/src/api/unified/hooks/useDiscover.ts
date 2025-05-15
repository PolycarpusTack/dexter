/**
 * Discover API Hook
 * 
 * This file provides React hooks for interacting with the Discover API.
 * It uses React Query for data fetching and caching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  executeQuery, 
  getSavedQueries, 
  saveQuery,
  DiscoverQuery,
  DiscoverQueryOptions,
  SavedQueryOptions
} from '../discoverApi';
import { showErrorNotification } from '../errorHandler';

/**
 * Query key factory for discover
 */
export const discoverKeys = {
  all: ['discover'] as const,
  queries: () => [...discoverKeys.all, 'queries'] as const,
  query: (options: DiscoverQueryOptions) => [...discoverKeys.queries(), options] as const,
  savedQueries: () => [...discoverKeys.all, 'savedQueries'] as const,
  savedQueriesList: (organizationSlug: string) => [
    ...discoverKeys.savedQueries(), organizationSlug
  ] as const,
};

/**
 * Hook for executing a Discover query
 * 
 * @param options - Query options
 * @returns Query result
 */
export const useDiscoverQuery = (options: DiscoverQueryOptions) => {
  return useQuery({
    queryKey: discoverKeys.query(options),
    queryFn: () => executeQuery(options),
    // Keep data fresh for 1 minute
    staleTime: 60 * 1000,
    // Disable automatic refetching on window focus
    refetchOnWindowFocus: false,
    onError: (error) => {
      showErrorNotification({
        title: 'Query execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for fetching saved queries
 * 
 * @param options - Saved query options
 * @returns Query result with saved queries
 */
export const useSavedQueries = (options: SavedQueryOptions) => {
  return useQuery({
    queryKey: discoverKeys.savedQueriesList(options.organizationSlug),
    queryFn: () => getSavedQueries(options),
    // Keep data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to fetch saved queries',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for saving a new query
 * 
 * @returns Mutation for saving a query
 */
export const useSaveQuery = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      organizationSlug, 
      name, 
      query, 
      isPublic = false 
    }: { 
      organizationSlug: string; 
      name: string; 
      query: DiscoverQuery; 
      isPublic?: boolean; 
    }) => saveQuery(organizationSlug, name, query, isPublic),
    
    onSuccess: (_, { organizationSlug }) => {
      // Invalidate saved queries list
      queryClient.invalidateQueries({ queryKey: discoverKeys.savedQueriesList(organizationSlug) });
    },
    
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to save query',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
};