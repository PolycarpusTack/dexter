import { useCallback } from 'react';

// Types for audit log events
interface AuditLogEvent {
  component: string;
  action: string;
  timestamp: number;
  details?: Record<string, any>;
}

// Return type for the logEvent function
type LogEventFunction = (action: string, details?: Record<string, any>) => AuditLogEvent;

/**
 * Hook for logging user interactions and component events
 * @param componentName - Name of the component generating logs
 * @returns Function to log events
 */
export function useAuditLog(componentName: string): LogEventFunction {
  /**
   * Log an event with details
   * @param action - Action being performed
   * @param details - Additional details about the action
   */
  const logEvent = useCallback((
    action: string,
    details?: Record<string, any>
  ) => {
    // Create the event object
    const event: AuditLogEvent = {
      component: componentName,
      action,
      timestamp: Date.now(),
      details
    };
    
    // Log to console in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Audit log:', event);
    }
    
    // In a real application, we would send this to a logging service
    // This could be done through an API call or other method
    // For now, we'll just store it in localStorage for demonstration
    
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
    
    // Return the event (useful for testing)
    return event;
  }, [componentName]);
  
  return logEvent;
}

export default useAuditLog;
