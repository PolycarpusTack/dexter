// Frontend API configuration
// This mirrors the YAML configuration structure from the backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiConfig = {
  // Base URL for all API endpoints
  baseUrl: API_BASE_URL,
  
  // API categories and endpoints
  categories: {
    // Issues API
    issues: {
      basePath: '/organizations/{organization_slug}/projects/{project_slug}',
      endpoints: {
        list: {
          path: '/issues',
          method: 'GET',
          description: 'List project issues'
        },
        detail: {
          path: '/issues/{issue_id}',
          method: 'GET',
          description: 'Get issue details'
        },
        update: {
          path: '/issues/{issue_id}',
          method: 'PUT',
          description: 'Update issue properties'
        },
        delete: {
          path: '/issues/{issue_id}',
          method: 'DELETE',
          description: 'Delete an issue'
        },
        bulk: {
          path: '/issues',
          method: 'PUT',
          description: 'Bulk update issues'
        }
      }
    },
    
    // Organization-level Issues API
    organization_issues: {
      basePath: '/organizations/{organization_slug}',
      endpoints: {
        list: {
          path: '/issues',
          method: 'GET',
          description: 'List organization issues across all projects'
        },
        assign: {
          path: '/issues/{issue_id}/assignee',
          method: 'PUT',
          description: 'Assign an issue to a user'
        },
        comments: {
          path: '/issues/{issue_id}/comments',
          method: 'GET',
          description: 'Get comments for an issue'
        },
        add_comment: {
          path: '/issues/{issue_id}/comments',
          method: 'POST',
          description: 'Add a comment to an issue'
        },
        export: {
          path: '/projects/{project_slug}/issues/export',
          method: 'GET',
          description: 'Export issues as CSV or JSON'
        }
      }
    },
    
    // Events API
    events: {
      basePath: '/organizations/{organization_slug}/projects/{project_slug}',
      endpoints: {
        list: {
          path: '/events',
          method: 'GET',
          description: 'List project events'
        },
        detail: {
          path: '/events/{event_id}',
          method: 'GET',
          description: 'Get event details'
        },
        tags: {
          path: '/tags',
          method: 'GET',
          description: 'Get available tags'
        },
        tag_values: {
          path: '/tags/{key}/values',
          method: 'GET',
          description: 'Get tag values'
        }
      }
    },
    
    // Issue Events API
    issue_events: {
      basePath: '/issues/{issue_id}',
      endpoints: {
        list: {
          path: '/events',
          method: 'GET',
          description: 'List events for an issue'
        },
        detail: {
          path: '/events/{event_id}',
          method: 'GET',
          description: 'Get a specific event for an issue'
        },
        latest: {
          path: '/events/latest',
          method: 'GET',
          description: 'Get latest event for an issue'
        },
        oldest: {
          path: '/events/oldest',
          method: 'GET',
          description: 'Get oldest event for an issue'
        },
        recommended: {
          path: '/events/recommended',
          method: 'GET',
          description: 'Get recommended event for an issue'
        }
      }
    },
    
    // Issue Alert Rules API
    issue_alert_rules: {
      basePath: '/projects/{organization_slug}/{project_slug}',
      endpoints: {
        list: {
          path: '/rules',
          method: 'GET',
          description: 'List issue alert rules for a project'
        },
        detail: {
          path: '/rules/{rule_id}',
          method: 'GET',
          description: 'Get issue alert rule details'
        },
        create: {
          path: '/rules',
          method: 'POST',
          description: 'Create a new issue alert rule'
        },
        update: {
          path: '/rules/{rule_id}',
          method: 'PUT',
          description: 'Update an issue alert rule'
        },
        delete: {
          path: '/rules/{rule_id}',
          method: 'DELETE',
          description: 'Delete an issue alert rule'
        }
      }
    },
    
    // Metric Alert Rules API
    metric_alert_rules: {
      basePath: '/organizations/{organization_slug}',
      endpoints: {
        list: {
          path: '/alert-rules',
          method: 'GET',
          description: 'List metric alert rules for an organization'
        },
        detail: {
          path: '/alert-rules/{rule_id}',
          method: 'GET',
          description: 'Get metric alert rule details'
        },
        create: {
          path: '/alert-rules',
          method: 'POST',
          description: 'Create a new metric alert rule'
        },
        update: {
          path: '/alert-rules/{rule_id}',
          method: 'PUT',
          description: 'Update a metric alert rule'
        },
        delete: {
          path: '/alert-rules/{rule_id}',
          method: 'DELETE',
          description: 'Delete a metric alert rule'
        }
      }
    },
    
    // Discover API
    discover: {
      basePath: '/organizations/{organization_slug}',
      endpoints: {
        query: {
          path: '/eventsv2',
          method: 'GET',
          description: 'Execute a Discover query'
        },
        saved_queries: {
          path: '/discover/saved',
          method: 'GET',
          description: 'Get saved Discover queries'
        },
        create_saved_query: {
          path: '/discover/saved',
          method: 'POST',
          description: 'Create a saved Discover query'
        },
        update_saved_query: {
          path: '/discover/saved/{query_id}',
          method: 'PUT',
          description: 'Update a saved Discover query'
        },
        delete_saved_query: {
          path: '/discover/saved/{query_id}',
          method: 'DELETE',
          description: 'Delete a saved Discover query'
        }
      }
    },
    
    // Analyzers API
    analyzers: {
      basePath: '',
      endpoints: {
        analyze_deadlock: {
          path: '/analyze-deadlock/{event_id}',
          method: 'GET',
          description: 'Analyze a PostgreSQL deadlock error'
        }
      }
    },
    
    // Enhanced Analyzers API
    enhanced_analyzers: {
      basePath: '',
      endpoints: {
        analyze_deadlock: {
          path: '/enhanced-analyzers/analyze-deadlock/{event_id}',
          method: 'GET',
          description: 'Analyze a PostgreSQL deadlock with enhanced parser'
        },
        lock_compatibility_matrix: {
          path: '/enhanced-analyzers/lock-compatibility-matrix',
          method: 'GET',
          description: 'Get PostgreSQL lock compatibility matrix'
        }
      }
    }
  }
};

export default apiConfig;
