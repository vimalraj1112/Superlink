import { Router } from 'express';
import {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  addTicketMessage,
  getTicketMessages,
  assignTicket,
  updateTicketStatus,
  updateTicketPriority,
  ticketCreateSchema,
  ticketUpdateSchema,
  ticketMessageSchema,
} from '@/controllers/ticketController';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { requirePermission } from '@/middleware/rbac';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List tickets - needs tickets:read
router.get('/', requirePermission({ resource: 'tickets', actions: ['read'] }), listTickets);

// Get ticket by ID - needs tickets:read
router.get('/:id', requirePermission({ resource: 'tickets', actions: ['read'] }), getTicket);

// Get ticket messages - needs tickets:read
router.get('/:id/messages', requirePermission({ resource: 'tickets', actions: ['read'] }), getTicketMessages);

// Create ticket - needs tickets:create
router.post('/', requirePermission({ resource: 'tickets', actions: ['create'] }), validate(ticketCreateSchema), createTicket);

// Update ticket - needs tickets:update
router.put('/:id', requirePermission({ resource: 'tickets', actions: ['update'] }), validate(ticketUpdateSchema), updateTicket);

// Delete ticket - needs tickets:delete
router.delete('/:id', requirePermission({ resource: 'tickets', actions: ['delete'] }), deleteTicket);

// Add ticket message - needs tickets:update (or create for messages)
router.post('/:id/messages', requirePermission({ resource: 'tickets', actions: ['update'] }), validate(ticketMessageSchema), addTicketMessage);

// Assign ticket - needs tickets:assign
router.post('/:id/assign', requirePermission({ resource: 'tickets', actions: ['assign'] }), assignTicket);

// Update ticket status - needs tickets:update
router.patch('/:id/status', requirePermission({ resource: 'tickets', actions: ['update'] }), updateTicketStatus);

// Update ticket priority - needs tickets:update
router.patch('/:id/priority', requirePermission({ resource: 'tickets', actions: ['update'] }), updateTicketPriority);

export default router;