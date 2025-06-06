import { useState, useEffect, useCallback } from 'react';
import { ConnectionState } from '../services/websocket.service';
import { useWebSocket } from './useWebSocket';

interface ConnectionInfo {
  state: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  hasError: boolean;
  queuedMessages: number;
  lastConnected?: Date;
  lastDisconnected?: Date;
}

interface UseWebSocketConnectionReturn extends ConnectionInfo {
  connect: () => Promise<void>;
  disconnect: () => void;
  retry: () => Promise<void>;
  clearQueue: () => void;
}

export const useWebSocketConnection = (
  wsHook: ReturnType<typeof useWebSocket>
): UseWebSocketConnectionReturn => {
  const { 
    connectionState, 
    isConnected, 
    connect, 
    disconnect, 
    queuedMessageCount, 
    clearQueue 
  } = wsHook;

  const [lastConnected, setLastConnected] = useState<Date | undefined>();
  const [lastDisconnected, setLastDisconnected] = useState<Date | undefined>();

  const retry = useCallback(async () => {
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await connect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (connectionState === ConnectionState.CONNECTED && !lastConnected) {
      setLastConnected(new Date());
    } else if (connectionState === ConnectionState.DISCONNECTED && isConnected) {
      setLastDisconnected(new Date());
    }
  }, [connectionState, isConnected, lastConnected]);

  const connectionInfo: ConnectionInfo = {
    state: connectionState,
    isConnected,
    isConnecting: connectionState === ConnectionState.CONNECTING,
    isReconnecting: connectionState === ConnectionState.RECONNECTING,
    hasError: connectionState === ConnectionState.ERROR,
    queuedMessages: queuedMessageCount,
    lastConnected,
    lastDisconnected
  };

  return {
    ...connectionInfo,
    connect,
    disconnect,
    retry,
    clearQueue
  };
};