/**
 * Configuration API Hooks
 * 
 * This file provides React Query hooks for interacting with the application configuration API.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  checkConfig, 
  getConfig, 
  updateConfig, 
  checkHealth,
  Config,
  ConfigParams,
  HealthStatus
} from '../configApi';

// Query keys
const QUERY_KEYS = {
  config: 'config',
  health: 'health'
};

/**
 * Hook for fetching application configuration
 * 
 * @param options - React Query options
 * @returns Query result with configuration
 */
export const useConfig = (options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.config],
    queryFn: () => getConfig({
      // Add error handling options to suppress API error notifications
      errorHandling: {
        suppressNotifications: true,
        logToConsole: false
      },
      retry: {
        maxRetries: 1
      }
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Limit retries for this query since it often 404s when backend is not running
    ...options
  });
};

/**
 * Hook for checking/validating configuration
 * 
 * @returns Mutation for checking configuration
 */
export const useCheckConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: ConfigParams) => checkConfig(config),
    onSuccess: () => {
      // Invalidate config query on successful check
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.config] });
    }
  });
};

/**
 * Hook for updating application configuration
 * 
 * @returns Mutation for updating configuration
 */
export const useUpdateConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: Partial<Config>) => updateConfig(config),
    onSuccess: () => {
      // Invalidate config query on successful update
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.config] });
    }
  });
};

/**
 * Hook for checking system health status
 * 
 * @param options - React Query options
 * @returns Query result with health status
 */
export const useHealthStatus = (options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.health],
    queryFn: () => checkHealth(),
    staleTime: 60 * 1000, // 1 minute
    ...options
  });
};

export default {
  useConfig,
  useCheckConfig,
  useUpdateConfig,
  useHealthStatus
};