export interface ConnectionState {
  socketId: string;
  userId: string;
  status: ConnectionStatus;
  connectedAt: Date;
  lastSeen: Date;
  lastPing?: Date;
  ipAddress?: string;
  userAgent?: string;
  reconnectionCount?: number;
}

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  isOnline: boolean;
  lastSeen: Date;
  currentActivity?: UserActivity;
  activeConnections: string[]; // Array of socket IDs for multi-tab support
}

export interface UserActivity {
  type: ActivityType;
  description?: string;
  listId?: string;
  taskId?: string;
  timestamp: Date;
}

export interface PresenceUpdate {
  userId: string;
  userName: string;
  status: PresenceStatus;
  isOnline: boolean;
  lastSeen: Date;
  activity?: UserActivity;
}

export interface HeartbeatConfig {
  interval: number; // Heartbeat interval in milliseconds
  timeout: number; // Timeout before considering connection stale
  maxMissedHeartbeats: number; // Max missed heartbeats before disconnect
}

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export enum PresenceStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

export enum ActivityType {
  VIEWING_LIST = 'viewing_list',
  EDITING_TASK = 'editing_task',
  CREATING_TASK = 'creating_task',
  IDLE = 'idle',
  TYPING = 'typing',
}
