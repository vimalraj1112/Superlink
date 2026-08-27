import { Request, Response } from 'express';
import { z } from 'zod';
import { telegramService } from '@/services/telegramService';
import { sendSuccess, sendError, sendValidationError } from '@/utils/apiResponse';
import { asyncHandler } from '@/middleware/errorHandler';
import { webhookRateLimiter } from '@/middleware/rateLimiter';

/**
 * POST /api/v1/webhooks/telegram
 * Telegram webhook endpoint - receives updates from Telegram Bot API
 */
export const telegramWebhook = [
  webhookRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const update = req.body;

      if (!update || !update.update_id) {
        sendValidationError(res, 'Invalid webhook payload');
        return;
      }

      // Process the update asynchronously
      await telegramService.processUpdate(update);

      // Respond quickly to Telegram (within 1 second)
      sendSuccess(res, { ok: true }, 'Webhook processed');
    } catch (error) {
      console.error('Telegram webhook error:', error);
      // Still return 200 to Telegram to avoid retries, but log the error
      sendSuccess(res, { ok: true }, 'Webhook acknowledged');
    }
  }),
];

/**
 * GET /api/v1/webhooks/telegram/setup
 * Setup Telegram webhook (admin only)
 */
export const setupTelegramWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url) {
    sendValidationError(res, 'Webhook URL is required');
    return;
  }

  const success = await telegramService.setWebhook(url);

  if (success) {
    sendSuccess(res, { webhookUrl: url }, 'Telegram webhook configured successfully');
  } else {
    sendError(res, 'Failed to configure Telegram webhook', 'WEBHOOK_SETUP_FAILED');
  }
});

/**
 * GET /api/v1/webhooks/telegram/info
 * Get Telegram bot info
 */
export const getTelegramBotInfo = asyncHandler(async (req: Request, res: Response) => {
  const botInfo = await telegramService.getMe();

  if (botInfo) {
    sendSuccess(res, botInfo, 'Bot info retrieved successfully');
  } else {
    sendError(res, 'Failed to get bot info', 'BOT_INFO_FAILED');
  }
});

/**
 * POST /api/v1/webhooks/whatsapp
 * WhatsApp Business Cloud API webhook endpoint
 * Will be implemented after Meta approval
 */
export const whatsappWebhook = [
  webhookRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // WhatsApp webhook verification (GET) and message handling (POST)
    // For now, just acknowledge
    sendSuccess(res, { ok: true }, 'WhatsApp webhook received');
  }),
];

/**
 * GET /api/v1/webhooks/whatsapp
 * WhatsApp webhook verification endpoint
 */
export const verifyWhatsAppWebhook = asyncHandler(async (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verify the webhook
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});