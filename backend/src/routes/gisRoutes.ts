import { Router } from 'express';
import { gisController } from '@/controllers/gisController';
import { authenticate } from '@/middleware/auth';
import { requirePermission } from '@/middleware/rbac';

const router = Router();

// All GIS routes require authentication
router.use(authenticate);

// Site GIS endpoints
router.get('/sites', requirePermission({ resource: 'gis', actions: ['read'] }), gisController.listSites);
router.get('/sites/stats', requirePermission({ resource: 'gis', actions: ['read'] }), gisController.getSiteStats);
router.get('/sites/:id', requirePermission({ resource: 'gis', actions: ['read'] }), gisController.getSite);

// ISP GIS endpoints
router.get('/isps', requirePermission({ resource: 'gis', actions: ['read'] }), gisController.listIsps);
router.get('/isps/:id', requirePermission({ resource: 'gis', actions: ['read'] }), gisController.getIsp);

// Combined map data
router.get('/map', requirePermission({ resource: 'gis', actions: ['read'] }), gisController.getMapData);

export default router;