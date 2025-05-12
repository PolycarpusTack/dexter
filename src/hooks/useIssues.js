/**
 * Issues hooks for React components
 * 
 * This module provides React hooks for working with issues data.
 */
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { IssuesApi } from '../api';

/**
 * Hook for fetching a list of issues
 */
export const useIssues = (org, project, options = {}) => {
  const { 
    filters = {}, 
    enabled = true, 
    staleTime = 60000,  // 1 minute
    refetchInterval = false,
    refetchOnWindowFocus = true
  } = options;

  return useQuery(
    ['issues', org, project, filters],
    () => IssuesApi.getIssues(org, project, filters),
    {
      enabled,
      staleTime,
      refetchInterval,
      refetchOnWindowFocus,
      keepPreviousData: true
    }
  );
};

/**
 * Hook for fetching issue details
 */
export const useIssueDetails = (org, issueId, options = {}) => {
  const {
    enabled = Boolean(issueId),
    staleTime = 30000,  // 30 seconds
    refetchInterval = false
  } = options;

  return useQuery(
    ['issue', org, issueId],
    () => IssuesApi.getIssueDetails(org, issueId),
    {
      enabled,
      staleTime,
      refetchInterval
    }
  );
};

/**
 * Hook for updating an issue
 */
export const useUpdateIssue = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ org, issueId, data }) => IssuesApi.updateIssue(org, issueId, data),
    {
      onSuccess: (data, variables) => {
        // Invalidate issue details query
        queryClient.invalidateQueries(['issue', variables.org, variables.issueId]);
        
        // Update issue in issue list cache if it exists
        queryClient.setQueriesData(['issues'], (oldData) => {
          if (!oldData || !oldData.data) return oldData;
          
          return {
            ...oldData,
            data: oldData.data.map(issue => 
              issue.id === variables.issueId ? { ...issue, ...variables.data } : issue
            )
          };
        });
      }
    }
  );
};

/**
 * Hook for bulk updating issues
 */
export const useBulkUpdateIssues = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ org, issueIds, data }) => IssuesApi.bulkUpdate(org, issueIds, data),
    {
      onSuccess: (data, variables) => {
        // Invalidate affected issue queries
        variables.issueIds.forEach(issueId => {
          queryClient.invalidateQueries(['issue', variables.org, issueId]);
        });
        
        // Invalidate issues list queries
        queryClient.invalidateQueries(['issues']);
      }
    }
  );
};

/**
 * Hook for assigning an issue
 */
export const useAssignIssue = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ org, issueId, assignee }) => IssuesApi.assignIssue(org, issueId, assignee),
    {
      onSuccess: (data, variables) => {
        // Invalidate issue details query
        queryClient.invalidateQueries(['issue', variables.org, variables.issueId]);
      }
    }
  );
};

/**
 * Hook for resolving an issue
 */
export const useResolveIssue = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ org, issueId, resolution }) => IssuesApi.resolveIssue(org, issueId, resolution),
    {
      onSuccess: (data, variables) => {
        // Invalidate issue details query
        queryClient.invalidateQueries(['issue', variables.org, variables.issueId]);
        
        // Update issue in issue list cache if it exists
        queryClient.setQueriesData(['issues'], (oldData) => {
          if (!oldData || !oldData.data) return oldData;
          
          return {
            ...oldData,
            data: oldData.data.map(issue => 
              issue.id === variables.issueId ? { ...issue, status: 'resolved' } : issue
            )
          };
        });
      }
    }
  );
};

/**
 * Hook for issue comments
 */
export const useIssueComments = (org, issueId, options = {}) => {
  const {
    enabled = Boolean(issueId),
    staleTime = 60000  // 1 minute
  } = options;

  return useQuery(
    ['issue-comments', org, issueId],
    () => IssuesApi.getIssueComments(org, issueId),
    {
      enabled,
      staleTime
    }
  );
};

/**
 * Hook for adding a comment to an issue
 */
export const useAddIssueComment = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ org, issueId, comment }) => IssuesApi.addIssueComment(org, issueId, comment),
    {
      onSuccess: (data, variables) => {
        // Invalidate comments query
        queryClient.invalidateQueries(['issue-comments', variables.org, variables.issueId]);
      }
    }
  );
};
