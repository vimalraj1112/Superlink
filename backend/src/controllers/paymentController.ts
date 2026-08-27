import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { sendSuccess, sendPaginatedSuccess, sendNotFound } from '@/utils/apiResponse';
import { getPaginationParams, getSearchQuery, getDateRange } from '@/utils/pagination';
import { PaymentType } from '@prisma/client';

export const paymentCreateSchema = z.object({
  body: z.object({
    customerId: z.string().min(1, 'Customer is required'),
    siteId: z.string().optional().nullable(),
    amount: z.number().positive('Amount must be positive'),
    type: z.enum(['OTC', 'MRC', 'STATIC_IP', 'OTHER']),
    description: z.string().optional(),
    paymentDate: z.string().refine((val) => {
      const parsed = Date.parse(val);
      return !isNaN(parsed);
    }, {
      message: 'Invalid date format. Use YYYY-MM-DD or ISO 8601 format.',
    }).optional(),
    paymentMethod: z.string().optional(),
    transactionId: z.string().optional(),
    referenceNumber: z.string().optional(),
    invoiceNumber: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const paymentUpdateSchema = paymentCreateSchema.deepPartial();

async function generatePaymentNumber(): Promise<string> {
  const count = await prisma.payment.count();
  const year = new Date().getFullYear();
  return `PAY-${year}${String(count + 1).padStart(5, '0')}`;
}

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, take } = getPaginationParams(req);
  const search = getSearchQuery(req);
  const type = req.query.type as PaymentType | undefined;
  const customerId = req.query.customerId as string | undefined;
  const siteId = req.query.siteId as string | undefined;
  const { startDate, endDate } = getDateRange(req);

  const where: Prisma.PaymentWhereInput = {
    ...(type ? { type } : {}),
    ...(customerId ? { customerId } : {}),
    ...(siteId ? { siteId } : {}),
    ...(startDate || endDate ? {
      paymentDate: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      },
    } : {}),
    ...(search
      ? {
          OR: [
            { paymentNumber: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { transactionId: { contains: search, mode: 'insensitive' } },
            { referenceNumber: { contains: search, mode: 'insensitive' } },
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
            { customer: { companyName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [payments, totalItems] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { paymentDate: 'desc' },
      include: {
        customer: { select: { id: true, customerCode: true, companyName: true, contactPerson: true } },
        site: { select: { id: true, siteCode: true, planName: true } },
        recordedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  sendPaginatedSuccess(res, payments, 'Payments fetched successfully', page, limit, totalItems);
});

export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      customer: true,
      site: { include: { isp: { select: { id: true, name: true, displayName: true } } } },
      recordedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!payment) {
    sendNotFound(res, 'Payment not found');
    return;
  }

  sendSuccess(res, payment, 'Payment fetched successfully');
});

export const createPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const paymentNumber = await generatePaymentNumber();

  const payment = await prisma.payment.create({
    data: {
      ...req.body,
      paymentNumber,
      amount: new Prisma.Decimal(req.body.amount),
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
      recordedById: req.user!.userId,
    },
    include: {
      customer: { select: { id: true, customerCode: true, companyName: true } },
      site: { select: { id: true, siteCode: true, planName: true } },
      recordedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  sendSuccess(res, payment, 'Payment created successfully', 201);
});

export const updatePayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const currentPayment = await prisma.payment.findUnique({
    where: { id },
  });

  if (!currentPayment) {
    sendNotFound(res, 'Payment not found');
    return;
  }

  const updateData: Prisma.PaymentUpdateInput = {};

  if (req.body.customerId !== undefined) updateData.customer = { connect: { id: req.body.customerId } };
  if (req.body.siteId !== undefined) updateData.site = { connect: { id: req.body.siteId } };
  if (req.body.amount !== undefined) updateData.amount = new Prisma.Decimal(req.body.amount);
  if (req.body.type !== undefined) updateData.type = req.body.type;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.paymentDate !== undefined) updateData.paymentDate = new Date(req.body.paymentDate);
  if (req.body.paymentMethod !== undefined) updateData.paymentMethod = req.body.paymentMethod;
  if (req.body.transactionId !== undefined) updateData.transactionId = req.body.transactionId;
  if (req.body.referenceNumber !== undefined) updateData.referenceNumber = req.body.referenceNumber;
  if (req.body.invoiceNumber !== undefined) updateData.invoiceNumber = req.body.invoiceNumber;
  if (req.body.notes !== undefined) updateData.notes = req.body.notes;

  const payment = await prisma.payment.update({
    where: { id },
    data: updateData,
    include: {
      customer: { select: { id: true, customerCode: true, companyName: true } },
      site: { select: { id: true, siteCode: true, planName: true } },
      recordedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  sendSuccess(res, payment, 'Payment updated successfully');
});

export const deletePayment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.payment.delete({ where: { id } });

  sendSuccess(res, null, 'Payment deleted successfully');
});

export const getPaymentStats = asyncHandler(async (req: Request, res: Response) => {
  const { customerId, siteId } = req.query;
  const { startDate, endDate } = getDateRange(req);

  const where: Prisma.PaymentWhereInput = {
    ...(customerId ? { customerId: customerId as string } : {}),
    ...(siteId ? { siteId: siteId as string } : {}),
    ...(startDate || endDate ? {
      paymentDate: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      },
    } : {}),
  };

  const [totalAmount, byType, count] = await Promise.all([
    prisma.payment.aggregate({
      where,
      _sum: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.count({ where }),
  ]);

  const stats = {
    totalPayments: count,
    totalAmount: totalAmount._sum.amount || 0,
    byType: byType.map(t => ({
      type: t.type,
      count: t._count,
      totalAmount: t._sum.amount || 0,
    })),
  };

  sendSuccess(res, stats, 'Payment stats fetched successfully');
});