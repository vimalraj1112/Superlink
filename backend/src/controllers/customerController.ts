import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { sendSuccess, sendPaginatedSuccess, sendNotFound } from '@/utils/apiResponse';
import { getPaginationParams, getSearchQuery } from '@/utils/pagination';
import { customerReadScope } from '@/utils/accessScope';

export const customerCreateSchema = z.object({
  body: z.object({
    customerCode: z.string().min(1).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    companyName: z.string().min(1),
    contactPerson: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(5),
    alternatePhone: z.string().optional(),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(3),
    gstNumber: z.string().optional(),
    panNumber: z.string().optional(),
    billingAddress: z.string().optional(),
    billingCity: z.string().optional(),
    billingState: z.string().optional(),
    billingPincode: z.string().optional(),
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const customerUpdateSchema = customerCreateSchema.deepPartial();

async function generateCustomerCode(): Promise<string> {
  const customers = await prisma.customer.findMany({
    select: { customerCode: true },
  });
  const max = customers.reduce((m, c) => {
    const n = parseInt((c.customerCode || '').replace('CUST-', ''), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `CUST-${String(max + 1).padStart(5, '0')}`;
}

export const listCustomers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, skip, take } = getPaginationParams(req);
  const search = getSearchQuery(req);
  const isActive = req.query.isActive as string | undefined;

  const where: Prisma.CustomerWhereInput = {
    ...customerReadScope(req.user),
    ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
    ...(search
      ? {
          OR: [
            { customerCode: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [customers, totalItems] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { sites: true, tickets: true, payments: true },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  // Attach each customer's soonest site renewal so the list can flag renewals
  // that are due or overdue. Same basis as the dashboard: renewalDate, and
  // disconnected sites are ignored.
  const customerIds = customers.map(customer => customer.id);
  const renewalSites = customerIds.length
    ? await prisma.site.findMany({
        where: {
          customerId: { in: customerIds },
          renewalDate: { not: null },
          status: { not: 'DISCONNECTED' },
        },
        select: { customerId: true, renewalDate: true },
        orderBy: { renewalDate: 'asc' },
      })
    : [];

  const nextRenewalByCustomer = new Map<string, Date>();
  for (const site of renewalSites) {
    if (site.renewalDate && !nextRenewalByCustomer.has(site.customerId)) {
      nextRenewalByCustomer.set(site.customerId, site.renewalDate);
    }
  }

  const customersWithRenewal = customers.map(customer => ({
    ...customer,
    nextRenewalDate: nextRenewalByCustomer.get(customer.id) ?? null,
  }));

  sendPaginatedSuccess(res, customersWithRenewal, 'Customers fetched successfully', page, limit, totalItems);
});

export const getCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const customer = await prisma.customer.findFirst({
    where: { id, ...customerReadScope(req.user) },
    include: {
      sites: {
        include: { isp: true },
        orderBy: { createdAt: 'desc' },
      },
      tickets: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        take: 10,
      },
    },
  });

  if (!customer) {
    sendNotFound(res, 'Customer not found');
    return;
  }

  sendSuccess(res, customer, 'Customer fetched successfully');
});

export const createCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const customerCode = req.body.customerCode || (await generateCustomerCode());

  const customer = await prisma.customer.create({
    data: {
      ...req.body,
      customerCode,
      createdById: req.user!.userId,
    },
  });

  sendSuccess(res, customer, 'Customer created successfully', 201);
});

export const updateCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...req.body,
      updatedById: req.user!.userId,
    },
  });

  sendSuccess(res, customer, 'Customer updated successfully');
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.customer.update({
    where: { id },
    data: { isActive: false },
  });

  sendSuccess(res, null, 'Customer deactivated successfully');
});
