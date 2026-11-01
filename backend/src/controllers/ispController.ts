import { Request, Response } from 'express';
import fs from 'fs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { sendSuccess, sendPaginatedSuccess, sendNotFound } from '@/utils/apiResponse';
import { getPaginationParams, getSearchQuery } from '@/utils/pagination';
import {
  isDataUrlImage,
  isExternalImageUrl,
  saveEntityImage,
  deleteEntityImage,
  entityImagePath,
  imageContentType,
} from '@/utils/fileStorage';

export const ispCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    displayName: z.string().min(1),
    contactPerson: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    email: z.string().email().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    phone: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    address: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    city: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    state: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    website: z.string().url().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    // Logo/photo: either a base64 data URL (new upload), an external image URL,
    // a stored file name (unchanged) or '' to clear it on update.
    logoUrl: z.string().max(9000000, 'Logo is too large').optional().nullable(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    notes: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
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

/** Streams an ISP's uploaded logo. */
export const getIspLogo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const isp = await prisma.iSP.findUnique({
    where: { id },
    select: { logoUrl: true },
  });

  if (!isp || !isp.logoUrl) {
    sendNotFound(res, 'No logo attached to this ISP');
    return;
  }

  // A logo hosted elsewhere is used directly by the client, not streamed here.
  if (isExternalImageUrl(isp.logoUrl)) {
    sendNotFound(res, 'Logo is hosted externally');
    return;
  }

  const filePath = entityImagePath(isp.logoUrl);
  if (!fs.existsSync(filePath)) {
    sendNotFound(res, 'ISP logo file is missing');
    return;
  }

  res.setHeader('Content-Type', imageContentType(isp.logoUrl));
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.sendFile(filePath);
});

export const createIsp = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { logoUrl, ...data } = req.body;

  // A new upload is saved to disk; a full URL is kept as-is.
  const storedLogo = isDataUrlImage(logoUrl)
    ? saveEntityImage(logoUrl, 'isp')
    : isExternalImageUrl(logoUrl)
      ? logoUrl
      : undefined;

  const isp = await prisma.iSP.create({
    data: {
      ...data,
      logoUrl: storedLogo,
      createdById: req.user!.userId,
    },
  });

  sendSuccess(res, isp, 'ISP created successfully', 201);
});

export const updateIsp = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { logoUrl, ...data } = req.body;

  const updateData: Prisma.ISPUpdateInput = {
    ...data,
    updatedById: req.user!.userId,
  };

  if (logoUrl !== undefined) {
    const current = await prisma.iSP.findUnique({ where: { id }, select: { logoUrl: true } });

    if (isDataUrlImage(logoUrl)) {
      // New logo uploaded — store it and drop the previous local file.
      const fileName = saveEntityImage(logoUrl, 'isp');
      deleteEntityImage(current?.logoUrl);
      updateData.logoUrl = fileName;
    } else if (!logoUrl) {
      // Explicitly cleared by the user.
      deleteEntityImage(current?.logoUrl);
      updateData.logoUrl = null;
    }
    // Any other value (e.g. the unchanged stored name or an external URL) is
    // left untouched.
  }

  const isp = await prisma.iSP.update({
    where: { id },
    data: updateData,
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