/**
 * Hook for validated API calls
 * 
 * This hook wraps API calls with proper validation using Zod schemas
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { z } from 'zod';
import { showErrorNotification } from '@mantine/notifications';

interface UseValidatedApiOptions<T> {
  schema: z.ZodSchema<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  errorTitle?: string;
}

export function useValidatedApi<T, Args extends any[]>(
  apiCall: (...args: Args) => Promise<any>,
  options: UseValidatedApiOptions<T>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancel any ongoing request when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const execute = useCallback(async (...args: Args) => {
    // Cancel previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    if (!isMountedRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCall(...args);
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        return;
      }
      
      // Validate response with schema
      const validatedData = options.schema.parse(response);
      setData(validatedData);
      
      if (options.onSuccess) {
        options.onSuccess(validatedData);
      }
      
      return validatedData;
    } catch (err) {
      // Check if the error is due to aborted request
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setError(error);
        
        // Show error notification
        showErrorNotification({
          title: options.errorTitle || 'API Error',
          message: error.message,
        });
        
        if (options.onError) {
          options.onError(error);
        }
      }
      
      throw error;
    } finally {
      // Only update loading state if component is still mounted
      if (isMountedRef.current) {
        setLoading(false);
      }
      
      // Clear the abort controller reference
      abortControllerRef.current = null;
    }
  }, [apiCall, options]);

  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setData(null);
      setError(null);
      setLoading(false);
    }
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    reset
  };
}

// Example usage:
// const { execute, loading, data } = useValidatedApi(
//   api.events.getEvent,
//   {
//     schema: EventDetailsSchema,
//     errorTitle: 'Failed to load event'
//   }
// );