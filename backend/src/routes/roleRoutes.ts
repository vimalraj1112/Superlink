import { Router } from 'express';
import {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  roleCreateSchema,
  roleUpdateSchema,
} from '@/controllers/roleController';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { UserRole } from '@prisma/client';

const router = Router();

// All role routes require authentication
router.use(authenticate);

// List & Get - accessible by SUPER_ADMIN, ISP_OWNER
router.get('/', requireRole(UserRole.SUPER_ADMIN, UserRole.ISP_OWNER), listRoles);
router.get('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.ISP_OWNER), getRole);

// Create - SUPER_ADMIN only
router.post('/', requireRole(UserRole.SUPER_ADMIN), validate(roleCreateSchema), createRole);

// Update - SUPER_ADMIN only
router.patch('/:id', requireRole(UserRole.SUPER_ADMIN), validate(roleUpdateSchema), updateRole);

// Delete - SUPER_ADMIN only
router.delete('/:id', requireRole(UserRole.SUPER_ADMIN), deleteRole);

export default router;