// File: src/hooks/useErrorHandler.ts

import { useCallback } from 'react';
import { createErrorHandler, ErrorHandlerOptions } from '../utils/errorHandling';

/**
 * Hook to create an error handler function
 * 
 * @param title - Error notification title
 * @param options - Error handler options
 * @returns Error handler function
 */
export function useErrorHandler(
  title: string,
  options: ErrorHandlerOptions = {}
): (error: unknown) => unknown {
  const handler = useCallback(
    createErrorHandler(title, options),
    [title, options.onError, options.logToSentry]
  );
  
  return handler;
}

export default useErrorHandler;
