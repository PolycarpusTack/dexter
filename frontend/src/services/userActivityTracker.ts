/**
 * User Activity Tracking Service
 * 
 * Tracks user interactions, session information, and feature usage to provide
 * insights into how users are using the application.
 */

import telemetry from './telemetry';
import { getAuditLogs } from '../hooks/useAuditLog';

// Session storage key
const SESSION_STORAGE_KEY = 'dexter_session';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Feature usage categories
export enum FeatureCategory {
  CORE = 'core',
  VISUALIZATION = 'visualization',
  ANALYTICS = 'analytics',
  SETTINGS = 'settings',
  ERROR_HANDLING = 'error_handling',
  NAVIGATION = 'navigation',
  SEARCH = 'search',
  FILTERING = 'filtering',
  SORTING = 'sorting',
  EXPORT = 'export',
  IMPORT = 'import',
  AI = 'ai',
  DEADLOCK = 'deadlock',
  CUSTOM = 'custom'
}

// Activity types
export enum ActivityType {
  VIEW = 'view',
  INTERACTION = 'interaction',
  NAVIGATION = 'navigation',
  SEARCH = 'search',
  FILTER = 'filter',
  SORT = 'sort',
  EXPORT = 'export',
  IMPORT = 'import',
  API = 'api',
  ERROR = 'error',
  RECOVERY = 'recovery',
  SETTING = 'setting',
  CUSTOM = 'custom'
}

// Session information
export interface SessionInfo {
  id: string;
  startTime: number;
  lastActivityTime: number;
  referrer: string;
  entryPath: string;
  userAgent: string;
  deviceType: string;
  isActive: boolean;
}

// Feature usage metrics
export interface FeatureUsage {
  featureId: string;
  category: FeatureCategory;
  usageCount: number;
  lastUsed: number;
  usageDuration: number;
  interactions: Record<string, number>;
}

// Path flow tracking
export interface PathFlow {
  from: string;
  to: string;
  count: number;
  averageDuration: number;
}

// Activity tracking options
export interface TrackActivityOptions {
  feature?: string;
  category?: FeatureCategory;
  type?: ActivityType;
  details?: Record<string, any>;
  duration?: number;
  path?: string;
  source?: string;
  target?: string;
  component?: string;
  action?: string;
  result?: 'success' | 'failure' | 'cancelled' | 'partial';
  value?: string | number | boolean;
  metadata?: Record<string, any>;
}

class UserActivityTracker {
  private session: SessionInfo | null = null;
  private features: Map<string, FeatureUsage> = new Map();
  private pathFlows: Map<string, PathFlow> = new Map();
  private featureStartTimes: Map<string, number> = new Map();
  private sessionCheckInterval: number | null = null;
  private userId: string | null = null;
  
  /**
   * Initialize the activity tracker
   */
  public initialize(userId?: string): void {
    this.userId = userId || null;
    
    // Initialize or restore session
    this.initializeSession();
    
    // Load stored feature usage data
    this.loadFeatureData();
    
    // Set up session check interval
    this.sessionCheckInterval = window.setInterval(() => {
      this.checkSession();
    }, 60 * 1000); // Check every minute
    
    // Track session start
    this.trackSessionStart();
    
    // Add event listeners for page visibility and close
    this.setupEventListeners();
  }
  
  /**
   * Clean up resources when service is destroyed
   */
  public destroy(): void {
    // Clear interval
    if (this.sessionCheckInterval !== null) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    
    // End session and save data
    this.endSession();
  }
  
  /**
   * Set user identifier for activity tracking
   */
  public setUserId(userId: string): void {
    this.userId = userId;
    
    // Update session with user ID if exists
    if (this.session) {
      this.trackEvent('user_identified', {
        previousUserId: this.userId,
        newUserId: userId
      });
    }
  }
  
  /**
   * Track a user activity
   */
  public trackActivity(
    name: string,
    options: TrackActivityOptions = {}
  ): void {
    // Get current time
    const now = Date.now();
    
    // Ensure session is active
    this.checkSession();
    
    // Update session last activity time
    if (this.session) {
      this.session.lastActivityTime = now;
      this.saveSession();
    }
    
    // Default feature ID and category
    const featureId = options.feature || 'app';
    const category = options.category || FeatureCategory.CUSTOM;
    
    // Track feature usage
    this.trackFeatureUsage(featureId, category, name, options, now);
    
    // Track path flow if relevant
    if (options.path || options.source || options.target) {
      this.trackPathFlow(options, now);
    }
    
    // Send to telemetry
    this.sendToTelemetry(name, options, now);
  }
  
