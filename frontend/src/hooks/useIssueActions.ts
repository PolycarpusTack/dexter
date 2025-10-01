// File: src/hooks/useIssueActions.ts

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateIssueStatus, assignIssue, addIssueComment, addIssueTags } from '../api/issuesApi';
import { showSuccessNotification, showErrorNotification } from '../utils/errorHandling';
import { useAuditLog } from './useAuditLog';

export interface IssueAction {
  /** Issue ID */
  id: string;
  /** Action type */
  type: 'status' | 'assign' | 'comment' | 'tag';
  /** Action value */
  value: any;
  /** Project ID (optional) */
  projectSlug?: string;
}

/**
 * Hook for issue action mutations (status, assign, comment, tag)
 * 
 * @returns Object with action functions and loading states
 */
function useIssueActions() {
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const logEvent = useAuditLog('IssueActions');
  
  // Update issue status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (params: { issueId: string; status: string; projectSlug?: string }) => 
      updateIssueStatus(params.issueId, params.status, params.projectSlug),
    onSuccess: (_, variables) => {
      showSuccessNotification({
        title: 'Status Updated',
        message: `Issue has been marked as ${variables.status}`
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue', variables.issueId] });
      
      // Log the action
      logEvent('update_status', {
        issueId: variables.issueId,
        status: variables.status,
        projectSlug: variables.projectSlug
      });
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to Update Status',
        error: error as Error
      });
    }
  });
  
  // Assign issue mutation
  const assignIssueMutation = useMutation({
    mutationFn: (params: { issueId: string; assigneeId: string; projectSlug?: string }) => 
      assignIssue(params.issueId, params.assigneeId, params.projectSlug),
    onSuccess: (data, variables) => {
      showSuccessNotification({
        title: 'Issue Assigned',
        message: `Issue has been assigned to ${data.assignee?.name || variables.assigneeId}`
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue', variables.issueId] });
      
      // Log the action
      logEvent('assign_issue', {
        issueId: variables.issueId,
        assigneeId: variables.assigneeId,
        projectSlug: variables.projectSlug
      });
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to Assign Issue',
        error: error as Error
      });
    }
  });
  
  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (params: { issueId: string; comment: string; projectSlug?: string }) => 
      addIssueComment(params.issueId, params.comment, params.projectSlug),
    onSuccess: (_, variables) => {
      showSuccessNotification({
        title: 'Comment Added',
        message: 'Your comment has been added to the issue'
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['issue', variables.issueId, 'comments'] });
      
      // Log the action
      logEvent('add_comment', {
        issueId: variables.issueId,
        commentLength: variables.comment.length,
        projectSlug: variables.projectSlug
      });
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to Add Comment',
        error: error as Error
      });
    }
  });
  
  // Add tags mutation
  const addTagsMutation = useMutation({
    mutationFn: (params: { issueId: string; tags: string[]; projectSlug?: string }) => 
      addIssueTags(params.issueId, params.tags, params.projectSlug),
    onSuccess: (_, variables) => {
      showSuccessNotification({
        title: 'Tags Added',
        message: `Added ${variables.tags.length} tag(s) to the issue`
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue', variables.issueId] });
      
      // Log the action
      logEvent('add_tags', {
        issueId: variables.issueId,
        tags: variables.tags,
        projectSlug: variables.projectSlug
      });
    },
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to Add Tags',
        error: error as Error
      });
    }
  });
  
  /**
   * Perform an action on an issue
   * 
   * @param action - Action details 
   * @returns Promise resolving to action result
   */
  const performAction = async (action: IssueAction) => {
    setIsUpdating(true);
    
    try {
      switch (action.type) {
        case 'status':
          return await updateStatusMutation.mutateAsync({
            issueId: action.id,
            status: action.value,
            projectSlug: action.projectSlug
          });
          
        case 'assign':
          return await assignIssueMutation.mutateAsync({
            issueId: action.id,
            assigneeId: action.value,
            projectSlug: action.projectSlug
          });
          
        case 'comment':
          return await addCommentMutation.mutateAsync({
            issueId: action.id,
            comment: action.value,
            projectSlug: action.projectSlug
          });
          
        case 'tag':
          return await addTagsMutation.mutateAsync({
            issueId: action.id,
            tags: Array.isArray(action.value) ? action.value : [action.value],
            projectSlug: action.projectSlug
          });
          
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } finally {
      setIsUpdating(false);
    }
  };
  
  /**
   * Perform bulk update on multiple issues
   * 
   * @param issueIds - Array of issue IDs
   * @param updates - Update actions to perform
   * @returns Promise resolving when all updates complete
   */
  const bulkUpdate = async (issueIds: string[], updates: Record<string, any>) => {
    setIsUpdating(true);
    
    try {
      const actions = [];
      
      // Queue up all actions
      for (const id of issueIds) {
        if (updates.status) {
          actions.push(
            updateStatusMutation.mutateAsync({
              issueId: id,
              status: updates.status,
              projectSlug: updates.projectSlug
            })
          );
        }
        
        if (updates.assigneeId) {
          actions.push(
            assignIssueMutation.mutateAsync({
              issueId: id,
              assigneeId: updates.assigneeId,
              projectSlug: updates.projectSlug
            })
          );
        }
        
        if (updates.tags && updates.tags.length > 0) {
          actions.push(
            addTagsMutation.mutateAsync({
              issueId: id,
              tags: updates.tags,
              projectSlug: updates.projectSlug
            })
          );
        }
      }
      
      // Execute all actions
      await Promise.all(actions);
      
      // Show success notification
      showSuccessNotification({
        title: 'Bulk Update Complete',
        message: `Updated ${issueIds.length} issues`
      });
      
      // Log the bulk action
      logEvent('bulk_update', {
        issueCount: issueIds.length,
        updates,
        projectSlug: updates.projectSlug
      });
      
      // Invalidate issues query
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      
    } catch (error) {
      showErrorNotification({
        title: 'Bulk Update Failed',
        error: error as Error
      });
      
      // Re-throw for caller to handle
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };
  
  return {
    updateStatus: (issueId: string, status: string, projectSlug?: string) => 
      performAction({ id: issueId, type: 'status', value: status, projectSlug }),
    
    assignTo: (issueId: string, assigneeId: string, projectSlug?: string) => 
      performAction({ id: issueId, type: 'assign', value: assigneeId, projectSlug }),
    
    addComment: (issueId: string, comment: string, projectSlug?: string) => 
      performAction({ id: issueId, type: 'comment', value: comment, projectSlug }),
    
    addTags: (issueId: string, tags: string[], projectSlug?: string) => 
      performAction({ id: issueId, type: 'tag', value: tags, projectSlug }),
    
    bulkUpdate,
    
    isUpdating,
    isStatusUpdating: updateStatusMutation.isPending,
    isAssigning: assignIssueMutation.isPending,
    isCommenting: addCommentMutation.isPending,
    isTagging: addTagsMutation.isPending
  };
}

export default useIssueActions;
