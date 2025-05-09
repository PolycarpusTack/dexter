// File: src/hooks/useEventData.ts

import { useQuery } from '@tanstack/react-query';
import { fetchEventDetails } from '../api/eventsApi';
import { extractErrorType, extractErrorMessage, isDatabaseError } from '../utils/eventUtils';
import { extractTags, getPrioritizedTags } from '../utils/tagUtils';
import { SentryEvent } from '../types/deadlock';

/**
 * Hook for fetching and processing Sentry event data
 * 
 * @param eventId - Sentry event ID to fetch
 * @param projectId - Optional project ID
 * @returns Object with event data and utility functions
 */
export function useEventData(eventId: string, projectId?: string) {
  // Fetch event details query
  const {
    data: eventDetails,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['eventDetails', eventId, projectId],
    queryFn: () => fetchEventDetails(eventId, projectId),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
  
  // Extract tags from event data
  const tags = eventDetails ? extractTags(eventDetails) : [];
  const prioritizedTags = getPrioritizedTags(tags);
  
  // Extract common fields
  const errorType = eventDetails ? extractErrorType(eventDetails) : '';
  const errorMessage = eventDetails ? extractErrorMessage(eventDetails) : '';
  
  // Determine if it's a database error
  const isDbError = eventDetails ? isDatabaseError(eventDetails) : false;
  
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
