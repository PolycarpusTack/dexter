/**
 * WebSocket client for real-time updates
 */

import { EventEmitter } from 'events';

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
  [key: string]: any;
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pendingMessages: WebSocketMessage[] = [];
  private status: WebSocketStatus = 'disconnected';
  private clientId: string;
  private token?: string;
  private subscriptions: Set<string> = new Set();

  constructor(config: WebSocketConfig) {
    super();
    
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      debug: false,
      ...config,
    };
    
    this.clientId = this.generateClientId();
  }

  /**
   * Connect to WebSocket server
   */
  connect(token?: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.token = token;
    this.status = 'connecting';
    this.emit('statusChange', this.status);

    try {
      const url = new URL(this.config.url);
      url.pathname = `/ws/${this.clientId}`;
      if (token) {
        url.searchParams.set('token', token);
      }

      this.ws = new WebSocket(url.toString());
      this.setupEventListeners();
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearTimers();
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.status = 'disconnected';
    this.emit('statusChange', this.status);
  }

  /**
   * Send a message through WebSocket
   */
  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for sending when connected
      this.pendingMessages.push(message);
    }
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string): void {
    this.send({
      type: 'subscribe',
      channel,
    });
    this.subscriptions.add(channel);
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string): void {
    this.send({
      type: 'unsubscribe',
      channel,
    });
    this.subscriptions.delete(channel);
  }

  /**
   * Update user presence
   */
  updatePresence(status: string): void {
    this.send({
      type: 'presence',
      status,
    });
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Get client ID
   */
  getClientId(): string {
    return this.clientId;
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.status = 'connected';
      this.emit('statusChange', this.status);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.processPendingMessages();
      this.resubscribeChannels();
      this.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        this.log('Error parsing message:', error);
      }
    };

    this.ws.onclose = (event) => {
      this.log('WebSocket closed:', event.code, event.reason);
      this.status = 'disconnected';
      this.emit('statusChange', this.status);
      this.clearTimers();
      
      if (event.code !== 1000 && event.code !== 1001) {
        // Abnormal closure, attempt reconnect
        this.reconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.handleError(error);
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    this.log('Received message:', message);

    switch (message.type) {
      case 'connection':
        this.emit('connected', message);
        break;
      
      case 'pong':
        // Heartbeat response received
        break;
      
      case 'subscription':
        this.emit('subscription', message);
        break;
      
      case 'issue_update':
        this.emit('issueUpdate', message);
        break;
      
      case 'alert_trigger':
        this.emit('alertTrigger', message);
        break;
      
      case 'presence_update':
        this.emit('presenceUpdate', message);
        break;
      
      case 'notification':
        this.emit('notification', message);
        break;
      
      default:
        this.emit('message', message);
    }
  }

  private handleError(error: any): void {
    this.log('WebSocket error:', error);
    this.status = 'error';
    this.emit('statusChange', this.status);
    this.emit('error', error);
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached');
      this.status = 'error';
      this.emit('statusChange', this.status);
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    this.status = 'reconnecting';
    this.emit('statusChange', this.status);
    
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.token);
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          timestamp: new Date().toISOString(),
        });
      }
    }, this.config.heartbeatInterval);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private processPendingMessages(): void {
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private resubscribeChannels(): void {
    this.subscriptions.forEach(channel => {
      this.send({
        type: 'subscribe',
        channel,
      });
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WebSocket]', ...args);
    }
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(config?: WebSocketConfig): WebSocketClient {
  if (!wsClient && config) {
    wsClient = new WebSocketClient(config);
  }
  
  if (!wsClient) {
    throw new Error('WebSocket client not initialized. Please provide config on first call.');
  }
  
  return wsClient;
}

export function initializeWebSocket(config: WebSocketConfig): WebSocketClient {
  if (wsClient) {
    wsClient.disconnect();
  }
  
  wsClient = new WebSocketClient(config);
  return wsClient;
}
