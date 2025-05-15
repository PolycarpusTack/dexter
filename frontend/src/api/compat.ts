/**
 * API Compatibility Layer
 * 
 * This file provides backward compatibility with the old API client.
 * It should be used only during the migration period and removed once
 * all components have been migrated to the new unified API client.
 */

import { api } from './unified';
import { Issue, Event, AlertRule } from './unified/types';

type OldIssuesParams = {
  orgSlug?: string;
  organizationSlug?: string;
  projectSlug?: string;
  projectId?: string;
  query?: string;
  searchTerm?: string;
  status?: string;
  statusFilter?: string;
  cursor?: string;
  limit?: number;
};

type OldEventsParams = {
  orgSlug?: string;
  organizationSlug?: string;
  projectSlug?: string;
  projectId?: string;
  query?: string;
  searchTerm?: string;
  cursor?: string;
  limit?: number;
  sort?: string;
};

type OldDiscoverParams = {
  orgSlug?: string;
  organizationSlug?: string;
  query?: any;
};

type OldApiResponse<T> = {
  items?: T[];
  data?: T[];
  events?: T[];
  issues?: T[];
  pagination?: {
    next?: string;
    previous?: string;
    cursor?: string;
  };
};

// Issues API compatibility

export async function getIssues(params: OldIssuesParams): Promise<OldApiResponse<Issue>> {
  const response = await api.issues.getIssues({
    organizationSlug: params.orgSlug || params.organizationSlug || '',
    projectSlug: params.projectSlug || params.projectId || '',
    query: params.query || params.searchTerm,
    status: params.status || params.statusFilter,
    cursor: params.cursor,
    limit: params.limit
  });
  
  return {
    items: response.items,
    issues: response.items,
    pagination: response.pagination
  };
}

export async function getIssue(
  orgSlug: string,
  issueId: string,
  options?: any
): Promise<Issue> {
  return api.issues.getIssue(orgSlug, issueId, options);
}

export async function updateIssue(
  orgSlug: string,
  issueId: string,
  data: any,
  options?: any
): Promise<Issue> {
  return api.issues.updateIssue(orgSlug, issueId, data, options);
}

export async function resolveIssue(
  orgSlug: string,
  issueId: string,
  options?: any
): Promise<Issue> {
  return api.issues.resolveIssue(orgSlug, issueId, options);
}

export async function ignoreIssue(
  orgSlug: string,
  issueId: string,
  options?: any
): Promise<Issue> {
  return api.issues.ignoreIssue(orgSlug, issueId, options);
}

export async function assignIssue(
  orgSlug: string,
  issueId: string,
  assigneeId: string | null,
  options?: any
): Promise<Issue> {
  return api.issues.assignIssue(orgSlug, issueId, assigneeId, options);
}

// Events API compatibility

export async function getEvents(params: OldEventsParams): Promise<OldApiResponse<Event>> {
  const response = await api.events.getEvents({
    organizationSlug: params.orgSlug || params.organizationSlug || '',
    projectSlug: params.projectSlug || params.projectId || '',
    query: params.query || params.searchTerm,
    cursor: params.cursor,
    limit: params.limit,
    sort: params.sort
  });
  
  return {
    items: response.items,
    events: response.items,
    pagination: response.pagination
  };
}

export async function getEvent(
  orgSlug: string,
  projectSlug: string,
  eventId: string,
  options?: any
): Promise<Event> {
  return api.events.getEvent(orgSlug, projectSlug, eventId, options);
}

export async function getEventTags(
  orgSlug: string,
  projectSlug: string,
  eventId: string,
  options?: any
): Promise<Array<{ key: string; value: string }>> {
  return api.events.getEventTags(orgSlug, projectSlug, eventId, options);
}

export async function getRelatedEvents(
  orgSlug: string,
  issueId: string,
  options?: any
): Promise<OldApiResponse<Event>> {
  const response = await api.events.getRelatedEvents(orgSlug, issueId, options);
  
  return {
    items: response.items,
    events: response.items,
    pagination: response.pagination
  };
}

// Discover API compatibility

export async function executeDiscoverQuery(params: OldDiscoverParams): Promise<any> {
  return api.discover.executeQuery({
    organizationSlug: params.orgSlug || params.organizationSlug || '',
    query: params.query || {}
  });
}

export async function getSavedQueries(
  orgSlug: string,
  options?: any
): Promise<any[]> {
  const response = await api.discover.getSavedQueries({
    organizationSlug: orgSlug,
    options
  });
  
  return response;
}

// Alerts API compatibility

export async function getAlertRules(
  orgSlug: string,
  options?: any
): Promise<AlertRule[]> {
  return api.alerts.getAlertRules(orgSlug, options);
}

export async function getAlertRule(
  orgSlug: string,
  ruleId: string,
  options?: any
): Promise<AlertRule> {
  return api.alerts.getAlertRule(orgSlug, ruleId, options);
}

// AI API compatibility

export async function explainError(
  eventId?: string,
  issueId?: string,
  errorText?: string,
  modelId?: string,
  options?: any
): Promise<any> {
  if (eventId) {
    return api.ai.explainErrorByEventId(eventId, modelId, options);
  } else if (issueId) {
    return api.ai.explainErrorByIssueId(issueId, modelId, options);
  } else if (errorText) {
    return api.ai.explainErrorText(errorText, undefined, modelId, options);
  }
  
  throw new Error('At least one of eventId, issueId, or errorText must be provided');
}

export async function getModels(options?: any): Promise<any[]> {
  return api.ai.getModels(options);
}

// Export old API client interface
export const apiClient = {
  get: api.apiClient.get,
  post: api.apiClient.post,
  put: api.apiClient.put,
  delete: api.apiClient.delete,
  patch: api.apiClient.patch
};