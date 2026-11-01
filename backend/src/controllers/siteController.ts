import { Request, Response } from 'express';
import fs from 'fs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { sendSuccess, sendPaginatedSuccess, sendNotFound } from '@/utils/apiResponse';
import { getPaginationParams, getSearchQuery } from '@/utils/pagination';
import { siteReadScope } from '@/utils/accessScope';
import { SiteStatus } from '@prisma/client';
import {
  isDataUrlImage,
  saveEntityImage,
  deleteEntityImage,
  entityImagePath,
  imageContentType,
} from '@/utils/fileStorage';

export const siteCreateSchema = z.object({
  body: z.object({
    siteCode: z.string().min(1).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    customerId: z.string().min(1, 'Customer is required'),
    ispId: z.string().min(1, 'ISP is required'),
    planName: z.string().min(1),
    bandwidth: z.string().min(1),
    mrc: z.number().positive(),
    otc: z.number().nonnegative(),
    staticIpCharge: z.number().nonnegative().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    staticIpCount: z.number().int().nonnegative().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    otherCharges: z.number().nonnegative().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    installationAddress: z.string().min(1),
    installationCity: z.string().min(1),
    installationState: z.string().min(1),
    installationPincode: z.string().min(3),
    latitude: z.number().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    longitude: z.number().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    connectionType: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    circuitId: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    activeDate: z.string().datetime().optional().nullable().or(z.literal('')).transform(val => val === '' ? undefined : val),
    renewalDate: z.string().datetime().optional().nullable().or(z.literal('')).transform(val => val === '' ? undefined : val),
    notes: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    // Optional site photo. Accepts a base64 data URL (new upload), a stored file
    // name (unchanged) or '' to clear it on update.
    photoUrl: z.string().max(9000000, 'Photo is too large').optional().nullable(),
  }),
});

export const siteUpdateSchema = siteCreateSchema.deepPartial();

async function generateSiteCode(): Promise<string> {
  const sites = await prisma.site.findMany({
    select: { siteCode: true },
  });
  const max = sites.reduce((m, s) => {
    const n = parseInt((s.siteCode || '').replace('SITE-', ''), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `SITE-${String(max + 1).padStart(5, '0')}`;
}

export const listSites = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, skip, take } = getPaginationParams(req);
  const search = getSearchQuery(req);
  const status = req.query.status as SiteStatus | 'ALL' | undefined;
  const customerId = req.query.customerId as string | undefined;
  const ispId = req.query.ispId as string | undefined;
  const renewalDue = req.query.renewalDue as string | undefined;

  // Must match RENEWAL_DUE_DAYS in the renewal badge UI.
  const renewalWindowEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const where: Prisma.SiteWhereInput = {
    ...siteReadScope(req.user),
    ...(status && status !== 'ALL' ? { status } : status !== 'ALL' ? { status: { not: SiteStatus.DISCONNECTED } } : {}),
    ...(customerId ? { customerId } : {}),
    ...(ispId ? { ispId } : {}),
    ...(renewalDue === 'true' ? { renewalDate: { lte: renewalWindowEnd } } : {}),
    ...(search
      ? {
          OR: [
            { siteCode: { contains: search, mode: 'insensitive' } },
            { planName: { contains: search, mode: 'insensitive' } },
            { installationAddress: { contains: search, mode: 'insensitive' } },
            { installationCity: { contains: search, mode: 'insensitive' } },
            { circuitId: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [sites, totalItems] = await Promise.all([
    prisma.site.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, customerCode: true, companyName: true, contactPerson: true } },
        isp: { select: { id: true, name: true, displayName: true } },
        _count: { select: { tickets: true, payments: true } },
      },
    }),
    prisma.site.count({ where }),
  ]);

  sendPaginatedSuccess(res, sites, 'Sites fetched successfully', page, limit, totalItems);
});

