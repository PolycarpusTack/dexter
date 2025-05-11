# Alert Rules Management Implementation

## Overview

This implementation adds alert rule management capabilities to Dexter, allowing users to create, view, update, and delete both issue alerts and metric alerts through a visual interface.

## Backend Implementation

### API Router (`backend/app/routers/alerts.py`)
- Created endpoints following REST conventions:
  - `GET /api/v1/projects/{project}/rules` - List all alert rules
  - `POST /api/v1/projects/{project}/rules` - Create a new alert rule
  - `PUT /api/v1/projects/{project}/rules/{rule_id}` - Update an alert rule
  - `DELETE /api/v1/projects/{project}/rules/{rule_id}` - Delete an alert rule
  - `GET /api/v1/projects/{project}/rules/{rule_id}` - Get a specific alert rule

### SentryApiClient Extensions
- Added methods to interact with Sentry's alert rule APIs:
  - `list_issue_alert_rules()`
  - `list_metric_alert_rules()`
  - `create_issue_alert_rule()`
  - `create_metric_alert_rule()`
  - `update_issue_alert_rule()`
  - `update_metric_alert_rule()`
  - `delete_issue_alert_rule()`
  - `delete_metric_alert_rule()`
  - `get_issue_alert_rule()`
  - `get_metric_alert_rule()`

### Data Models
- Created Pydantic models for validation:
  - `IssueAlertRule` - Validates issue alert configurations
  - `MetricAlertRule` - Validates metric alert configurations
  - `AlertRuleCondition`, `AlertRuleFilter`, `AlertRuleAction` - Supporting models
  - `MetricAlertTrigger` - Trigger configuration for metric alerts

## Frontend Implementation

### API Client (`frontend/src/api/alertsApi.ts`)
- TypeScript interfaces matching backend models
- API client class with methods for all CRUD operations
- Proper error handling and type safety

### UI Components

#### Alert Rules List (`AlertRules.tsx`)
- Displays all alert rules in a table format
- Shows rule name, type, status, environment, and creation date
- Provides actions to edit and delete rules
- Includes a button to create new rules

#### Alert Rule Builder (`AlertRuleBuilder.tsx`)
- Visual form for creating/editing alert rules
- Tab-based interface for issue vs metric alerts
- Dynamic form fields based on selected conditions/actions
- Comprehensive validation before submission

### Key Features

1. **Issue Alert Rules**
   - Conditions: New issue created, issue regression, frequency thresholds
   - Filters: Age comparison, occurrence count, assignment status
   - Actions: Email, Slack, Teams, Discord, Jira, GitHub notifications
   - Configurable frequency and environment targeting

2. **Metric Alert Rules**
   - Metrics: Error count, user impact, crash rates, performance metrics
   - Time windows: 1 minute to 24 hours
   - Trigger levels: Critical and warning thresholds
   - Query filtering using Sentry search syntax
   - Resolve threshold configuration

3. **User Experience**
   - Visual rule builder with contextual form fields
   - Type-safe interfaces throughout the stack
   - Real-time validation and error feedback
   - Modal-based editing interface
   - Responsive design for mobile/desktop

### Integration

1. **Navigation**
   - Added "Alert Rules" to main navigation
   - Route: `/organizations/:org/projects/:project/alert-rules`
   - Disabled when no project is configured

2. **State Management**
   - Uses React Query for data fetching
   - Form state managed with Mantine's useForm
   - Notifications for success/error feedback

3. **Security**
   - All requests authenticated via backend
   - User permissions enforced by Sentry API
   - Input validation at both frontend and backend

## Usage

1. Navigate to Alert Rules from the main menu
2. Click "Create Alert Rule" to open the builder
3. Select rule type (Issue or Metric)
4. Configure conditions, filters, and actions
5. Save the rule
6. Manage existing rules from the main list

## Technical Notes

- Uses Sentry API exactly as specified in OpenAPI schema
- Follows Dexter's existing patterns for components and API integration
- Maintains backward compatibility with existing functionality
- Extensible design for future alert rule types

## Future Enhancements

1. **Advanced Features**
   - Rule templates for common scenarios
   - Bulk operations on multiple rules
   - Rule testing/preview functionality
   - Integration with more notification channels

2. **Analytics**
   - Alert rule performance metrics
   - False positive/negative tracking
   - Alert fatigue analysis

3. **Collaboration**
   - Rule ownership and permissions
   - Change history and audit logs
   - Team-based rule management
