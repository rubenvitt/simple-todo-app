import { useState, useCallback, useEffect } from 'react';
import { useWebSocket, useWebSocketMessage } from './';

interface UserPresence {
  userId: string;
  username: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: string;
  currentActivity?: {
    type: 'viewing_list' | 'editing_task' | 'idle';
    listId?: string;
    taskId?: string;
  };
}

interface PresenceUpdate {
  userId: string;
  status: UserPresence['status'];
  activity?: UserPresence['currentActivity'];
  timestamp: string;
}

interface UseUserPresenceOptions {
  listId?: string;
  trackOwnPresence?: boolean;
  onUserJoined?: (user: UserPresence) => void;
  onUserLeft?: (userId: string) => void;
  onPresenceUpdate?: (update: PresenceUpdate) => void;
  enabled?: boolean;
}

export const useUserPresence = (
  wsHook: ReturnType<typeof useWebSocket>,
  options: UseUserPresenceOptions
) => {
  const { 
    listId, 
    trackOwnPresence = true, 
    onUserJoined, 
    onUserLeft, 
    onPresenceUpdate, 
    enabled = true 
  } = options;

  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresence>>(new Map());
  const [currentActivity, setCurrentActivity] = useState<UserPresence['currentActivity']>();

  const handleUserJoined = useCallback((user: UserPresence) => {
    setOnlineUsers(prev => new Map(prev.set(user.userId, user)));
    onUserJoined?.(user);
  }, [onUserJoined]);

  const handleUserLeft = useCallback((data: { userId: string }) => {
    setOnlineUsers(prev => {
      const newMap = new Map(prev);
      newMap.delete(data.userId);
      return newMap;
    });
    onUserLeft?.(data.userId);
  }, [onUserLeft]);

  const handlePresenceUpdate = useCallback((update: PresenceUpdate) => {
    setOnlineUsers(prev => {
      const user = prev.get(update.userId);
      if (user) {
        const updatedUser = {
          ...user,
          status: update.status,
          currentActivity: update.activity,
          lastSeen: update.timestamp
        };
        return new Map(prev.set(update.userId, updatedUser));
      }
      return prev;
    });
    onPresenceUpdate?.(update);
  }, [onPresenceUpdate]);

  const handleInitialPresence = useCallback((data: { users: UserPresence[] }) => {
    const usersMap = new Map();
    data.users.forEach(user => {
      usersMap.set(user.userId, user);
    });
    setOnlineUsers(usersMap);
  }, []);

  const userJoinedSubscription = useWebSocketMessage<UserPresence>(wsHook, {
    eventType: 'presence:user_joined',
    onMessage: handleUserJoined,
    enabled: enabled && !!onUserJoined
  });

  const userLeftSubscription = useWebSocketMessage<{ userId: string }>(wsHook, {
    eventType: 'presence:user_left',
    onMessage: handleUserLeft,
    enabled: enabled && !!onUserLeft
  });

  const presenceUpdateSubscription = useWebSocketMessage<PresenceUpdate>(wsHook, {
    eventType: 'presence:updated',
    onMessage: handlePresenceUpdate,
    enabled: enabled && !!onPresenceUpdate
  });

  const initialPresenceSubscription = useWebSocketMessage<{ users: UserPresence[] }>(wsHook, {
    eventType: 'presence:initial',
    onMessage: handleInitialPresence,
    enabled
  });

  const updatePresence = useCallback((status: UserPresence['status'], activity?: UserPresence['currentActivity']) => {
    if (wsHook.isConnected && trackOwnPresence) {
      setCurrentActivity(activity);
      wsHook.send('presence:update', {
        status,
        activity,
        listId
      });
    }
  }, [wsHook, trackOwnPresence, listId]);

  const joinList = useCallback((newListId: string) => {
    if (wsHook.isConnected) {
      wsHook.send('presence:join_list', { listId: newListId });
      updatePresence('online', { type: 'viewing_list', listId: newListId });
    }
  }, [wsHook, updatePresence]);

  const leaveList = useCallback((oldListId: string) => {
    if (wsHook.isConnected) {
      wsHook.send('presence:leave_list', { listId: oldListId });
      updatePresence('online', { type: 'idle' });
    }
  }, [wsHook, updatePresence]);

  const setEditingTask = useCallback((taskId: string) => {
    updatePresence('busy', { 
      type: 'editing_task', 
      listId, 
      taskId 
    });
  }, [updatePresence, listId]);

  const setViewing = useCallback(() => {
    updatePresence('online', { 
      type: 'viewing_list', 
      listId 
    });
  }, [updatePresence, listId]);

  const setAway = useCallback(() => {
    updatePresence('away', { type: 'idle' });
  }, [updatePresence]);

  useEffect(() => {
    if (wsHook.isConnected && listId) {
      joinList(listId);
    }

    return () => {
      if (listId) {
        leaveList(listId);
      }
    };
  }, [wsHook.isConnected, listId, joinList, leaveList]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setAway();
      } else {
        setViewing();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [setAway, setViewing]);

  return {
    onlineUsers: Array.from(onlineUsers.values()),
    onlineUserCount: onlineUsers.size,
    currentActivity,
    updatePresence,
    joinList,
    leaveList,
    setEditingTask,
    setViewing,
    setAway,
    subscriptions: {
      userJoined: userJoinedSubscription,
      userLeft: userLeftSubscription,
      presenceUpdate: presenceUpdateSubscription,
      initialPresence: initialPresenceSubscription
    }
  };
};