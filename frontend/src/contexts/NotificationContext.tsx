import React, { createContext, useContext } from 'react';
import { useNotificationWebSocket } from '../hooks/useNotificationWebSocket';

interface NotificationContextType {
  isWebSocketConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { isConnected } = useNotificationWebSocket();

  const value = {
    isWebSocketConnected: isConnected,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};