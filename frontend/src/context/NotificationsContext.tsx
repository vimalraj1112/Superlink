import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useSocket } from './SocketContext';

/**
 * A notification delivered over the socket by the backend
 * (`backend/src/services/socketService.ts` emits `notification:new` to the
 * `user:<id>` and `role:<role>` rooms, which every socket joins on connect).
 */
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  createdAt: string;
  read: boolean;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

/**
 * Notifications are held in memory only — there is no Notification table in the
 * schema, so they reset on page reload. Keep the most recent ones only.
 */
const MAX_NOTIFICATIONS = 50;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleNew = (payload?: {
      type?: string;
      title?: string;
      message?: string;
      data?: Record<string, unknown>;
    }) => {
      const notification: AppNotification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: payload?.type || 'info',
        title: payload?.title || 'Notification',
        message: payload?.message || '',
        data: payload?.data ?? null,
        createdAt: new Date().toISOString(),
        read: false,
      };

      setNotifications((previous) => [notification, ...previous].slice(0, MAX_NOTIFICATIONS));

      // Surface it immediately too, since the bell panel is usually closed.
      toast(notification.title, {
        description: notification.message,
        duration: 6000,
      });
    };

    socket.on('notification:new', handleNew);
    return () => {
      socket.off('notification:new', handleNew);
    };
  }, [socket]);

  const markRead = useCallback((id: string) => {
    setNotifications((previous) => previous.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((previous) => previous.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((previous) => previous.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.reduce((total, n) => (n.read ? total : total + 1), 0);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, removeNotification, clearAll }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
