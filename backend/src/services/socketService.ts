import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '@/config/env';
import { verifyAccessToken, JwtPayload } from '@/utils/jwt';
import { prisma } from '@/config/db';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload & { permissions?: Record<string, string[]> };
}

interface SocketEvents {
  // Server to client events
  'ticket:created': (data: { ticket: any }) => void;
  'ticket:updated': (data: { ticket: any; changes: string[] }) => void;
  'ticket:assigned': (data: { ticket: any; assignedTo: any }) => void;
  'ticket:message': (data: { ticketId: string; message: any }) => void;
  'ticket:statusChanged': (data: { ticketId: string; status: string; oldStatus: string }) => void;
  'ticket:priorityChanged': (data: { ticketId: string; priority: string; oldPriority: string }) => void;
  'chat:newMessage': (data: { sessionId: string; message: any }) => void;
  'chat:newSession': (data: { session: any }) => void;
  'notification:new': (data: { type: string; title: string; message: string; data?: any }) => void;

  // Client to server events
  'authenticate': (token: string) => void;
  'join:ticket': (ticketId: string) => void;
  'leave:ticket': (ticketId: string) => void;
  'join:customer': (customerId: string) => void;
  'leave:customer': (customerId: string) => void;
  'join:notifications': () => void;
}

let io: Server<SocketEvents> | null = null;

/**
 * Initialize Socket.io server
 */
