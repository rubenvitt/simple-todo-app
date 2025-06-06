import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket, useWebSocketConnection } from '../hooks';
import { ConnectionState } from '../services/websocket.service';

interface WebSocketContextType {
  wsHook: ReturnType<typeof useWebSocket>;
  connectionInfo: ReturnType<typeof useWebSocketConnection>;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
  getToken: () => string | null;
  onTokenExpired?: () => void;
  onAuthError?: (error: any) => void;
  refreshToken?: () => Promise<string | null>;
  enabled?: boolean;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  url = 'ws://localhost:3000',
  getToken,
  onTokenExpired,
  onAuthError,
  refreshToken,
  enabled = true
}) => {
  const wsHook = useWebSocket({
    url,
    getToken,
    onTokenExpired,
    onAuthError,
    refreshToken,
    autoConnect: true,
    enabled
  });

  const connectionInfo = useWebSocketConnection(wsHook);

  return (
    <WebSocketContext.Provider value={{ wsHook, connectionInfo }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

export const useWebSocketHook = () => {
  const { wsHook } = useWebSocketContext();
  return wsHook;
};

export const useConnectionInfo = () => {
  const { connectionInfo } = useWebSocketContext();
  return connectionInfo;
};