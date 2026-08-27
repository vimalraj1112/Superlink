import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { env } from '@/config/env';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
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
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const newSocket = io(env.VITE_API_URL || 'http://localhost:3002', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      setConnected(false);
    });

    newSocket.on('auth:success', (data) => {
      // Socket authenticated successfully
    });

    newSocket.on('auth:error', (error) => {
      console.error('Socket auth error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

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