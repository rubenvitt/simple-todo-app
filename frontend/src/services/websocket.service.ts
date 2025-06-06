import { io, Socket } from 'socket.io-client';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export interface WebSocketConfig {
  url: string;
  autoConnect?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

class WebSocketService {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private messageQueue: WebSocketMessage[] = [];
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private retryCount = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();

  constructor(config: WebSocketConfig) {
    this.config = {
      autoConnect: true,
      maxRetries: 5,
      retryDelay: 1000,
      timeout: 5000,
      ...config
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.updateConnectionState(ConnectionState.CONNECTING);

      const socketConfig: any = {
        timeout: this.config.timeout,
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true
      };

      if (token) {
        socketConfig.auth = { token };
        socketConfig.extraHeaders = { Authorization: `Bearer ${token}` };
      }

      this.socket = io(this.config.url, socketConfig);

      this.socket.on('connect', () => {
        this.updateConnectionState(ConnectionState.CONNECTED);
        this.retryCount = 0;
        this.processMessageQueue();
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        this.updateConnectionState(ConnectionState.DISCONNECTED);
        
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
          return;
        }

        this.handleReconnection();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.updateConnectionState(ConnectionState.ERROR);
        
        if (this.retryCount === 0) {
          reject(error);
        }
        
        this.handleReconnection();
      });

      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.updateConnectionState(ConnectionState.ERROR);
      });

      this.setupMessageHandling();
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateConnectionState(ConnectionState.DISCONNECTED);
    this.retryCount = 0;
  }

  send(type: string, payload: any): void {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now()
    };

    if (this.isConnected()) {
      this.socket?.emit(type, payload);
    } else {
      this.messageQueue.push(message);
    }
  }

  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(callback);

    if (this.socket) {
      this.socket.on(eventType, callback);
    }

    return () => this.unsubscribe(eventType, callback);
  }

  unsubscribe(eventType: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }

    if (this.socket) {
      this.socket.off(eventType, callback);
    }
  }

  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(callback);
    callback(this.connectionState);

    return () => {
      this.stateListeners.delete(callback);
    };
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED && this.socket?.connected === true;
  }

  private updateConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.stateListeners.forEach(listener => listener(state));
    }
  }

  private handleReconnection(): void {
    if (this.retryCount >= this.config.maxRetries!) {
      this.updateConnectionState(ConnectionState.ERROR);
      return;
    }

    this.updateConnectionState(ConnectionState.RECONNECTING);
    this.retryCount++;

    const delay = this.config.retryDelay! * Math.pow(2, this.retryCount - 1);

    this.reconnectTimer = setTimeout(() => {
      if (this.connectionState === ConnectionState.RECONNECTING) {
        this.connect();
      }
    }, delay);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!;
      this.socket?.emit(message.type, message.payload);
    }
  }

  private setupMessageHandling(): void {
    if (!this.socket) return;

    this.listeners.forEach((callbacks, eventType) => {
      callbacks.forEach(callback => {
        this.socket?.on(eventType, callback);
      });
    });
  }

  clearMessageQueue(): void {
    this.messageQueue = [];
  }

  getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }
}

export default WebSocketService;