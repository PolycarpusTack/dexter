/**
 * API Configuration for the unified API client
 */

import axios from 'axios';
import { ApiConfig, HttpMethod } from './types';

// Create base API client instance
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Default API configuration
const apiConfig: ApiConfig = {
  baseUrl: '/api',
  timeout: 30000,
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  endpoints: {
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
          path: '/',
          method: HttpMethod.GET
        },
        update: {
          path: '/',
          method: HttpMethod.PUT
        },
        check: {
          path: '/check',
          method: HttpMethod.GET
        },
        health: {
          path: '/health',
          method: HttpMethod.GET
        }
      }
    }
  }
};

export default apiConfig;