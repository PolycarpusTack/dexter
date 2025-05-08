// frontend/src/utils/deadlockMockData.js

/**
 * Mock data for testing the Deadlock Analyzer Modal
 * 
 * This file provides sample deadlock events and analysis responses for development
 * and testing purposes. Import these in your components to quickly test the UI without
 * needing a backend.
 */

/**
 * Sample deadlock event with complete data structure
 */
export const sampleDeadlockEvent = {
  id: "deadlock-event-123",
  projectId: "project-1",
  project: {
    id: "project-1",
    name: "Backend API",
    slug: "backend-api",
  },
  title: "deadlock detected (40P01)",
  message: "ERROR: deadlock detected\n  Detail: Process 12345 waits for ShareLock on transaction 678; blocked by process 67890.\nProcess 67890 waits for ShareLock on transaction 901; blocked by process 12345.\n  Hint: See server log for query details.",
  level: "error",
  timestamp: new Date().toISOString(),
  tags: [
    { key: "server", value: "db-prod-3" },
    { key: "error_code", value: "40P01" },
    { key: "database", value: "users_db" },
    { key: "transaction_id", value: "tx-98765" },
  ],
  entries: [
    {
      type: "exception",
      data: {
        values: [
          {
            type: "DatabaseError",
            value: "ERROR: deadlock detected\n  Detail: Process 12345 waits for ShareLock on transaction 678; blocked by process 67890.\nProcess 67890 waits for ShareLock on transaction 901; blocked by process 12345.\n  Hint: See server log for query details."
          }
        ]
      }
    }
  ],
  exception: {
    values: [
      {
        type: "DatabaseError",
        value: "ERROR: deadlock detected\n  Detail: Process 12345 waits for ShareLock on transaction 678; blocked by process 67890.\nProcess 67890 waits for ShareLock on transaction 901; blocked by process 12345.\n  Hint: See server log for query details."
      }
    ]
  },
  contexts: {
    request: {
      url: "/api/users/update",
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    },
    user: {
      id: "user-456",
      email: "test@example.com",
      ip_address: "192.168.1.100"
    },
    db: {
      server: "db-prod-3",
      database: "users_db",
      transaction_id: "tx-98765"
    }
  }
};

/**
 * Sample deadlock analysis data - standard parser
 */
export const sampleDeadlockAnalysisStandard = {
  success: true,
  analysis: {
    timestamp: new Date().toISOString(),
    metadata: {
      execution_time_ms: 156,
      parser_version: "standard",
      cycles_found: 1
    },
    visualization_data: {
      processes: [
        {
          pid: 12345,
          applicationName: "backend-api",
          databaseName: "users_db",
          query: "UPDATE users SET last_login = NOW() WHERE id = 123",
          blockingPids: [67890],
          waitEventType: "Lock",
          waitEvent: "transactionid",
          tableName: "users",
          relation: 16384,
          lockType: "transactionid",
          lockMode: "ShareLock"
        },
        {
          pid: 67890,
          applicationName: "analytics-service",
          databaseName: "users_db",
          query: "UPDATE user_metrics SET login_count = login_count + 1 WHERE user_id = 123",
          blockingPids: [12345],
          waitEventType: "Lock",
          waitEvent: "transactionid",
          tableName: "user_metrics",
          relation: 16385,
          lockType: "transactionid",
          lockMode: "ShareLock"
        }
      ],
      relations: [
        {
          relationId: 16384,
          schema: "public",
          name: "users",
          lockingProcesses: [12345, 67890]
        },
        {
          relationId: 16385,
          schema: "public",
          name: "user_metrics",
          lockingProcesses: [67890, 12345]
        }
      ]
    },
    recommended_fix: "Consider the following solutions for this deadlock:\n\n1. Restructure transactions to access tables in a consistent order (users table first, then user_metrics).\n\n2. Use shorter transactions to reduce the likelihood of concurrent lock conflicts.\n\n3. Consider implementing retry logic with exponential backoff for transactions that encounter deadlocks."
  }
};

/**
 * Sample deadlock analysis data - enhanced parser
 */
