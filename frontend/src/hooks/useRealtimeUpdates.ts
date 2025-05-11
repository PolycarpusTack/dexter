/**
 * Hook for managing real-time updates via WebSocket
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { 
  WebSocketClient, 
  WebSocketStatus, 
  WebSocketMessage,
  getWebSocketClient,
  initializeWebSocket
} from '../services/websocket';
import { useAuth } from './useAuth';

export interface RealtimeConfig {
  enabled?: boolean;
  autoReconnect?: boolean;
  showNotifications?: boolean;
  channels?: string[];
}

export interface RealtimeState {
  status: WebSocketStatus;
  isConnected: boolean;
  lastUpdate?: Date;
  error?: Error;
}

const DEFAULT_CONFIG: RealtimeConfig = {
  enabled: true,
  autoReconnect: true,
  showNotifications: true,
  channels: ['issues', 'alerts'],
};

/**
 * Hook for managing real-time updates
 */
export function useRealtimeUpdates(config: RealtimeConfig = {}) {
  const queryClient = useQueryClient();
  const { user, token } = useAuth();
  const [state, setState] = useState<RealtimeState>({
    status: 'disconnected',
    isConnected: false,
  });
  
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const configRef = useRef({ ...DEFAULT_CONFIG, ...config });
  configRef.current = { ...DEFAULT_CONFIG, ...config };

  // Initialize WebSocket client
  useEffect(() => {
    if (!configRef.current.enabled) return;

    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';
    
    wsClientRef.current = initializeWebSocket({
      url: wsUrl,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      debug: process.env.NODE_ENV === 'development',
    });

    const client = wsClientRef.current;

    // Event listeners
    client.on('statusChange', (status: WebSocketStatus) => {
      setState(prev => ({
        ...prev,
        status,
        isConnected: status === 'connected',
      }));
    });

    client.on('connected', () => {
      setState(prev => ({
        ...prev,
        lastUpdate: new Date(),
      }));

      // Subscribe to default channels
      configRef.current.channels?.forEach(channel => {
        client.subscribe(channel);
      });
    });

    client.on('error', (error: Error) => {
      setState(prev => ({
        ...prev,
        error,
      }));

      if (configRef.current.showNotifications) {
        notifications.show({
          title: 'Connection Error',
          message: 'Real-time updates temporarily unavailable',
          color: 'red',
        });
      }
    });

    // Connect with authentication token
    client.connect(token);

    return () => {
      client.disconnect();
    };
  }, [token]);

  // Handle issue updates
  useEffect(() => {
    if (!wsClientRef.current) return;

    const handleIssueUpdate = (message: WebSocketMessage) => {
      const { update_type, issue_id, data } = message;

      // Update React Query cache
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue', issue_id] });

      // Show notification
      if (configRef.current.showNotifications) {
        let title = 'Issue Updated';
        let color = 'blue';

        switch (update_type) {
          case 'created':
            title = 'New Issue';
            color = 'green';
            break;
          case 'resolved':
            title = 'Issue Resolved';
            color = 'green';
            break;
          case 'assigned':
            title = 'Issue Assigned';
            color = 'yellow';
            break;
        }

        notifications.show({
          title,
          message: data.title || `Issue ${issue_id} ${update_type}`,
          color,
        });
      }

      setState(prev => ({
        ...prev,
        lastUpdate: new Date(),
      }));
    };

    wsClientRef.current.on('issueUpdate', handleIssueUpdate);

    return () => {
      wsClientRef.current?.off('issueUpdate', handleIssueUpdate);
    };
  }, [queryClient]);

  // Handle alert triggers
  useEffect(() => {
    if (!wsClientRef.current) return;

    const handleAlertTrigger = (message: WebSocketMessage) => {
      const { alert_id, data } = message;

      // Update React Query cache
      queryClient.invalidateQueries({ queryKey: ['alerts'] });

      // Show notification
      if (configRef.current.showNotifications) {
        notifications.show({
          title: 'Alert Triggered',
          message: data.message || `Alert ${alert_id} triggered`,
          color: 'red',
        });
      }

      setState(prev => ({
        ...prev,
        lastUpdate: new Date(),
      }));
    };

    wsClientRef.current.on('alertTrigger', handleAlertTrigger);

    return () => {
      wsClientRef.current?.off('alertTrigger', handleAlertTrigger);
    };
  }, [queryClient]);

  // Subscribe to channel
  const subscribe = useCallback((channel: string) => {
    wsClientRef.current?.subscribe(channel);
  }, []);

  // Unsubscribe from channel
  const unsubscribe = useCallback((channel: string) => {
    wsClientRef.current?.unsubscribe(channel);
  }, []);

  // Update presence
  const updatePresence = useCallback((status: string) => {
    wsClientRef.current?.updatePresence(status);
  }, []);

  // Manual reconnect
  const reconnect = useCallback(() => {
    wsClientRef.current?.connect(token);
  }, [token]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    updatePresence,
    reconnect,
  };
}

/**
 * Hook for real-time issue updates
 */
export function useRealtimeIssueUpdates(issueId?: string) {
  const { subscribe, unsubscribe, ...realtimeState } = useRealtimeUpdates();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!issueId) return;

    // Subscribe to specific issue channel
    const channel = `issue:${issueId}`;
    subscribe(channel);

    return () => {
      unsubscribe(channel);
    };
  }, [issueId, subscribe, unsubscribe]);

  // Force refresh issue data
  const refreshIssue = useCallback(() => {
    if (issueId) {
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
    }
  }, [issueId, queryClient]);

  return {
    ...realtimeState,
    refreshIssue,
  };
}

/**
 * Hook for real-time presence
 */
export function useRealtimePresence() {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const { updatePresence } = useRealtimeUpdates();

  useEffect(() => {
    if (!wsClientRef.current) return;

    const handlePresenceUpdate = (message: WebSocketMessage) => {
      const { user_id, status } = message;
      
      setOnlineUsers(prev => {
        if (status === 'online') {
          return [...new Set([...prev, user_id])];
        } else {
          return prev.filter(id => id !== user_id);
        }
      });
    };

    // Subscribe to presence channel
    wsClientRef.current.subscribe('presence');
    wsClientRef.current.on('presenceUpdate', handlePresenceUpdate);

    return () => {
      wsClientRef.current?.unsubscribe('presence');
      wsClientRef.current?.off('presenceUpdate', handlePresenceUpdate);
    };
  }, []);

  // Update own presence
  const setPresence = useCallback((status: string) => {
    updatePresence(status);
  }, [updatePresence]);

  return {
    onlineUsers,
    setPresence,
  };
}

/**
 * Hook for real-time notifications
 */
export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { isConnected } = useRealtimeUpdates();

  useEffect(() => {
    if (!wsClientRef.current || !isConnected) return;

    const handleNotification = (message: WebSocketMessage) => {
      const notification = {
        id: Date.now(),
        ...message.data,
        timestamp: new Date(),
      };

      setNotifications(prev => [notification, ...prev]);

      // Show system notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title || 'New Notification', {
          body: notification.message,
          icon: '/favicon.ico',
        });
      }
    };

    wsClientRef.current.on('notification', handleNotification);

    return () => {
      wsClientRef.current?.off('notification', handleNotification);
    };
  }, [isConnected]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  return {
    notifications,
    clearNotifications,
    markAsRead,
  };
}
