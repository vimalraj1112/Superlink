import { Router } from 'express';
import {
  exportCustomers,
  exportSites,
  exportPayments,
  exportTickets,
  previewImportCustomers,
  previewImportSites,
  executeImportCustomers,
  executeImportSites,
  downloadTemplate,
  importCustomersSchema,
  importSitesSchema,
} from '@/controllers/importExportController';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { requirePermission } from '@/middleware/rbac';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============ EXPORT ROUTES ============
// Export customers - needs importExport:read
router.get('/export/customers', requirePermission({ resource: 'importExport', actions: ['read'] }), exportCustomers);

// Export sites - needs importExport:read
router.get('/export/sites', requirePermission({ resource: 'importExport', actions: ['read'] }), exportSites);

// Export payments - needs importExport:read
router.get('/export/payments', requirePermission({ resource: 'importExport', actions: ['read'] }), exportPayments);

// Export tickets - needs importExport:read
router.get('/export/tickets', requirePermission({ resource: 'importExport', actions: ['read'] }), exportTickets);

// ============ IMPORT TEMPLATE ROUTES ============
// Download import template
router.get('/template/:type', requirePermission({ resource: 'importExport', actions: ['read'] }), downloadTemplate);

// ============ IMPORT PREVIEW ROUTES ============
// Preview customer import - needs importExport:create
router.post('/import/customers/preview', requirePermission({ resource: 'importExport', actions: ['create'] }), validate(importCustomersSchema), previewImportCustomers);

// Preview site import - needs importExport:create
router.post('/import/sites/preview', requirePermission({ resource: 'importExport', actions: ['create'] }), validate(importSitesSchema), previewImportSites);

// ============ IMPORT EXECUTE ROUTES ============
// Execute customer import - needs importExport:create
router.post('/import/customers', requirePermission({ resource: 'importExport', actions: ['create'] }), validate(importCustomersSchema), executeImportCustomers);

// Execute site import - needs importExport:create
router.post('/import/sites', requirePermission({ resource: 'importExport', actions: ['create'] }), validate(importSitesSchema), executeImportSites);

export default router;