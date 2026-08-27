import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma, SiteStatus } from '@prisma/client';
import { prisma } from '@/config/db';
import { asyncHandler } from '@/middleware/errorHandler';
import { sendSuccess, sendPaginatedSuccess, sendNotFound } from '@/utils/apiResponse';
import { getPaginationParams, getSearchQuery } from '@/utils/pagination';

export const gisController = {
  listSites: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = getPaginationParams(req);
    const search = getSearchQuery(req);
    const status = req.query.status as string | undefined;
    const ispId = req.query.ispId as string | undefined;
    const connectionType = req.query.connectionType as string | undefined;

    const where: Prisma.SiteWhereInput = {
      ...(status ? { status: status as SiteStatus } : {}),
      ...(ispId ? { ispId } : {}),
      ...(connectionType ? { connectionType } : {}),
      latitude: { not: null },
      longitude: { not: null },
      ...(search
        ? {
            OR: [
              { siteCode: { contains: search, mode: 'insensitive' } },
              { customer: { companyName: { contains: search, mode: 'insensitive' } } },
              { installationCity: { contains: search, mode: 'insensitive' } },
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
          customer: { select: { id: true, customerCode: true, companyName: true, contactPerson: true, phone: true, email: true } },
          isp: { select: { id: true, name: true, displayName: true } },
        },
      }),
      prisma.site.count({ where }),
    ]);

    sendPaginatedSuccess(res, sites, 'Sites fetched successfully', page, limit, totalItems);
  }),

  getSite: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const site = await prisma.site.findUnique({
      where: { id },
      include: {
        customer: true,
        isp: true,
        credentials: true,
      },
    });

    if (!site) {
      sendNotFound(res, 'Site not found');
      return;
    }

    sendSuccess(res, site, 'Site fetched successfully');
  }),

  listIsps: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip, take } = getPaginationParams(req);
    const search = getSearchQuery(req);

    const where: Prisma.ISPWhereInput = {
      isActive: true,
      latitude: { not: null },
      longitude: { not: null },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [isps, totalItems] = await Promise.all([
      prisma.iSP.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.iSP.count({ where }),
    ]);

    sendPaginatedSuccess(res, isps, 'ISPs fetched successfully', page, limit, totalItems);
  }),

  getIsp: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const isp = await prisma.iSP.findUnique({
      where: { id },
    });

    if (!isp) {
      sendNotFound(res, 'ISP not found');
      return;
    }

    sendSuccess(res, isp, 'ISP fetched successfully');
  }),

  getMapData: asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const ispId = req.query.ispId as string | undefined;

    const where: Prisma.SiteWhereInput = {
      latitude: { not: null },
      longitude: { not: null },
      ...(status ? { status: status as SiteStatus } : {}),
      ...(ispId ? { ispId } : {}),
    };

    const sites = await prisma.site.findMany({
      where,
      select: {
        id: true,
        siteCode: true,
        planName: true,
        bandwidth: true,
        status: true,
        installationAddress: true,
        installationCity: true,
        installationState: true,
        latitude: true,
        longitude: true,
        connectionType: true,
        customer: { select: { id: true, customerCode: true, companyName: true, contactPerson: true, phone: true, email: true } },
        isp: { select: { id: true, name: true, displayName: true } },
      },
    });

    const isps = await prisma.iSP.findMany({
      where: {
        isActive: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        latitude: true,
        longitude: true,
        address: true,
        city: true,
        state: true,
      },
    });

    sendSuccess(res, { sites, isps }, 'Map data fetched successfully');
  }),

  getSiteStats: asyncHandler(async (req: Request, res: Response) => {
    const [totalSites, byStatus, byConnectionType, renewalsDue] = await Promise.all([
      prisma.site.count(),
      prisma.site.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.site.groupBy({
        by: ['connectionType'],
        where: { connectionType: { not: null } },
        _count: true,
      }),
      prisma.site.count({
        where: {
          status: 'DELIVERED_ACTIVE',
          renewalDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // next 30 days
            gte: new Date(),
          },
        },
      }),
    ]);

    const stats = {
      totalSites,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      byConnectionType: byConnectionType.map(c => ({ connectionType: c.connectionType, count: c._count })),
      renewalsDueIn30Days: renewalsDue,
    };

    sendSuccess(res, stats, 'Site stats fetched successfully');
  }),
};