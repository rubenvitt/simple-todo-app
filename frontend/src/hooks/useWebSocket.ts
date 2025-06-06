import { useEffect, useRef, useCallback, useState } from 'react';
import { ConnectionState } from '../services/websocket.service';
import AuthenticatedWebSocketService from '../services/websocket-auth.service';

interface UseWebSocketOptions {
  url: string;
  getToken: () => string | null;
  onTokenExpired?: () => void;
  onAuthError?: (error: any) => void;
  refreshToken?: () => Promise<string | null>;
  autoConnect?: boolean;
  enabled?: boolean;
}

interface WebSocketHookReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (type: string, payload: any) => void;
  subscribe: (eventType: string, callback: (data: any) => void) => () => void;
  queuedMessageCount: number;
  clearQueue: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions): WebSocketHookReturn => {
  const wsRef = useRef<AuthenticatedWebSocketService | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [queuedMessageCount, setQueuedMessageCount] = useState(0);

  const connect = useCallback(async () => {
    if (!wsRef.current) return;
    
    try {
      await wsRef.current.connect();
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
    }
  }, []);

  const send = useCallback((type: string, payload: any) => {
    if (wsRef.current) {
      wsRef.current.send(type, payload);
      setQueuedMessageCount(wsRef.current.getQueuedMessageCount());
    }
  }, []);

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    if (!wsRef.current) {
      return () => {};
    }
    return wsRef.current.subscribe(eventType, callback);
  }, []);

  const clearQueue = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.clearMessageQueue();
      setQueuedMessageCount(0);
    }
  }, []);

  useEffect(() => {
    if (!options.enabled && options.enabled !== undefined) {
      return;
    }

    wsRef.current = new AuthenticatedWebSocketService({
      url: options.url,
      getToken: options.getToken,
      onTokenExpired: options.onTokenExpired,
      onAuthError: options.onAuthError,
      refreshToken: options.refreshToken,
      autoConnect: options.autoConnect ?? true
    });

    const unsubscribeState = wsRef.current.onConnectionStateChange((state) => {
      setConnectionState(state);
      setQueuedMessageCount(wsRef.current?.getQueuedMessageCount() || 0);
    });

    return () => {
      unsubscribeState();
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [options.url, options.enabled]);

  return {
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    connect,
    disconnect,
    send,
    subscribe,
    queuedMessageCount,
    clearQueue
  };
};