  /**
   * Start tracking time spent on a feature
   */
  public startFeatureTimer(featureId: string): void {
    this.featureStartTimes.set(featureId, Date.now());
  }
  
  /**
   * Stop tracking time spent on a feature
   */
  public stopFeatureTimer(
    featureId: string,
    options: TrackActivityOptions = {}
  ): number {
    const startTime = this.featureStartTimes.get(featureId);
    if (!startTime) {
      return 0;
    }
    
    const now = Date.now();
    const duration = now - startTime;
    
    // Remove start time
    this.featureStartTimes.delete(featureId);
    
    // Track feature usage with duration
    options.duration = duration;
    this.trackActivity(`${featureId}_used`, options);
    
    return duration;
  }
  
  /**
   * Track a view of a page or component
   */
  public trackView(
    viewName: string,
    options: TrackActivityOptions = {}
  ): void {
    this.trackActivity(viewName, {
      ...options,
      type: ActivityType.VIEW
    });
  }
  
  /**
   * Track a search action
   */
  public trackSearch(
    searchTerm: string,
    options: TrackActivityOptions = {}
  ): void {
    this.trackActivity('search', {
      ...options,
      type: ActivityType.SEARCH,
      value: searchTerm
    });
  }
  
  /**
   * Track a filter operation
   */
  public trackFilter(
    filterCriteria: Record<string, any>,
    options: TrackActivityOptions = {}
  ): void {
    this.trackActivity('filter', {
      ...options,
      type: ActivityType.FILTER,
      details: filterCriteria
    });
  }
  
  /**
   * Track a sort operation
   */
  public trackSort(
    sortField: string,
    sortDirection: 'asc' | 'desc',
    options: TrackActivityOptions = {}
  ): void {
    this.trackActivity('sort', {
      ...options,
      type: ActivityType.SORT,
      details: {
        field: sortField,
        direction: sortDirection
      }
    });
  }
  
  /**
   * Track navigation between pages
   */
  public trackNavigation(
    from: string,
    to: string,
    options: TrackActivityOptions = {}
  ): void {
    this.trackActivity('navigation', {
      ...options,
      type: ActivityType.NAVIGATION,
      source: from,
      target: to
    });
  }
  
  /**
   * Track an export operation
   */
  public trackExport(
    exportType: string,
    options: TrackActivityOptions = {}
  ): void {
    this.trackActivity('export', {
      ...options,
      type: ActivityType.EXPORT,
      value: exportType
    });
  }
  
  /**
   * Get session information
   */
  public getSession(): SessionInfo | null {
    return this.session;
  }
  
  /**
   * Get feature usage metrics
   */
  public getFeatureUsage(): FeatureUsage[] {
    return Array.from(this.features.values());
  }
  
  /**
   * Get usage metrics for a specific feature
   */
  public getFeatureMetrics(featureId: string): FeatureUsage | null {
    return this.features.get(featureId) || null;
  }
  
