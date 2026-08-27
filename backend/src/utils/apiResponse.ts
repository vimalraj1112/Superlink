/**
 * Standardized API Response Envelope
 * Matches exactly the format specified:
 *
 * Success (Paginated):
 * {
 *   "success": true,
 *   "message": "Sites fetched successfully",
 *   "data": [ ... ],
 *   "meta": {
 *     "page": 1,
 *     "limit": 10,
 *     "totalItems": 45,
 *     "totalPages": 5,
 *     "hasNextPage": true,
 *     "hasPrevPage": false
 *   }
 * }
 *
 * Success (Single Item):
 * {
 *   "success": true,
 *   "message": "Site created successfully",
 *   "data": { ... }
 * }
 *
 * Error:
 * {
 *   "success": false,
 *   "message": "Too many login attempts. Please try again after 15 minutes.",
 *   "error": {
 *     "code": "RATE_LIMIT_EXCEEDED",
 *     "details": null
 *   }
 * }
 */

import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ErrorDetail {
  code: string;
  details: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  error?: ErrorDetail;
}

/**
 * Send a successful response (single item or array without pagination)
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
}

/**
 * Send a successful paginated response
 */
export function sendPaginatedSuccess<T>(
  res: Response,
  data: T[],
  message: string,
  page: number,
  limit: number,
  totalItems: number,
  statusCode: number = 200
): Response {
  const totalPages = Math.ceil(totalItems / limit);
  const meta: PaginationMeta = {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };

  const response: ApiResponse<T[]> = {
    success: true,
    message,
    data,
    meta,
  };
  return res.status(statusCode).json(response);
}

/**
 * Send an error response
 */
export function sendError(
  res: Response,
  message: string,
  code: string = 'INTERNAL_ERROR',
  details: unknown = null,
  statusCode: number = 500
): Response {
  const response: ApiResponse<null> = {
    success: false,
    message,
    error: {
      code,
      details,
    },
  };
  return res.status(statusCode).json(response);
}

/**
 * Send a validation error response (400)
 */
export function sendValidationError(
  res: Response,
  message: string = 'Validation failed',
  details: unknown = null
): Response {
  return sendError(res, message, 'VALIDATION_ERROR', details, 400);
}

/**
 * Send an unauthorized error response (401)
 */
export function sendUnauthorized(
  res: Response,
  message: string = 'Unauthorized access'
): Response {
  return sendError(res, message, 'UNAUTHORIZED', null, 401);
}

/**
 * Send a forbidden error response (403)
 */
export function sendForbidden(
  res: Response,
  message: string = 'Access forbidden'
): Response {
  return sendError(res, message, 'FORBIDDEN', null, 403);
}

/**
 * Send a not found error response (404)
 */
export function sendNotFound(
  res: Response,
  message: string = 'Resource not found'
): Response {
  return sendError(res, message, 'NOT_FOUND', null, 404);
}

/**
 * Send a rate limit error response (429)
 */
export function sendRateLimitError(
  res: Response,
  message: string = 'Too many requests. Please try again later.',
  retryAfter?: number
): Response {
  const details = retryAfter ? { retryAfter } : null;
  return sendError(res, message, 'RATE_LIMIT_EXCEEDED', details, 429);
}

/**
 * Send a conflict error response (409)
 */
export function sendConflict(
  res: Response,
  message: string = 'Resource already exists',
  details: unknown = null
): Response {
  return sendError(res, message, 'CONFLICT', details, 409);
}