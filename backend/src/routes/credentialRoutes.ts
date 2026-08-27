import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import * as credentialController from '../controllers/credentialController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get credentials for a specific site
router.get(
  '/sites/:siteId',
  requirePermission({ resource: 'credentials', actions: ['read'] }),
  credentialController.getSiteCredentials
);

// Create or update credentials for a site
router.post(
  '/sites/:siteId',
  requirePermission({ resource: 'credentials', actions: ['create', 'update'] }),
  validate(
    z.object({
      body: z.object({
        username: z.string().optional(),
        password: z.string().optional(),
        routerIp: z.string().optional(),
        routerModel: z.string().optional(),
        vlanId: z.string().optional(),
        pppoeUsername: z.string().optional(),
        pppoePassword: z.string().optional(),
        staticIps: z.array(z.object({
          ip: z.string(),
          gateway: z.string().optional(),
          subnet: z.string().optional(),
        })).optional(),
        notes: z.string().optional(),
      }),
    })
  ),
  credentialController.createOrUpdateCredentials
);

// Reveal a specific credential (password or pppoePassword)
router.post(
  '/sites/:siteId/reveal',
  requirePermission({ resource: 'credentials', actions: ['reveal'] }),
  validate(
    z.object({
      body: z.object({
        field: z.enum(['password', 'pppoePassword']),
      }),
    })
  ),
  credentialController.revealPassword
);

// Delete credentials for a site
router.delete(
  '/sites/:siteId',
  requirePermission({ resource: 'credentials', actions: ['delete'] }),
  credentialController.deleteCredentials
);

// List all credentials (SUPER_ADMIN and ISP_OWNER only)
router.get(
  '/',
  requirePermission({ resource: 'credentials', actions: ['read'] }),
  credentialController.listAllCredentials
);

export default router;