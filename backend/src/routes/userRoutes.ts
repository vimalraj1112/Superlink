import { Router } from 'express';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  userCreateSchema,
  userUpdateSchema,
} from '@/controllers/userController';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { UserRole } from '@prisma/client';

const router = Router();

// All user routes require authentication and admin/owner access
router.use(authenticate);
router.use(requireRole(UserRole.SUPER_ADMIN, UserRole.ISP_OWNER));

router.get('/', listUsers);
router.get('/:id', getUser);
router.post('/', validate(userCreateSchema), createUser);
router.patch('/:id', validate(userUpdateSchema), updateUser);
router.delete('/:id', deleteUser);
router.post('/change-password', changePassword);

export default router;