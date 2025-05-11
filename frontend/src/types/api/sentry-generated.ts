// Auto-generated from Sentry OpenAPI specification
// DO NOT EDIT MANUALLY

// Base types for Sentry API
export interface SentryError {
  detail: string;
  status?: number;
  errorId?: string;
}

export interface SentryPaginationParams {
  cursor?: string;
  per_page?: number;
}

export interface SentryDateParams {
  start?: string;
  end?: string;
  statsPeriod?: string;
}

export interface SentryBulkResponse<T> {
  successful: T[];
  failed: Array<{
    item: any;
    error: SentryError;
  }>;
}

// Common Sentry types based on actual API patterns
export interface SentryEvent {
  id: string;
  groupID?: string;
  eventID: string;
  projectID: string;
  title: string;
  message?: string;
  platform?: string;
  dateCreated: string;
  dateReceived: string;
  type: string;
  metadata?: Record<string, any>;
  tags: Array<{ key: string; value: string }>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
    ip_address?: string;
  };
  contexts?: Record<string, any>;
  entries?: any[];
}

export interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  permalink: string;
  status: 'resolved' | 'unresolved' | 'ignored';
  substatus?: 'archived' | 'escalating' | 'new' | 'ongoing' | 'regressed';
  isPublic: boolean;
  platform: string;
  project: {
    id: string;
    name: string;
    slug: string;
  };
  type: string;
  metadata: Record<string, any>;
  numComments: number;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  isBookmarked: boolean;
  hasSeen: boolean;
  annotations: string[];
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  stats: {
    [period: string]: Array<[number, number]>;
  };
}

export interface SentryProject {
  id: string;
  slug: string;
  name: string;
  platform?: string;
  dateCreated: string;
  isBookmarked: boolean;
  features: string[];
  status: string;
  firstEvent?: string;
  avatar?: {
    avatarType?: string;
    avatarUrl?: string;
  };
}

export interface SentryOrganization {
  id: string;
  slug: string;
  name: string;
  dateCreated: string;
  isEarlyAdopter: boolean;
  features: string[];
  status: {
    id: string;
    name: string;
  };
  avatar: {
    avatarType?: string;
    avatarUrl?: string;
  };
}

export interface SentryRelease {
  version: string;
  ref?: string;
  url?: string;
  dateCreated: string;
  dateReleased?: string;
  data: Record<string, any>;
  newGroups: number;
  owner?: string;
  commitCount: number;
  lastCommit?: {
    id: string;
    repository: {
      name: string;
      url: string;
    };
    message: string;
    dateCreated: string;
  };
  deployCount: number;
  lastDeploy?: {
    id: string;
    environment: string;
    dateStarted?: string;
    dateFinished: string;
  };
}

export interface CreateProjectIssueAlertRuleRequest {
  organization_slug: string;
  project_slug: string;
}

export interface CreateProjectIssueAlertRuleResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListProjectIssueAlertRulesRequest {
  organization_slug: string;
  project_slug: string;
}

export interface ListProjectIssueAlertRulesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface CreateOrgMetricAlertRuleRequest {
  organization_slug: string;
}

export interface CreateOrgMetricAlertRuleResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListOrgMetricAlertRulesRequest {
  organization_slug: string;
}

export interface ListOrgMetricAlertRulesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface CreateSpikeProtectionNotificationRequest {
  organization_slug: string;
}

export interface CreateSpikeProtectionNotificationResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListSpikeProtectionNotificationsRequest {
  organization_slug: string;
}

export interface ListSpikeProtectionNotificationsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteProjectIssueAlertRuleRequest {
  organization_slug: string;
  project_slug: string;
  rule_id: string;
}

export interface DeleteProjectIssueAlertRuleResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveProjectIssueAlertRuleRequest {
  organization_slug: string;
  project_slug: string;
  rule_id: string;
}

export interface RetrieveProjectIssueAlertRuleResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UpdateProjectIssueAlertRuleRequest {
  organization_slug: string;
  project_slug: string;
  rule_id: string;
}

export interface UpdateProjectIssueAlertRuleResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteSpikeProtectionNotificationRequest {
  organization_slug: string;
  action_id: string;
}

export interface DeleteSpikeProtectionNotificationResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveSpikeProtectionNotificationRequest {
  organization_slug: string;
  action_id: string;
}

export interface RetrieveSpikeProtectionNotificationResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface CreateSpikeProtectionNotificationCopyRequest {
  organization_slug: string;
  action_id: string;
}

export interface CreateSpikeProtectionNotificationCopyResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteMetricAlertRuleforOrganizationRequest {
  organization_slug: string;
  alert_rule_id: string;
}

export interface DeleteMetricAlertRuleforOrganizationResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveMetricAlertRuleforOrganizationRequest {
  organization_slug: string;
  alert_rule_id: string;
}

export interface RetrieveMetricAlertRuleforOrganizationResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UpdateOrgMetricAlertRuleRequest {
  organization_slug: string;
  alert_rule_id: string;
}

export interface UpdateOrgMetricAlertRuleResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface CreateSentryErrorRequest {
}

export interface CreateSentryErrorResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface QueryDiscoverEventsRequest {
  organization_slug: string;
}

export interface QueryDiscoverEventsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface BulkMutateListofIssuesRequest {
  organization_slug: string;
  project_slug: string;
}

export interface BulkMutateListofIssuesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface BulkRemoveListofIssuesRequest {
  organization_slug: string;
  project_slug: string;
}

export interface BulkRemoveListofIssuesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListProjectIssuesRequest {
  organization_slug: string;
  project_slug: string;
}

export interface ListProjectIssuesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListProjectEventsRequest {
  organization_slug: string;
  project_slug: string;
}

export interface ListProjectEventsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListTagValuesforIssueRequest {
}

export interface ListTagValuesforIssueResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListIssueEventsRequest {
}

export interface ListIssueEventsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface GetIssueHashesRequest {
}

export interface GetIssueHashesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteIssueRequest {
}

export interface DeleteIssueResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface GetIssueRequest {
}

export interface GetIssueResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UpdateIssueRequest {
}

export interface UpdateIssueResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveEventforProjectRequest {
  organization_slug: string;
  project_slug: string;
}

export interface RetrieveEventforProjectResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveTagDetailsRequest {
}

export interface RetrieveTagDetailsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveLatestEventforIssueRequest {
}

export interface RetrieveLatestEventforIssueResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveOldestEventforIssueRequest {
}

export interface RetrieveOldestEventforIssueResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListOrganizationsAvailableIntegrationsRequest {
  organization_slug: string;
}

export interface ListOrganizationsAvailableIntegrationsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface CreateExternalIssueRequest {
}

export interface CreateExternalIssueResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteExternalIssueRequest {
}

export interface DeleteExternalIssueResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListOrganizationIntegrationPlatformsRequest {
  organization_slug: string;
}

export interface ListOrganizationIntegrationPlatformsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteOrganizationMemberRequest {
  organization_slug: string;
}

export interface DeleteOrganizationMemberResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveOrganizationMemberRequest {
  organization_slug: string;
}

export interface RetrieveOrganizationMemberResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListRepositoryCommitsRequest {
  organization_slug: string;
}

export interface ListRepositoryCommitsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListOrganizationsProjectsRequest {
  organization_slug: string;
}

export interface ListOrganizationsProjectsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListOrganizationsRepositoriesRequest {
  organization_slug: string;
}

export interface ListOrganizationsRepositoriesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListOrganizationsUsersRequest {
  organization_slug: string;
}

export interface ListOrganizationsUsersResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListOrganizationsRequest {
}

export interface ListOrganizationsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ResolveShortIDRequest {
  organization_slug: string;
}

export interface ResolveShortIDResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ResolveEventIDRequest {
  organization_slug: string;
}

export interface ResolveEventIDResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveOrganizationRequest {
  organization_slug: string;
}

export interface RetrieveOrganizationResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UpdateOrganizationRequest {
  organization_slug: string;
}

