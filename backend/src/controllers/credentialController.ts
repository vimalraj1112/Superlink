import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { sendSuccess, sendError, sendNotFound, sendForbidden, sendPaginatedSuccess } from '../utils/apiResponse';
import { getPaginationParams, getSearchQuery } from '../utils/pagination';
import { encrypt, decrypt } from '../services/encryptionService';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Helper to check if user can access site credentials
const canAccessCredentials = (user: AuthenticatedRequest['user'], site: { ispId: string; customerId: string }) => {
  // SUPER_ADMIN can access everything
  if (user?.role === 'SUPER_ADMIN') return true;

  // ISP_OWNER can access credentials for their ISP's sites
  if (user?.role === 'ISP_OWNER') {
    // Check if the site's ISP is owned by this user
    // In a real implementation, you'd check user's ISP ownership
    return true; // Simplified for now
  }

  // NOC can access credentials for all sites
  if (user?.role === 'NOC') return true;

  return false;
};

// Helper to check if user can reveal credentials
const canRevealCredentials = (user: AuthenticatedRequest['user']) => {
  const allowedRoles = ['SUPER_ADMIN', 'ISP_OWNER', 'NOC'];
  return user && allowedRoles.includes(user.role);
};

export const getSiteCredentials = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const siteId = req.params.siteId;

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, ispId: true, customerId: true, siteCode: true },
    });

    if (!site) {
      sendNotFound(res, 'Site not found');
      return;
    }

    // Check access
    if (!canAccessCredentials(req.user!, site)) {
      sendForbidden(res, 'You do not have permission to view credentials for this site');
      return;
    }

    const credentials = await prisma.siteCredential.findUnique({
      where: { siteId },
    });

    if (!credentials) {
      sendSuccess(res, null, 'No credentials found for this site');
      return;
    }

    // Return credentials without decrypting passwords
    sendSuccess(res, {
      id: credentials.id,
      siteId: credentials.siteId,
      username: credentials.username,
      routerIp: credentials.routerIp,
      routerModel: credentials.routerModel,
      vlanId: credentials.vlanId,
      pppoeUsername: credentials.pppoeUsername,
      staticIps: credentials.staticIps,
      notes: credentials.notes,
      hasPassword: !!credentials.passwordEnc,
      hasPppoePassword: !!credentials.pppoePasswordEnc,
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt,
    }, 'Credentials fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateCredentials = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const siteId = req.params.siteId;
    const { username, password, routerIp, routerModel, vlanId, pppoeUsername, pppoePassword, staticIps, notes } = req.body;

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, ispId: true, customerId: true, siteCode: true },
    });

    if (!site) {
      sendNotFound(res, 'Site not found');
      return;
    }

    // Check access
    if (!canAccessCredentials(req.user!, site)) {
      sendForbidden(res, 'You do not have permission to manage credentials for this site');
      return;
    }

    // Encrypt passwords if provided
    let passwordEnc: string | undefined;
    let pppoePasswordEnc: string | undefined;

    if (password) {
      passwordEnc = encrypt(password);
    }
    if (pppoePassword) {
      pppoePasswordEnc = encrypt(pppoePassword);
    }

    const credentials = await prisma.siteCredential.upsert({
      where: { siteId },
      create: {
        siteId,
        username,
        passwordEnc,
        routerIp,
        routerModel,
        vlanId,
        pppoeUsername,
        pppoePasswordEnc,
        staticIps: staticIps ? JSON.parse(JSON.stringify(staticIps)) : Prisma.JsonNull,
        notes,
      },
      update: {
        username,
        ...(passwordEnc && { passwordEnc }),
        routerIp,
        routerModel,
        vlanId,
        pppoeUsername,
        ...(pppoePasswordEnc && { pppoePasswordEnc }),
        staticIps: staticIps ? JSON.parse(JSON.stringify(staticIps)) : Prisma.JsonNull,
        notes,
      },
    });

    sendSuccess(res, {
      id: credentials.id,
      siteId: credentials.siteId,
      username: credentials.username,
      routerIp: credentials.routerIp,
      routerModel: credentials.routerModel,
      vlanId: credentials.vlanId,
      pppoeUsername: credentials.pppoeUsername,
      staticIps: credentials.staticIps,
      notes: credentials.notes,
      hasPassword: !!credentials.passwordEnc,
      hasPppoePassword: !!credentials.pppoePasswordEnc,
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt,
    }, 'Credentials saved successfully');
  } catch (error) {
    next(error);
  }
};

