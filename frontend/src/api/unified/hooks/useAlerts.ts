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
  list: (projectSlug: string) => [...alertsKeys.lists(), projectSlug] as const,
  details: () => [...alertsKeys.all, 'detail'] as const,
  detail: (projectSlug: string, ruleId: string, ruleType: string) => [
    ...alertsKeys.details(), projectSlug, ruleId, ruleType
  ] as const,
};

/**
 * Hook for fetching alert rules
 *
 * @param projectSlug - Project slug
 * @returns Query result with alert rules
 */
export const useAlertRules = (projectSlug: string) => {
  return useQuery({
    queryKey: alertsKeys.list(projectSlug),
    queryFn: () => getAlertRules(projectSlug),
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
 * @param projectSlug - Project slug
 * @param ruleId - Alert rule ID
 * @param ruleType - Rule type ('issue' | 'metric')
 * @returns Query result with alert rule
 */
export const useAlertRule = (projectSlug: string, ruleId: string, ruleType: 'issue' | 'metric') => {
  return useQuery({
    queryKey: alertsKeys.detail(projectSlug, ruleId, ruleType),
    queryFn: () => getAlertRule(projectSlug, ruleId, ruleType),
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
      projectSlug,
      data,
      ruleType
    }: {
      projectSlug: string;
      data: AlertRuleInput;
      ruleType: 'issue' | 'metric';
    }) => createAlertRule(projectSlug, data, ruleType),

    onSuccess: (_, { projectSlug }) => {
      // Invalidate alert rules list
      queryClient.invalidateQueries({ queryKey: alertsKeys.list(projectSlug) });
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
      projectSlug,
      ruleId,
      data,
      ruleType
    }: {
      projectSlug: string;
      ruleId: string;
      data: Partial<AlertRuleInput>;
      ruleType: 'issue' | 'metric';
    }) => updateAlertRule(projectSlug, ruleId, data, ruleType),

    onSuccess: (_, { projectSlug, ruleId, ruleType }) => {
      // Invalidate alert rule and list
      queryClient.invalidateQueries({ queryKey: alertsKeys.detail(projectSlug, ruleId, ruleType) });
      queryClient.invalidateQueries({ queryKey: alertsKeys.list(projectSlug) });
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
      projectSlug,
      ruleId,
      ruleType
    }: {
      projectSlug: string;
      ruleId: string;
      ruleType: 'issue' | 'metric';
    }) => deleteAlertRule(projectSlug, ruleId, ruleType),

    onSuccess: (_, { projectSlug }) => {
      // Invalidate alert rules list
      queryClient.invalidateQueries({ queryKey: alertsKeys.list(projectSlug) });
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