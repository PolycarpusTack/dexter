/**
 * API Configuration for the unified API client
 */

import axios from 'axios';
import { ApiConfig, HttpMethod } from './types';

// Get the API base URL from environment or use localhost:8000
const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Create base API client instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: false // Set to false since CORS allows credentials but we're not using them
});

// Default API configuration
const apiConfig: ApiConfig = {
  baseUrl: API_BASE_URL,
  timeout: 30000,
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
      base: '/issues',
      endpoints: {
        list: {
          path: '/',
          method: HttpMethod.GET
        },
        get: {
          path: '/{id}',
          method: HttpMethod.GET
        },
        update: {
          path: '/{id}',
          method: HttpMethod.PUT
        },
        bulkUpdate: {
          path: '/bulk',
          method: HttpMethod.POST
        }
      }
    },
    events: {
      base: '/events',
      endpoints: {
        list: {
          path: '/',
          method: HttpMethod.GET
        },
        get: {
          path: '/{id}',
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
      base: '/alerts',
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