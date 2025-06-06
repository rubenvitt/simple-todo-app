import WebSocketService, { ConnectionState } from './websocket.service';

export interface AuthenticatedWebSocketConfig {
  url: string;
  getToken: () => string | null;
  onTokenExpired?: () => void;
  onAuthError?: (error: any) => void;
  refreshToken?: () => Promise<string | null>;
  autoConnect?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

class AuthenticatedWebSocketService {
  private wsService: WebSocketService;
  private config: AuthenticatedWebSocketConfig;
  private isAuthenticating = false;
  private authRetryCount = 0;
  private maxAuthRetries = 3;

  constructor(config: AuthenticatedWebSocketConfig) {
    this.config = config;
    
    this.wsService = new WebSocketService({
      url: config.url,
      autoConnect: false,
      maxRetries: config.maxRetries || 5,
      retryDelay: config.retryDelay || 1000
    });

    this.setupAuthenticationHandling();

    if (config.autoConnect) {
      this.connect();
    }
  }

  async connect(): Promise<void> {
    const token = this.config.getToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    try {
      await this.wsService.connect(token);
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      
      if (this.config.refreshToken && this.authRetryCount < this.maxAuthRetries) {
        await this.handleTokenRefresh();
      } else {
        throw error;
      }
    }
  }

  disconnect(): void {
    this.wsService.disconnect();
    this.isAuthenticating = false;
    this.authRetryCount = 0;
  }

  send(type: string, payload: any): void {
    this.wsService.send(type, payload);
  }

  subscribe(eventType: string, callback: (data: any) => void): () => void {
    return this.wsService.subscribe(eventType, callback);
  }

  unsubscribe(eventType: string, callback: (data: any) => void): void {
    this.wsService.unsubscribe(eventType, callback);
  }

  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void {
    return this.wsService.onConnectionStateChange(callback);
  }

  getConnectionState(): ConnectionState {
    return this.wsService.getConnectionState();
  }

  isConnected(): boolean {
    return this.wsService.isConnected();
  }

  private setupAuthenticationHandling(): void {
    this.wsService.subscribe('auth_error', (error: any) => {
      console.error('WebSocket authentication error:', error);
      this.handleAuthenticationError(error);
    });

    this.wsService.subscribe('token_expired', () => {
      console.warn('WebSocket token expired');
      this.handleTokenExpiration();
    });

    this.wsService.subscribe('unauthorized', (error: any) => {
      console.error('WebSocket unauthorized:', error);
      this.handleAuthenticationError(error);
    });

    this.wsService.onConnectionStateChange((state) => {
      if (state === ConnectionState.ERROR && !this.isAuthenticating) {
        this.handleConnectionError();
      }
    });
  }

  private async handleTokenExpiration(): Promise<void> {
    if (this.config.onTokenExpired) {
      this.config.onTokenExpired();
    }

    if (this.config.refreshToken) {
      await this.handleTokenRefresh();
    } else {
      this.disconnect();
    }
  }

  private async handleAuthenticationError(error: any): Promise<void> {
    if (this.config.onAuthError) {
      this.config.onAuthError(error);
    }

    this.authRetryCount++;

    if (this.authRetryCount < this.maxAuthRetries && this.config.refreshToken) {
      await this.handleTokenRefresh();
    } else {
      this.disconnect();
      throw new Error(`Authentication failed after ${this.maxAuthRetries} attempts`);
    }
  }

  private async handleTokenRefresh(): Promise<void> {
    if (this.isAuthenticating) {
      return;
    }

    this.isAuthenticating = true;

    try {
      console.log('Attempting to refresh WebSocket token...');
      
      const newToken = await this.config.refreshToken!();
      
      if (newToken) {
        this.disconnect();
        await this.wsService.connect(newToken);
        this.authRetryCount = 0;
        console.log('WebSocket token refreshed successfully');
      } else {
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.authRetryCount++;
      
      if (this.authRetryCount >= this.maxAuthRetries) {
        this.disconnect();
        throw error;
      }
    } finally {
      this.isAuthenticating = false;
    }
  }

  private async handleConnectionError(): Promise<void> {
    const token = this.config.getToken();
    
    if (!token && this.config.refreshToken) {
      try {
        await this.handleTokenRefresh();
      } catch (error) {
        console.error('Failed to recover from connection error:', error);
      }
    }
  }

  getQueuedMessageCount(): number {
    return this.wsService.getQueuedMessageCount();
  }

  clearMessageQueue(): void {
    this.wsService.clearMessageQueue();
  }
}

export default AuthenticatedWebSocketService;