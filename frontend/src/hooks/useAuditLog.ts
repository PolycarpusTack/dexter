// File: src/hooks/useAuditLog.ts

import { useCallback } from 'react';
import useAppStore from '../store/appStore';

export interface AuditLogEvent {
  timestamp: string;
  component: string;
  action: string;
  details: Record<string, any>;
}

/**
 * Hook for logging user actions for audit purposes
 * 
 * @param component - Component name for the log source
 * @returns Function to log events
 */
export function useAuditLog(component: string) {
  const { userId, organizationId } = useAppStore(state => ({
    userId: state.userId,
    organizationId: state.organizationId
  }));
  
  /**
   * Log an action with details
   * 
   * @param action - Action name
   * @param details - Additional details
   */
  const logEvent = useCallback((
    action: string,
    details: Record<string, any> = {}
  ) => {
    // Create audit log event
    const event: AuditLogEvent = {
      timestamp: new Date().toISOString(),
      component,
      action,
      details: {
        ...details,
        userId,
        organizationId
      }
    };
    
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[AuditLog] ${component}:${action}`, event);
    }
    
    // TODO: Send to backend API or analytics service in production
    // This would typically use an API call to store the audit trail
    
    return event;
  }, [component, userId, organizationId]);
  
  return logEvent;
}

export default useAuditLog;
