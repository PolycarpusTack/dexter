# External API Integration

## Overview

This document describes the External API Integration feature of Dexter, which allows the application to connect with third-party services and APIs to enhance error analysis capabilities. This feature represents the final component of the AI & Integration epic (DEXTER-404).

## Architecture

The External API Integration system uses a plugin architecture to connect with various third-party APIs:

1. **Integration Registry** - Central registry that manages all available external integrations
2. **Provider Adapters** - Service-specific adapters that normalize external API interactions
3. **Authentication Manager** - Securely stores and manages API credentials
4. **Request Orchestrator** - Coordinates requests to multiple external services
5. **Response Transformer** - Normalizes responses from different providers

## Supported Integrations

| Service | Status | Capabilities | Authentication |
|---------|--------|--------------|----------------|
| GitHub | ✅ Complete | Code context, repository analysis | OAuth, Personal Access Token |
| Stack Overflow | ✅ Complete | Error pattern matching, solution lookup | OAuth |
| NPM/PyPI | ✅ Complete | Package vulnerability scanning | API Key |
| CircleCI/Jenkins | 🔄 In Progress | Build context, deployment info | API Key |
| Custom Webhooks | 🔄 In Progress | User-defined integrations | API Key, Basic Auth |

## Implementation Details

### Integration Registry

The Integration Registry serves as the central management system for all external integrations:

```typescript
// src/api/unified/externalApi.ts
export class IntegrationRegistry {
  private integrations: Map<string, IntegrationAdapter> = new Map();
  
  registerIntegration(name: string, adapter: IntegrationAdapter): void {
    this.integrations.set(name, adapter);
  }
  
  getIntegration(name: string): IntegrationAdapter | undefined {
    return this.integrations.get(name);
  }
  
  listIntegrations(): string[] {
    return Array.from(this.integrations.keys());
  }
  
  getEnabledIntegrations(): string[] {
    return Array.from(this.integrations.entries())
      .filter(([_, adapter]) => adapter.isEnabled())
      .map(([name]) => name);
  }
}
```

### Provider Adapters

Each external service has a dedicated adapter that normalizes its API:

```typescript
// src/api/unified/adapters/githubAdapter.ts
export class GitHubAdapter implements IntegrationAdapter {
  private client: Octokit;
  private enabled: boolean = false;
  
  constructor(config: GitHubConfig) {
    this.client = new Octokit({ auth: config.token });
    this.enabled = config.enabled;
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  async getCodeContext(file: string, lineNumber: number): Promise<CodeContext> {
    // Implementation details
  }
  
  async searchIssues(query: string): Promise<SearchResult[]> {
    // Implementation details
  }
}
```

### Authentication Manager

The Authentication Manager securely handles credentials for external services:

```typescript
// src/api/unified/auth/authManager.ts
export class AuthenticationManager {
  private store: SecureStore;
  
  constructor() {
    this.store = new SecureStore();
  }
  
  async getCredentials(service: string): Promise<Credentials> {
    return this.store.getCredentials(service);
  }
  
  async setCredentials(service: string, credentials: Credentials): Promise<void> {
    await this.store.setCredentials(service, credentials);
  }
  
  async hasCredentials(service: string): Promise<boolean> {
    return this.store.hasCredentials(service);
  }
}
```

## Integration with AI Features

The External API Integration works with the existing AI features in the following ways:

1. **Context Enrichment** - External APIs provide additional context for AI analysis
2. **Solution Retrieval** - Fetches potential solutions from external knowledge bases
3. **Vulnerability Detection** - Identifies known vulnerabilities in dependencies
4. **Trend Analysis** - Correlates errors with external systems like CI/CD

## Configuration

External integrations can be configured through the settings panel:

```json
{
  "externalIntegrations": {
    "github": {
      "enabled": true,
      "authType": "oauth",
      "repositories": ["org/repo1", "org/repo2"]
    },
    "stackoverflow": {
      "enabled": true,
      "tagsToSearch": ["javascript", "typescript", "react"]
    }
  }
}
```

## Usage Examples

### Fetching Related GitHub Issues

```typescript
// Example of using GitHub integration to find related issues
const githubIntegration = integrationRegistry.getIntegration('github');
if (githubIntegration && githubIntegration.isEnabled()) {
  const relatedIssues = await githubIntegration.searchIssues(
    `org:myOrg ${error.message}`
  );
  
  // Use the related issues in error analysis
  if (relatedIssues.length > 0) {
    console.log('Found related issues in GitHub:', relatedIssues);
  }
}
```

### Enriching Error Context with Package Information

```typescript
// Example of using NPM integration to check for package vulnerabilities
const npmIntegration = integrationRegistry.getIntegration('npm');
if (npmIntegration && npmIntegration.isEnabled()) {
  const packageInfo = await npmIntegration.getPackageInfo(
    packageName, version
  );
  
  if (packageInfo.vulnerabilities.length > 0) {
    console.log('Package has known vulnerabilities:', packageInfo.vulnerabilities);
  }
}
```

## Error Handling

External API integrations implement robust error handling to ensure Dexter remains functional even when external services are unavailable:

1. **Graceful Degradation** - Falls back to core functionality if external APIs fail
2. **Rate Limit Handling** - Implements backoff strategies for rate limited APIs
3. **Timeout Management** - Sets appropriate timeouts to prevent blocking operations
4. **Circuit Breaker Pattern** - Temporarily disables failing integrations

## Testing

External integrations include comprehensive testing strategies:

1. **Mock Adapters** - Test doubles that simulate external API responses
2. **Integration Tests** - End-to-end tests with real external APIs (using test accounts)
3. **Configuration Tests** - Verifies proper handling of configuration options
4. **Error Scenario Tests** - Tests behavior when external services fail

## Future Enhancements

Planned enhancements for External API Integration include:

1. **Integration Marketplace** - Allow users to discover and enable new integrations
2. **Custom Integration Builder** - UI for creating custom integrations without code
3. **Integration Analytics** - Track usage and performance of integrations
4. **Enhanced Authentication Options** - Support for additional authentication methods

## Last Updated

May 2025