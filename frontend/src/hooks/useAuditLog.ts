// frontend/src/hooks/useAuditLog.ts

import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { AuditLogEvent } from '../types/deadlock';

/**
 * Hook for audit logging user interactions
 * 
 * @param componentName Name of the component using this hook
 * @returns Log function
 */
export function useAuditLog(componentName: string) {
  // Get current user information from store
  const userId = useAppStore(state => state.userInfo?.id || 'anonymous');
  const organizationId = useAppStore(state => state.organization?.id || 'unknown');
  
  /**
   * Log an audit event
   * 
   * @param action The action being performed
   * @param details Additional details about the action
   * @returns The created audit event object
   */
  const logEvent = useCallback((action: string, details: Record<string, any> = {}) => {
    const timestamp = new Date().toISOString();
    const auditEvent: AuditLogEvent = {
      timestamp,
      userId,
      organizationId,
      component: componentName,
      action,
      details
    };
    
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('[Audit]', auditEvent);
    }
    
    // TODO: In the future, send to backend API
    // Currently just storing in localStorage for development/demo purposes
    try {
      const existingLogsStr = localStorage.getItem('dexterAuditLogs');
      const existingLogs: AuditLogEvent[] = existingLogsStr ? JSON.parse(existingLogsStr) : [];
      
      existingLogs.push(auditEvent);
      // Keep only the last 100 events to avoid localStorage size limits
      if (existingLogs.length > 100) {
        existingLogs.shift();
      }
      localStorage.setItem('dexterAuditLogs', JSON.stringify(existingLogs));
    } catch (error) {
      console.error('Error storing audit log:', error);
    }
    
    return auditEvent;
  }, [componentName, userId, organizationId]);
  
  return logEvent;
}