export const revealPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const siteId = req.params.siteId;
    const { field } = req.body; // 'password' or 'pppoePassword'

    // Check if user can reveal credentials
    if (!canRevealCredentials(req.user!)) {
      sendForbidden(res, 'You do not have permission to reveal credentials');
      return;
    }

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, ispId: true, customerId: true, siteCode: true },
    });

    if (!site) {
      sendNotFound(res, 'Site not found');
      return;
    }

    // Check access
    if (!canAccessCredentials(req.user!, site)) {
      sendForbidden(res, 'You do not have permission to access credentials for this site');
      return;
    }

    const credentials = await prisma.siteCredential.findUnique({
      where: { siteId },
    });

    if (!credentials) {
      sendNotFound(res, 'No credentials found for this site');
      return;
    }

    let decryptedValue: string | null = null;

    if (field === 'password') {
      if (!credentials.passwordEnc) {
        sendError(res, 'No password stored for this site', 'NO_PASSWORD', null, 400);
        return;
      }
      decryptedValue = decrypt(credentials.passwordEnc);
    } else if (field === 'pppoePassword') {
      if (!credentials.pppoePasswordEnc) {
        sendError(res, 'No PPPoE password stored for this site', 'NO_PPPOE_PASSWORD', null, 400);
        return;
      }
      decryptedValue = decrypt(credentials.pppoePasswordEnc);
    } else {
      sendError(res, 'Invalid field. Use "password" or "pppoePassword"', 'INVALID_FIELD', null, 400);
      return;
    }

    // Log the credential reveal for audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREDENTIAL_REVEAL',
        entityType: 'SiteCredential',
        entityId: siteId,
        newData: { field, siteCode: site.siteCode },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    sendSuccess(res, { value: decryptedValue }, 'Credential revealed successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteCredentials = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const siteId = req.params.siteId;

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, ispId: true, customerId: true, siteCode: true },
    });

    if (!site) {
      sendNotFound(res, 'Site not found');
      return;
    }

    // Check access
    if (!canAccessCredentials(req.user!, site)) {
      sendForbidden(res, 'You do not have permission to delete credentials for this site');
      return;
    }

    await prisma.siteCredential.delete({
      where: { siteId },
    });

    sendSuccess(res, null, 'Credentials deleted successfully');
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      sendNotFound(res, 'Credentials not found');
      return;
    }
    next(error);
  }
};

export const listAllCredentials = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Only SUPER_ADMIN and ISP_OWNER can list all credentials
    if (!req.user || !['SUPER_ADMIN', 'ISP_OWNER'].includes(req.user.role)) {
      sendForbidden(res, 'You do not have permission to list all credentials');
      return;
    }

    const { page, limit, skip } = getPaginationParams(req);
    const search = getSearchQuery(req);

    const where: Prisma.SiteCredentialWhereInput = {};

    if (search) {
      where.OR = [
        { site: { siteCode: { contains: search, mode: 'insensitive' } } },
        { site: { customer: { companyName: { contains: search, mode: 'insensitive' } } } },
        { username: { contains: search, mode: 'insensitive' } },
        { routerIp: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [credentials, total] = await Promise.all([
      prisma.siteCredential.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          site: {
            select: {
              siteCode: true,
              customer: { select: { companyName: true, customerCode: true } },
            },
          },
        },
      }),
      prisma.siteCredential.count({ where }),
    ]);

    sendPaginatedSuccess(res, credentials.map(c => ({
      id: c.id,
      siteId: c.siteId,
      siteCode: c.site.siteCode,
      customerName: c.site.customer.companyName,
      customerCode: c.site.customer.customerCode,
      username: c.username,
      routerIp: c.routerIp,
      routerModel: c.routerModel,
      vlanId: c.vlanId,
      pppoeUsername: c.pppoeUsername,
      hasPassword: !!c.passwordEnc,
      hasPppoePassword: !!c.pppoePasswordEnc,
      updatedAt: c.updatedAt,
    })), 'Credentials fetched successfully', page, limit, total);
  } catch (error) {
    next(error);
  }
};