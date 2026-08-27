import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { sendSuccess, sendPaginatedSuccess, sendNotFound } from '@/utils/apiResponse';
import { getPaginationParams, getSearchQuery } from '@/utils/pagination';

export const ispCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    displayName: z.string().min(1),
    contactPerson: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    website: z.string().url().optional(),
    logoUrl: z.string().url().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const ispUpdateSchema = ispCreateSchema.deepPartial();

export const listIsps = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, take } = getPaginationParams(req);
  const search = getSearchQuery(req);
  const isActive = req.query.isActive as string | undefined;

  const where: Prisma.ISPWhereInput = {
    ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } },
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
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { sites: true } },
      },
    }),
    prisma.iSP.count({ where }),
  ]);

  sendPaginatedSuccess(res, isps, 'ISPs fetched successfully', page, limit, totalItems);
});

export const getIsp = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const isp = await prisma.iSP.findUnique({
    where: { id },
    include: {
      sites: {
        include: {
          customer: { select: { id: true, customerCode: true, companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!isp) {
    sendNotFound(res, 'ISP not found');
    return;
  }

  sendSuccess(res, isp, 'ISP fetched successfully');
});

export const createIsp = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const isp = await prisma.iSP.create({
    data: {
      ...req.body,
      createdById: req.user!.userId,
    },
  });

  sendSuccess(res, isp, 'ISP created successfully', 201);
});

export const updateIsp = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const isp = await prisma.iSP.update({
    where: { id },
    data: {
      ...req.body,
      updatedById: req.user!.userId,
    },
  });

  sendSuccess(res, isp, 'ISP updated successfully');
});

export const deleteIsp = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.iSP.update({
    where: { id },
    data: { isActive: false },
  });

  sendSuccess(res, null, 'ISP deactivated successfully');
});