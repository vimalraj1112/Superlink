import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { env } from '@/config/env';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  /** Number of consecutive reconnect attempts since last successful connect (0 = connected/clean). */
  retryCount: number;
  /** Force an immediate reconnect attempt (useful for a manual "retry" button). */
  reconnectNow: () => void;
  joinTicket: (ticketId: string) => void;
  leaveTicket: (ticketId: string) => void;
  joinCustomer: (customerId: string) => void;
  leaveCustomer: (customerId: string) => void;
  joinNotifications: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const newSocket = io(env.VITE_API_URL || 'http://localhost:3002', {
      auth: { token },
      transports: ['websocket', 'polling'],
      // Never give up — realtime should recover on its own once the backend
      // is healthy again (e.g. after a rate-limit window passes or a restart).
      // Exponential backoff (capped) plus jitter so we don't hammer the server.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      setRetryCount(0);
    });

    newSocket.on('disconnect', (reason) => {
      setConnected(false);
      // Server-initiated disconnect: reconnect explicitly, since the automatic
      // reconnection only fires on transport errors/unexpected disconnects.
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      setConnected(false);
      // Keep trying automatically; surface that we're reconnecting so UI can
      // tell the user realtime is temporarily unavailable instead of silently
      // failing. Treat HTTP 429 (rate-limited) as "wait and back off."
      setRetryCount((count) => count + 1);
      if ((error as any)?.description === 429 || (error as any)?.message?.includes('429')) {
        // Rate-limited: the backend is telling us to hold off. Slow down by
        // forcing a longer delay before the next automatic attempt.
        newSocket.io.opts.reconnectionDelay = Math.max(
          newSocket.io.opts.reconnectionDelay,
          5000
        );
      }
    });

    newSocket.on('auth:success', () => {
      // Socket authenticated successfully
    });

    newSocket.on('auth:error', (error) => {
      console.error('Socket auth error:', error);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, [user]);

  const reconnectNow = useCallback(() => {
    if (socketRef.current) {
      // Reset backoff to the floor so a manual retry happens promptly.
      socketRef.current.io.opts.reconnectionDelay = 500;
      socketRef.current.connect();
    }
  }, []);

  const joinTicket = useCallback((ticketId: string) => {
    socket?.emit('join:ticket', ticketId);
  }, [socket]);

  const leaveTicket = useCallback((ticketId: string) => {
    socket?.emit('leave:ticket', ticketId);
  }, [socket]);

  const joinCustomer = useCallback((customerId: string) => {
    socket?.emit('join:customer', customerId);
  }, [socket]);

  const leaveCustomer = useCallback((customerId: string) => {
    socket?.emit('leave:customer', customerId);
  }, [socket]);

  const joinNotifications = useCallback(() => {
    socket?.emit('join:notifications');
  }, [socket]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        retryCount,
        reconnectNow,
        joinTicket,
        leaveTicket,
        joinCustomer,
        leaveCustomer,
        joinNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}