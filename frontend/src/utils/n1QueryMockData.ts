/**
 * Mock data for testing N+1 Query Analyzer
 */

import { BaseEvent } from '../types/events';

// Temporary type until we have the real N1QueryAnalysis type
interface N1QueryAnalysis {
  [key: string]: unknown;
}

/**
 * Sample N+1 query event
 */
export const sampleN1QueryEvent: Partial<BaseEvent> = {
  id: "n1-query-event-001",
  projectSlug: "backend-api",
  title: "Potential N+1 Query Pattern Detected",
  message: "Detected 101 similar queries executed in rapid succession",
  level: "warning",
  timestamp: new Date().toISOString(),
  tags: [
    { key: "server", value: "api-prod-2" },
    { key: "database", value: "postgres" },
    { key: "query_count", value: "101" },
    { key: "endpoint", value: "/api/users" },
    { key: "orm", value: "django" },
  ],
  entries: [
    {
      type: "breadcrumbs",
      data: {
        values: [
          {
            timestamp: new Date(Date.now() - 1000).toISOString(),
            type: "query",
            category: "database",
            message: "SELECT * FROM users LIMIT 100",
            data: {
              duration: 15,
              rows_returned: 100
            }
          },
          {
            timestamp: new Date(Date.now() - 900).toISOString(),
            type: "query",
            category: "database",
            message: "SELECT * FROM profiles WHERE user_id = 1",
            data: {
              duration: 5,
              rows_returned: 1
            }
          },
          {
            timestamp: new Date(Date.now() - 850).toISOString(),
            type: "query",
            category: "database",
            message: "SELECT * FROM profiles WHERE user_id = 2",
            data: {
              duration: 5,
              rows_returned: 1
            }
          }
        ]
      }
    }
  ],
  contexts: {
    trace: {
      trace_id: "abc123",
      span_id: "def456"
    }
  }
};

/**
 * Sample N+1 query analysis response
 */
export const sampleN1QueryAnalysis: N1QueryAnalysis = {
  event_id: "n1-query-event-001",
  pattern_type: "Classic N+1",
  detected_patterns: [
    {
      type: "N+1 Query",
      parent_query: {
        sql: "SELECT * FROM users LIMIT 100",
        duration_ms: 15,
        rows_returned: 100,
        timestamp: new Date(Date.now() - 1000).toISOString()
      },
      child_queries: [
        {
          sql: "SELECT * FROM profiles WHERE user_id = ?",
          count: 100,
          total_duration_ms: 500,
          avg_duration_ms: 5,
          sample_values: ["1", "2", "3", "4", "5"]
        },
        {
          sql: "SELECT * FROM user_settings WHERE user_id = ?",
          count: 100,
          total_duration_ms: 450,
          avg_duration_ms: 4.5,
          sample_values: ["1", "2", "3", "4", "5"]
        }
      ],
      total_queries: 201,
      total_duration_ms: 965,
      estimated_optimized_duration_ms: 25,
      performance_impact: "high",
      affected_endpoint: "/api/users",
      stack_trace: [
        {
          filename: "views.py",
          function: "get_users",
          lineno: 45,
          context: "users = User.objects.all()[:100]"
        },
        {
          filename: "serializers.py",
          function: "to_representation",
          lineno: 23,
          context: "profile = user.profile  # Triggers query"
        }
      ]
    }
  ],
  optimization_suggestions: [
    {
      type: "Use select_related",
      description: "Use select_related('profile') to fetch related profiles in a single query",
      example_code: "User.objects.select_related('profile').all()[:100]",
      estimated_improvement: "95% reduction in queries"
    },
    {
      type: "Use prefetch_related",
      description: "Use prefetch_related for many-to-many or reverse foreign key relationships",
      example_code: "User.objects.prefetch_related('settings').all()[:100]",
      estimated_improvement: "99% reduction in queries for related objects"
    },
    {
      type: "Add database indexes",
      description: "Consider adding an index on profiles.user_id for faster lookups",
      example_code: "CREATE INDEX idx_profiles_user_id ON profiles(user_id);",
      estimated_improvement: "20-30% faster query execution"
    }
  ],
  orm_specific_advice: {
    framework: "Django ORM",
    suggestions: [
      "Enable Django Debug Toolbar in development to catch N+1 queries early",
      "Use only() or defer() to limit fields fetched",
      "Consider using raw SQL or database views for complex queries"
    ]
  },
  impact_analysis: {
    current_performance: {
      total_queries: 201,
      total_duration_ms: 965,
      database_round_trips: 201
    },
    optimized_performance: {
      total_queries: 2,
      total_duration_ms: 25,
      database_round_trips: 2
    },
    improvement_percentage: 97.4
  },
  timestamp: new Date().toISOString()
};

/**
 * Multiple N+1 query events
 */
export const multipleN1QueryEvents: Partial<Event>[] = [
  sampleN1QueryEvent,
  {
    ...sampleN1QueryEvent,
    id: "n1-query-event-002",
    title: "N+1 Pattern in Order Processing",
    message: "Detected 250 similar queries for order items",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    tags: [
      { key: "query_count", value: "250" },
      { key: "endpoint", value: "/api/orders" },
      { key: "orm", value: "sqlalchemy" },
    ],
  },
  {
    ...sampleN1QueryEvent,
    id: "n1-query-event-003",
    title: "Nested N+1 Queries in Product Catalog",
    message: "Detected nested N+1 pattern with 1000+ queries",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    tags: [
      { key: "query_count", value: "1052" },
      { key: "endpoint", value: "/api/products" },
      { key: "orm", value: "eloquent" },
    ],
  }
];

/**
 * Function to generate mock N+1 query analysis
 */
export function generateMockN1QueryAnalysis(eventId: string): N1QueryAnalysis {
  return {
    ...sampleN1QueryAnalysis,
    event_id: eventId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Mock API functions for N+1 query testing
 */
export const mockN1QueryApi = {
  async analyzeN1Query(eventId: string): Promise<N1QueryAnalysis> {
    return new Promise(resolve => {
      setTimeout(() => resolve(generateMockN1QueryAnalysis(eventId)), 1500);
    });
  },
  
  async getN1QueryEvents(): Promise<Partial<Event>[]> {
    return new Promise(resolve => {
      setTimeout(() => resolve(multipleN1QueryEvents), 800);
    });
  },
  
  async getQueryPlan(sql: string): Promise<any> {
    // Mock query execution plan
    return new Promise(resolve => {
      setTimeout(() => resolve({
        plan: "Seq Scan on users  (cost=0.00..10.50 rows=100 width=8)",
        execution_time: 5.2,
        planning_time: 0.1
      }), 500);
    });
  }
};