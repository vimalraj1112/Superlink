import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { sendSuccess, sendPaginatedSuccess, sendNotFound } from '@/utils/apiResponse';
import { getPaginationParams, getSearchQuery } from '@/utils/pagination';
import { SiteStatus } from '@prisma/client';

export const siteCreateSchema = z.object({
  body: z.object({
    siteCode: z.string().min(1).optional(),
    customerId: z.string().min(1, 'Customer is required'),
    ispId: z.string().min(1, 'ISP is required'),
    planName: z.string().min(1),
    bandwidth: z.string().min(1),
    mrc: z.number().positive(),
    otc: z.number().nonnegative(),
    staticIpCharge: z.number().nonnegative().optional(),
    staticIpCount: z.number().int().nonnegative().optional(),
    otherCharges: z.number().nonnegative().optional(),
    installationAddress: z.string().min(1),
    installationCity: z.string().min(1),
    installationState: z.string().min(1),
    installationPincode: z.string().min(3),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    connectionType: z.string().optional(),
    circuitId: z.string().optional(),
    renewalDate: z.string().datetime().optional().nullable(),
    notes: z.string().optional(),
  }),
});

export const siteUpdateSchema = siteCreateSchema.deepPartial();

async function generateSiteCode(): Promise<string> {
  const count = await prisma.site.count();
  return `SITE-${String(count + 1).padStart(5, '0')}`;
}

export const listSites = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, take } = getPaginationParams(req);
  const search = getSearchQuery(req);
  const status = req.query.status as SiteStatus | 'ALL' | undefined;
  const customerId = req.query.customerId as string | undefined;
  const ispId = req.query.ispId as string | undefined;

  const where: Prisma.SiteWhereInput = {
    ...(status && status !== 'ALL' ? { status } : status !== 'ALL' ? { status: { not: SiteStatus.DISCONNECTED } } : {}),
    ...(customerId ? { customerId } : {}),
    ...(ispId ? { ispId } : {}),
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

export const getSite = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const site = await prisma.site.findUnique({
    where: { id },
    include: {
      customer: true,
      isp: true,
      credentials: true,
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

export const createSite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const siteCode = req.body.siteCode || (await generateSiteCode());

  const site = await prisma.site.create({
    data: {
      ...req.body,
      siteCode,
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

  const updateData: Prisma.SiteUpdateInput = {
    ...req.body,
    updatedById: req.user!.userId,
  };

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

export const getSitesByCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { customerId } = req.params;

  const sites = await prisma.site.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    include: {
      isp: { select: { id: true, name: true, displayName: true } },
    },
  });

  sendSuccess(res, sites, 'Customer sites fetched successfully');
});