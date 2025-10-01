// File: src/hooks/useEventData.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '../api/unified';
import { extractErrorType, extractErrorMessage, isDatabaseError } from '../utils/eventUtils';
import { extractTags, getPrioritizedTags } from '../utils/tagUtils';
import { CACHE_STALE_TIME_5_MINUTES } from '../constants/timing';

/**
 * Hook for fetching and processing Sentry event data
 * 
 * @param eventId - Sentry event ID to fetch
 * @param projectSlug - Optional project slug
 * @returns Object with event data and utility functions
 */
export function useEventData(eventId: string, projectSlug?: string) {
  // Fetch event details query
  const {
    data: eventDetails,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['eventDetails', eventId, projectSlug],
    queryFn: () => api.events.getEventDetails({ eventId, projectSlug }),
    enabled: !!eventId,
    staleTime: CACHE_STALE_TIME_5_MINUTES,
    refetchOnWindowFocus: false
  });
  
  // Extract tags from event data with error handling
  let tags: Array<{ key: string; value: string }> = [];
  let prioritizedTags: Array<{ key: string; value: string }> = [];
  
  try {
    tags = eventDetails ? extractTags(eventDetails) : [];
    prioritizedTags = getPrioritizedTags(tags);
  } catch (error) {
    // Silently handle error and return empty arrays
    // Error logging can be enabled in development via logger utility
  }
  
  // Extract common fields with error handling
  let errorType = '';
  let errorMessage = '';
  let isDbError = false;
  
  try {
    errorType = eventDetails ? extractErrorType(eventDetails) : '';
  } catch (error) {
    // Default to 'Unknown Error' on extraction failure
    errorType = 'Unknown Error';
  }
  
  try {
    errorMessage = eventDetails ? extractErrorMessage(eventDetails) : '';
  } catch (error) {
    // Default error message on extraction failure
    errorMessage = 'Error message unavailable';
  }
  
  try {
    isDbError = eventDetails ? isDatabaseError(eventDetails) : false;
  } catch (error) {
    // Default to false on error
    isDbError = false;
  }
  
  return {
    eventDetails,
    isLoading,
    isError,
    error,
    refetch,
    tags: prioritizedTags,
    errorType,
    errorMessage,
    isDbError
  };
}

export default useEventData;
