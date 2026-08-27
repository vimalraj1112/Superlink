import { Router } from 'express';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  customerCreateSchema,
  customerUpdateSchema,
} from '@/controllers/customerController';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { requirePermission } from '@/middleware/rbac';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List customers - needs customers:read
router.get('/', requirePermission({ resource: 'customers', actions: ['read'] }), listCustomers);

// Get customer by ID - needs customers:read
router.get('/:id', requirePermission({ resource: 'customers', actions: ['read'] }), getCustomer);

// Create customer - needs customers:create
router.post('/', requirePermission({ resource: 'customers', actions: ['create'] }), validate(customerCreateSchema), createCustomer);

// Update customer - needs customers:update
router.put('/:id', requirePermission({ resource: 'customers', actions: ['update'] }), validate(customerUpdateSchema), updateCustomer);

// Delete (deactivate) customer - needs customers:delete
router.delete('/:id', requirePermission({ resource: 'customers', actions: ['delete'] }), deleteCustomer);

export default router;