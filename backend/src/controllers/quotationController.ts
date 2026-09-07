import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { sendSuccess, sendPaginatedSuccess, sendNotFound } from '@/utils/apiResponse';
import { getPaginationParams, getSearchQuery } from '@/utils/pagination';
import { UserRole } from '@prisma/client';
import { buildQuotationPdf } from '@/utils/quotationPdf';

export const quotationCreateSchema = z.object({
  body: z.object({
    customerId: z.string().min(1, 'Customer is required'),
    siteId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? undefined : val),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    validityDate: z.string().datetime({ offset: true }),
    subtotal: z.number().min(0),
    taxAmount: z.number().min(0).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    totalAmount: z.number().min(0),
    terms: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    notes: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    items: z.array(z.object({
      description: z.string().min(1),
      quantity: z.number().int().min(1).default(1),
      unitPrice: z.number().min(0),
      totalPrice: z.number().min(0),
      sortOrder: z.number().int().default(0),
    })).min(1, 'At least one item is required'),
  }),
});

export const quotationUpdateSchema = quotationCreateSchema.deepPartial();

async function generateQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `QUO-${year}-`;
  const quotations = await prisma.quotation.findMany({
    select: { quotationNumber: true },
  });
  const max = quotations.reduce((m, q) => {
    const n = parseInt((q.quotationNumber || '').replace(prefix, ''), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

export const listQuotations = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, take } = getPaginationParams(req);
  const search = getSearchQuery(req);
  const status = req.query.status as string | undefined;
  const customerId = req.query.customerId as string | undefined;
  const siteId = req.query.siteId as string | undefined;

  const where: Prisma.QuotationWhereInput = {
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
    ...(siteId ? { siteId } : {}),
    ...(search
      ? {
          OR: [
            { quotationNumber: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { customer: { companyName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [quotations, totalItems] = await Promise.all([
    prisma.quotation.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, companyName: true, customerCode: true } },
        site: { select: { id: true, siteCode: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.quotation.count({ where }),
  ]);

  sendPaginatedSuccess(res, quotations, 'Quotations fetched successfully', page, limit, totalItems);
});

export const getQuotation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      site: { include: { isp: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!quotation) {
    sendNotFound(res, 'Quotation not found');
    return;
  }

  sendSuccess(res, quotation, 'Quotation fetched successfully');
});

export const createQuotation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { items, ...quotationData } = req.body;

  const quotationNumber = await generateQuotationNumber();

  const quotation = await prisma.quotation.create({
    data: {
      ...quotationData,
      quotationNumber,
      validityDate: new Date(quotationData.validityDate),
      createdById: req.user!.userId,
      items: {
        create: items.map((item: any, index: number) => ({
          ...item,
          sortOrder: item.sortOrder ?? index,
        })),
      },
    },
    include: {
      customer: { select: { id: true, companyName: true } },
      site: { select: { id: true, siteCode: true } },
      items: true,
    },
  });

  sendSuccess(res, quotation, 'Quotation created successfully', 201);
});

export const updateQuotation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { items, ...quotationData } = req.body;

  // Check if quotation exists
  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) {
    sendNotFound(res, 'Quotation not found');
    return;
  }

  // Update quotation and items
  const quotation = await prisma.$transaction(async (tx) => {
    // Delete existing items and create new ones
    await tx.quotationItem.deleteMany({ where: { quotationId: id } });

    return tx.quotation.update({
      where: { id },
      data: {
        ...quotationData,
        validityDate: quotationData.validityDate ? new Date(quotationData.validityDate) : undefined,
        items: {
          create: items?.map((item: any, index: number) => ({
            ...item,
            sortOrder: item.sortOrder ?? index,
          })) ?? [],
        },
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        site: { select: { id: true, siteCode: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });
  });

  sendSuccess(res, quotation, 'Quotation updated successfully');
});

export const deleteQuotation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) {
    sendNotFound(res, 'Quotation not found');
    return;
  }

  await prisma.quotation.delete({ where: { id } });
  sendSuccess(res, null, 'Quotation deleted successfully');
});

export const downloadQuotationPdf = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      site: { include: { isp: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!quotation) {
    sendNotFound(res, 'Quotation not found');
    return;
  }

  const pdfBuffer = await buildQuotationPdf({
    quotationNumber: quotation.quotationNumber,
    title: quotation.title,
    status: quotation.status,
    validityDate: quotation.validityDate,
    description: quotation.description,
    terms: quotation.terms,
    subtotal: Number(quotation.subtotal) || 0,
    taxAmount: Number(quotation.taxAmount) || 0,
    totalAmount: Number(quotation.totalAmount) || 0,
    createdAt: quotation.createdAt,
    customer: quotation.customer,
    site: quotation.site as any,
    createdBy: quotation.createdBy,
    items: quotation.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice) || 0,
      totalPrice: Number(item.totalPrice) || 0,
    })),
  });

  const fileName = `${quotation.quotationNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(pdfBuffer);
});