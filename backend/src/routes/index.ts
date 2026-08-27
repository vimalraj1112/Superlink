import { Router } from 'express';
import { env, apiPrefix } from '@/config/env';

import authRoutes from './authRoutes';
import customerRoutes from './customerRoutes';
import siteRoutes from './siteRoutes';
import ispRoutes from './ispRoutes';
import ticketRoutes from './ticketRoutes';
import paymentRoutes from './paymentRoutes';
import webhookRoutes from './webhookRoutes';
import gisRoutes from './gisRoutes';
import credentialRoutes from './credentialRoutes';
import userRoutes from './userRoutes';
import importExportRoutes from './importExportRoutes';
import quotationRoutes from './quotationRoutes';
import roleRoutes from './roleRoutes';

const router = Router();

// API version prefix is already in env.ts
// Mount all routes
router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/sites', siteRoutes);
router.use('/isps', ispRoutes);
router.use('/tickets', ticketRoutes);
router.use('/payments', paymentRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/gis', gisRoutes);
router.use('/credentials', credentialRoutes);
router.use('/users', userRoutes);
router.use('/import-export', importExportRoutes);
router.use('/quotations', quotationRoutes);
router.use('/roles', roleRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    data: {
      version: env.API_VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

export default router;