/**
 * Mock data for testing Memory Leak Analyzer
 */

import { BaseEvent } from '../types/events';

// Temporary type until we have the real MemoryLeakAnalysis type
interface MemoryLeakAnalysis {
  [key: string]: unknown;
}

/**
 * Sample memory leak event
 */
export const sampleMemoryLeakEvent: Partial<BaseEvent> = {
  id: "memory-leak-event-001",
  projectSlug: "frontend-app",
  title: "OutOfMemoryError: JavaScript heap out of memory",
  message: "FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory",
  level: "error",
  timestamp: new Date().toISOString(),
  tags: [
    { key: "server", value: "web-prod-5" },
    { key: "error_type", value: "OutOfMemoryError" },
    { key: "heap_used", value: "1890MB" },
    { key: "heap_limit", value: "2048MB" },
    { key: "node_version", value: "18.17.0" },
  ],
  entries: [
    {
      type: "exception",
      data: {
        values: [
          {
            type: "OutOfMemoryError",
            value: "JavaScript heap out of memory",
            stacktrace: {
              frames: [
                {
                  filename: "app.js",
                  function: "processLargeDataset",
                  lineno: 1234,
                  colno: 15,
                  abs_path: "/app/src/utils/dataProcessor.js",
                  context_line: "    const results = data.map(item => processItem(item));",
                  pre_context: [
                    "  function processLargeDataset(data) {",
                    "    // Process large dataset without cleanup"
                  ],
                  post_context: [
                    "    return results;",
                    "  }"
                  ]
                }
              ]
            }
          }
        ]
      }
    }
  ]
};

/**
 * Sample memory leak analysis response
 */
export const sampleMemoryLeakAnalysis: MemoryLeakAnalysis = {
  event_id: "memory-leak-event-001",
  leak_type: "JavaScript Heap Exhaustion",
  memory_profile: {
    heap_used: 1890,
    heap_limit: 2048,
    external_memory: 128,
    gc_count: 42,
    gc_pause_total: 1250,
    gc_pause_avg: 29.76,
    timeline: [
      { timestamp: new Date(Date.now() - 3600000).toISOString(), heap_used: 512 },
      { timestamp: new Date(Date.now() - 2700000).toISOString(), heap_used: 768 },
      { timestamp: new Date(Date.now() - 1800000).toISOString(), heap_used: 1024 },
      { timestamp: new Date(Date.now() - 900000).toISOString(), heap_used: 1536 },
      { timestamp: new Date(Date.now()).toISOString(), heap_used: 1890 }
    ]
  },
  suspected_causes: [
    {
      type: "Unbounded Array Growth",
      location: "dataProcessor.js:1234",
      description: "Array 'results' grows without bounds in processLargeDataset",
      confidence: 0.85,
      samples: [
        "const results = data.map(item => processItem(item)); // No pagination or chunking"
      ]
    },
    {
      type: "Event Listener Leak",
      location: "eventManager.js:567",
      description: "Event listeners not removed on component unmount",
      confidence: 0.72,
      samples: [
        "window.addEventListener('resize', this.handleResize); // Never removed"
      ]
    }
  ],
  affected_components: [
    {
      name: "DataProcessor",
      file: "src/utils/dataProcessor.js",
      memory_retained: 512,
      instances: 1
    },
    {
      name: "EventManager",
      file: "src/utils/eventManager.js",
      memory_retained: 128,
      instances: 42
    }
  ],
  recommendations: [
    "Implement pagination or streaming for large dataset processing",
    "Use WeakMap for object caches to allow garbage collection",
    "Remove event listeners in cleanup functions",
    "Consider using worker threads for heavy computations",
    "Implement memory monitoring and alerts"
  ],
  heap_snapshot_available: true,
  timestamp: new Date().toISOString()
};

/**
 * Multiple memory leak events
 */
export const multipleMemoryLeakEvents: Partial<Event>[] = [
  sampleMemoryLeakEvent,
  {
    ...sampleMemoryLeakEvent,
    id: "memory-leak-event-002",
    title: "V8 Fatal Error: Allocation failed",
    message: "FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    tags: [
      { key: "server", value: "web-prod-3" },
      { key: "error_type", value: "AllocationError" },
      { key: "heap_used", value: "1945MB" },
      { key: "heap_limit", value: "2048MB" },
    ],
  },
  {
    ...sampleMemoryLeakEvent,
    id: "memory-leak-event-003",
    title: "Process out of memory: Cannot allocate memory",
    message: "Error: spawn ENOMEM",
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    tags: [
      { key: "server", value: "worker-prod-2" },
      { key: "error_type", value: "SystemMemoryError" },
      { key: "memory_available", value: "128MB" },
      { key: "memory_total", value: "8192MB" },
    ],
  }
];

/**
 * Function to generate mock memory leak analysis
 */
export function generateMockMemoryLeakAnalysis(eventId: string): MemoryLeakAnalysis {
  return {
    ...sampleMemoryLeakAnalysis,
    event_id: eventId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Mock API functions for memory leak testing
 */
export const mockMemoryLeakApi = {
  async analyzeMemoryLeak(eventId: string): Promise<MemoryLeakAnalysis> {
    return new Promise(resolve => {
      setTimeout(() => resolve(generateMockMemoryLeakAnalysis(eventId)), 2000);
    });
  },
  
  async getMemoryLeakEvents(): Promise<Partial<Event>[]> {
    return new Promise(resolve => {
      setTimeout(() => resolve(multipleMemoryLeakEvents), 800);
    });
  },
  
  async getHeapSnapshot(eventId: string): Promise<Blob> {
    // Mock heap snapshot data
    const mockData = new Blob([JSON.stringify({ heap: "snapshot data" })], {
      type: "application/json"
    });
    return new Promise(resolve => {
      setTimeout(() => resolve(mockData), 1000);
    });
  }
};