import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { sendForbidden } from '@/utils/apiResponse';
import { UserRole } from '@prisma/client';
import { prisma } from '@/config/db';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'assign' | 'reveal';

export interface RequiredPermission {
  resource: string;
  actions: PermissionAction[];
}

/**
 * Check if user has required permission
 */
export function requirePermission(...permissions: RequiredPermission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendForbidden(res, 'Authentication required');
      return;
    }

    const userPermissions = req.user.permissions || {};

    for (const required of permissions) {
      const allowedActions = userPermissions[required.resource] as PermissionAction[] | undefined;

      if (!allowedActions) {
        sendForbidden(res, `Access denied: No permissions for ${required.resource}`);
        return;
      }

      const hasPermission = required.actions.some((action) => allowedActions.includes(action));

      if (!hasPermission) {
        sendForbidden(
          res,
          `Access denied: Missing ${required.actions.join(' or ')} permission for ${required.resource}`
        );
        return;
      }
    }

    next();
  };
}

/**
 * Check if user has any of the specified roles
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendForbidden(res, 'Authentication required');
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendForbidden(res, `Access denied: Requires one of roles: ${roles.join(', ')}`);
      return;
    }

    next();
  };
}

/**
 * Check if user is SUPER_ADMIN or ISP_OWNER
 */
export function requireAdminOrOwner() {
  return requireRole(UserRole.SUPER_ADMIN, UserRole.ISP_OWNER);
}

/**
 * Check if user is SUPER_ADMIN
 */
export function requireSuperAdmin() {
  return requireRole(UserRole.SUPER_ADMIN);
}

/**
 * Check if user can access customer data (own customer or has permission)
 */
export function canAccessCustomer(customerIdParam: string = 'customerId') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      sendForbidden(res, 'Authentication required');
      return;
    }

    const customerId = req.params[customerIdParam] || req.body[customerIdParam] || req.query[customerIdParam];

    // SUPER_ADMIN and ISP_OWNER can access all customers
    const adminRoles = [UserRole.SUPER_ADMIN, UserRole.ISP_OWNER] as const;
    if (adminRoles.includes(req.user.role as typeof adminRoles[number])) {
      next();
      return;
    }

    // CLIENT can only access their own customer record
    if (req.user.role === UserRole.CLIENT) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, OR: [{ createdById: req.user.userId }, { updatedById: req.user.userId }] },
      });
      if (customer) {
        next();
        return;
      }
      sendForbidden(res, 'Access denied: You can only access your own customer data');
      return;
    }

    // Other roles check permissions
    const userPermissions = req.user.permissions || {};
    const customerPerms = userPermissions.customers as PermissionAction[] | undefined;

    if (customerPerms?.includes('read')) {
      next();
      return;
    }

    sendForbidden(res, 'Access denied: Insufficient permissions for customer data');
  };
}

/**
 * Check if user can access site data
 */
export function canAccessSite(siteIdParam: string = 'siteId') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      sendForbidden(res, 'Authentication required');
      return;
    }

    const siteId = req.params[siteIdParam] || req.body[siteIdParam] || req.query[siteIdParam];

    // SUPER_ADMIN and ISP_OWNER can access all sites
    const adminRoles = [UserRole.SUPER_ADMIN, UserRole.ISP_OWNER] as const;
    if (adminRoles.includes(req.user.role as typeof adminRoles[number])) {
      next();
      return;
    }

    // CLIENT can only access their own sites
    if (req.user.role === UserRole.CLIENT) {
      const site = await prisma.site.findFirst({
        where: { id: siteId, customer: { OR: [{ createdById: req.user.userId }, { updatedById: req.user.userId }] } },
      });
      if (site) {
        next();
        return;
      }
      sendForbidden(res, 'Access denied: You can only access your own sites');
      return;
    }

    // Other roles check permissions
    const userPermissions = req.user.permissions || {};
    const sitePerms = userPermissions.sites as PermissionAction[] | undefined;

    if (sitePerms?.includes('read')) {
      next();
      return;
    }

    sendForbidden(res, 'Access denied: Insufficient permissions for site data');
  };
}