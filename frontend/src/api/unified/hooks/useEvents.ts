/**
 * Events API Hook
 * 
 * This file provides React hooks for interacting with the Events API.
 * It uses React Query for data fetching and caching.
 */

import { useQuery } from '@tanstack/react-query';
import { 
  getEvents, 
  getEvent, 
  getEventTags, 
  getRelatedEvents, 
  getLatestEvent,
  FetchEventsOptions
} from '../eventsApi';
import { showErrorNotification } from '../errorHandler';

/**
 * Query key factory for events
 */
export const eventsKeys = {
  all: ['events'] as const,
  lists: () => [...eventsKeys.all, 'list'] as const,
  list: (filters: FetchEventsOptions) => [...eventsKeys.lists(), filters] as const,
  details: () => [...eventsKeys.all, 'detail'] as const,
  detail: (organizationSlug: string, projectSlug: string, eventId: string) => [
    ...eventsKeys.details(), organizationSlug, projectSlug, eventId
  ] as const,
  tags: (organizationSlug: string, projectSlug: string, eventId: string) => [
    ...eventsKeys.all, 'tags', organizationSlug, projectSlug, eventId
  ] as const,
  issueEvents: (organizationSlug: string, issueId: string) => [
    ...eventsKeys.all, 'issue', organizationSlug, issueId
  ] as const,
  latestEvent: (organizationSlug: string, issueId: string) => [
    ...eventsKeys.all, 'latest', organizationSlug, issueId
  ] as const,
};

/**
 * Hook for fetching events list
 * 
 * @param options - Fetch options
 * @returns Query result with events
 */
export const useEvents = (options: FetchEventsOptions) => {
  return useQuery({
    queryKey: eventsKeys.list(options),
    queryFn: () => getEvents(options),
    retry: 1,
    // Only refetch on window focus if data is stale
    refetchOnWindowFocus: true,
    // Keep data fresh for 1 minute
    staleTime: 60 * 1000,
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for fetching a single event
 * 
 * @param organizationSlug - Organization slug
 * @param projectSlug - Project slug
 * @param eventId - Event ID
 * @returns Query result with event
 */
export const useEvent = (organizationSlug: string, projectSlug: string, eventId: string) => {
  return useQuery({
    queryKey: eventsKeys.detail(organizationSlug, projectSlug, eventId),
    queryFn: () => getEvent(organizationSlug, projectSlug, eventId),
    // Don't fetch if we don't have an event ID
    enabled: !!eventId,
    // Only refetch on window focus if data is stale
    refetchOnWindowFocus: true,
    // Keep data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to fetch event details',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for fetching event tags
 * 
 * @param organizationSlug - Organization slug
 * @param projectSlug - Project slug
 * @param eventId - Event ID
 * @returns Query result with event tags
 */
export const useEventTags = (organizationSlug: string, projectSlug: string, eventId: string) => {
  return useQuery({
    queryKey: eventsKeys.tags(organizationSlug, projectSlug, eventId),
    queryFn: () => getEventTags(organizationSlug, projectSlug, eventId),
    // Don't fetch if we don't have an event ID
    enabled: !!eventId,
    // Only refetch on window focus if data is stale
    refetchOnWindowFocus: true,
    // Keep data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to fetch event tags',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for fetching related events for an issue
 * 
 * @param organizationSlug - Organization slug
 * @param issueId - Issue ID
 * @returns Query result with related events
 */
export const useRelatedEvents = (organizationSlug: string, issueId: string) => {
  return useQuery({
    queryKey: eventsKeys.issueEvents(organizationSlug, issueId),
    queryFn: () => getRelatedEvents(organizationSlug, issueId),
    // Don't fetch if we don't have an issue ID
    enabled: !!issueId,
    // Only refetch on window focus if data is stale
    refetchOnWindowFocus: true,
    // Keep data fresh for 1 minute
    staleTime: 60 * 1000,
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to fetch related events',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};

/**
 * Hook for fetching latest event for an issue
 * 
 * @param organizationSlug - Organization slug
 * @param issueId - Issue ID
 * @returns Query result with latest event
 */
export const useLatestEvent = (organizationSlug: string, issueId: string) => {
  return useQuery({
    queryKey: eventsKeys.latestEvent(organizationSlug, issueId),
    queryFn: () => getLatestEvent(organizationSlug, issueId),
    // Don't fetch if we don't have an issue ID
    enabled: !!issueId,
    // Only refetch on window focus if data is stale
    refetchOnWindowFocus: true,
    // Keep data fresh for 1 minute
    staleTime: 60 * 1000,
    onError: (error) => {
      showErrorNotification({
        title: 'Failed to fetch latest event',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : undefined,
      });
    }
  });
};