export const getSite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const site = await prisma.site.findFirst({
    where: { id, ...siteReadScope(req.user) },
    include: {
      customer: true,
      isp: true,
      credentials: {
        select: {
          id: true,
          siteId: true,
          username: true,
          routerIp: true,
          routerModel: true,
          vlanId: true,
          pppoeUsername: true,
          staticIps: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      tickets: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        take: 10,
      },
    },
  });

  if (!site) {
    sendNotFound(res, 'Site not found');
    return;
  }

  sendSuccess(res, site, 'Site fetched successfully');
});

/** Streams a site's uploaded photo. Guarded by auth + the same read scope as the site. */
export const getSitePhoto = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const site = await prisma.site.findFirst({
    where: { id, ...siteReadScope(req.user) },
    select: { photoUrl: true },
  });

  if (!site || !site.photoUrl) {
    sendNotFound(res, 'No photo attached to this site');
    return;
  }

  const filePath = entityImagePath(site.photoUrl);
  if (!fs.existsSync(filePath)) {
    sendNotFound(res, 'Site photo file is missing');
    return;
  }

  res.setHeader('Content-Type', imageContentType(site.photoUrl));
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.sendFile(filePath);
});

export const createSite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const siteCode = req.body.siteCode || (await generateSiteCode());
  const { photoUrl, ...data } = req.body;

  // Only a genuine upload is persisted; anything else is ignored.
  const photoFile = isDataUrlImage(photoUrl) ? saveEntityImage(photoUrl, 'site') : undefined;

  const site = await prisma.site.create({
    data: {
      ...data,
      photoUrl: photoFile,
      siteCode,
      activeDate: req.body.activeDate ? new Date(req.body.activeDate) : null,
      renewalDate: req.body.renewalDate ? new Date(req.body.renewalDate) : null,
      createdById: req.user!.userId,
    },
    include: {
      customer: { select: { id: true, customerCode: true, companyName: true } },
      isp: { select: { id: true, name: true, displayName: true } },
    },
  });

  sendSuccess(res, site, 'Site created successfully', 201);
});

export const updateSite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { photoUrl, ...data } = req.body;

  const updateData: Prisma.SiteUpdateInput = {
    ...data,
    updatedById: req.user!.userId,
  };

  if (photoUrl !== undefined) {
    const current = await prisma.site.findUnique({ where: { id }, select: { photoUrl: true } });

    if (isDataUrlImage(photoUrl)) {
      // New photo uploaded — store it and drop the previous file.
      const fileName = saveEntityImage(photoUrl, 'site');
      deleteEntityImage(current?.photoUrl);
      updateData.photoUrl = fileName;
    } else if (!photoUrl) {
      // Explicitly cleared by the user.
      deleteEntityImage(current?.photoUrl);
      updateData.photoUrl = null;
    }
    // Any other value (e.g. the unchanged stored file name) is left untouched.
  }

  if (req.body.activeDate !== undefined) {
    updateData.activeDate = req.body.activeDate ? new Date(req.body.activeDate) : null;
  }

  if (req.body.renewalDate !== undefined) {
    updateData.renewalDate = req.body.renewalDate ? new Date(req.body.renewalDate) : null;
  }

  const site = await prisma.site.update({
    where: { id },
    data: updateData,
    include: {
      customer: { select: { id: true, customerCode: true, companyName: true } },
      isp: { select: { id: true, name: true, displayName: true } },
    },
  });

  sendSuccess(res, site, 'Site updated successfully');
});

export const deleteSite = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.site.update({
    where: { id },
    data: { status: SiteStatus.DISCONNECTED, disconnectedAt: new Date() },
  });

  sendSuccess(res, null, 'Site marked as disconnected');
});

export const getSitesByCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { customerId } = req.params;

  const sites = await prisma.site.findMany({
    where: { customerId, ...siteReadScope(req.user) },
    orderBy: { createdAt: 'desc' },
    include: {
      isp: { select: { id: true, name: true, displayName: true } },
    },
  });

  sendSuccess(res, sites, 'Customer sites fetched successfully');
});