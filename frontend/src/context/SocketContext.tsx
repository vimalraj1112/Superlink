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

    // Re-read the latest access token and point the socket at it, so the next
    // automatic attempt uses a fresh token. The API layer rotates this token on
    // 401 via axios.ts, so realtime recovers the moment a new token is written
    // to localStorage — instead of retrying forever with a stale one.
    const refreshSocketAuth = () => {
      const latestToken = localStorage.getItem('accessToken');
      if (latestToken) {
        newSocket.auth = { token: latestToken };
      }
    };

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
      // Surface that we're reconnecting so UI can tell the user realtime is
      // temporarily unavailable instead of silently failing.
      setRetryCount((count) => count + 1);
      // Stale/expired access token is the common cause here — refresh it so the
      // next attempt authenticates. (The 429 rate-limit case also lands here and
      // is handled the same way: keep trying but with the current token.)
      refreshSocketAuth();
    });

    newSocket.on('auth:success', () => {
      // Socket authenticated successfully
    });

    newSocket.on('auth:error', (error) => {
      // Backend explicitly rejected the token — re-read the latest one and retry.
      refreshSocketAuth();
      newSocket.connect();
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