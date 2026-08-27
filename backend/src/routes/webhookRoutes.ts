import { Router } from 'express';
import {
  telegramWebhook,
  setupTelegramWebhook,
  getTelegramBotInfo,
  whatsappWebhook,
  verifyWhatsAppWebhook,
} from '@/controllers/webhookController';
import { authenticate } from '@/middleware/auth';
import { requirePermission } from '@/middleware/rbac';

const router = Router();

// Public webhook endpoints (no auth required - they have their own rate limiting)
// Telegram webhook - public endpoint for Telegram to call
router.post('/telegram', telegramWebhook);

// WhatsApp webhook - public endpoints for Meta to call
router.get('/whatsapp', verifyWhatsAppWebhook);
router.post('/whatsapp', whatsappWebhook);

// Protected admin endpoints for webhook management
router.use(authenticate);

// Setup Telegram webhook - needs settings:update
router.post(
  '/telegram/setup',
  requirePermission({ resource: 'settings', actions: ['update'] }),
  setupTelegramWebhook
);

// Get Telegram bot info - needs settings:read
router.get(
  '/telegram/info',
  requirePermission({ resource: 'settings', actions: ['read'] }),
  getTelegramBotInfo
);

export default router;