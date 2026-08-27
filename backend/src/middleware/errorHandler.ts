import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { sendError, sendConflict, sendNotFound, sendValidationError } from '@/utils/apiResponse';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function notFoundHandler(req: Request, res: Response): void {
  sendNotFound(res, `Route ${req.method} ${req.originalUrl} not found`);
}

export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Prisma unique constraint violation
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        sendConflict(res, 'A record with this value already exists', {
          fields: error.meta?.target,
        });
        return;
      case 'P2025':
        sendNotFound(res, 'Record not found');
        return;
      case 'P2003':
        sendValidationError(res, 'Invalid reference to related record', error.meta);
        return;
      case 'P2014':
        sendValidationError(res, 'Invalid relation data', error.meta);
        return;
      default:
        sendError(res, 'Database operation failed', 'DATABASE_ERROR', error.meta, 500);
        return;
    }
  }

  // Prisma validation error
  if (error instanceof Prisma.PrismaClientValidationError) {
    sendValidationError(res, 'Invalid database query data', error.message);
    return;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    sendError(res, 'Invalid token', 'INVALID_TOKEN', null, 401);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    sendError(res, 'Token expired', 'TOKEN_EXPIRED', null, 401);
    return;
  }

  // Custom app error
  if (error.statusCode) {
    sendError(
      res,
      error.message || 'An error occurred',
      error.code || 'APP_ERROR',
      error.details || null,
      error.statusCode
    );
    return;
  }

  // Default error
  sendError(
    res,
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message || 'Internal server error',
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'production' ? null : { stack: error.stack },
    500
  );
}

export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void | Response>
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}