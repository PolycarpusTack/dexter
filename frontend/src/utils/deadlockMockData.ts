/**
 * Mock data for testing the Deadlock Analyzer Modal
 * 
 * This file provides sample deadlock events and analysis responses for development
 * and testing purposes. Import these in your components to quickly test the UI without
 * needing a backend.
 */

import { BaseEvent } from '../types/events';
import { DeadlockAnalysis } from '../types/deadlock';

/**
 * Sample deadlock event with complete data structure
 */
export const sampleDeadlockEvent: Partial<BaseEvent> = {
  id: "deadlock-event-123",
  projectSlug: "backend-api",
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
  }
};

/**
 * Sample deadlock analysis response
 */
export const sampleDeadlockAnalysis: DeadlockAnalysis = {
  event_id: "deadlock-event-123",
  deadlock_type: "PostgreSQL Deadlock",
  transactions: [
    {
      process_id: "12345",
      transaction_id: "678",
      waiting_for: "ShareLock",
      blocked_by: "67890",
      query: "UPDATE users SET last_active = NOW() WHERE id = 123",
      start_time: new Date(Date.now() - 5000).toISOString(),
      wait_duration: 5000,
      application: "web-api",
      client_info: {
        host: "10.0.1.45",
        port: 54321,
        user: "app_user"
      }
    },
    {
      process_id: "67890",
      transaction_id: "901",
      waiting_for: "ShareLock",
      blocked_by: "12345",
      query: "UPDATE user_profiles SET updated_at = NOW() WHERE user_id = 123",
      start_time: new Date(Date.now() - 4000).toISOString(),
      wait_duration: 4000,
      application: "web-api",
      client_info: {
        host: "10.0.1.46",
        port: 54322,
        user: "app_user"
      }
    }
  ],
  victim_process: "12345",
  timestamp: new Date().toISOString(),
  database: "users_db",
  server: "db-prod-3",
  analysis: {
    deadlock_cycle: ["12345 -> 67890", "67890 -> 12345"],
    involved_tables: ["users", "user_profiles"],
    lock_types: ["ShareLock"],
    recommendation: "Consider updating users and user_profiles in a consistent order to avoid deadlocks."
  },
  resolution_suggestions: [
    "Always acquire locks in the same order across transactions",
    "Consider using advisory locks for complex operations",
    "Reduce transaction duration by optimizing queries",
    "Use SELECT ... FOR UPDATE SKIP LOCKED where appropriate"
  ],
  related_events: ["deadlock-event-121", "deadlock-event-122"]
};

/**
 * Multiple deadlock events for testing list views
 */
export const multipleDeadlockEvents: Partial<Event>[] = [
  sampleDeadlockEvent,
  {
    ...sampleDeadlockEvent,
    id: "deadlock-event-124",
    title: "deadlock detected (40P01) - Order Processing",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    tags: [
      { key: "server", value: "db-prod-1" },
      { key: "error_code", value: "40P01" },
      { key: "database", value: "orders_db" },
      { key: "transaction_id", value: "tx-11111" },
    ],
  },
  {
    ...sampleDeadlockEvent,
    id: "deadlock-event-125",
    title: "deadlock detected (40P01) - Inventory Update",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    tags: [
      { key: "server", value: "db-prod-2" },
      { key: "error_code", value: "40P01" },
      { key: "database", value: "inventory_db" },
      { key: "transaction_id", value: "tx-22222" },
    ],
  }
];

/**
 * Function to generate mock deadlock analysis
 */
export function generateMockDeadlockAnalysis(eventId: string): DeadlockAnalysis {
  return {
    ...sampleDeadlockAnalysis,
    event_id: eventId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Function to simulate API delay
 */
export async function simulateApiDelay<T>(data: T, delay: number = 1000): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => resolve(data), delay);
  });
}

/**
 * Mock API functions for testing
 */
export const mockDeadlockApi = {
  async analyzeDeadlock(eventId: string): Promise<DeadlockAnalysis> {
    return simulateApiDelay(generateMockDeadlockAnalysis(eventId), 1500);
  },
  
  async getDeadlockEvents(): Promise<Partial<Event>[]> {
    return simulateApiDelay(multipleDeadlockEvents, 800);
  },
  
  async getDeadlockEvent(eventId: string): Promise<Partial<Event>> {
    const event = multipleDeadlockEvents.find(e => e.id === eventId) || sampleDeadlockEvent;
    return simulateApiDelay(event, 500);
  }
};