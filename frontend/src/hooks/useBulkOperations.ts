// File: src/hooks/useBulkOperations.ts

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { showSuccessNotification, showErrorNotification } from '../utils/errorHandling';
import { useAuditLog } from './useAuditLog';

export interface BulkOperation {
  issue_id: string;
  operation_type: 'status' | 'assign' | 'tag';
  data: any;
}

export interface BulkOperationResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    issue_id: string;
    success: boolean;
    operation_type: string;
    result?: any;
  }>;
  errors: Array<{
    issue_id: string;
    success: boolean;
    error: string;
  }>;
}

export interface BulkOperationProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
}

/**
 * Hook for performing bulk operations on issues
 * 
 * @returns Object with bulk operation functions and state
 */
export function useBulkOperations() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BulkOperationProgress>({
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0
  });
  
  const queryClient = useQueryClient();
  const logEvent = useAuditLog('BulkOperations');
  
  // Bulk operations mutation
  const bulkMutation = useMutation({
    mutationFn: async (operations: BulkOperation[]): Promise<BulkOperationResult> => {
      setProgress({
        total: operations.length,
        processed: 0,
        succeeded: 0,
        failed: 0
      });
      
      // Send all operations to the backend
      const response = await apiClient.post<BulkOperationResult>(
        '/issues/bulk',
        operations
      );
      
      return response;
    },
    onSuccess: (data) => {
      // Update progress with final results
      setProgress({
        total: data.total,
        processed: data.total,
        succeeded: data.succeeded,
        failed: data.failed
      });
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      
      // Log the bulk operation
      logEvent('bulk_operation_complete', {
        total: data.total,
        succeeded: data.succeeded,
        failed: data.failed,
        operationTypes: [...new Set(data.results.map(r => r.operation_type))]
      });
      
      // Show notification based on results
      if (data.succeeded > 0 && data.failed === 0) {
        showSuccessNotification({
          title: 'Bulk Operation Complete',
          message: `Successfully processed ${data.succeeded} operations`
        });
      } else if (data.succeeded > 0 && data.failed > 0) {
        showSuccessNotification({
          title: 'Partial Success',
          message: `Processed ${data.succeeded} operations successfully, ${data.failed} failed`
        });
      } else if (data.failed > 0) {
        showErrorNotification({
          title: 'Bulk Operation Failed',
          message: `All ${data.failed} operations failed`
        });
      }
    },
    onError: (error) => {
      setProgress(prev => ({ ...prev, processed: prev.total }));
      
      showErrorNotification({
        title: 'Bulk Operation Error',
        message: error.message || 'An error occurred during bulk operation'
      });
      
      logEvent('bulk_operation_error', {
        error: error.message
      });
    }
  });
  
  /**
   * Perform bulk operations on issues
   * 
   * @param operations - Array of operations to perform
   * @returns Promise resolving to operation results
   */
  const performBulkOperations = async (operations: BulkOperation[]): Promise<BulkOperationResult> => {
    setIsProcessing(true);
    
    try {
      const result = await bulkMutation.mutateAsync(operations);
      return result;
    } finally {
      setIsProcessing(false);
      
      // Reset progress after a delay
      setTimeout(() => {
        setProgress({
          total: 0,
          processed: 0,
          succeeded: 0,
          failed: 0
        });
      }, 2000);
    }
  };
  
  /**
   * Perform bulk status update
   * 
   * @param issueIds - Array of issue IDs
   * @param status - New status to apply
   * @returns Promise resolving to operation results
   */
  const bulkUpdateStatus = async (issueIds: string[], status: string): Promise<BulkOperationResult> => {
    const operations: BulkOperation[] = issueIds.map(id => ({
      issue_id: id,
      operation_type: 'status',
      data: { status }
    }));
    
    return performBulkOperations(operations);
  };
  
  /**
   * Perform bulk assignment
   * 
   * @param issueIds - Array of issue IDs
   * @param assignee - User ID or email to assign to
   * @returns Promise resolving to operation results
   */
  const bulkAssign = async (issueIds: string[], assignee: string): Promise<BulkOperationResult> => {
    const operations: BulkOperation[] = issueIds.map(id => ({
      issue_id: id,
      operation_type: 'assign',
      data: { assignee }
    }));
    
    return performBulkOperations(operations);
  };
  
  /**
   * Add tags to multiple issues
   * 
   * @param issueIds - Array of issue IDs
   * @param tags - Array of tags to add
   * @returns Promise resolving to operation results
   */
  const bulkAddTags = async (issueIds: string[], tags: string[]): Promise<BulkOperationResult> => {
    const operations: BulkOperation[] = issueIds.map(id => ({
      issue_id: id,
      operation_type: 'tag',
      data: { tags }
    }));
    
    return performBulkOperations(operations);
  };
  
  return {
    performBulkOperations,
    bulkUpdateStatus,
    bulkAssign,
    bulkAddTags,
    isProcessing,
    isPending: bulkMutation.isPending,
    progress
  };
}

export default useBulkOperations;