export const sampleDeadlockAnalysisEnhanced = {
  success: true,
  analysis: {
    timestamp: new Date().toISOString(),
    metadata: {
      execution_time_ms: 287,
      parser_version: "enhanced-v2.1",
      cycles_found: 1,
      confidence_score: 0.89
    },
    visualization_data: {
      processes: [
        {
          pid: 12345,
          applicationName: "backend-api",
          databaseName: "users_db",
          query: "UPDATE users SET last_login = NOW() WHERE id = 123",
          blockingPids: [67890],
          waitEventType: "Lock",
          waitEvent: "transactionid",
          tableName: "users",
          relation: 16384,
          lockType: "transactionid",
          lockMode: "ShareLock",
          startTime: new Date(Date.now() - 5000).toISOString(),
          executionTimeMs: 4231,
          sessionUser: "api_user",
          clientAddr: "10.0.1.42",
          transactionStartTime: new Date(Date.now() - 6000).toISOString(),
          critical: true
        },
        {
          pid: 67890,
          applicationName: "analytics-service",
          databaseName: "users_db",
          query: "UPDATE user_metrics SET login_count = login_count + 1 WHERE user_id = 123",
          blockingPids: [12345],
          waitEventType: "Lock",
          waitEvent: "transactionid",
          tableName: "user_metrics",
          relation: 16385,
          lockType: "transactionid",
          lockMode: "ShareLock",
          startTime: new Date(Date.now() - 3000).toISOString(),
          executionTimeMs: 2789,
          sessionUser: "analytics_user",
          clientAddr: "10.0.1.56",
          transactionStartTime: new Date(Date.now() - 4000).toISOString(),
          critical: false
        }
      ],
      relations: [
        {
          relationId: 16384,
          schema: "public",
          name: "users",
          lockingProcesses: [12345, 67890],
          accessPattern: "UPDATE",
          totalRows: 1250000,
          estimatedImpact: "high",
          hasIndex: true,
          indexTypes: ["btree"]
        },
        {
          relationId: 16385,
          schema: "public",
          name: "user_metrics",
          lockingProcesses: [67890, 12345],
          accessPattern: "UPDATE",
          totalRows: 1250000,
          estimatedImpact: "medium",
          hasIndex: true,
          indexTypes: ["btree"]
        }
      ],
      deadlockChain: [
        {
          source: 12345,
          target: 67890,
          lockType: "transactionid",
          lockMode: "ShareLock",
          tableName: "users"
        },
        {
          source: 67890,
          target: 12345,
          lockType: "transactionid",
          lockMode: "ShareLock",
          tableName: "user_metrics"
        }
      ],
      pattern: {
        type: "circular_wait",
        commonality: "common",
        risk: "high"
      }
    },
    recommended_fix: "This deadlock is caused by a circular wait pattern between two transactions updating related tables (users and user_metrics) in different orders. Here are recommended solutions in priority order:\n\n1. **Enforce consistent access order**: Modify applications to always update tables in the same order (alphabetical: first user_metrics, then users).\n\n2. **Transaction isolation**: Lower isolation level for the analytics service to READ COMMITTED if possible.\n\n3. **Add application-level retry logic**: Implement automatic retry with exponential backoff when deadlocks are encountered.\n\n4. **Schema optimization**: Consider denormalizing the user_metrics into the users table if these updates frequently happen together.\n\n5. **Monitoring**: Create alerts for recurring deadlocks on these tables to detect patterns.\n\nBased on the observed lock patterns, solution #1 is likely to be the most effective with the lowest implementation risk."
  }
};

/**
 * List of sample events for testing the table implementation
 */
export const sampleEvents = [
  sampleDeadlockEvent,
  {
    id: "event-234",
    projectId: "project-1",
    title: "Division by zero in calculation service",
    message: "Error: Division by zero in calculation service at line 42",
    level: "error",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    tags: [
      { key: "service", value: "calculation-api" },
      { key: "component", value: "math-engine" }
    ]
  },
  {
    id: "event-345",
    projectId: "project-1",
    title: "API rate limit exceeded",
    message: "Warning: API rate limit exceeded for client client-55",
    level: "warning",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    tags: [
      { key: "service", value: "api-gateway" },
      { key: "client_id", value: "client-55" }
    ]
  },
  {
    id: "deadlock-event-456",
    projectId: "project-1",
    title: "deadlock detected (40P01)",
    message: "ERROR: deadlock detected\n  Detail: Process 22222 waits for ShareLock on transaction 333; blocked by process 44444.\nProcess 44444 waits for ShareLock on transaction 555; blocked by process 22222.\n  Hint: See server log for query details.",
    level: "error",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    tags: [
      { key: "server", value: "db-prod-1" },
      { key: "error_code", value: "40P01" },
      { key: "database", value: "orders_db" }
    ]
  },
  {
    id: "event-567",
    projectId: "project-1",
    title: "Cache invalidation failed",
    message: "Error: Failed to invalidate cache for product updates",
    level: "error",
    timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
    tags: [
      { key: "service", value: "cache-service" },
      { key: "component", value: "redis-client" }
    ]
  }
];

/**
 * Mock API response for event listing
 */
export const mockEventsResponse = {
  items: sampleEvents,
  totalCount: sampleEvents.length,
  page: 1,
  pageSize: 25
};

/**
 * Use this function to simulate API responses for testing
 */
export function mockDeadlockApi() {
  // Replace the actual API calls with mock implementations for testing
  jest.mock('../../api/enhancedDeadlockApi', () => ({
    analyzeDeadlock: (eventId, options) => {
      return Promise.resolve(
        options?.useEnhancedAnalysis 
          ? sampleDeadlockAnalysisEnhanced 
          : sampleDeadlockAnalysisStandard
      );
    },
    exportDeadlockSVG: (eventId, svgElement) => {
      console.log('Mock export SVG for event', eventId);
      return Promise.resolve({ success: true });
    }
  }));
  
  // Mock issues API
  jest.mock('../../api/issuesApi.ts', () => ({
    fetchIssuesList: () => Promise.resolve(mockEventsResponse)
  }));
}

/**
 * Example usage in tests:
 * 
 * import { mockDeadlockApi, sampleDeadlockEvent } from '../../utils/deadlockMockData';
 * 
 * describe('DeadlockModal', () => {
 *   beforeAll(() => {
 *     mockDeadlockApi();
 *   });
 *   
 *   test('renders correctly with sample data', () => {
 *     render(
 *       <DeadlockModal
 *         eventId={sampleDeadlockEvent.id}
 *         eventDetails={sampleDeadlockEvent}
 *         isOpen={true}
 *         onClose={() => {}}
 *       />
 *     );
 *     
 *     // Your assertions here
 *   });
 * });
 */
