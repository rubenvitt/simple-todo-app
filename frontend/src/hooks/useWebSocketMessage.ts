import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

interface UseWebSocketMessageOptions<T = any> {
  eventType: string;
  onMessage?: (data: T) => void;
  onError?: (error: any) => void;
  enabled?: boolean;
  autoAcknowledge?: boolean;
  messageHistory?: boolean;
  maxHistorySize?: number;
}

interface MessageWithTimestamp<T = any> {
  data: T;
  timestamp: Date;
  acknowledged?: boolean;
}

interface UseWebSocketMessageReturn<T = any> {
  lastMessage: MessageWithTimestamp<T> | null;
  messageHistory: MessageWithTimestamp<T>[];
  send: (data: any) => void;
  acknowledge: (messageId?: string) => void;
  clearHistory: () => void;
  isListening: boolean;
}

export const useWebSocketMessage = <T = any>(
  wsHook: ReturnType<typeof useWebSocket>,
  options: UseWebSocketMessageOptions<T>
): UseWebSocketMessageReturn<T> => {
  const { subscribe, send, isConnected } = wsHook;
  const {
    eventType,
    onMessage,
    onError,
    enabled = true,
    autoAcknowledge = false,
    messageHistory = false,
    maxHistorySize = 100
  } = options;

  const [lastMessage, setLastMessage] = useState<MessageWithTimestamp<T> | null>(null);
  const [history, setHistory] = useState<MessageWithTimestamp<T>[]>([]);
  const isListeningRef = useRef(false);

  const handleMessage = useCallback((data: T) => {
    const messageWithTimestamp: MessageWithTimestamp<T> = {
      data,
      timestamp: new Date(),
      acknowledged: autoAcknowledge
    };

    setLastMessage(messageWithTimestamp);

    if (messageHistory) {
      setHistory(prev => {
        const newHistory = [messageWithTimestamp, ...prev];
        return newHistory.slice(0, maxHistorySize);
      });
    }

    if (onMessage) {
      try {
        onMessage(data);
      } catch (error) {
        console.error(`Error handling WebSocket message for ${eventType}:`, error);
        if (onError) {
          onError(error);
        }
      }
    }

    if (autoAcknowledge) {
      send(`${eventType}_ack`, { timestamp: messageWithTimestamp.timestamp });
    }
  }, [eventType, onMessage, onError, autoAcknowledge, messageHistory, maxHistorySize, send]);

  const sendMessage = useCallback((data: any) => {
    send(eventType, data);
  }, [send, eventType]);

  const acknowledge = useCallback((messageId?: string) => {
    if (lastMessage && !lastMessage.acknowledged) {
      setLastMessage(prev => prev ? { ...prev, acknowledged: true } : null);
      
      if (messageHistory) {
        setHistory(prev => prev.map(msg => 
          msg.timestamp === lastMessage.timestamp 
            ? { ...msg, acknowledged: true }
            : msg
        ));
      }
    }

    send(`${eventType}_ack`, { 
      messageId, 
      timestamp: lastMessage?.timestamp 
    });
  }, [lastMessage, messageHistory, send, eventType]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setLastMessage(null);
  }, []);

  useEffect(() => {
    if (!enabled || !isConnected) {
      isListeningRef.current = false;
      return;
    }

    isListeningRef.current = true;
    const unsubscribe = subscribe(eventType, handleMessage);

    return () => {
      unsubscribe();
      isListeningRef.current = false;
    };
  }, [subscribe, eventType, handleMessage, enabled, isConnected]);

  return {
    lastMessage,
    messageHistory: history,
    send: sendMessage,
    acknowledge,
    clearHistory,
    isListening: isListeningRef.current
  };
};