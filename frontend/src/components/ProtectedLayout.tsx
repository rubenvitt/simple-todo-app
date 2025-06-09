import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from './AppLayout';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { tokenStorage } from '../services/token-storage.service';

export const ProtectedLayout: React.FC = () => {
  const { logout } = useAuth();
  
  const getToken = () => {
    return tokenStorage.getAccessToken();
  };
  
  const handleTokenExpired = () => {
    logout();
  };
  
  const handleAuthError = (error: any) => {
    console.error('WebSocket auth error:', error);
    logout();
  };

  return (
    <ProtectedRoute>
      <WebSocketProvider
        url={import.meta.env.DEV ? 'ws://localhost:3000' : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`}
        getToken={getToken}
        onTokenExpired={handleTokenExpired}
        onAuthError={handleAuthError}
        enabled={true}
      >
        <NotificationProvider>
          <AppLayout />
        </NotificationProvider>
      </WebSocketProvider>
    </ProtectedRoute>
  );
};