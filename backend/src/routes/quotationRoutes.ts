import { Router } from 'express';
import {
  listQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  quotationCreateSchema,
  quotationUpdateSchema,
} from '@/controllers/quotationController';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { UserRole } from '@prisma/client';

const router = Router();

// All quotation routes require authentication
router.use(authenticate);

// List & Get - accessible by SUPER_ADMIN, ISP_OWNER, SALES
router.get('/', requireRole(UserRole.SUPER_ADMIN, UserRole.ISP_OWNER, UserRole.SALES), listQuotations);
router.get('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.ISP_OWNER, UserRole.SALES), getQuotation);

// Create - SUPER_ADMIN, ISP_OWNER, SALES
router.post('/', requireRole(UserRole.SUPER_ADMIN, UserRole.ISP_OWNER, UserRole.SALES), validate(quotationCreateSchema), createQuotation);

// Update - SUPER_ADMIN, ISP_OWNER, SALES
router.patch('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.ISP_OWNER, UserRole.SALES), validate(quotationUpdateSchema), updateQuotation);

// Delete - SUPER_ADMIN, ISP_OWNER only
router.delete('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.ISP_OWNER), deleteQuotation);

export default router;