export interface UpdateOrganizationResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveOrganizationEventsCountsRequest {
  organization_slug: string;
}

export interface RetrieveOrganizationEventsCountsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface CreateNewClientKeyRequest {
  organization_slug: string;
  project_slug: string;
}

export interface CreateNewClientKeyResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListProjectClientKeysRequest {
  organization_slug: string;
  project_slug: string;
}

export interface ListProjectClientKeysResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteClientKeyRequest {
  organization_slug: string;
  project_slug: string;
}

export interface DeleteClientKeyResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteProjectRequest {
  organization_slug: string;
  project_slug: string;
}

export interface DeleteProjectResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveProjectRequest {
  organization_slug: string;
  project_slug: string;
}

export interface RetrieveProjectResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UpdateProjectRequest {
  organization_slug: string;
  project_slug: string;
}

export interface UpdateProjectResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteProjectDebugInfoFileRequest {
  organization_slug: string;
  project_slug: string;
}

export interface DeleteProjectDebugInfoFileResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListProjectDebugInfoFilesRequest {
  organization_slug: string;
  project_slug: string;
}

export interface ListProjectDebugInfoFilesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UploadNewFileRequest {
  organization_slug: string;
  project_slug: string;
}

export interface UploadNewFileResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListProjectServiceHooksRequest {
  organization_slug: string;
  project_slug: string;
}

export interface ListProjectServiceHooksResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RegisterServiceHookRequest {
  organization_slug: string;
  project_slug: string;
}

export interface RegisterServiceHookResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListProjectUserFeedbackRequest {
  organization_slug: string;
  project_slug: string;
}

export interface ListProjectUserFeedbackResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface SubmitUserFeedbackRequest {
  organization_slug: string;
  project_slug: string;
}

export interface SubmitUserFeedbackResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface GetProjectUsersRequest {
  organization_slug: string;
  project_slug: string;
}

export interface GetProjectUsersResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface GetTagValuesRequest {
  organization_slug: string;
  project_slug: string;
}

export interface GetTagValuesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListProjectsRequest {
}

export interface ListProjectsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteServiceHookRequest {
  organization_slug: string;
  project_slug: string;
}

export interface DeleteServiceHookResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveServiceHookRequest {
  organization_slug: string;
  project_slug: string;
}

export interface RetrieveServiceHookResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UpdateServiceHookRequest {
  organization_slug: string;
  project_slug: string;
}

export interface UpdateServiceHookResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveProjectEventCountsRequest {
  organization_slug: string;
  project_slug: string;
}

export interface RetrieveProjectEventCountsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UpdateClientKeyRequest {
  organization_slug: string;
  project_slug: string;
}

export interface UpdateClientKeyResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface CreateaDeployRequest {
  organization_slug: string;
  version: string;
}

export interface CreateaDeployResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface CreateaReleaseRequest {
  organization_slug: string;
}

export interface CreateaReleaseResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListOrganizationReleasesRequest {
  organization_slug: string;
}

export interface ListOrganizationReleasesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteProjectReleaseFileRequest {
  organization_slug: string;
  project_slug: string;
}

export interface DeleteProjectReleaseFileResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteOrganizationReleaseFileRequest {
  organization_slug: string;
}

export interface DeleteOrganizationReleaseFileResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteOrganizationReleaseRequest {
  organization_slug: string;
}

export interface DeleteOrganizationReleaseResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveOrganizationReleasesRequest {
  organization_slug: string;
}

export interface RetrieveOrganizationReleasesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UpdateOrganizationReleaseRequest {
  organization_slug: string;
}

export interface UpdateOrganizationReleaseResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListProjectReleaseCommitsRequest {
  organization_slug: string;
  project_slug: string;
}

export interface ListProjectReleaseCommitsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListProjectReleaseFilesRequest {
  organization_slug: string;
  project_slug: string;
}

export interface ListProjectReleaseFilesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListReleaseDeploysRequest {
  organization_slug: string;
}

