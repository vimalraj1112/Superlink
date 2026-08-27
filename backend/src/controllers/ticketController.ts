import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { sendSuccess, sendPaginatedSuccess, sendNotFound } from '@/utils/apiResponse';
import { getPaginationParams, getSearchQuery } from '@/utils/pagination';
import { TicketStatus, TicketPriority, TicketSource } from '@prisma/client';
import {
  emitTicketCreated,
  emitTicketUpdated,
  emitTicketMessage,
  emitTicketAssigned,
  emitTicketStatusChanged,
  emitTicketPriorityChanged,
} from '@/services/socketService';

export const ticketCreateSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().min(1, 'Description is required'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
    source: z.enum(['MANUAL', 'TELEGRAM', 'WHATSAPP', 'EMAIL']).optional(),
    customerId: z.string().min(1, 'Customer is required'),
    siteId: z.string().optional(),
    assignedToId: z.string().optional(),
    slaDueAt: z.string().datetime().optional().nullable(),
  }),
});

export const ticketUpdateSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().min(1).optional(),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
    assignedToId: z.string().optional().nullable(),
    slaDueAt: z.string().datetime().optional().nullable(),
    resolvedAt: z.string().datetime().optional().nullable(),
    closedAt: z.string().datetime().optional().nullable(),
  }),
});

export const ticketMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message is required'),
    isInternal: z.boolean().optional(),
  }),
});

async function generateTicketNumber(): Promise<string> {
  const count = await prisma.ticket.count();
  const year = new Date().getFullYear();
  return `TKT-${year}${String(count + 1).padStart(5, '0')}`;
}

export const listTickets = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, take } = getPaginationParams(req);
  const search = getSearchQuery(req);
  const status = req.query.status as TicketStatus | undefined;
  const priority = req.query.priority as TicketPriority | undefined;
  const source = req.query.source as TicketSource | undefined;
  const customerId = req.query.customerId as string | undefined;
  const siteId = req.query.siteId as string | undefined;
  const assignedToId = req.query.assignedToId as string | undefined;

  const where: Prisma.TicketWhereInput = {
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(source ? { source } : {}),
    ...(customerId ? { customerId } : {}),
    ...(siteId ? { siteId } : {}),
    ...(assignedToId ? { assignedToId } : {}),
    ...(search
      ? {
          OR: [
            { ticketNumber: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [tickets, totalItems] = await Promise.all([
    prisma.ticket.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, customerCode: true, companyName: true, contactPerson: true } },
        site: { select: { id: true, siteCode: true, planName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  sendPaginatedSuccess(res, tickets, 'Tickets fetched successfully', page, limit, totalItems);
});

export const getTicket = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      customer: true,
      site: { include: { isp: { select: { id: true, name: true, displayName: true } } } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      chatSessions: {
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
        },
      },
    },
  });

  if (!ticket) {
    sendNotFound(res, 'Ticket not found');
    return;
  }

  sendSuccess(res, ticket, 'Ticket fetched successfully');
});

export const createTicket = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const ticketNumber = await generateTicketNumber();

  const ticket = await prisma.ticket.create({
    data: {
      ...req.body,
      ticketNumber,
      slaDueAt: req.body.slaDueAt ? new Date(req.body.slaDueAt) : null,
      createdById: req.user!.userId,
    },
    include: {
      customer: { select: { id: true, customerCode: true, companyName: true } },
      site: { select: { id: true, siteCode: true, planName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Create initial internal message
  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      userId: req.user!.userId,
      message: `Ticket created by ${req.user!.firstName} ${req.user!.lastName}`,
      isInternal: true,
    },
  });

  // Emit real-time event
  emitTicketCreated(ticket);

  sendSuccess(res, ticket, 'Ticket created successfully', 201);
});

