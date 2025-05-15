/**
 * API Configuration
 * 
 * This file contains the configuration for the unified API client.
 * It defines API endpoints, categories, and path mappings.
 */

import { ApiConfig, HttpMethod } from './types';

/**
 * Get API base URL from environment or use default
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * API Configuration
 */
const apiConfig: ApiConfig = {
  baseUrl: API_BASE_URL,
  categories: {
    // Templates API
    templates: {
      basePath: '',
      endpoints: {
        list: {
          name: 'listTemplates',
          path: '/templates',
          method: HttpMethod.GET,
          description: 'List prompt templates',
          requiresAuth: true,
          cacheTTL: 300, // 5 minutes
        },
        detail: {
          name: 'getTemplate',
          path: '/templates/{template_id}',
          method: HttpMethod.GET,
          description: 'Get template details',
          requiresAuth: true,
          cacheTTL: 60, // 1 minute
        },
        create: {
          name: 'createTemplate',
          path: '/templates',
          method: HttpMethod.POST,
          description: 'Create a new template',
          requiresAuth: true,
        },
        update: {
          name: 'updateTemplate',
          path: '/templates/{template_id}',
          method: HttpMethod.PUT,
          description: 'Update a template',
          requiresAuth: true,
        },
        delete: {
          name: 'deleteTemplate',
          path: '/templates/{template_id}',
          method: HttpMethod.DELETE,
          description: 'Delete a template',
          requiresAuth: true,
        },
        render: {
          name: 'renderTemplate',
          path: '/templates/{template_id}/render',
          method: HttpMethod.POST,
          description: 'Render a template with variables',
          requiresAuth: true,
        },
        versions: {
          name: 'getTemplateVersions',
          path: '/templates/{template_id}/versions',
          method: HttpMethod.GET,
          description: 'Get all versions of a template',
          requiresAuth: true,
          cacheTTL: 300, // 5 minutes
        },
        defaults: {
          name: 'getDefaultTemplates',
          path: '/templates/categories/{category}/defaults',
          method: HttpMethod.GET,
          description: 'Get default templates for a category',
          requiresAuth: true,
          cacheTTL: 300, // 5 minutes
        },
        setDefault: {
          name: 'setTemplateAsDefault',
          path: '/templates/{template_id}/set-as-default',
          method: HttpMethod.POST,
          description: 'Set a template as the default for its category',
          requiresAuth: true,
        },
      },
    },
    
    // Issues API
    issues: {
      basePath: '/organizations/{organization_slug}/projects/{project_slug}',
      endpoints: {
        list: {
          name: 'listIssues',
          path: '/issues',
          method: HttpMethod.GET,
          description: 'List project issues',
          requiresAuth: true,
          cacheTTL: 300, // 5 minutes
        },
        detail: {
          name: 'getIssue',
          path: '/issues/{issue_id}',
          method: HttpMethod.GET,
          description: 'Get issue details',
          requiresAuth: true,
          cacheTTL: 60, // 1 minute
        },
        update: {
          name: 'updateIssue',
          path: '/issues/{issue_id}',
          method: HttpMethod.PUT,
          description: 'Update an issue',
          requiresAuth: true,
        },
        bulk: {
          name: 'bulkUpdateIssues',
          path: '/issues',
          method: HttpMethod.PUT,
          description: 'Bulk update issues',
          requiresAuth: true,
        },
        delete: {
          name: 'deleteIssue',
          path: '/issues/{issue_id}',
          method: HttpMethod.DELETE,
          description: 'Delete an issue',
          requiresAuth: true,
        },
        comments: {
          name: 'getIssueComments',
          path: '/issues/{issue_id}/comments',
          method: HttpMethod.GET,
          description: 'Get issue comments',
          requiresAuth: true,
          cacheTTL: 60, // 1 minute
        },
        addComment: {
          name: 'addIssueComment',
          path: '/issues/{issue_id}/comments',
          method: HttpMethod.POST,
          description: 'Add a comment to an issue',
          requiresAuth: true,
        },
      },
    },
    
    // Events API
    events: {
      basePath: '/organizations/{organization_slug}/projects/{project_slug}',
      endpoints: {
        list: {
          name: 'listEvents',
          path: '/events',
          method: HttpMethod.GET,
          description: 'List project events',
          requiresAuth: true,
          cacheTTL: 60, // 1 minute
        },
        detail: {
          name: 'getEvent',
          path: '/events/{event_id}',
          method: HttpMethod.GET,
          description: 'Get event details',
          requiresAuth: true,
          cacheTTL: 300, // 5 minutes
        },
        tags: {
          name: 'getEventTags',
          path: '/events/{event_id}/tags',
          method: HttpMethod.GET,
          description: 'Get event tags',
          requiresAuth: true,
          cacheTTL: 300, // 5 minutes
        },
      },
    },
    
    // Issue Events API
    issueEvents: {
      basePath: '/organizations/{organization_slug}',
      endpoints: {
        list: {
          name: 'listIssueEvents',
          path: '/issues/{issue_id}/events',
          method: HttpMethod.GET,
          description: 'List events for an issue',
          requiresAuth: true,
          cacheTTL: 60, // 1 minute
        },
        latest: {
          name: 'getLatestEvent',
          path: '/issues/{issue_id}/events/latest',
          method: HttpMethod.GET,
          description: 'Get latest event for an issue',
          requiresAuth: true,
          cacheTTL: 60, // 1 minute
        },
        oldest: {
          name: 'getOldestEvent',
          path: '/issues/{issue_id}/events/oldest',
          method: HttpMethod.GET,
          description: 'Get oldest event for an issue',
          requiresAuth: true,
          cacheTTL: 60, // 1 minute
        },
      },
    },
    
    // Discover API
    discover: {
      basePath: '/organizations/{organization_slug}',
      endpoints: {
        query: {
          name: 'discoverQuery',
          path: '/discover',
          method: HttpMethod.GET,
          description: 'Execute a Discover query',
          requiresAuth: true,
          cacheTTL: 60, // 1 minute
        },
        savedQueries: {
          name: 'getSavedQueries',
          path: '/discover/saved',
          method: HttpMethod.GET,
          description: 'Get saved Discover queries',
          requiresAuth: true,
          cacheTTL: 300, // 5 minutes
        },
        saveQuery: {
          name: 'saveQuery',
          path: '/discover/saved',
          method: HttpMethod.POST,
          description: 'Save a Discover query',
          requiresAuth: true,
        },
      },
    },
    
    // AI/Model API
    ai: {
      basePath: '',
      endpoints: {
        explainError: {
          name: 'explainError',
          path: '/ai/explain-error',
          method: HttpMethod.POST,
          description: 'Get AI explanation for an error',
          requiresAuth: true,
        },
        models: {
          name: 'getModels',
          path: '/ai/models',
          method: HttpMethod.GET,
          description: 'Get available AI models',
          requiresAuth: true,
          cacheTTL: 600, // 10 minutes
        },
      },
    },
    
    // Deadlock Analysis API
    analyzers: {
      basePath: '',
      endpoints: {
        analyzeDeadlock: {
          name: 'analyzeDeadlock',
          path: '/analyze-deadlock/{event_id}',
          method: HttpMethod.GET,
          description: 'Analyze a PostgreSQL deadlock error',
          requiresAuth: true,
          cacheTTL: 600, // 10 minutes
        },
      },
    },
    
    // Enhanced Analyzers API
    enhancedAnalyzers: {
      basePath: '',
      endpoints: {
        analyzeDeadlock: {
          name: 'analyzeDeadlockEnhanced',
          path: '/enhanced-analyzers/analyze-deadlock/{event_id}',
          method: HttpMethod.GET,
          description: 'Analyze a PostgreSQL deadlock with enhanced parser',
          requiresAuth: true,
          cacheTTL: 600, // 10 minutes
        },
        lockCompatibilityMatrix: {
          name: 'getLockCompatibilityMatrix',
          path: '/enhanced-analyzers/lock-compatibility-matrix',
          method: HttpMethod.GET,
          description: 'Get PostgreSQL lock compatibility matrix',
          requiresAuth: true,
          cacheTTL: 86400, // 24 hours
        },
      },
    },
    
    // Alert Rules API
    alerts: {
      basePath: '/organizations/{organization_slug}',
      endpoints: {
        listRules: {
          name: 'listAlertRules',
          path: '/alert-rules',
          method: HttpMethod.GET,
          description: 'List alert rules',
          requiresAuth: true,
          cacheTTL: 300, // 5 minutes
        },
        getRule: {
          name: 'getAlertRule',
          path: '/alert-rules/{rule_id}',
          method: HttpMethod.GET,
          description: 'Get alert rule details',
          requiresAuth: true,
          cacheTTL: 60, // 1 minute
        },
        createRule: {
          name: 'createAlertRule',
          path: '/alert-rules',
          method: HttpMethod.POST,
          description: 'Create an alert rule',
          requiresAuth: true,
        },
        updateRule: {
          name: 'updateAlertRule',
          path: '/alert-rules/{rule_id}',
          method: HttpMethod.PUT,
          description: 'Update an alert rule',
          requiresAuth: true,
        },
        deleteRule: {
          name: 'deleteAlertRule',
          path: '/alert-rules/{rule_id}',
          method: HttpMethod.DELETE,
          description: 'Delete an alert rule',
          requiresAuth: true,
        },
      },
    },
    
    // Config API
    config: {
      basePath: '',
      endpoints: {
        getConfig: {
          name: 'getConfig',
          path: '/config',
          method: HttpMethod.GET,
          description: 'Get application configuration',
          requiresAuth: false,
          cacheTTL: 300, // 5 minutes
        },
        updateConfig: {
          name: 'updateConfig',
          path: '/config',
          method: HttpMethod.PUT,
          description: 'Update application configuration',
          requiresAuth: true,
        },
      },
    },
    
    // Metrics API
    metrics: {
      basePath: '',
      endpoints: {
        modelMetrics: {
          name: 'getModelMetrics',
          path: '/metrics/models/{modelId}',
          method: HttpMethod.GET,
          description: 'Get performance metrics for a specific model',
          requiresAuth: true,
          cacheTTL: 60, // 1 minute
        },
        timeSeriesData: {
          name: 'getTimeSeriesData',
          path: '/metrics/models/{modelId}/series',
          method: HttpMethod.GET,
          description: 'Get time series data for a specific metric',
          requiresAuth: true,
          cacheTTL: 60, // 1 minute
        },
        compareModels: {
          name: 'compareModels',
          path: '/metrics/comparison',
          method: HttpMethod.GET,
          description: 'Compare metrics across multiple models',
          requiresAuth: true,
          cacheTTL: 60, // 1 minute
        },
        recordUsage: {
          name: 'recordUsage',
          path: '/metrics/record',
          method: HttpMethod.POST,
          description: 'Record usage metrics for a model',
          requiresAuth: true,
        },
      },
    },
  },
};

export default apiConfig;