/**
 * Alerts API Hook
 * 
 * This file provides React hooks for interacting with the Alerts API.
 * It uses React Query for data fetching and caching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAlertRules, 
  getAlertRule, 
  createAlertRule, 
  updateAlertRule, 
  deleteAlertRule,
  AlertRuleInput
} from '../alertsApi';
import { showErrorNotification } from '../errorHandler';

/**
 * Query key factory for alerts
 */
export const alertsKeys = {
  all: ['alerts'] as const,
  lists: () => [...alertsKeys.all, 'list'] as const,
  list: (organizationSlug: string) => [...alertsKeys.lists(), organizationSlug] as const,
  details: () => [...alertsKeys.all, 'detail'] as const,
  detail: (organizationSlug: string, ruleId: string) => [
    ...alertsKeys.details(), organizationSlug, ruleId
  ] as const,
};

/**
 * Hook for fetching alert rules
 * 
 * @param organizationSlug - Organization slug
 * @returns Query result with alert rules
 */
export const useAlertRules = (organizationSlug: string) => {
  return useQuery({
    queryKey: alertsKeys.list(organizationSlug),
    queryFn: () => getAlertRules(organizationSlug),
    // Keep data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to fetch alert rules',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for fetching a single alert rule
 * 
 * @param organizationSlug - Organization slug
 * @param ruleId - Alert rule ID
 * @returns Query result with alert rule
 */
export const useAlertRule = (organizationSlug: string, ruleId: string) => {
  return useQuery({
    queryKey: alertsKeys.detail(organizationSlug, ruleId),
    queryFn: () => getAlertRule(organizationSlug, ruleId),
    // Don't fetch if we don't have a rule ID
    enabled: !!ruleId,
    // Keep data fresh for 1 minute
    staleTime: 60 * 1000,
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to fetch alert rule',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for creating an alert rule
 * 
 * @returns Mutation for creating an alert rule
 */
export const useCreateAlertRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      organizationSlug, 
      data 
    }: { 
      organizationSlug: string; 
      data: AlertRuleInput; 
    }) => createAlertRule(organizationSlug, data),
    
    onSuccess: (_, { organizationSlug }) => {
      // Invalidate alert rules list
      queryClient.invalidateQueries({ queryKey: alertsKeys.list(organizationSlug) });
    },
    
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to create alert rule',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
};

/**
 * Hook for updating an alert rule
 * 
 * @returns Mutation for updating an alert rule
 */
export const useUpdateAlertRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      organizationSlug, 
      ruleId, 
      data 
    }: { 
      organizationSlug: string; 
      ruleId: string; 
      data: Partial<AlertRuleInput>; 
    }) => updateAlertRule(organizationSlug, ruleId, data),
    
    onSuccess: (_, { organizationSlug, ruleId }) => {
      // Invalidate alert rule and list
      queryClient.invalidateQueries({ queryKey: alertsKeys.detail(organizationSlug, ruleId) });
      queryClient.invalidateQueries({ queryKey: alertsKeys.list(organizationSlug) });
    },
    
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to update alert rule',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
};

/**
 * Hook for deleting an alert rule
 * 
 * @returns Mutation for deleting an alert rule
 */
export const useDeleteAlertRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      organizationSlug, 
      ruleId 
    }: { 
      organizationSlug: string; 
      ruleId: string; 
    }) => deleteAlertRule(organizationSlug, ruleId),
    
    onSuccess: (_, { organizationSlug }) => {
      // Invalidate alert rules list
      queryClient.invalidateQueries({ queryKey: alertsKeys.list(organizationSlug) });
    },
    
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to delete alert rule',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    },
  });
};