# Dexter Integration Guide

## Overview

This document provides comprehensive information on integrating Dexter with Sentry and other systems. It consolidates multiple integration-related documents into a single reference.

## Table of Contents

1. [Sentry Integration](#sentry-integration)
2. [API Integration](#api-integration)
3. [Authentication and Authorization](#authentication-and-authorization)
4. [Webhook Integration](#webhook-integration)
5. [Notification Systems](#notification-systems)
6. [Data Export](#data-export)
7. [Third-Party Integrations](#third-party-integrations)
8. [Deployment Integration](#deployment-integration)

## Sentry Integration

### Basic Integration

Dexter integrates with Sentry through its API. The basic integration steps are:

1. **Create Sentry API Token**:
   - In Sentry, navigate to Settings > API Keys
   - Create a new API token with appropriate scopes
   - Note down the token value

2. **Configure Dexter**:
   - Set the Sentry API token in Dexter's configuration
   - Configure the Sentry organization and project settings

3. **Verify Connection**:
   - Test the connection to ensure API access works
   - Check that data is being retrieved correctly

### API Authentication

Dexter supports multiple authentication methods for Sentry:

1. **API Token** (preferred):
   ```
   Authorization: Bearer {token}
   ```

2. **OAuth 2.0**:
   - Register Dexter as an OAuth application in Sentry
   - Configure redirect URLs
   - Implement authorization code flow

### Data Synchronization

Dexter synchronizes the following data from Sentry:

1. **Issues**:
   - New and updated issues
   - Issue assignments and status changes
   - Comments and activity

2. **Events**:
   - Event details and metadata
   - Stack traces and context
   - Related events

3. **Projects and Teams**:
   - Project configuration
   - Team membership
   - Project settings

### Configuration Example

```typescript
// Example Sentry configuration
export const sentryConfig = {
  baseUrl: 'https://sentry.io/api/0/',
  organization: 'your-organization',
  project: 'your-project',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  refreshInterval: 60000, // 1 minute
  rateLimitPause: 5000, // 5 seconds
  maxRetries: 3,
};
```

## API Integration

### REST API Overview

Dexter exposes a REST API that allows other systems to integrate with it:

1. **Base URL**: `https://your-dexter-instance.com/api/v1/`

2. **Authentication**: JWT-based authentication with token endpoint at `/api/auth/token`

3. **Main Endpoints**:
   - `/api/issues` - Issue management
   - `/api/events` - Event details
   - `/api/deadlocks` - Deadlock analysis
   - `/api/reports` - Analytics and reporting
   - `/api/alerts` - Alert configuration

### API Client Generation

Dexter provides OpenAPI/Swagger documentation to facilitate client generation:

1. **Swagger Documentation**: Available at `/api/docs` or `/api/redoc`

2. **Client Generation**:
   ```bash
   # Generate TypeScript client
   openapi-generator-cli generate -i https://your-dexter-instance.com/api/openapi.json -g typescript-fetch -o ./client
   
   # Generate Python client
   openapi-generator-cli generate -i https://your-dexter-instance.com/api/openapi.json -g python -o ./python-client
   ```

### Example API Usage

```typescript
// JavaScript/TypeScript example
import { DexterClient } from 'dexter-client';

const client = new DexterClient({
  baseUrl: 'https://your-dexter-instance.com/api/v1',
  apiKey: 'your-api-key',
});

// Fetch issues
async function fetchIssues() {
  try {
    const issues = await client.issues.list({
      status: 'unresolved',
      limit: 100,
    });
    
    console.log(`Fetched ${issues.length} issues`);
    return issues;
  } catch (error) {
    console.error('Failed to fetch issues:', error);
    throw error;
  }
}
```

## Authentication and Authorization

### Authentication Methods

Dexter supports several authentication methods:

1. **JWT Tokens**:
   - Obtained via `/api/auth/token`
   - Included in `Authorization: Bearer {token}` header
   - Default expiration: 24 hours

2. **API Keys**:
   - Long-lived keys for service integration
   - Included in `X-API-Key: {key}` header
   - Configurable scopes and restrictions

3. **OAuth 2.0**:
   - For third-party integrations
   - Authorization code and client credentials flows
   - Scoped access to specific resources

### User Authorization

Dexter implements role-based access control (RBAC):

1. **Roles**:
   - Admin: Full system access
   - Manager: Manage issues and configurations
   - Developer: View and update issues
   - Viewer: Read-only access

2. **Permissions**:
   - Issues: create, read, update, delete
   - Events: read, export
   - Configuration: read, update
   - Users: manage

3. **Assignment**:
   - Roles assigned at user level
   - Permissions can be customized per-role
   - Special permissions can be granted individually

### Example Authorization Flow

```typescript
// Check if user has permission
function hasPermission(user, resource, action) {
  const userRoles = user.roles || [];
  const permissions = userRoles.flatMap(role => ROLE_PERMISSIONS[role] || []);
  
  return permissions.some(permission => 
    permission.resource === resource && 
    permission.actions.includes(action)
  );
}

// Usage
if (hasPermission(currentUser, 'issues', 'update')) {
  // Allow issue update
} else {
  // Show permission denied
}
```

## Webhook Integration

### Webhook Events

Dexter can send webhook notifications for various events:

1. **Issue Events**:
   - `issue.created`
   - `issue.updated`
   - `issue.resolved`
   - `issue.assigned`

2. **Alert Events**:
   - `alert.triggered`
   - `alert.resolved`

3. **System Events**:
   - `system.error`
   - `system.warning`

### Webhook Configuration

Configure webhooks in the Dexter admin interface:

1. **Endpoint URL**: The URL to send webhook payloads to
2. **Event Types**: Select which events to trigger the webhook
3. **Secret**: Shared secret for payload verification
4. **Retry Settings**: Configure retry behavior for failed deliveries

### Webhook Payload Format

```json
{
  "id": "evt_123456",
  "timestamp": "2023-05-15T14:32:10Z",
  "type": "issue.updated",
  "data": {
    "issue": {
      "id": "issue_789",
      "title": "Exception in ThreadPoolExecutor",
      "status": "resolved",
      "project": "backend-api",
      "url": "https://your-dexter-instance.com/issues/issue_789"
    },
    "changes": {
      "status": {
        "from": "unresolved",
        "to": "resolved"
      }
    }
  }
}
```

### Verifying Webhook Signatures

Webhook payloads include a signature for verification:

```typescript
// Example signature verification (Node.js)
import crypto from 'crypto';

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage in Express.js
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-dexter-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  handleWebhook(req.body);
  res.status(200).send('Webhook received');
});
```

## Notification Systems

### Email Notifications

Dexter can send email notifications for various events:

1. **Configuration**:
   ```yaml
   # Email configuration in backend
   email:
     smtp_server: smtp.example.com
     smtp_port: 587
     smtp_user: notifications@example.com
     smtp_password: ${SMTP_PASSWORD}
     from_address: dexter@example.com
     from_name: Dexter Notifications
   ```

2. **Notification Types**:
   - Issue alerts
   - Daily/weekly summaries
   - System status updates

3. **Customization**:
   - HTML templates in `backend/templates/email/`
   - User-configurable notification preferences

### Slack Integration

Dexter integrates with Slack for real-time notifications:

1. **Setup**:
   - Create Slack app
   - Add webhook URL or use Slack API
   - Configure permissions

2. **Features**:
   - Issue notifications with action buttons
   - Interactive alert responses
   - Command integration for queries

3. **Configuration Example**:
   ```yaml
   slack:
     webhook_url: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
     default_channel: #dexter-alerts
     notification_levels:
       - critical
       - error
   ```

### Microsoft Teams Integration

Dexter also supports Microsoft Teams integration:

1. **Configuration**:
   - Set up incoming webhook connector in Teams
   - Configure notification preferences

2. **Message Format**:
   - Adaptive Cards for rich interaction
   - Actionable notifications
   - Summary digests

## Data Export

### Export Formats

Dexter supports exporting data in several formats:

1. **CSV**: Tabular data for spreadsheet applications
2. **JSON**: Structured data for programmatic use
3. **PDF**: Formatted reports for sharing
4. **Excel**: Advanced spreadsheet format with multiple sheets

### Export API

Data can be exported programmatically via the API:

```typescript
// Example export API call
const response = await api.get('/api/export/issues', {
  params: {
    format: 'csv',
    filters: {
      status: 'unresolved',
      timerange: 'last7days',
    },
  },
  responseType: 'blob',
});

// Create download from response
const url = window.URL.createObjectURL(new Blob([response.data]));
const link = document.createElement('a');
link.href = url;
link.setAttribute('download', 'dexter-issues-export.csv');
document.body.appendChild(link);
link.click();
```

### Scheduled Exports

Configure scheduled exports for regular reporting:

1. **Setup**:
   - Configure in Admin > Scheduled Exports
   - Set frequency (daily, weekly, monthly)
   - Define export format and filters
   - Add recipients

2. **Delivery Methods**:
   - Email attachment
   - Upload to S3/cloud storage
   - Webhook delivery

## Third-Party Integrations

### Jira Integration

Dexter integrates with Jira for issue tracking:

1. **Configuration**:
   - Jira instance URL
   - API credentials
   - Project mapping

2. **Features**:
   - Create Jira issues from Dexter issues
   - Bi-directional status updates
   - Link Dexter issues to Jira issues

3. **Setup Example**:
   ```yaml
   jira:
     url: https://your-company.atlassian.net
     user: integration@example.com
     api_token: ${JIRA_API_TOKEN}
     project_mapping:
       backend-api: BACK
       frontend-app: FRONT
     issue_type_default: Bug
   ```

### GitHub Integration

Dexter integrates with GitHub for code context:

1. **Setup**:
   - GitHub OAuth application
   - Repository access configuration

2. **Features**:
   - Link issues to commits
   - Show code context for stack traces
   - Create pull requests from recommendations

3. **Configuration**:
   ```yaml
   github:
     api_url: https://api.github.com
     oauth:
       client_id: ${GITHUB_CLIENT_ID}
       client_secret: ${GITHUB_CLIENT_SECRET}
     repositories:
       - owner/repo1
       - owner/repo2
   ```

### PagerDuty Integration

Dexter can trigger PagerDuty incidents:

1. **Configuration**:
   - PagerDuty API key
   - Service mapping

2. **Features**:
   - Create incidents from critical issues
   - Bi-directional status updates
   - Custom alert routing

## Deployment Integration

### Docker Deployment

Dexter can be deployed using Docker:

1. **Docker Compose**:
   ```yaml
   version: '3'
   
   services:
     frontend:
       image: dexter/frontend:latest
       ports:
         - "80:80"
       environment:
         - API_URL=http://backend:8000
       depends_on:
         - backend
   
     backend:
       image: dexter/backend:latest
       ports:
         - "8000:8000"
       environment:
         - DB_HOST=postgres
         - DB_USER=dexter
         - DB_PASSWORD=${DB_PASSWORD}
         - SENTRY_TOKEN=${SENTRY_TOKEN}
       depends_on:
         - postgres
   
     postgres:
       image: postgres:14
       volumes:
         - postgres_data:/var/lib/postgresql/data
       environment:
         - POSTGRES_USER=dexter
         - POSTGRES_PASSWORD=${DB_PASSWORD}
         - POSTGRES_DB=dexter
   
   volumes:
     postgres_data:
   ```

2. **Environment Configuration**:
   Create a `.env` file with required secrets:
   ```
   DB_PASSWORD=secure_password
   SENTRY_TOKEN=your_sentry_token
   ```

### Kubernetes Deployment

Dexter can be deployed on Kubernetes:

1. **Helm Chart**:
   - Available in `deploy/helm/dexter`
   - Customizable values in `values.yaml`

2. **Configuration**:
   ```yaml
   # values.yaml
   replicaCount:
     frontend: 2
     backend: 3
   
   image:
     repository: dexter
     tag: 1.0.0
   
   ingress:
     enabled: true
     hosts:
       - dexter.example.com
   
   database:
     host: postgres.database.svc.cluster.local
     user: dexter
     existingSecret: dexter-db-credentials
     existingSecretKey: password
   
   sentry:
     token:
       existingSecret: dexter-sentry
       existingSecretKey: token
   ```

3. **Installation**:
   ```bash
   helm install dexter ./deploy/helm/dexter -f values.yaml
   ```

### CI/CD Integration

Dexter supports integration with CI/CD pipelines:

1. **GitHub Actions**:
   Example workflow in `.github/workflows/deploy.yml`

2. **Jenkins**:
   Example Jenkinsfile in `Jenkinsfile`

3. **GitLab CI**:
   Example configuration in `.gitlab-ci.yml`
