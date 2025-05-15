/**
 * Telemetry Service
 * 
 * A service for collecting and reporting application telemetry data
 * including user interactions, performance metrics, and error events.
 */

import { v4 as uuidv4 } from 'uuid';

// Event types for telemetry
export type EventType = 
  | 'user_interaction'  // User-initiated actions
  | 'error'             // Error events
  | 'performance'       // Performance measurements
  | 'lifecycle'         // App lifecycle events
  | 'resource'          // Resource loading events
  | 'navigation'        // Page/route navigation
  | 'custom';           // Custom events

// Severity levels for events
export type EventSeverity = 
  | 'debug'     // Debug information
  | 'info'      // General information
  | 'warning'   // Warnings that don't disrupt functionality
  | 'error'     // Error conditions
  | 'critical'; // Critical failures

// Categories for user interactions
export type InteractionCategory =
  | 'click'
  | 'input'
  | 'selection'
  | 'navigation'
  | 'form'
  | 'keyboard'
  | 'dialog'
  | 'drag_drop'
  | 'hover'
  | 'focus'
  | 'context_menu';

// Performance metric types
export type PerformanceMetricType =
  | 'page_load'
  | 'component_render'
  | 'api_call'
  | 'resource_load'
  | 'custom_measurement';

// Error categories
export type ErrorCategory =
  | 'network'
  | 'api'
  | 'validation'
  | 'auth'
  | 'rendering'
  | 'logic'
  | 'resource'
  | 'unknown';

// Base telemetry event interface
export interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: EventType;
  name: string;
  component?: string;
  details?: Record<string, any>;
  sessionId?: string;
  userId?: string;
  severity?: EventSeverity;
  duration?: number;
  tags?: string[];
}

// User interaction event
export interface InteractionEvent extends TelemetryEvent {
  type: 'user_interaction';
  category: InteractionCategory;
  target?: string;
  action?: string;
  value?: string | number | boolean;
}

// Error event
export interface ErrorEvent extends TelemetryEvent {
  type: 'error';
  message: string;
  stack?: string;
  category: ErrorCategory;
  code?: string | number;
  severity: EventSeverity;
  recoverable?: boolean;
  retryAttempts?: number;
}

// Performance event
export interface PerformanceEvent extends TelemetryEvent {
  type: 'performance';
  metricType: PerformanceMetricType;
  metricValue: number;
  metricUnit: 'ms' | 'bytes' | 'count' | 'percent' | 'score';
  baseline?: number;
  thresholds?: {
    warning?: number;
    error?: number;
  };
}

// Lifecycle event
export interface LifecycleEvent extends TelemetryEvent {
  type: 'lifecycle';
  phase: 
    | 'init'
    | 'mount' 
    | 'update' 
    | 'unmount' 
    | 'suspend' 
    | 'resume' 
    | 'error';
  status: 'start' | 'complete' | 'error';
  duration?: number;
}

// Navigation event
export interface NavigationEvent extends TelemetryEvent {
  type: 'navigation';
  from: string;
  to: string;
  duration?: number;
  method: 'link' | 'browser' | 'programmatic' | 'initial';
}

// Resource event
export interface ResourceEvent extends TelemetryEvent {
  type: 'resource';
  resourceType: 'script' | 'style' | 'image' | 'font' | 'fetch' | 'other';
  resourceUrl: string;
  status: 'loading' | 'success' | 'error';
  size?: number;
  duration?: number;
}

// Transport options for telemetry data
export interface TelemetryTransportOptions {
  // Endpoint URL for telemetry data
  endpoint?: string;
  
  // Buffer size before sending batch
  batchSize?: number;
  
  // Send interval in milliseconds
  sendInterval?: number;
  
  // Whether to store events offline when endpoint unreachable
  offlineStorage?: boolean;
  
  // Max offline storage size in bytes
  maxOfflineSize?: number;
  
  // Headers to include with telemetry requests
  headers?: Record<string, string>;
  
  // Whether to send telemetry in the background using sendBeacon
  useBeacon?: boolean;
}

// Configuration options for the telemetry service
export interface TelemetryOptions {
  // Whether telemetry is enabled
  enabled?: boolean;
  
  // Default app component name
  appName?: string;
  
  // App version
  appVersion?: string;
  
  // Environment (dev, test, prod)
  environment?: string;
  
