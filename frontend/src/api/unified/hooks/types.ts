/**
 * API Hook Types
 * 
 * This file defines TypeScript interfaces for the API hooks.
 */

import { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// Common hook options
export interface ApiHookOptions<TData = unknown, TError = Error> 
  extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  // Additional hook options can be added here
}

// Common mutation hook options
export interface ApiMutationOptions<TData = unknown, TError = Error, TVariables = unknown> 
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  // Additional mutation hook options can be added here
}

// Pagination parameters for list queries
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

// Sort parameters for list queries
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// Filter parameters for list queries
export interface FilterParams {
  [key: string]: string | number | boolean | string[] | undefined;
}

// Common list query parameters
export interface ListQueryParams {
  pagination?: PaginationParams;
  sort?: SortParams[];
  filters?: FilterParams;
}

// Hook error types
export enum HookErrorType {
  FETCH = 'fetch_error',
  MUTATION = 'mutation_error',
  CACHE = 'cache_error',
  TIMEOUT = 'timeout_error',
  NETWORK = 'network_error',
  VALIDATION = 'validation_error',
  UNKNOWN = 'unknown_error'
}

// Hook error interface
export interface HookError extends Error {
  type: HookErrorType;
  data?: unknown;
  status?: number;
  originalError?: Error;
}