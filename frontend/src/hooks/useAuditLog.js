// frontend/src/hooks/useAuditLog.js

import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';

/**
 * Hook for audit logging user interactions
 * This initial implementation logs to console, but can be
 * extended to send logs to a backend API or analytics service
 * 
 * @param {string} componentName - Name of the component using this hook
 * @returns {Function} Log function
 */
export function useAuditLog(componentName) {
  // Get current user information from store
  const userId = useAppStore(state => state.userInfo?.id || 'anonymous');
  const organizationId = useAppStore(state => state.organization?.id || 'unknown');
  
  /**
   * Log an audit event
   * 
   * @param {string} action - The action being performed
   * @param {Object} details - Additional details about the action
   */
  const logEvent = useCallback((action, details = {}) => {
    const timestamp = new Date().toISOString();
    const auditEvent = {
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
      const existingLogs = JSON.parse(localStorage.getItem('dexterAuditLogs') || '[]');
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
