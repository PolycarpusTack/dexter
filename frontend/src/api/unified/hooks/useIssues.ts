/**
 * Issues API Hook
 * 
 * This file provides React hooks for interacting with the Issues API.
 * It uses React Query for data fetching and caching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getIssues, 
  getIssue, 
  updateIssue, 
  bulkUpdateIssues, 
  assignIssue, 
  resolveIssue, 
  ignoreIssue, 
  FetchIssuesOptions, 
  IssueUpdateData 
} from '../issuesApi';
import { showErrorNotification } from '../errorHandler';

/**
 * Query key factory for issues
 */
export const issuesKeys = {
  all: ['issues'] as const,
  lists: () => [...issuesKeys.all, 'list'] as const,
  list: (filters: FetchIssuesOptions) => [...issuesKeys.lists(), filters] as const,
  details: () => [...issuesKeys.all, 'detail'] as const,
  detail: (organizationSlug: string, issueId: string) => [
    ...issuesKeys.details(), organizationSlug, issueId
  ] as const,
};

/**
 * Hook for fetching issues list
 * 
 * @param options - Fetch options
 * @returns Query result with issues
 */
export const useIssues = (options: FetchIssuesOptions) => {
  return useQuery({
    queryKey: issuesKeys.list(options),
    queryFn: () => getIssues(options),
    retry: 1,
    // Only refetch on window focus if data is stale
    refetchOnWindowFocus: true,
    // Keep data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for fetching a single issue
 * 
 * @param organizationSlug - Organization slug
 * @param issueId - Issue ID
 * @returns Query result with issue
 */
export const useIssue = (organizationSlug: string, issueId: string) => {
  return useQuery({
    queryKey: issuesKeys.detail(organizationSlug, issueId),
    queryFn: () => getIssue(organizationSlug, issueId),
    // Don't fetch if we don't have an issue ID
    enabled: !!issueId,
    // Only refetch on window focus if data is stale
    refetchOnWindowFocus: true,
    // Keep data fresh for 1 minute
    staleTime: 60 * 1000,
  });
};

/**
 * Hook for updating an issue
 * 
 * @returns Mutation for updating an issue
 */
export const useUpdateIssue = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      organizationSlug, 
      issueId, 
      data 
    }: { 
      organizationSlug: string; 
      issueId: string; 
      data: IssueUpdateData 
    }) => updateIssue(organizationSlug, issueId, data),
    
    onSuccess: (data, { organizationSlug, issueId }) => {
      // Invalidate the issue and issues list queries
      queryClient.invalidateQueries({ queryKey: issuesKeys.detail(organizationSlug, issueId) });
      queryClient.invalidateQueries({ queryKey: issuesKeys.lists() });
    },
    
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to update issue',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
};

/**
 * Hook for assigning an issue
 * 
 * @returns Mutation for assigning an issue
 */
export const useAssignIssue = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      organizationSlug, 
      issueId, 
      assigneeId 
    }: { 
      organizationSlug: string; 
      issueId: string; 
      assigneeId: string | null 
    }) => assignIssue(organizationSlug, issueId, assigneeId),
    
    onSuccess: (data, { organizationSlug, issueId }) => {
      // Invalidate the issue query
      queryClient.invalidateQueries({ queryKey: issuesKeys.detail(organizationSlug, issueId) });
    },
    
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to assign issue',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
};

/**
 * Hook for resolving an issue
 * 
 * @returns Mutation for resolving an issue
 */
export const useResolveIssue = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      organizationSlug, 
      issueId 
    }: { 
      organizationSlug: string; 
      issueId: string; 
    }) => resolveIssue(organizationSlug, issueId),
    
    onSuccess: (data, { organizationSlug, issueId }) => {
      // Invalidate the issue and issues list queries
      queryClient.invalidateQueries({ queryKey: issuesKeys.detail(organizationSlug, issueId) });
      queryClient.invalidateQueries({ queryKey: issuesKeys.lists() });
    },
    
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to resolve issue',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
};

/**
 * Hook for ignoring an issue
 * 
 * @returns Mutation for ignoring an issue
 */
export const useIgnoreIssue = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      organizationSlug, 
      issueId 
    }: { 
      organizationSlug: string; 
      issueId: string; 
    }) => ignoreIssue(organizationSlug, issueId),
    
    onSuccess: (data, { organizationSlug, issueId }) => {
      // Invalidate the issue and issues list queries
      queryClient.invalidateQueries({ queryKey: issuesKeys.detail(organizationSlug, issueId) });
      queryClient.invalidateQueries({ queryKey: issuesKeys.lists() });
    },
    
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to ignore issue',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
};

/**
 * Hook for bulk updating issues
 * 
 * @returns Mutation for bulk updating issues
 */
export const useBulkUpdateIssues = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      organizationSlug, 
      projectSlug, 
      issueIds, 
      data 
    }: { 
      organizationSlug: string; 
      projectSlug: string; 
      issueIds: string[]; 
      data: IssueUpdateData 
    }) => bulkUpdateIssues({
      organizationSlug,
      projectSlug,
      issueIds,
      data
    }),
    
    onSuccess: () => {
      // Invalidate all issues lists
      queryClient.invalidateQueries({ queryKey: issuesKeys.lists() });
    },
    
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to update issues',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
};