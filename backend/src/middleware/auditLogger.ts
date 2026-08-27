import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { prisma } from '@/config/db';
import { Prisma } from '@prisma/client';

export interface AuditContext {
  action: string;
  entityType: string;
  entityId: string;
  oldData?: Prisma.InputJsonValue;
  newData?: Prisma.InputJsonValue;
}

/**
 * Middleware to automatically log mutations
 * Usage: Add to routes that modify data, or call manually in controllers
 */
export function auditLogger(
  getContext: (req: AuthenticatedRequest) => AuditContext | Promise<AuditContext>
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Store original send to capture response
    const originalSend = res.send;
    let responseData: unknown;

    res.send = function (data: unknown) {
      responseData = data;
      return originalSend.call(this, data);
    };

    // Execute next middleware/handler
    await next();

    // Only log if request was successful (2xx) and user is authenticated
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      try {
        const context = await getContext(req);

        // Don't log if no entityId (e.g., bulk operations handled separately)
        if (!context.entityId) return;

        await prisma.auditLog.create({
          data: {
            userId: req.user.userId,
            action: context.action,
            entityType: context.entityType,
            entityId: context.entityId,
            oldData: context.oldData,
            newData: context.newData ?? (responseData as Prisma.InputJsonValue),
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          },
        });
      } catch (error) {
        // Don't let audit logging failures break the response
        console.error('Audit log failed:', error);
      }
    }
  };
}

/**
 * Manual audit log function for complex operations
 */
export async function createAuditLog(
  userId: string,
  context: AuditContext,
  req?: Request
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: context.action,
        entityType: context.entityType,
        entityId: context.entityId,
        oldData: context.oldData,
        newData: context.newData,
        ipAddress: req?.ip,
        userAgent: req?.get('user-agent'),
      },
    });
  } catch (error) {
    console.error('Manual audit log failed:', error);
  }
}

/**
 * Helper to create audit context for CRUD operations
 */
export function createCrudAuditContext(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: string,
  getEntityId: (req: Request) => string,
  getOldData?: (req: Request) => Prisma.InputJsonValue,
  getNewData?: (req: Request) => Prisma.InputJsonValue
) {
  return async (req: AuthenticatedRequest): Promise<AuditContext> => {
    const entityId = getEntityId(req);
    return {
      action,
      entityType,
      entityId,
      oldData: getOldData ? getOldData(req) : undefined,
      newData: getNewData ? getNewData(req) : undefined,
    };
  };
}