export interface ListReleaseDeploysResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListOrganizationReleasesCommitsRequest {
  organization_slug: string;
}

export interface ListOrganizationReleasesCommitsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListOrganizationReleasesFilesRequest {
  organization_slug: string;
}

export interface ListOrganizationReleasesFilesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UploadOrganizationReleaseFileRequest {
  organization_slug: string;
}

export interface UploadOrganizationReleaseFileResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListIssuesResolvedinaReleaseRequest {
  organization_slug: string;
  project_slug: string;
}

export interface ListIssuesResolvedinaReleaseResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveProjectReleaseFileRequest {
  organization_slug: string;
  project_slug: string;
}

export interface RetrieveProjectReleaseFileResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveOrganizationReleaseFileRequest {
  organization_slug: string;
}

export interface RetrieveOrganizationReleaseFileResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveFilesChangedinReleaseCommitRequest {
  organization_slug: string;
}

export interface RetrieveFilesChangedinReleaseCommitResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveReleaseHealthSessionStatisticsRequest {
  organization_slug: string;
}

export interface RetrieveReleaseHealthSessionStatisticsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UpdateProjectReleaseFileRequest {
  organization_slug: string;
  project_slug: string;
}

export interface UpdateProjectReleaseFileResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UpdateOrganizationReleaseFileRequest {
  organization_slug: string;
}

export interface UpdateOrganizationReleaseFileResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UploadProjectReleaseFileRequest {
  organization_slug: string;
  project_slug: string;
}

export interface UploadProjectReleaseFileResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteaReplayInstanceRequest {
  organization_slug: string;
  project_slug: string;
}

export interface DeleteaReplayInstanceResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveaReplayInstanceRequest {
  organization_slug: string;
  project_slug: string;
}

export interface RetrieveaReplayInstanceResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface FetchRecordingSegmentRequest {
  organization_slug: string;
  project_slug: string;
}

export interface FetchRecordingSegmentResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListanOrgReplaysRequest {
  organization_slug: string;
}

export interface ListanOrgReplaysResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListanOrgsSelectorsRequest {
  organization_slug: string;
}

export interface ListanOrgsSelectorsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListClickedNodesRequest {
  organization_slug: string;
  project_slug: string;
}

export interface ListClickedNodesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListRecordingSegmentsRequest {
  organization_slug: string;
  project_slug: string;
}

export interface ListRecordingSegmentsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ReturnOrgReplayCountRequest {
  organization_slug: string;
}

export interface ReturnOrgReplayCountResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ProvisionNewTeamRequest {
  organization_slug: string;
}

export interface ProvisionNewTeamResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListOrganizationsTeamsRequest {
  organization_slug: string;
}

export interface ListOrganizationsTeamsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface CreateNewProjectRequest {
  organization_slug: string;
}

export interface CreateNewProjectResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListTeamProjectsRequest {
  organization_slug: string;
}

export interface ListTeamProjectsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface CreateNewTeamRequest {
  organization_slug: string;
}

export interface CreateNewTeamResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface ListOrganizationTeamsRequest {
  organization_slug: string;
}

export interface ListOrganizationTeamsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface DeleteTeamRequest {
  organization_slug: string;
}

export interface DeleteTeamResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveTeamRequest {
  organization_slug: string;
}

export interface RetrieveTeamResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UpdateTeamRequest {
  organization_slug: string;
}

export interface UpdateTeamResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveTeamEventCountsRequest {
  organization_slug: string;
}

export interface RetrieveTeamEventCountsResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UpdateAlertRequest {
  organization_slug: string;
  project_slug: string;
}

export interface UpdateAlertResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface UpdateIssueOwnershipRulesRequest {
  organization_slug: string;
  project_slug: string;
}

export interface UpdateIssueOwnershipRulesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface RetrieveAllOrganizationIssuesRequest {
  organization_slug: string;
}

export interface RetrieveAllOrganizationIssuesResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}

export interface AddTeamtoProjectRequest {
  organization_slug: string;
}

export interface AddTeamtoProjectResponse {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}
