import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import {
  getDashboardStats,
  getRecentTickets,
  getRenewals,
  getChartData,
} from '@/controllers/dashboardController';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

router.get('/stats', getDashboardStats);
router.get('/recent-tickets', getRecentTickets);
router.get('/renewals', getRenewals);
router.get('/chart-data', getChartData);

export default router;