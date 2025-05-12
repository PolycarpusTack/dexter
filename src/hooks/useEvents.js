/**
 * Events hooks for React components
 * 
 * This module provides React hooks for working with events data.
 */
import { useQuery } from 'react-query';
import { EventsApi } from '../api';

/**
 * Hook for fetching a list of events
 */
export const useEvents = (org, project, options = {}) => {
  const { 
    filters = {}, 
    enabled = true, 
    staleTime = 60000,  // 1 minute
    refetchInterval = false
  } = options;

  return useQuery(
    ['events', org, project, filters],
    () => EventsApi.getEvents(org, project, filters),
    {
      enabled,
      staleTime,
      refetchInterval,
      keepPreviousData: true
    }
  );
};

/**
 * Hook for fetching event details
 */
export const useEventDetails = (org, project, eventId, options = {}) => {
  const {
    enabled = Boolean(eventId),
    staleTime = 300000  // 5 minutes (events are immutable)
  } = options;

  return useQuery(
    ['event', org, project, eventId],
    () => EventsApi.getEventDetails(org, project, eventId),
    {
      enabled,
      staleTime
    }
  );
};

/**
 * Hook for fetching events for a specific issue
 */
export const useIssueEvents = (org, issueId, options = {}) => {
  const {
    filters = {},
    enabled = Boolean(issueId),
    staleTime = 60000,  // 1 minute
    refetchInterval = false
  } = options;

  return useQuery(
    ['issue-events', org, issueId, filters],
    () => EventsApi.getIssueEvents(org, issueId, filters),
    {
      enabled,
      staleTime,
      refetchInterval,
      keepPreviousData: true
    }
  );
};

/**
 * Hook for fetching the latest event for an issue
 */
export const useLatestEvent = (org, issueId, options = {}) => {
  const {
    enabled = Boolean(issueId),
    staleTime = 60000  // 1 minute
  } = options;

  return useQuery(
    ['latest-event', org, issueId],
    () => EventsApi.getLatestEvent(org, issueId),
    {
      enabled,
      staleTime
    }
  );
};

/**
 * Hook for fetching tag values for a project
 */
export const useTagValues = (org, project, tagKey, options = {}) => {
  const {
    filters = {},
    enabled = Boolean(tagKey),
    staleTime = 300000  // 5 minutes
  } = options;

  return useQuery(
    ['tag-values', org, project, tagKey, filters],
    () => EventsApi.getTagValues(org, project, tagKey, filters),
    {
      enabled,
      staleTime
    }
  );
};

/**
 * Hook for fetching the tag distribution
 */
export const useTagDistribution = (org, project, tagKey, options = {}) => {
  const {
    filters = {},
    enabled = Boolean(tagKey),
    staleTime = 300000  // 5 minutes
  } = options;

  return useQuery(
    ['tag-distribution', org, project, tagKey, filters],
    () => EventsApi.getTagDistribution(org, project, tagKey, filters),
    {
      enabled,
      staleTime
    }
  );
};

/**
 * Hook for fetching event stacktrace
 */
export const useEventStacktrace = (org, project, eventId, options = {}) => {
  const {
    enabled = Boolean(eventId),
    staleTime = 300000  // 5 minutes (stacktraces are immutable)
  } = options;

  return useQuery(
    ['event-stacktrace', org, project, eventId],
    () => EventsApi.getEventStacktrace(org, project, eventId),
    {
      enabled,
      staleTime
    }
  );
};