  /**
   * Get top used features
   */
  public getTopFeatures(limit: number = 10): FeatureUsage[] {
    return Array.from(this.features.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }
  
  /**
   * Get path flows sorted by count
   */
  public getPathFlows(limit: number = 20): PathFlow[] {
    return Array.from(this.pathFlows.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
  
  /**
   * Get audit activity for the current session
   */
  public getSessionActivity(): any[] {
    const auditLogs = getAuditLogs();
    
    if (!this.session) {
      return [];
    }
    
    // Filter logs to current session time range
    return auditLogs.filter(log => 
      log.timestamp >= this.session!.startTime
    );
  }
  
  /**
   * Check if a feature has been used
   */
  public hasUsedFeature(featureId: string): boolean {
    return this.features.has(featureId);
  }
  
  // Private methods
  
  /**
   * Initialize or restore the session
   */
  private initializeSession(): void {
    try {
      // Try to load existing session
      const sessionJson = sessionStorage.getItem(SESSION_STORAGE_KEY);
      
      if (sessionJson) {
        const session = JSON.parse(sessionJson) as SessionInfo;
        
        // Check if session has expired
        if (Date.now() - session.lastActivityTime < SESSION_TIMEOUT) {
          this.session = session;
          this.session.isActive = true;
          return;
        }
      }
      
      // Create new session if none exists or has expired
      this.createNewSession();
    } catch (error) {
      console.error('Failed to initialize session:', error);
      this.createNewSession();
    }
  }
  
  /**
   * Create a new session
   */
  private createNewSession(): void {
    this.session = {
      id: this.generateSessionId(),
      startTime: Date.now(),
      lastActivityTime: Date.now(),
      referrer: document.referrer,
      entryPath: window.location.pathname,
      userAgent: navigator.userAgent,
      deviceType: this.getDeviceType(),
      isActive: true
    };
    
    this.saveSession();
  }
  
  /**
   * Save session to storage
   */
  private saveSession(): void {
    if (!this.session) return;
    
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }
  
  /**
   * End the current session
   */
  private endSession(): void {
    if (!this.session) return;
    
    // Calculate session duration
    const duration = Date.now() - this.session.startTime;
    
    // Track session end
    this.trackEvent('session_end', {
      sessionId: this.session.id,
      duration,
      endPath: window.location.pathname
    });
    
    // Mark session as inactive
    this.session.isActive = false;
    this.saveSession();
    
    // Save feature usage data
    this.saveFeatureData();
  }
  
  /**
   * Check if session is active and renew if needed
   */
  private checkSession(): void {
    if (!this.session) {
      this.initializeSession();
      return;
    }
    
    const now = Date.now();
    
    // Check if session has expired
    if (now - this.session.lastActivityTime > SESSION_TIMEOUT) {
      // End current session
      this.endSession();
      
      // Create new session
      this.createNewSession();
      
      // Track session timeout
      this.trackEvent('session_timeout', {
        previousSessionId: this.session.id
      });
    }
  }
  
  /**
   * Load stored feature usage data
   */
  private loadFeatureData(): void {
    try {
      const featuresJson = localStorage.getItem('dexter_feature_usage');
      if (featuresJson) {
        const featuresData = JSON.parse(featuresJson) as FeatureUsage[];
        
        // Convert to Map
        this.features = new Map(
          featuresData.map(feature => [feature.featureId, feature])
        );
      }
      
      const pathsJson = localStorage.getItem('dexter_path_flows');
      if (pathsJson) {
        const pathsData = JSON.parse(pathsJson) as PathFlow[];
        
        // Convert to Map
        this.pathFlows = new Map(
          pathsData.map(path => [`${path.from}:${path.to}`, path])
        );
      }
    } catch (error) {
      console.error('Failed to load feature usage data:', error);
    }
  }
  
  /**
   * Save feature usage data
   */
  private saveFeatureData(): void {
    try {
      // Save features
      const featuresData = Array.from(this.features.values());
      localStorage.setItem('dexter_feature_usage', JSON.stringify(featuresData));
      
      // Save path flows
      const pathsData = Array.from(this.pathFlows.values());
      localStorage.setItem('dexter_path_flows', JSON.stringify(pathsData));
    } catch (error) {
      console.error('Failed to save feature usage data:', error);
    }
  }
  
  /**
   * Track feature usage
   */
  private trackFeatureUsage(
    featureId: string,
    category: FeatureCategory,
    action: string,
    options: TrackActivityOptions,
    timestamp: number
  ): void {
    // Get existing feature data or create new
    let feature = this.features.get(featureId);
    
    if (!feature) {
      feature = {
        featureId,
        category,
        usageCount: 0,
        lastUsed: timestamp,
        usageDuration: 0,
        interactions: {}
      };
    }
    
    // Update feature usage
    feature.usageCount += 1;
    feature.lastUsed = timestamp;
    
    // Add duration if provided
    if (options.duration) {
      feature.usageDuration += options.duration;
    }
    
    // Track specific interaction
    if (action) {
      feature.interactions[action] = (feature.interactions[action] || 0) + 1;
    }
    
    // Save to map
    this.features.set(featureId, feature);
    
    // Periodically save data (every 10 actions)
    if (feature.usageCount % 10 === 0) {
      this.saveFeatureData();
    }
  }
  
  /**
   * Track path flow
   */
  private trackPathFlow(
    options: TrackActivityOptions,
    timestamp: number
  ): void {
    let from = options.source || options.path || '';
    let to = options.target || '';
    
    // If either is missing, try to use current path
    if (!from) {
      from = window.location.pathname;
    }
    
    if (!to) {
      to = from;
    }
    
    // Skip if from and to are the same and it's not a view action
    if (from === to && options.type !== ActivityType.VIEW) {
      return;
    }
    
    // Create key for path flow
    const key = `${from}:${to}`;
    
    // Get existing path flow or create new
    let pathFlow = this.pathFlows.get(key);
    
    if (!pathFlow) {
      pathFlow = {
        from,
        to,
        count: 0,
        averageDuration: 0
      };
    }
    
    // Update path flow
    pathFlow.count += 1;
    
    // Update duration if provided
    if (options.duration) {
      const newAverage = 
        (pathFlow.averageDuration * (pathFlow.count - 1) + options.duration) / 
        pathFlow.count;
      
      pathFlow.averageDuration = newAverage;
    }
    
    // Save to map
    this.pathFlows.set(key, pathFlow);
  }
  
  /**
   * Send activity to telemetry
   */
  private sendToTelemetry(
    name: string,
    options: TrackActivityOptions,
    timestamp: number
  ): void {
    // Track as user interaction
    telemetry.trackInteraction({
      name,
      category: this.mapCategoryToTelemetry(options.type || ActivityType.INTERACTION),
      component: options.component,
      action: options.action,
      details: {
        ...options.details,
        sessionId: this.session?.id,
        userId: this.userId,
        feature: options.feature,
        featureCategory: options.category,
        source: options.source,
        target: options.target,
        path: options.path,
        result: options.result,
        ...options.metadata
      },
      value: options.value !== undefined ? String(options.value) : undefined,
      tags: [
        options.category || FeatureCategory.CUSTOM,
        options.type || ActivityType.INTERACTION
      ]
    });
  }
  
  /**
   * Track an event with telemetry
   */
  private trackEvent(
    eventName: string,
    details: Record<string, any> = {}
  ): void {
    telemetry.trackCustom(eventName, {
      ...details,
      sessionId: this.session?.id,
      userId: this.userId,
      timestamp: Date.now()
    });
  }
  
  /**
   * Track session start
   */
  private trackSessionStart(): void {
    if (!this.session) return;
    
    this.trackEvent('session_start', {
      referrer: this.session.referrer,
      entryPath: this.session.entryPath,
      deviceType: this.session.deviceType
    });
  }
  
  /**
   * Set up event listeners for page visibility and close
   */
  private setupEventListeners(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.trackEvent('page_hidden');
      } else {
        this.trackEvent('page_visible');
      }
    });
    
    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }
  
  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  /**
   * Detect device type
   */
  private getDeviceType(): string {
    const ua = navigator.userAgent;
    
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      return 'tablet';
    }
    
    if (/mobile|android|iphone|ipod|phone/i.test(ua)) {
      return 'mobile';
    }
    
    return 'desktop';
  }
  
  /**
   * Map activity type to telemetry category
   */
  private mapCategoryToTelemetry(type: ActivityType): string {
    switch (type) {
      case ActivityType.VIEW:
        return 'view';
      case ActivityType.NAVIGATION:
        return 'navigation';
      case ActivityType.SEARCH:
        return 'search';
      case ActivityType.FILTER:
        return 'filter';
      case ActivityType.SORT:
        return 'sort';
      case ActivityType.EXPORT:
        return 'export';
      case ActivityType.IMPORT:
        return 'import';
      case ActivityType.API:
        return 'api';
      case ActivityType.ERROR:
        return 'error';
      case ActivityType.RECOVERY:
        return 'recovery';
      case ActivityType.SETTING:
        return 'setting';
      default:
        return 'custom';
    }
  }
}

// Create singleton instance
const userActivityTracker = new UserActivityTracker();

// Initialize tracker
if (typeof window !== 'undefined') {
  // Initialize after DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      userActivityTracker.initialize();
    });
  } else {
    userActivityTracker.initialize();
  }
}

export default userActivityTracker;