import { Router } from 'express';
import {
  listSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  getSitesByCustomer,
  siteCreateSchema,
  siteUpdateSchema,
} from '@/controllers/siteController';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { requirePermission } from '@/middleware/rbac';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List sites - needs sites:read
router.get('/', requirePermission({ resource: 'sites', actions: ['read'] }), listSites);

// Get sites by customer - needs sites:read
router.get('/customer/:customerId', requirePermission({ resource: 'sites', actions: ['read'] }), getSitesByCustomer);

// Get site by ID - needs sites:read
router.get('/:id', requirePermission({ resource: 'sites', actions: ['read'] }), getSite);

// Create site - needs sites:create
router.post('/', requirePermission({ resource: 'sites', actions: ['create'] }), validate(siteCreateSchema), createSite);

// Update site - needs sites:update
router.put('/:id', requirePermission({ resource: 'sites', actions: ['update'] }), validate(siteUpdateSchema), updateSite);

// Delete (disconnect) site - needs sites:delete
router.delete('/:id', requirePermission({ resource: 'sites', actions: ['delete'] }), deleteSite);

export default router;