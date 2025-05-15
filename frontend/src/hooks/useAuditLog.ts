import { useCallback } from 'react';
import telemetry from '../services/telemetry';

// Types for audit log events
export interface AuditLogEvent {
  component: string;
  action: string;
  timestamp: number;
  details?: Record<string, any>;
  actor?: string; // Person who performed the action
  target?: string; // Entity that was affected
  status?: 'success' | 'failure' | 'pending';
  category?: string; // For grouping related actions
}

// Return type for the logEvent function
type LogEventFunction = (action: string, details?: Record<string, any>) => AuditLogEvent;

export interface UseAuditLogOptions {
  /** User identifier */
  userId?: string;
  /** Send logs to telemetry service */
  enableTelemetry?: boolean;
  /** Save logs locally */
  enableLocalStorage?: boolean;
  /** Category for the audit logs */
  category?: string;
}

/**
 * Hook for logging user interactions and component events
 * @param componentName - Name of the component generating logs
 * @param options - Configuration options
 * @returns Function to log events
 */
export function useAuditLog(
  componentName: string,
  options: UseAuditLogOptions = {}
): LogEventFunction {
  /**
   * Log an event with details
   * @param action - Action being performed
   * @param details - Additional details about the action
   */
  const defaultOptions: UseAuditLogOptions = {
    enableTelemetry: true,
    enableLocalStorage: true
  };
  
  const config = { ...defaultOptions, ...options };
  
  const logEvent = useCallback((
    action: string,
    details?: Record<string, any>
  ) => {
    // Create the event object
    const event: AuditLogEvent = {
      component: componentName,
      action,
      timestamp: Date.now(),
      details,
      actor: config.userId,
      category: config.category
    };
    
    // Log to console in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Audit log:', event);
    }
    
    // Send to telemetry service if enabled
    if (config.enableTelemetry) {
      telemetry.trackInteraction({
        name: action,
        category: 'custom',
        component: componentName,
        details: {
          ...details,
          auditLog: true,
          actor: config.userId,
          category: config.category
        }
      });
    }
    
    // Store in localStorage if enabled
    if (config.enableLocalStorage) {
      try {
        // Get existing logs
        const existingLogs = localStorage.getItem('auditLogs');
        const logs = existingLogs ? JSON.parse(existingLogs) : [];
        
        // Add the new event
        logs.push(event);
        
        // Trim to last 1000 events to prevent localStorage from growing too large
        const trimmedLogs = logs.slice(-1000);
        
        // Save back to localStorage
        localStorage.setItem('auditLogs', JSON.stringify(trimmedLogs));
      } catch (error) {
        // Silently fail if localStorage is not available
        console.error('Failed to save audit log:', error);
      }
    }
    
    // Return the event (useful for testing)
    return event;
  }, [componentName, config]);
  
  return logEvent;
}

/**
 * Get stored audit logs from localStorage
 * @returns Array of stored audit log events
 */
export function getAuditLogs(): AuditLogEvent[] {
  try {
    const logs = localStorage.getItem('auditLogs');
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Failed to retrieve audit logs:', error);
    return [];
  }
}

/**
 * Clear stored audit logs from localStorage
 */
export function clearAuditLogs(): void {
  try {
    localStorage.removeItem('auditLogs');
  } catch (error) {
    console.error('Failed to clear audit logs:', error);
  }
}

export default useAuditLog;
