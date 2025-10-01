/**
 * Tests for WebSocket memory leak fixes
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketClient, initializeWebSocket, destroyWebSocketClient } from '../websocket';

// Mock WebSocket
class MockWebSocket {
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }
  
  send(data: string) {
    // Mock send
  }
  
  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('WebSocket Memory Leak Prevention', () => {
  let client: WebSocketClient;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Clean up any existing client
    destroyWebSocketClient();
  });
  
  it('should remove all event listeners on disconnect', () => {
    client = initializeWebSocket({ url: 'ws://localhost:8000' });
    const removeAllListenersSpy = vi.spyOn(client, 'removeAllListeners');
    
    client.connect();
    
    // Let connection establish
    setTimeout(() => {
      client.disconnect();
      
      // Check that removeAllListeners was called
      expect(removeAllListenersSpy).toHaveBeenCalled();
      
      // Check that WebSocket event handlers are nullified
      const ws = (client as any).ws;
      if (ws) {
        expect(ws.onopen).toBeNull();
        expect(ws.onmessage).toBeNull();
        expect(ws.onclose).toBeNull();
        expect(ws.onerror).toBeNull();
      }
    }, 20);
  });
  
  it('should clear pending messages on disconnect', () => {
    client = initializeWebSocket({ url: 'ws://localhost:8000' });
    
    // Add some pending messages
    client.send({ type: 'test1', data: 'message1' });
    client.send({ type: 'test2', data: 'message2' });
    
    const pendingMessages = (client as any).pendingMessages;
    expect(pendingMessages.length).toBeGreaterThan(0);
    
    client.disconnect();
    
    // Check that pending messages are cleared
    expect((client as any).pendingMessages.length).toBe(0);
  });
  
  it('should clear subscriptions on disconnect', () => {
    client = initializeWebSocket({ url: 'ws://localhost:8000' });
    
    client.connect();
    
    // Add subscriptions
    client.subscribe('channel1');
    client.subscribe('channel2');
    
    const subscriptions = (client as any).subscriptions;
    expect(subscriptions.size).toBe(2);
    
    client.disconnect();
    
    // Check that subscriptions are cleared
    expect((client as any).subscriptions.size).toBe(0);
  });
  
  it('should clear timers on disconnect', () => {
    client = initializeWebSocket({ url: 'ws://localhost:8000' });
    
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    client.connect();
    
    // Let connection establish and timers start
    setTimeout(() => {
      client.disconnect();
      
      // Check that timers are cleared
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      // Check internal timer references are null
      expect((client as any).reconnectTimer).toBeNull();
      expect((client as any).heartbeatTimer).toBeNull();
    }, 20);
  });
  
  it('should properly clean up singleton instance', () => {
    const client1 = initializeWebSocket({ url: 'ws://localhost:8000' });
    const disconnectSpy = vi.spyOn(client1, 'disconnect');
    
    // Initialize again should disconnect the first client
    const client2 = initializeWebSocket({ url: 'ws://localhost:8001' });
    
    expect(disconnectSpy).toHaveBeenCalled();
    expect(client2).not.toBe(client1);
  });
  
  it('should handle multiple connect/disconnect cycles without leaks', () => {
    client = initializeWebSocket({ url: 'ws://localhost:8000' });
    
    const eventCounts: number[] = [];
    
    // Perform multiple connect/disconnect cycles
    for (let i = 0; i < 5; i++) {
      client.connect();
      
      // Add event listeners
      client.on('message', () => {});
      client.on('error', () => {});
      client.on('statusChange', () => {});
      
      // Count event listeners
      eventCounts.push(client.listenerCount('message'));
      
      client.disconnect();
    }
    
    // Event listener count should not grow with each cycle
    expect(eventCounts.every(count => count === eventCounts[0])).toBe(true);
    
    // After final disconnect, should have no listeners
    expect(client.listenerCount('message')).toBe(0);
    expect(client.listenerCount('error')).toBe(0);
    expect(client.listenerCount('statusChange')).toBe(0);
  });
});