export const updateTicket = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Get current ticket to detect changes
  const currentTicket = await prisma.ticket.findUnique({
    where: { id },
    select: { status: true, priority: true, assignedToId: true, title: true, description: true, slaDueAt: true },
  });

  if (!currentTicket) {
    sendNotFound(res, 'Ticket not found');
    return;
  }

  const changes: string[] = [];
  const updateData: Prisma.TicketUpdateInput = {
    updatedBy: { connect: { id: req.user!.userId } },
  };

  // Track changes
  if (req.body.title !== undefined && req.body.title !== currentTicket.title) {
    updateData.title = req.body.title;
    changes.push('title');
  }
  if (req.body.description !== undefined && req.body.description !== currentTicket.description) {
    updateData.description = req.body.description;
    changes.push('description');
  }
  if (req.body.status !== undefined && req.body.status !== currentTicket.status) {
    updateData.status = req.body.status;
    changes.push('status');
  }
  if (req.body.priority !== undefined && req.body.priority !== currentTicket.priority) {
    updateData.priority = req.body.priority;
    changes.push('priority');
  }
  if (req.body.assignedToId !== undefined && req.body.assignedToId !== currentTicket.assignedToId) {
    updateData.assignedTo = req.body.assignedToId ? { connect: { id: req.body.assignedToId } } : { disconnect: true };
    changes.push('assignedTo');
  }
  if (req.body.slaDueAt !== undefined) {
    const newSla = req.body.slaDueAt ? new Date(req.body.slaDueAt) : null;
    if (newSla?.getTime() !== currentTicket.slaDueAt?.getTime()) {
      updateData.slaDueAt = newSla;
      changes.push('slaDueAt');
    }
  }
  if (req.body.resolvedAt !== undefined) {
    updateData.resolvedAt = req.body.resolvedAt ? new Date(req.body.resolvedAt) : null;
    changes.push('resolvedAt');
  }
  if (req.body.closedAt !== undefined) {
    updateData.closedAt = req.body.closedAt ? new Date(req.body.closedAt) : null;
    changes.push('closedAt');
  }

  // Auto-set resolvedAt/closedAt when status changes
  if (req.body.status === 'RESOLVED' && !req.body.resolvedAt) {
    updateData.resolvedAt = new Date();
  }
  if (req.body.status === 'CLOSED' && !req.body.closedAt) {
    updateData.closedAt = new Date();
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: updateData,
    include: {
      customer: { select: { id: true, customerCode: true, companyName: true } },
      site: { select: { id: true, siteCode: true, planName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Emit real-time event if there were changes
  if (changes.length > 0) {
    emitTicketUpdated(ticket, changes);
  }

  sendSuccess(res, ticket, 'Ticket updated successfully');
});

export const deleteTicket = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.ticket.delete({
    where: { id },
  });

  sendSuccess(res, null, 'Ticket deleted successfully');
});

export const addTicketMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!ticket) {
    sendNotFound(res, 'Ticket not found');
    return;
  }

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      userId: req.user!.userId,
      message: req.body.message,
      isInternal: req.body.isInternal ?? false,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Auto-update ticket status if message is from agent and not internal
  if (!req.body.isInternal && ticket.status === 'OPEN') {
    await prisma.ticket.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });
    emitTicketStatusChanged(id, 'IN_PROGRESS', 'OPEN');
  }

  // Emit real-time message event
  emitTicketMessage(id, message);

  sendSuccess(res, message, 'Message added successfully', 201);
});

export const getTicketMessages = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!ticket) {
    sendNotFound(res, 'Ticket not found');
    return;
  }

  const messages = await prisma.ticketMessage.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
    },
  });

  sendSuccess(res, messages, 'Ticket messages fetched successfully');
});

export const assignTicket = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { assignedToId } = req.body;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!ticket) {
    sendNotFound(res, 'Ticket not found');
    return;
  }

  // Validate assignedToId exists and is valid user
  if (assignedToId) {
    const user = await prisma.user.findUnique({
      where: { id: assignedToId, isActive: true },
    });
    if (!user) {
      sendNotFound(res, 'Assigned user not found or inactive');
      return;
    }
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: {
      assignedToId: assignedToId || null,
      status: assignedToId ? 'IN_PROGRESS' : 'OPEN',
      updatedBy: { connect: { id: req.user!.userId } },
    },
    include: {
      customer: { select: { id: true, customerCode: true, companyName: true } },
      site: { select: { id: true, siteCode: true, planName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Add assignment message
  if (assignedToId) {
    const assignee = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { firstName: true, lastName: true, id: true, email: true },
    });
    await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        userId: req.user!.userId,
        message: `Ticket assigned to ${assignee?.firstName} ${assignee?.lastName}`,
        isInternal: true,
      },
    });

    // Emit assignment event
    emitTicketAssigned(updatedTicket, assignee!);
  }

  sendSuccess(res, updatedTicket, assignedToId ? 'Ticket assigned successfully' : 'Ticket unassigned successfully');
});

export const updateTicketStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!ticket) {
    sendNotFound(res, 'Ticket not found');
    return;
  }

  const updateData: Prisma.TicketUpdateInput = {
    status,
    updatedBy: { connect: { id: req.user!.userId } },
  };

  if (status === 'RESOLVED') {
    updateData.resolvedAt = new Date();
  }
  if (status === 'CLOSED') {
    updateData.closedAt = new Date();
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: updateData,
    include: {
      customer: { select: { id: true, customerCode: true, companyName: true } },
      site: { select: { id: true, siteCode: true, planName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Add status change message
  await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      userId: req.user!.userId,
      message: `Ticket status changed from ${ticket.status} to ${status}`,
      isInternal: true,
    },
  });

  // Emit real-time status change
  emitTicketStatusChanged(id, status, ticket.status);

  sendSuccess(res, updatedTicket, 'Ticket status updated successfully');
});

export const updateTicketPriority = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { priority } = req.body;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, priority: true },
  });

  if (!ticket) {
    sendNotFound(res, 'Ticket not found');
    return;
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: {
      priority,
      updatedBy: { connect: { id: req.user!.userId } },
    },
    include: {
      customer: { select: { id: true, customerCode: true, companyName: true } },
      site: { select: { id: true, siteCode: true, planName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      userId: req.user!.userId,
      message: `Ticket priority changed from ${ticket.priority} to ${priority}`,
      isInternal: true,
    },
  });

  // Emit real-time priority change
  emitTicketPriorityChanged(id, priority, ticket.priority);

  sendSuccess(res, updatedTicket, 'Ticket priority updated successfully');
});