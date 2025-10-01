# External API Integration

This document describes the External API Integration module in Dexter, which allows the application to seamlessly integrate with external APIs beyond Sentry and Ollama.

## Overview

The External API Integration module provides a flexible, robust framework for connecting Dexter to any third-party API. It includes comprehensive features for authentication, rate limiting, caching, error handling, and metrics tracking, making it easy to integrate and manage external services.

## Key Features

- **Multiple Authentication Methods**: Support for API keys, OAuth2, Bearer tokens, and Basic auth
- **Automatic Rate Limiting**: Adaptive rate limiting based on response headers or configurable fixed limits
- **Intelligent Caching**: Configurable response caching with separate TTLs for success and error responses
- **Comprehensive Error Handling**: Detailed error tracking with automatic retries and exponential backoff
- **Metrics and Monitoring**: Track request success rates, response times, and error distributions
- **YAML Configuration**: Simple YAML-based configuration files for API integrations
- **Dynamic Endpoint Management**: Configure and update API endpoints without code changes
- **Extensible Provider System**: Built-in support for common services like GitHub, Jira, GitLab, and more

## Supported Providers

The following API providers are supported out of the box:

- GitHub
- JIRA
- GitLab
- Bitbucket
- Slack
- Microsoft Teams
- Discord
- Generic REST APIs
- Custom provider implementations

## Authentication Types

The module supports the following authentication methods:

- **API Key**: Authentication via header or query parameter
- **OAuth2**: Token-based authentication with refresh capabilities
- **Bearer Token**: Standard Bearer token authentication
- **Basic Auth**: Username/password authentication
- **Custom**: Extensible authentication for specialized needs

## Configuration

API integrations are configured using YAML files stored in the `app/config/external_apis` directory. Each API has its own configuration file with the following structure:

```yaml
id: github-example
name: GitHub API Integration
provider: github
base_url: https://api.github.com
description: GitHub API for repository and issue management
status: active
enabled: true
version: "v3"
auth:
  type: bearer
  token: YOUR_TOKEN_HERE
default_timeout: 30.0
default_headers:
  Accept: application/vnd.github.v3+json
  User-Agent: Dexter-App/1.0
rate_limit:
  policy: adaptive
  requests_per_minute: 60
  header_limit_remaining: X-RateLimit-Remaining
  header_limit_reset: X-RateLimit-Reset
retry:
  max_retries: 3
  initial_delay: 1.0
  max_delay: 60.0
  backoff_factor: 2.0
endpoints:
  rate_limit:
    path: /rate_limit
    method: GET
    description: Get rate limit status
    test_endpoint: true
    cache_ttl: 60
  repos:
    path: /user/repos
    method: GET
    description: List user repositories
    cache_ttl: 300
```

## API Endpoints

The External API Integration module exposes the following REST endpoints:

- `GET /api/v1/external-apis`: List all configured API integrations
- `POST /api/v1/external-apis`: Create a new API integration
- `GET /api/v1/external-apis/{api_id}`: Get details of a specific API integration
- `PUT /api/v1/external-apis/{api_id}`: Update an API integration
- `DELETE /api/v1/external-apis/{api_id}`: Delete an API integration
- `GET /api/v1/external-apis/{api_id}/status`: Get status and metrics for an API
- `POST /api/v1/external-apis/{api_id}/test`: Test the connection to an API
- `POST /api/v1/external-apis/{api_id}/endpoints`: Configure endpoints for an API
- `POST /api/v1/external-apis/{api_id}/request`: Make a request to an external API
- `GET /api/v1/external-apis/providers`: List all supported providers
- `GET /api/v1/external-apis/auth-types`: List all supported authentication types

## Usage Examples

### Creating a New API Integration

```json
POST /api/v1/external-apis

{
  "name": "GitHub Issues",
  "provider": "github",
  "base_url": "https://api.github.com",
  "description": "GitHub API for issue tracking",
  "auth_type": "bearer",
  "token": "ghp_xxxxxxxxxxxx",
  "default_timeout": 30
}
```

### Making an API Request

```json
POST /api/v1/external-apis/github-example/request

{
  "endpoint": "repos",
  "method": "GET",
  "params": {
    "visibility": "public",
    "sort": "updated"
  },
  "headers": {
    "Accept": "application/vnd.github.v3+json"
  }
}
```

## Metrics and Monitoring

The External API Integration module tracks the following metrics for each API:

- **Total Requests**: Count of all requests made to the API
- **Successful Requests**: Count of successful requests (2xx status)
- **Failed Requests**: Count of failed requests (non-2xx status)
- **Success Rate**: Percentage of successful requests
- **Average Response Time**: Mean response time in milliseconds
- **Rate Limit Hits**: Count of rate limit (429) responses
- **Error Breakdown**: Counts of different error types

## Error Handling

The module includes comprehensive error handling features:

- **Automatic Retries**: Configurable retry strategy for failed requests
- **Exponential Backoff**: Increasing delays between retries
- **Rate Limit Handling**: Special handling for rate limit responses
- **Error Classification**: Categorization of errors for better reporting
- **Informative Error Messages**: Detailed error responses with actionable information

## Security Considerations

- API credentials are kept in memory and not logged or exposed in responses
- Authentication details are excluded from serialized configurations
- Sensitive headers are filtered from logs and stored responses
- All requests use HTTPS by default
- API keys and tokens can be provided via environment variables

## Performance Optimization

- Connection pooling for efficient request handling
- Response caching with configurable TTLs
- Batch request support for multiple operations
- Concurrent requests where appropriate
- Adaptive rate limiting to maximize throughput

## Extending the Module

The External API Integration module is designed to be extensible:

- **Custom Providers**: Add new provider types by extending the `ExternalAPIProvider` enum
- **Custom Authentication**: Implement specialized authentication methods
- **Custom Rate Limiting**: Create custom rate limiting policies
- **Integration with Internal Services**: Easily integrate with other Dexter services

## Troubleshooting

Common issues and solutions:

1. **Connection Failures**: Verify network connectivity and base URL
2. **Authentication Errors**: Check API credentials and authentication settings
3. **Rate Limiting**: Adjust rate limit policy and consider caching
4. **Timeouts**: Increase timeout settings for slow endpoints
5. **Parsing Errors**: Verify response format expectations

## Roadmap

Future enhancements planned for the External API Integration module:

1. **Webhook Support**: Add webhook registration and management
2. **API Schema Discovery**: Automatic endpoint discovery from OpenAPI specs
3. **Enhanced Metrics**: More detailed performance metrics and visualizations
4. **Integration Templates**: Pre-configured templates for common use cases
5. **Event-Driven Architecture**: Support for event-based integrations