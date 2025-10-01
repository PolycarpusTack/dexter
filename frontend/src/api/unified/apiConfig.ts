/**
 * API Configuration for the unified API client
 */

import axios from 'axios';
import { ApiConfig, HttpMethod } from './types';
import { config } from '../../config/index.js';

// Use centralized config for API base URL
// If API_BASE_URL already ends with /api/v1, use it directly
// Otherwise, append /api/v1 (for local development)
const API_BASE_URL = config.API_BASE_URL.endsWith('/api/v1')
  ? config.API_BASE_URL
  : `${config.API_BASE_URL}/api/v1`;

// Create base API client instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: config.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: false // Set to false since CORS allows credentials but we're not using them
});

// Default API configuration
const apiConfig: ApiConfig = {
  baseUrl: API_BASE_URL,
  timeout: config.API_TIMEOUT,
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  endpoints: {
    // Add ai-enhanced category
    'ai-enhanced': {
      base: '/ai-enhanced',
      endpoints: {
        models: {
          path: '/models',
          method: HttpMethod.GET
        },
        pullModelEnhanced: {
          path: '/models/pull/{modelId}',
          method: HttpMethod.POST
        },
        selectModelEnhanced: {
          path: '/models/select',
          method: HttpMethod.POST
        },
        createFallbackChain: {
          path: '/fallback-chains',
          method: HttpMethod.POST
        },
        setDefaultFallbackChain: {
          path: '/fallback-chains/{chainId}/set-default',
          method: HttpMethod.POST
        },
        userPreferences: {
          path: '/user/{userId}/preferences',
          method: HttpMethod.GET
        },
        explainErrorEnhanced: {
          path: '/explain',
          method: HttpMethod.POST
        },
        providerConfig: {
          path: '/providers/{provider}/config',
          method: HttpMethod.POST
        },
        testConnection: {
          path: '/providers/{provider}/test-connection',
          method: HttpMethod.POST
        },
        getProviderAvailability: {
          path: '/providers/availability',
          method: HttpMethod.GET
        }
      }
    },
    issues: {
      base: '',
      endpoints: {
        list: {
          path: '/organizations/{organization_slug}/projects/{project_slug}/issues',
          method: HttpMethod.GET
        },
        get: {
          path: '/organizations/{organization_slug}/issues/{issue_id}',
          method: HttpMethod.GET
        },
        update: {
          path: '/organizations/{organization_slug}/issues/{issue_id}',
          method: HttpMethod.PUT
        },
        bulkUpdate: {
          path: '/issues/bulk',
          method: HttpMethod.POST
        }
      }
    },
    events: {
      base: '',
      endpoints: {
        list: {
          path: '/organizations/{organization_slug}/issues/{issue_id}/events',
          method: HttpMethod.GET
        },
        detail: {
          path: '/organizations/{organization_slug}/projects/{project_slug}/events/{event_id}',
          method: HttpMethod.GET
        },
        tags: {
          path: '/organizations/{organization_slug}/projects/{project_slug}/events/{event_id}/tags',
          method: HttpMethod.GET
        },
        latest: {
          path: '/organizations/{organization_slug}/issues/{issue_id}/latest-event',
          method: HttpMethod.GET
        }
      }
    },
    discover: {
      base: '/discover',
      endpoints: {
        query: {
          path: '/query',
          method: HttpMethod.POST
        },
        savedQueries: {
          path: '/saved',
          method: HttpMethod.GET
        },
        saveQuery: {
          path: '/saved',
          method: HttpMethod.POST
        }
      }
    },
    alerts: {
      base: '/projects/{project}/alerts',
      endpoints: {
        list: {
          path: '/rules',
          method: HttpMethod.GET
        },
        get: {
          path: '/rules/{id}',
          method: HttpMethod.GET
        },
        create: {
          path: '/rules',
          method: HttpMethod.POST
        },
        update: {
          path: '/rules/{id}',
          method: HttpMethod.PUT
        },
        delete: {
          path: '/rules/{id}',
          method: HttpMethod.DELETE
        }
      }
    },
    ai: {
      base: '/ai',
      endpoints: {
        models: {
          path: '/models',
          method: HttpMethod.GET
        },
        explain: {
          path: '/explain',
          method: HttpMethod.POST
        },
        pullModel: {
          path: '/models/pull/{model_name}',
          method: HttpMethod.POST
        },
        selectModel: {
          path: '/models/select',
          method: HttpMethod.POST
        },
        explainEvent: {
          path: '/explain/event/{id}',
          method: HttpMethod.GET
        },
        explainIssue: {
          path: '/explain/issue/{id}',
          method: HttpMethod.GET
        }
      }
    },
    analyzers: {
      base: '/analyzers',
      endpoints: {
        deadlock: {
          path: '/deadlock',
          method: HttpMethod.POST
        },
        analyze: {
          path: '/analyze',
          method: HttpMethod.POST
        }
      }
    },
    config: {
      base: '/config',
      endpoints: {
        get: {
          path: '/config',
          method: HttpMethod.GET
        },
        update: {
          path: '/config',
          method: HttpMethod.PUT
        },
        check: {
          path: '/config',
          method: HttpMethod.GET
        },
        health: {
          path: '/status',
          method: HttpMethod.GET
        }
      }
    }
  }
};

export default apiConfig;