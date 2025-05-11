# Auto-generated from Sentry OpenAPI specification
# DO NOT EDIT MANUALLY

from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum


class SentryError(BaseModel):
    detail: str
    status: Optional[int] = None
    error_id: Optional[str] = Field(None, alias='errorId')


class SentryPaginationParams(BaseModel):
    cursor: Optional[str] = None
    per_page: Optional[int] = Field(None, alias='per_page', ge=1, le=100)


class SentryDateParams(BaseModel):
    start: Optional[str] = None
    end: Optional[str] = None
    stats_period: Optional[str] = Field(None, alias='statsPeriod')


class StatusEnum(str, Enum):
    RESOLVED = 'resolved'
    UNRESOLVED = 'unresolved'
    IGNORED = 'ignored'


class SubstatusEnum(str, Enum):
    ARCHIVED = 'archived'
    ESCALATING = 'escalating'
    NEW = 'new'
    ONGOING = 'ongoing'
    REGRESSED = 'regressed'


class User(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    ip_address: Optional[str] = None


class Project(BaseModel):
    id: str
    name: str
    slug: str


class SentryIssue(BaseModel):
    id: str
    title: str
    culprit: str
    permalink: str
    status: StatusEnum
    substatus: Optional[SubstatusEnum] = None
    is_public: bool = Field(..., alias='isPublic')
    platform: str
    project: Project
    type: str
    metadata: Dict[str, Any]
    num_comments: int = Field(..., alias='numComments')
    assigned_to: Optional[Dict[str, Any]] = Field(None, alias='assignedTo')
    is_bookmarked: bool = Field(..., alias='isBookmarked')
    has_seen: bool = Field(..., alias='hasSeen')
    annotations: List[str]
    count: str
    user_count: int = Field(..., alias='userCount')
    first_seen: str = Field(..., alias='firstSeen')
    last_seen: str = Field(..., alias='lastSeen')
    stats: Dict[str, List[List[int]]]


class SentryEvent(BaseModel):
    id: str
    group_id: Optional[str] = Field(None, alias='groupID')
    event_id: str = Field(..., alias='eventID')
    project_id: str = Field(..., alias='projectID')
    title: str
    message: Optional[str] = None
    platform: Optional[str] = None
    date_created: str = Field(..., alias='dateCreated')
    date_received: str = Field(..., alias='dateReceived')
    type: str
    metadata: Optional[Dict[str, Any]] = None
    tags: List[Dict[str, str]]
    user: Optional[User] = None
    contexts: Optional[Dict[str, Any]] = None
    entries: Optional[List[Any]] = None

class CreateProjectIssueAlertRuleRequest(BaseModel):
    organization_slug: str
    project_slug: str


class CreateProjectIssueAlertRuleResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListProjectIssueAlertRulesRequest(BaseModel):
    organization_slug: str
    project_slug: str


class ListProjectIssueAlertRulesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class CreateOrgMetricAlertRuleRequest(BaseModel):
    organization_slug: str


class CreateOrgMetricAlertRuleResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListOrgMetricAlertRulesRequest(BaseModel):
    organization_slug: str


class ListOrgMetricAlertRulesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class CreateSpikeProtectionNotificationRequest(BaseModel):
    organization_slug: str


class CreateSpikeProtectionNotificationResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListSpikeProtectionNotificationsRequest(BaseModel):
    organization_slug: str


class ListSpikeProtectionNotificationsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteProjectIssueAlertRuleRequest(BaseModel):
    organization_slug: str
    project_slug: str
    rule_id: str


class DeleteProjectIssueAlertRuleResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveProjectIssueAlertRuleRequest(BaseModel):
    organization_slug: str
    project_slug: str
    rule_id: str


class RetrieveProjectIssueAlertRuleResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UpdateProjectIssueAlertRuleRequest(BaseModel):
    organization_slug: str
    project_slug: str
    rule_id: str


class UpdateProjectIssueAlertRuleResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteSpikeProtectionNotificationRequest(BaseModel):
    organization_slug: str
    action_id: str


class DeleteSpikeProtectionNotificationResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveSpikeProtectionNotificationRequest(BaseModel):
    organization_slug: str
    action_id: str


class RetrieveSpikeProtectionNotificationResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class CreateSpikeProtectionNotificationCopyRequest(BaseModel):
    organization_slug: str
    action_id: str


class CreateSpikeProtectionNotificationCopyResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteMetricAlertRuleforOrganizationRequest(BaseModel):
    organization_slug: str
    alert_rule_id: str


class DeleteMetricAlertRuleforOrganizationResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveMetricAlertRuleforOrganizationRequest(BaseModel):
    organization_slug: str
    alert_rule_id: str


class RetrieveMetricAlertRuleforOrganizationResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UpdateOrgMetricAlertRuleRequest(BaseModel):
    organization_slug: str
    alert_rule_id: str


class UpdateOrgMetricAlertRuleResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class CreateSentryErrorRequest(BaseModel):
    pass


class CreateSentryErrorResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class QueryDiscoverEventsRequest(BaseModel):
    organization_slug: str


class QueryDiscoverEventsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class BulkMutateListofIssuesRequest(BaseModel):
    organization_slug: str
    project_slug: str


class BulkMutateListofIssuesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class BulkRemoveListofIssuesRequest(BaseModel):
    organization_slug: str
    project_slug: str


class BulkRemoveListofIssuesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListProjectIssuesRequest(BaseModel):
    organization_slug: str
    project_slug: str


class ListProjectIssuesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListProjectEventsRequest(BaseModel):
    organization_slug: str
    project_slug: str


class ListProjectEventsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListTagValuesforIssueRequest(BaseModel):
    pass


class ListTagValuesforIssueResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListIssueEventsRequest(BaseModel):
    pass


class ListIssueEventsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class GetIssueHashesRequest(BaseModel):
    pass


class GetIssueHashesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteIssueRequest(BaseModel):
    pass


class DeleteIssueResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class GetIssueRequest(BaseModel):
    pass


class GetIssueResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UpdateIssueRequest(BaseModel):
    pass


class UpdateIssueResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveEventforProjectRequest(BaseModel):
    organization_slug: str
    project_slug: str


class RetrieveEventforProjectResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveTagDetailsRequest(BaseModel):
    pass


class RetrieveTagDetailsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveLatestEventforIssueRequest(BaseModel):
    pass


class RetrieveLatestEventforIssueResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveOldestEventforIssueRequest(BaseModel):
    pass


class RetrieveOldestEventforIssueResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListOrganizationsAvailableIntegrationsRequest(BaseModel):
    organization_slug: str


class ListOrganizationsAvailableIntegrationsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class CreateExternalIssueRequest(BaseModel):
    pass


class CreateExternalIssueResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteExternalIssueRequest(BaseModel):
    pass


class DeleteExternalIssueResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListOrganizationIntegrationPlatformsRequest(BaseModel):
    organization_slug: str


class ListOrganizationIntegrationPlatformsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteOrganizationMemberRequest(BaseModel):
    organization_slug: str


class DeleteOrganizationMemberResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveOrganizationMemberRequest(BaseModel):
    organization_slug: str


class RetrieveOrganizationMemberResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListRepositoryCommitsRequest(BaseModel):
    organization_slug: str


class ListRepositoryCommitsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListOrganizationsProjectsRequest(BaseModel):
    organization_slug: str


class ListOrganizationsProjectsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListOrganizationsRepositoriesRequest(BaseModel):
    organization_slug: str


class ListOrganizationsRepositoriesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListOrganizationsUsersRequest(BaseModel):
    organization_slug: str


class ListOrganizationsUsersResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListOrganizationsRequest(BaseModel):
    pass


class ListOrganizationsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ResolveShortIDRequest(BaseModel):
    organization_slug: str


class ResolveShortIDResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ResolveEventIDRequest(BaseModel):
    organization_slug: str


class ResolveEventIDResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveOrganizationRequest(BaseModel):
    organization_slug: str


class RetrieveOrganizationResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UpdateOrganizationRequest(BaseModel):
    organization_slug: str


class UpdateOrganizationResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveOrganizationEventsCountsRequest(BaseModel):
    organization_slug: str


class RetrieveOrganizationEventsCountsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class CreateNewClientKeyRequest(BaseModel):
    organization_slug: str
    project_slug: str


class CreateNewClientKeyResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListProjectClientKeysRequest(BaseModel):
    organization_slug: str
    project_slug: str


class ListProjectClientKeysResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteClientKeyRequest(BaseModel):
    organization_slug: str
    project_slug: str


class DeleteClientKeyResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteProjectRequest(BaseModel):
    organization_slug: str
    project_slug: str


class DeleteProjectResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveProjectRequest(BaseModel):
    organization_slug: str
    project_slug: str


class RetrieveProjectResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UpdateProjectRequest(BaseModel):
    organization_slug: str
    project_slug: str


class UpdateProjectResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteProjectDebugInfoFileRequest(BaseModel):
    organization_slug: str
    project_slug: str


class DeleteProjectDebugInfoFileResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListProjectDebugInfoFilesRequest(BaseModel):
    organization_slug: str
    project_slug: str


class ListProjectDebugInfoFilesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UploadNewFileRequest(BaseModel):
    organization_slug: str
    project_slug: str


class UploadNewFileResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListProjectServiceHooksRequest(BaseModel):
    organization_slug: str
    project_slug: str


class ListProjectServiceHooksResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RegisterServiceHookRequest(BaseModel):
    organization_slug: str
    project_slug: str


class RegisterServiceHookResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListProjectUserFeedbackRequest(BaseModel):
    organization_slug: str
    project_slug: str


class ListProjectUserFeedbackResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class SubmitUserFeedbackRequest(BaseModel):
    organization_slug: str
    project_slug: str


class SubmitUserFeedbackResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class GetProjectUsersRequest(BaseModel):
    organization_slug: str
    project_slug: str


class GetProjectUsersResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class GetTagValuesRequest(BaseModel):
    organization_slug: str
    project_slug: str


class GetTagValuesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListProjectsRequest(BaseModel):
    pass


class ListProjectsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteServiceHookRequest(BaseModel):
    organization_slug: str
    project_slug: str


class DeleteServiceHookResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveServiceHookRequest(BaseModel):
    organization_slug: str
    project_slug: str


class RetrieveServiceHookResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UpdateServiceHookRequest(BaseModel):
    organization_slug: str
    project_slug: str


class UpdateServiceHookResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveProjectEventCountsRequest(BaseModel):
    organization_slug: str
    project_slug: str


class RetrieveProjectEventCountsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UpdateClientKeyRequest(BaseModel):
    organization_slug: str
    project_slug: str


class UpdateClientKeyResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class CreateaDeployRequest(BaseModel):
    organization_slug: str
    {version: str


class CreateaDeployResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class CreateaReleaseRequest(BaseModel):
    organization_slug: str


class CreateaReleaseResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListOrganizationReleasesRequest(BaseModel):
    organization_slug: str


class ListOrganizationReleasesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteProjectReleaseFileRequest(BaseModel):
    organization_slug: str
    project_slug: str


class DeleteProjectReleaseFileResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteOrganizationReleaseFileRequest(BaseModel):
    organization_slug: str


class DeleteOrganizationReleaseFileResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteOrganizationReleaseRequest(BaseModel):
    organization_slug: str


class DeleteOrganizationReleaseResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveOrganizationReleasesRequest(BaseModel):
    organization_slug: str


class RetrieveOrganizationReleasesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UpdateOrganizationReleaseRequest(BaseModel):
    organization_slug: str


class UpdateOrganizationReleaseResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListProjectReleaseCommitsRequest(BaseModel):
    organization_slug: str
    project_slug: str


class ListProjectReleaseCommitsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListProjectReleaseFilesRequest(BaseModel):
    organization_slug: str
    project_slug: str


class ListProjectReleaseFilesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListReleaseDeploysRequest(BaseModel):
    organization_slug: str


class ListReleaseDeploysResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListOrganizationReleasesCommitsRequest(BaseModel):
    organization_slug: str


class ListOrganizationReleasesCommitsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListOrganizationReleasesFilesRequest(BaseModel):
    organization_slug: str


class ListOrganizationReleasesFilesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UploadOrganizationReleaseFileRequest(BaseModel):
    organization_slug: str


class UploadOrganizationReleaseFileResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListIssuesResolvedinaReleaseRequest(BaseModel):
    organization_slug: str
    project_slug: str


class ListIssuesResolvedinaReleaseResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveProjectReleaseFileRequest(BaseModel):
    organization_slug: str
    project_slug: str


class RetrieveProjectReleaseFileResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveOrganizationReleaseFileRequest(BaseModel):
    organization_slug: str


class RetrieveOrganizationReleaseFileResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveFilesChangedinReleaseCommitRequest(BaseModel):
    organization_slug: str


class RetrieveFilesChangedinReleaseCommitResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveReleaseHealthSessionStatisticsRequest(BaseModel):
    organization_slug: str


class RetrieveReleaseHealthSessionStatisticsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UpdateProjectReleaseFileRequest(BaseModel):
    organization_slug: str
    project_slug: str


class UpdateProjectReleaseFileResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UpdateOrganizationReleaseFileRequest(BaseModel):
    organization_slug: str


class UpdateOrganizationReleaseFileResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UploadProjectReleaseFileRequest(BaseModel):
    organization_slug: str
    project_slug: str


class UploadProjectReleaseFileResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteaReplayInstanceRequest(BaseModel):
    organization_slug: str
    project_slug: str


class DeleteaReplayInstanceResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveaReplayInstanceRequest(BaseModel):
    organization_slug: str
    project_slug: str


class RetrieveaReplayInstanceResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class FetchRecordingSegmentRequest(BaseModel):
    organization_slug: str
    project_slug: str


class FetchRecordingSegmentResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListanOrgReplaysRequest(BaseModel):
    organization_slug: str


class ListanOrgReplaysResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListanOrgsSelectorsRequest(BaseModel):
    organization_slug: str


class ListanOrgsSelectorsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListClickedNodesRequest(BaseModel):
    organization_slug: str
    project_slug: str


class ListClickedNodesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListRecordingSegmentsRequest(BaseModel):
    organization_slug: str
    project_slug: str


class ListRecordingSegmentsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ReturnOrgReplayCountRequest(BaseModel):
    organization_slug: str


class ReturnOrgReplayCountResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ProvisionNewTeamRequest(BaseModel):
    organization_slug: str


class ProvisionNewTeamResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListOrganizationsTeamsRequest(BaseModel):
    organization_slug: str


class ListOrganizationsTeamsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class CreateNewProjectRequest(BaseModel):
    organization_slug: str


class CreateNewProjectResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListTeamProjectsRequest(BaseModel):
    organization_slug: str


class ListTeamProjectsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class CreateNewTeamRequest(BaseModel):
    organization_slug: str


class CreateNewTeamResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class ListOrganizationTeamsRequest(BaseModel):
    organization_slug: str


class ListOrganizationTeamsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class DeleteTeamRequest(BaseModel):
    organization_slug: str


class DeleteTeamResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveTeamRequest(BaseModel):
    organization_slug: str


class RetrieveTeamResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UpdateTeamRequest(BaseModel):
    organization_slug: str


class UpdateTeamResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveTeamEventCountsRequest(BaseModel):
    organization_slug: str


class RetrieveTeamEventCountsResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UpdateAlertRequest(BaseModel):
    organization_slug: str
    project_slug: str


class UpdateAlertResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class UpdateIssueOwnershipRulesRequest(BaseModel):
    organization_slug: str
    project_slug: str


class UpdateIssueOwnershipRulesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class RetrieveAllOrganizationIssuesRequest(BaseModel):
    organization_slug: str


class RetrieveAllOrganizationIssuesResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None

class AddTeamtoProjectRequest(BaseModel):
    organization_slug: str


class AddTeamtoProjectResponse(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None
