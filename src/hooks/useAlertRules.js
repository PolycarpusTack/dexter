/**
 * Alert Rules hooks for React components
 * 
 * This module provides React hooks for working with Sentry's Alert Rules.
 */
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { AlertRulesApi } from '../api';

/**
 * Hook for fetching a list of alert rules
 */
export const useAlertRules = (org, project, options = {}) => {
  const {
    enabled = true,
    staleTime = 300000, // 5 minutes
    refetchInterval = false
  } = options;

  return useQuery(
    ['alert-rules', org, project],
    () => AlertRulesApi.getAlertRules(org, project),
    {
      enabled,
      staleTime,
      refetchInterval
    }
  );
};

/**
 * Hook for fetching alert rule details
 */
export const useAlertRuleDetails = (org, project, ruleId, options = {}) => {
  const {
    enabled = Boolean(ruleId),
    staleTime = 300000 // 5 minutes
  } = options;

  return useQuery(
    ['alert-rule', org, project, ruleId],
    () => AlertRulesApi.getAlertRuleDetails(org, project, ruleId),
    {
      enabled,
      staleTime
    }
  );
};

/**
 * Hook for creating an alert rule
 */
export const useCreateAlertRule = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ org, project, ruleData }) => AlertRulesApi.createAlertRule(org, project, ruleData),
    {
      onSuccess: (data, variables) => {
        // Invalidate alert rules list
        queryClient.invalidateQueries(['alert-rules', variables.org, variables.project]);
      }
    }
  );
};

/**
 * Hook for updating an alert rule
 */
export const useUpdateAlertRule = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ org, project, ruleId, ruleData }) => 
      AlertRulesApi.updateAlertRule(org, project, ruleId, ruleData),
    {
      onSuccess: (data, variables) => {
        // Invalidate specific alert rule
        queryClient.invalidateQueries([
          'alert-rule', 
          variables.org, 
          variables.project, 
          variables.ruleId
        ]);
        
        // Invalidate alert rules list
        queryClient.invalidateQueries(['alert-rules', variables.org, variables.project]);
      }
    }
  );
};

/**
 * Hook for deleting an alert rule
 */
export const useDeleteAlertRule = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ org, project, ruleId }) => AlertRulesApi.deleteAlertRule(org, project, ruleId),
    {
      onSuccess: (data, variables) => {
        // Invalidate alert rules list
        queryClient.invalidateQueries(['alert-rules', variables.org, variables.project]);
      }
    }
  );
};

/**
 * Hook for creating a threshold alert
 */
export const useCreateThresholdAlert = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ org, project, options }) => AlertRulesApi.createThresholdAlert(org, project, options),
    {
      onSuccess: (data, variables) => {
        // Invalidate alert rules list
        queryClient.invalidateQueries(['alert-rules', variables.org, variables.project]);
      }
    }
  );
};

/**
 * Hook for fetching alert rule triggers
 */
export const useAlertRuleTriggers = (org, project, ruleId, options = {}) => {
  const {
    timeRange = '24h',
    enabled = Boolean(ruleId),
    staleTime = 300000, // 5 minutes
    refetchInterval = false
  } = options;

  return useQuery(
    ['alert-rule-triggers', org, project, ruleId, timeRange],
    () => AlertRulesApi.getAlertRuleTriggers(org, project, ruleId, timeRange),
    {
      enabled,
      staleTime,
      refetchInterval
    }
  );
};

/**
 * Hook for testing an alert rule
 */
export const useTestAlertRule = () => {
  return useMutation(
    ({ org, project, ruleData }) => AlertRulesApi.testAlertRule(org, project, ruleData)
  );
};
