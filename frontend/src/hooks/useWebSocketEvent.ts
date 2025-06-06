import { useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

interface UseWebSocketEventOptions<T = any> {
  eventType: string;
  onMessage?: (data: T) => void;
  enabled?: boolean;
  dependencies?: any[];
}

export const useWebSocketEvent = <T = any>(
  wsHook: ReturnType<typeof useWebSocket>,
  options: UseWebSocketEventOptions<T>
): {
  sendMessage: (data: any) => void;
  isListening: boolean;
} => {
  const { subscribe, send, isConnected } = wsHook;
  const { eventType, onMessage, enabled = true, dependencies = [] } = options;
  const isListeningRef = useRef(false);

  const sendMessage = useCallback((data: any) => {
    send(eventType, data);
  }, [send, eventType]);

  useEffect(() => {
    if (!enabled || !isConnected || !onMessage) {
      isListeningRef.current = false;
      return;
    }

    isListeningRef.current = true;
    const unsubscribe = subscribe(eventType, onMessage);

    return () => {
      unsubscribe();
      isListeningRef.current = false;
    };
  }, [subscribe, eventType, onMessage, enabled, isConnected, ...dependencies]);

  return {
    sendMessage,
    isListening: isListeningRef.current
  };
};