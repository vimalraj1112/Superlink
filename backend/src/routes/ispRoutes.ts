import { Router } from 'express';
import {
  listIsps,
  getIsp,
  createIsp,
  updateIsp,
  deleteIsp,
  ispCreateSchema,
  ispUpdateSchema,
} from '@/controllers/ispController';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { requirePermission } from '@/middleware/rbac';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List ISPs - needs isps:read
router.get('/', requirePermission({ resource: 'isps', actions: ['read'] }), listIsps);

// Get ISP by ID - needs isps:read
router.get('/:id', requirePermission({ resource: 'isps', actions: ['read'] }), getIsp);

// Create ISP - needs isps:create
router.post('/', requirePermission({ resource: 'isps', actions: ['create'] }), validate(ispCreateSchema), createIsp);

// Update ISP - needs isps:update
router.put('/:id', requirePermission({ resource: 'isps', actions: ['update'] }), validate(ispUpdateSchema), updateIsp);

// Delete (deactivate) ISP - needs isps:delete
router.delete('/:id', requirePermission({ resource: 'isps', actions: ['delete'] }), deleteIsp);

export default router;