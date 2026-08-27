import { Router } from 'express';
import {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentStats,
} from '@/controllers/paymentController';
import { authenticate } from '@/middleware/auth';
import { requirePermission } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { paymentCreateSchema, paymentUpdateSchema } from '@/controllers/paymentController';

const router = Router();

// All payment routes require authentication
router.use(authenticate);

// Payment statistics
router.get('/stats', requirePermission({ resource: 'payments', actions: ['read'] }), getPaymentStats);

// List payments with filters, pagination, search
router.get('/', requirePermission({ resource: 'payments', actions: ['read'] }), listPayments);

// Get single payment
router.get('/:id', requirePermission({ resource: 'payments', actions: ['read'] }), getPayment);

// Create payment
router.post('/', requirePermission({ resource: 'payments', actions: ['create'] }), validate(paymentCreateSchema), createPayment);

// Update payment
router.patch('/:id', requirePermission({ resource: 'payments', actions: ['update'] }), validate(paymentUpdateSchema), updatePayment);

// Delete payment
router.delete('/:id', requirePermission({ resource: 'payments', actions: ['delete'] }), deletePayment);

export default router;