  // User identifier
  userId?: string;
  
  // Global tags to apply to all events
  globalTags?: string[];
  
  // Sampling rate (0-1) to limit event volume
  samplingRate?: number;
  
  // Transport configuration
  transport?: TelemetryTransportOptions;
  
  // Max events per second to avoid overwhelming analytics
  throttleRate?: number;
  
  // Log telemetry events to console
  consoleLogging?: boolean;
  
  // Auto-collect certain metric types
  autoCollect?: {
    errors?: boolean;
    performance?: boolean;
    navigation?: boolean;
    resources?: boolean;
  };
}

const DEFAULT_OPTIONS: TelemetryOptions = {
  enabled: true,
  appName: 'Dexter',
  appVersion: '1.0.0',
  environment: 'production',
  globalTags: [],
  samplingRate: 1.0,
  transport: {
    batchSize: 10,
    sendInterval: 5000,
    offlineStorage: true,
    maxOfflineSize: 1024 * 1024 * 5, // 5MB
    useBeacon: true,
  },
  throttleRate: 50,
  consoleLogging: false,
  autoCollect: {
    errors: true,
    performance: true,
    navigation: true,
    resources: false,
  }
};

/**
 * Telemetry service for tracking application metrics and events
 */
export class TelemetryService {
  private options: TelemetryOptions;
  private eventQueue: TelemetryEvent[] = [];
  private sendTimer: NodeJS.Timeout | null = null;
  private sessionId: string;
  private isEnabled: boolean;
  private throttleTimestamp: number = 0;
  private throttleCount: number = 0;
  private callbacks: Record<string, ((event: TelemetryEvent) => void)[]> = {};
  
  /**
   * Create a new telemetry service instance
   */
  constructor(options: TelemetryOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.isEnabled = this.options.enabled ?? true;
    this.sessionId = this.generateSessionId();
    
    // Set up sending interval if transport is configured
    if (this.options.transport?.sendInterval) {
      this.startSendingInterval();
    }
    
    // Set up automatic error collection
    if (this.options.autoCollect?.errors && typeof window !== 'undefined') {
      this.setupErrorCollection();
    }
    
    // Set up automatic performance collection
    if (this.options.autoCollect?.performance && typeof window !== 'undefined') {
      this.setupPerformanceCollection();
    }
    
    // Set up automatic navigation tracking
    if (this.options.autoCollect?.navigation && typeof window !== 'undefined') {
      this.setupNavigationTracking();
    }
  }
  
  /**
   * Enable telemetry collection
   */
  public enable(): void {
    this.isEnabled = true;
  }
  
  /**
   * Disable telemetry collection
   */
  public disable(): void {
    this.isEnabled = false;
  }
  
  /**
   * Set user identifier for telemetry events
   */
  public setUserId(userId: string): void {
    this.options.userId = userId;
  }
  
  /**
   * Create a new session ID
   */
  public resetSession(): void {
    this.sessionId = this.generateSessionId();
  }
  
  /**
   * Subscribe to telemetry events
   * @param eventType Type of event to subscribe to
   * @param callback Callback function to call when event occurs
   * @returns Subscription ID for unsubscribing
   */
  public subscribe(
    eventType: EventType | 'all',
    callback: (event: TelemetryEvent) => void
  ): string {
    const subscriptionId = uuidv4();
    const key = eventType === 'all' ? 'all' : eventType;
    
    if (!this.callbacks[key]) {
      this.callbacks[key] = [];
    }
    
    this.callbacks[key].push(callback);
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe from telemetry events
   * @param subscriptionId ID returned from subscribe method
   */
  public unsubscribe(subscriptionId: string): void {
    // Remove subscription from all callback groups
    Object.keys(this.callbacks).forEach(key => {
      this.callbacks[key] = this.callbacks[key].filter(
        callback => callback.toString() !== subscriptionId
      );
      
      if (this.callbacks[key].length === 0) {
        delete this.callbacks[key];
      }
    });
  }
  
  /**
   * Track a user interaction event
   */
  public trackInteraction(event: Omit<InteractionEvent, 'id' | 'timestamp' | 'type'>): void {
    if (!this.isEnabled || !this.shouldSampleEvent()) return;
    
    const telemetryEvent: InteractionEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'user_interaction',
      ...event,
      sessionId: this.sessionId,
      userId: this.options.userId,
    };
    
    this.trackEvent(telemetryEvent);
  }
  
