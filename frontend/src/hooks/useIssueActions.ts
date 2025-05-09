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
  projectId?: string;
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
    mutationFn: (params: { issueId: string; status: string; projectId?: string }) => 
      updateIssueStatus(params.issueId, params.status, params.projectId),
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
        projectId: variables.projectId
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
    mutationFn: (params: { issueId: string; assigneeId: string; projectId?: string }) => 
      assignIssue(params.issueId, params.assigneeId, params.projectId),
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
        projectId: variables.projectId
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
    mutationFn: (params: { issueId: string; comment: string; projectId?: string }) => 
      addIssueComment(params.issueId, params.comment, params.projectId),
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
        projectId: variables.projectId
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
    mutationFn: (params: { issueId: string; tags: string[]; projectId?: string }) => 
      addIssueTags(params.issueId, params.tags, params.projectId),
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
        projectId: variables.projectId
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
            projectId: action.projectId
          });
          
        case 'assign':
          return await assignIssueMutation.mutateAsync({
            issueId: action.id,
            assigneeId: action.value,
            projectId: action.projectId
          });
          
        case 'comment':
          return await addCommentMutation.mutateAsync({
            issueId: action.id,
            comment: action.value,
            projectId: action.projectId
          });
          
        case 'tag':
          return await addTagsMutation.mutateAsync({
            issueId: action.id,
            tags: Array.isArray(action.value) ? action.value : [action.value],
            projectId: action.projectId
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
              projectId: updates.projectId
            })
          );
        }
        
        if (updates.assigneeId) {
          actions.push(
            assignIssueMutation.mutateAsync({
              issueId: id,
              assigneeId: updates.assigneeId,
              projectId: updates.projectId
            })
          );
        }
        
        if (updates.tags && updates.tags.length > 0) {
          actions.push(
            addTagsMutation.mutateAsync({
              issueId: id,
              tags: updates.tags,
              projectId: updates.projectId
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
        projectId: updates.projectId
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
    updateStatus: (issueId: string, status: string, projectId?: string) => 
      performAction({ id: issueId, type: 'status', value: status, projectId }),
    
    assignTo: (issueId: string, assigneeId: string, projectId?: string) => 
      performAction({ id: issueId, type: 'assign', value: assigneeId, projectId }),
    
    addComment: (issueId: string, comment: string, projectId?: string) => 
      performAction({ id: issueId, type: 'comment', value: comment, projectId }),
    
    addTags: (issueId: string, tags: string[], projectId?: string) => 
      performAction({ id: issueId, type: 'tag', value: tags, projectId }),
    
    bulkUpdate,
    
    isUpdating,
    isStatusUpdating: updateStatusMutation.isPending,
    isAssigning: assignIssueMutation.isPending,
    isCommenting: addCommentMutation.isPending,
    isTagging: addTagsMutation.isPending
  };
}

export default useIssueActions;