export function initSocketServer(httpServer: HttpServer): Server<SocketEvents> {
  io = new Server<SocketEvents>(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const payload = verifyAccessToken(token);

      // Fetch user to get permissions
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { role: true },
      });

      if (!user || !user.isActive) {
        return next(new Error('User no longer exists or is inactive'));
      }

      socket.user = {
        ...payload,
        permissions: user.role.permissions as Record<string, string[]> | undefined,
      };

      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.user?.userId})`);

    // Join notification room for this user
    socket.join(`user:${socket.user?.userId}`);

    // Join role-based rooms
    if (socket.user?.role) {
      socket.join(`role:${socket.user.role}`);
    }

    // Handle authentication (for token refresh)
    socket.on('authenticate', async (token: string) => {
      try {
        const payload = verifyAccessToken(token);
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          include: { role: true },
        });

        if (!user || !user.isActive) {
          socket.emit('auth:error', { message: 'User no longer exists or is inactive' });
          return;
        }

        socket.user = {
          ...payload,
          permissions: user.role.permissions as Record<string, string[]> | undefined,
        };

        socket.emit('auth:success', { user: { id: user.id, email: user.email, role: user.role.name } });
      } catch {
        socket.emit('auth:error', { message: 'Invalid or expired token' });
      }
    });

    // Join ticket room
    socket.on('join:ticket', (ticketId: string) => {
      socket.join(`ticket:${ticketId}`);
      console.log(`Socket ${socket.id} joined ticket:${ticketId}`);
    });

    // Leave ticket room
    socket.on('leave:ticket', (ticketId: string) => {
      socket.leave(`ticket:${ticketId}`);
    });

    // Join customer room
    socket.on('join:customer', (customerId: string) => {
      socket.join(`customer:${customerId}`);
    });

    // Leave customer room
    socket.on('leave:customer', (customerId: string) => {
      socket.leave(`customer:${customerId}`);
    });

    // Join notifications room
    socket.on('join:notifications', () => {
      socket.join('notifications');
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('Socket.io server initialized');
  return io;
}

/**
 * Get Socket.io instance
 */
export function getSocketServer(): Server<SocketEvents> | null {
  return io;
}

/**
 * Emit new ticket event to relevant users
 */
export function emitTicketCreated(ticket: any) {
  if (!io) return;

  // Notify assigned user
  if (ticket.assignedToId) {
    io.to(`user:${ticket.assignedToId}`).emit('ticket:created', { ticket });
    io.to(`user:${ticket.assignedToId}`).emit('notification:new', {
      type: 'ticket_created',
      title: 'New Ticket Assigned',
      message: `Ticket ${ticket.ticketNumber}: ${ticket.title} has been assigned to you`,
      data: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber },
    });
  }

  // Notify support/NOC/Finance roles
  io.to('role:SUPPORT').emit('ticket:created', { ticket });
  io.to('role:NOC').emit('ticket:created', { ticket });
  io.to('role:FINANCE').emit('ticket:created', { ticket });
  io.to('role:SUPER_ADMIN').emit('ticket:created', { ticket });
  io.to('role:ISP_OWNER').emit('ticket:created', { ticket });

  // Notify customer
  io.to(`customer:${ticket.customerId}`).emit('ticket:created', { ticket });
}

/**
 * Emit ticket updated event
 */
export function emitTicketUpdated(ticket: any, changes: string[]) {
  if (!io) return;

  io.to(`ticket:${ticket.id}`).emit('ticket:updated', { ticket, changes });

  // Notify assigned user
  if (ticket.assignedToId) {
    io.to(`user:${ticket.assignedToId}`).emit('notification:new', {
      type: 'ticket_updated',
      title: 'Ticket Updated',
      message: `Ticket ${ticket.ticketNumber} has been updated`,
      data: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, changes },
    });
  }
}

/**
 * Emit ticket assigned event
 */
export function emitTicketAssigned(ticket: any, assignedTo: any) {
  if (!io) return;

  // Notify the newly assigned user
  if (assignedTo) {
    io.to(`user:${assignedTo.id}`).emit('ticket:assigned', { ticket, assignedTo });
    io.to(`user:${assignedTo.id}`).emit('notification:new', {
      type: 'ticket_assigned',
      title: 'Ticket Assigned',
      message: `You have been assigned to ticket ${ticket.ticketNumber}: ${ticket.title}`,
      data: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber },
    });
  }

  // Notify in ticket room
  io.to(`ticket:${ticket.id}`).emit('ticket:assigned', { ticket, assignedTo });
}

/**
 * Emit new ticket message
 */
export function emitTicketMessage(ticketId: string, message: any) {
  if (!io) return;

  io.to(`ticket:${ticketId}`).emit('ticket:message', { ticketId, message });

  // Notify assigned user if message is not internal
  if (!message.isInternal && message.user?.id) {
    io.to(`user:${message.user.id}`).emit('notification:new', {
      type: 'ticket_message',
      title: 'New Message',
      message: `${message.user.firstName} ${message.user.lastName} replied to ticket`,
      data: { ticketId, messageId: message.id },
    });
  }
}

/**
 * Emit ticket status change
 */
export function emitTicketStatusChanged(ticketId: string, status: string, oldStatus: string) {
  if (!io) return;

  io.to(`ticket:${ticketId}`).emit('ticket:statusChanged', { ticketId, status, oldStatus });
}

/**
 * Emit ticket priority change
 */
export function emitTicketPriorityChanged(ticketId: string, priority: string, oldPriority: string) {
  if (!io) return;

  io.to(`ticket:${ticketId}`).emit('ticket:priorityChanged', { ticketId, priority, oldPriority });
}

/**
 * Emit chat new message
 */
export function emitChatMessage(sessionId: string, message: any) {
  if (!io) return;

  io.to(`chat:${sessionId}`).emit('chat:newMessage', { sessionId, message });
}

/**
 * Emit chat new session
 */
export function emitChatNewSession(session: any) {
  if (!io) return;

  // Notify support agents
  io.to('role:SUPPORT').emit('chat:newSession', { session });
  io.to('role:NOC').emit('chat:newSession', { session });
  io.to('role:SUPER_ADMIN').emit('chat:newSession', { session });
  io.to('role:ISP_OWNER').emit('chat:newSession', { session });
}

/**
 * Emit generic notification to specific user
 */
export function emitNotificationToUser(userId: string, notification: { type: string; title: string; message: string; data?: any }) {
  if (!io) return;

  io.to(`user:${userId}`).emit('notification:new', notification);
}

/**
 * Emit notification to role
 */
export function emitNotificationToRole(role: string, notification: { type: string; title: string; message: string; data?: any }) {
  if (!io) return;

  io.to(`role:${role}`).emit('notification:new', notification);
}

/**
 * Broadcast to all connected clients
 */
export function broadcast(event: string, data: any) {
  if (!io) return;
  io.emit(event as keyof SocketEvents, data);
}