  /**
   * Track an error event
   */
  public trackError(event: Omit<ErrorEvent, 'id' | 'timestamp' | 'type'>): void {
    if (!this.isEnabled || !this.shouldSampleEvent()) return;
    
    const telemetryEvent: ErrorEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'error',
      ...event,
      sessionId: this.sessionId,
      userId: this.options.userId,
    };
    
    this.trackEvent(telemetryEvent);
  }
  
  /**
   * Track a performance metric
   */
  public trackPerformance(event: Omit<PerformanceEvent, 'id' | 'timestamp' | 'type'>): void {
    if (!this.isEnabled || !this.shouldSampleEvent()) return;
    
    const telemetryEvent: PerformanceEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'performance',
      ...event,
      sessionId: this.sessionId,
      userId: this.options.userId,
    };
    
    this.trackEvent(telemetryEvent);
  }
  
  /**
   * Track a lifecycle event
   */
  public trackLifecycle(event: Omit<LifecycleEvent, 'id' | 'timestamp' | 'type'>): void {
    if (!this.isEnabled || !this.shouldSampleEvent()) return;
    
    const telemetryEvent: LifecycleEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'lifecycle',
      ...event,
      sessionId: this.sessionId,
      userId: this.options.userId,
    };
    
    this.trackEvent(telemetryEvent);
  }
  
  /**
   * Track a navigation event
   */
  public trackNavigation(event: Omit<NavigationEvent, 'id' | 'timestamp' | 'type'>): void {
    if (!this.isEnabled || !this.shouldSampleEvent()) return;
    
    const telemetryEvent: NavigationEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'navigation',
      ...event,
      sessionId: this.sessionId,
      userId: this.options.userId,
    };
    
    this.trackEvent(telemetryEvent);
  }
  
  /**
   * Track a resource event
   */
  public trackResource(event: Omit<ResourceEvent, 'id' | 'timestamp' | 'type'>): void {
    if (!this.isEnabled || !this.shouldSampleEvent()) return;
    
    const telemetryEvent: ResourceEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'resource',
      ...event,
      sessionId: this.sessionId,
      userId: this.options.userId,
    };
    
    this.trackEvent(telemetryEvent);
  }
  
  /**
   * Track a custom event
   */
  public trackCustom(name: string, details: Record<string, any> = {}, options: Partial<TelemetryEvent> = {}): void {
    if (!this.isEnabled || !this.shouldSampleEvent()) return;
    
    const telemetryEvent: TelemetryEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: 'custom',
      name,
      details,
      sessionId: this.sessionId,
      userId: this.options.userId,
      ...options,
    };
    
    this.trackEvent(telemetryEvent);
  }
  
  /**
   * Measure the time it takes to execute a function
   * @param name Name of the metric
   * @param fn Function to measure
   * @param metricType Type of performance metric
   * @returns The result of the function
   */
  public measure<T>(
    name: string, 
    fn: () => T, 
    metricType: PerformanceMetricType = 'custom_measurement'
  ): T {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    this.trackPerformance({
      name,
      metricType,
      metricValue: endTime - startTime,
      metricUnit: 'ms',
    });
    
    return result;
  }
  
  /**
   * Start measuring a performance period
   * @param name Name of the metric
   * @returns A function to stop measuring and record the duration
   */
  public startMeasurement(
    name: string,
    metricType: PerformanceMetricType = 'custom_measurement'
  ): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      
      this.trackPerformance({
        name,
        metricType,
        metricValue: endTime - startTime,
        metricUnit: 'ms',
      });
    };
  }
  
  /**
   * Track a component render duration
   * @param componentName Name of the component
   * @param duration Duration in milliseconds
   */
  public trackRender(componentName: string, duration: number): void {
    this.trackPerformance({
      name: `${componentName} render`,
      metricType: 'component_render',
      metricValue: duration,
      metricUnit: 'ms',
      component: componentName,
    });
  }
  
  /**
   * Track an API call
   * @param endpoint API endpoint
   * @param method HTTP method
   * @param duration Duration in milliseconds
   * @param status HTTP status code
   * @param success Whether the call was successful
   */
  public trackApiCall(
    endpoint: string,
    method: string,
    duration: number,
    status?: number,
    success?: boolean
  ): void {
    this.trackPerformance({
      name: `API ${method} ${endpoint}`,
      metricType: 'api_call',
      metricValue: duration,
      metricUnit: 'ms',
      details: {
        endpoint,
        method,
        status,
        success,
      },
    });
  }
  
  /**
   * Create a hook for measuring React component render time
   * @param componentName Name of the component
   * @returns Object with start and end methods
   */
  public createRenderHook(componentName: string): { 
    start: () => void;
    end: () => void;
  } {
    let startTime = 0;
    
    return {
      start: () => {
        startTime = performance.now();
      },
      end: () => {
        if (startTime === 0) return;
        const endTime = performance.now();
        this.trackRender(componentName, endTime - startTime);
        startTime = 0;
      }
    };
  }
  
  /**
   * Send all collected telemetry data immediately
   */
  public flush(): Promise<void> {
    return this.sendEvents();
  }
  
  /**
   * Set up global error collection
   */
  private setupErrorCollection(): void {
    window.addEventListener('error', (event) => {
      this.trackError({
        name: 'Uncaught Error',
        message: event.message,
        stack: event.error?.stack,
        category: 'unknown',
        severity: 'error',
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        name: 'Unhandled Promise Rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        category: 'unknown',
        severity: 'error',
        details: {
          reason: event.reason,
        },
      });
    });
  }
  
  /**
   * Set up performance collection
   */
  private setupPerformanceCollection(): void {
    // Track page load performance
    window.addEventListener('load', () => {
      if (performance && performance.getEntriesByType) {
        // Get navigation timing data
        const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navTiming) {
          this.trackPerformance({
            name: 'Page Load Time',
            metricType: 'page_load',
            metricValue: navTiming.loadEventEnd - navTiming.startTime,
            metricUnit: 'ms',
            details: {
              dns: navTiming.domainLookupEnd - navTiming.domainLookupStart,
              connection: navTiming.connectEnd - navTiming.connectStart,
              ttfb: navTiming.responseStart - navTiming.requestStart,
              domInteractive: navTiming.domInteractive - navTiming.startTime,
              domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.startTime,
              domComplete: navTiming.domComplete - navTiming.startTime,
            },
          });
        }
        
        // Report Web Vitals if available
        if ('onLCP' in window) {
          // This would be implemented with web-vitals library
          // but placeholder is left here for architecture documentation
        }
      }
    });
  }
  
  /**
   * Set up navigation tracking
   */
  private setupNavigationTracking(): void {
    if (typeof window !== 'undefined' && 'history' in window) {
      let currentPath = window.location.pathname;
      
      // Track initial navigation
      this.trackNavigation({
        from: 'external',
        to: currentPath,
        method: 'initial',
      });
      
      // Track history changes
      const originalPushState = history.pushState;
      history.pushState = (...args) => {
        const to = args[2] as string;
        
        this.trackNavigation({
          from: currentPath,
          to: to || window.location.pathname,
          method: 'programmatic',
        });
        
        currentPath = to || window.location.pathname;
        return originalPushState.apply(history, args);
      };
      
      // Track popstate (back/forward navigation)
      window.addEventListener('popstate', () => {
        const to = window.location.pathname;
        
        this.trackNavigation({
          from: currentPath,
          to,
          method: 'browser',
        });
        
        currentPath = to;
      });
    }
  }
  
  /**
   * Track a telemetry event
   */
  private trackEvent(event: TelemetryEvent): void {
    // Apply global tags
    if (this.options.globalTags?.length) {
      event.tags = [...(event.tags || []), ...this.options.globalTags];
    }
    
    // Apply throttling
    if (!this.isThrottled()) {
      // Add to queue
      this.eventQueue.push(event);
      
      // Send immediately if queue is full
      if (this.eventQueue.length >= (this.options.transport?.batchSize || 10)) {
        this.sendEvents();
      }
      
      // Log to console if enabled
      if (this.options.consoleLogging) {
        console.log(`[Telemetry] ${event.type}:`, event);
      }
      
      // Notify subscribers
      this.notifySubscribers(event);
    }
  }
  
  /**
   * Notify subscribers of an event
   */
  private notifySubscribers(event: TelemetryEvent): void {
    // Notify type-specific subscribers
    if (this.callbacks[event.type]) {
      this.callbacks[event.type].forEach(callback => callback(event));
    }
    
    // Notify 'all' subscribers
    if (this.callbacks['all']) {
      this.callbacks['all'].forEach(callback => callback(event));
    }
  }
  
  /**
   * Check if event should be sampled based on sampling rate
   */
  private shouldSampleEvent(): boolean {
    return Math.random() < (this.options.samplingRate || 1.0);
  }
  
  /**
   * Check if events are being throttled
   */
  private isThrottled(): boolean {
    const now = Date.now();
    const throttleRate = this.options.throttleRate || 50;
    
    // Reset counter if in a new second
    if (now - this.throttleTimestamp > 1000) {
      this.throttleTimestamp = now;
      this.throttleCount = 0;
    }
    
    // Check if over limit
    if (this.throttleCount >= throttleRate) {
      return true;
    }
    
    this.throttleCount++;
    return false;
  }
  
  /**
   * Start the timer for sending events periodically
   */
  private startSendingInterval(): void {
    this.stopSendingInterval();
    
    this.sendTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.sendEvents();
      }
    }, this.options.transport?.sendInterval || 5000);
  }
  
  /**
   * Stop the timer for sending events
   */
  private stopSendingInterval(): void {
    if (this.sendTimer) {
      clearInterval(this.sendTimer);
      this.sendTimer = null;
    }
  }
  
  /**
   * Send collected events to the configured endpoint
   */
  private async sendEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return Promise.resolve();
    }
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    // If no endpoint configured, just log and return
    if (!this.options.transport?.endpoint) {
      return Promise.resolve();
    }
    
    // Prepare payload
    const payload = {
      events,
      metadata: {
        appName: this.options.appName,
        appVersion: this.options.appVersion,
        environment: this.options.environment,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
      },
    };
    
    // Send data using beacon if supported and enabled
    if (navigator.sendBeacon && this.options.transport?.useBeacon) {
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const success = navigator.sendBeacon(this.options.transport.endpoint, blob);
        
        if (success) {
          return Promise.resolve();
        }
      } catch (e) {
        // Fall back to fetch if beacon fails
      }
    }
    
    // Fall back to fetch
    try {
      const response = await fetch(this.options.transport.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.transport.headers,
        },
        body: JSON.stringify(payload),
        // Use keepalive to allow request to complete even if page unloads
        keepalive: true,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send telemetry: ${response.status} ${response.statusText}`);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to send telemetry:', error);
      
      // If offline storage is enabled, store events for later
      if (this.options.transport?.offlineStorage) {
        this.storeEventsOffline(events);
      }
      
      return Promise.reject(error);
    }
  }
  
  /**
   * Store events offline for later sending
   */
  private storeEventsOffline(events: TelemetryEvent[]): void {
    if (!this.options.transport?.offlineStorage) return;
    
    try {
      // Get existing stored events
      const storedEvents = this.getStoredEvents();
      
      // Add new events
      const allEvents = [...storedEvents, ...events];
      
      // Calculate storage size
      const serializedEvents = JSON.stringify(allEvents);
      const storageSize = new Blob([serializedEvents]).size;
      
      // If storage size exceeds limit, trim oldest events
      if (storageSize > (this.options.transport.maxOfflineSize || 5 * 1024 * 1024)) {
        // Remove oldest events until under size limit
        const eventsToRemove = Math.ceil(allEvents.length * 0.2); // Remove 20%
        allEvents.splice(0, eventsToRemove);
      }
      
      // Store events
      localStorage.setItem('dexter_telemetry_events', JSON.stringify(allEvents));
    } catch (error) {
      console.error('Failed to store telemetry events offline:', error);
    }
  }
  
  /**
   * Get events stored offline
   */
  private getStoredEvents(): TelemetryEvent[] {
    try {
      const storedEvents = localStorage.getItem('dexter_telemetry_events');
      return storedEvents ? JSON.parse(storedEvents) : [];
    } catch (error) {
      console.error('Failed to retrieve stored telemetry events:', error);
      return [];
    }
  }
  
  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return uuidv4();
  }
  
  /**
   * Clean up resources when service is destroyed
   */
  public destroy(): void {
    this.stopSendingInterval();
    this.flush().catch(() => {});
    this.callbacks = {};
  }
}

// Create a singleton instance
const telemetry = new TelemetryService();

export default telemetry;