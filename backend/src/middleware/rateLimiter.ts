import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { env } from '@/config/env';
import { sendRateLimitError } from '@/utils/apiResponse';

/**
 * Global rate limiter for all API requests
 */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: undefined,
  handler: (req, res) => {
    sendRateLimitError(
      res,
      `Too many requests from this IP. Please try again after ${Math.ceil(env.RATE_LIMIT_WINDOW_MS / 60000)} minutes.`,
      Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000)
    );
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: undefined,
  handler: (req, res) => {
    sendRateLimitError(
      res,
      'Too many login attempts. Please try again after 15 minutes.',
      15 * 60
    );
  },
});

/**
 * Rate limiter for password reset / forgot password
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: undefined,
  handler: (req, res) => {
    sendRateLimitError(
      res,
      'Too many password reset requests. Please try again after 1 hour.',
      60 * 60
    );
  },
});

/**
 * Rate limiter for webhook endpoints (Telegram, WhatsApp)
 * Higher limit since these come from known platforms
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: undefined,
  handler: (req, res) => {
    sendRateLimitError(
      res,
      'Webhook rate limit exceeded. Please slow down.',
      60
    );
  },
});

/**
 * Rate limiter for ticket creation (prevent spam)
 */
export const ticketCreationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 tickets per hour per user/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: undefined,
  handler: (req, res) => {
    sendRateLimitError(
      res,
      'Too many tickets created. Please wait before creating more.',
      60 * 60
    );
  },
});

/**
 * Create a custom rate limiter with specific config
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req: Request) => req.ip || 'unknown'),
    message: undefined,
    handler: (req, res) => {
      sendRateLimitError(
        res,
        options.message || 'Rate limit exceeded. Please try again later.',
        Math.ceil(options.windowMs / 1000)
      );
    },
  });
}