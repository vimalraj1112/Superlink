import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { asyncHandler } from '@/middleware/errorHandler';
import { sendSuccess } from '@/utils/apiResponse';
import { AuthenticatedRequest } from '@/middleware/auth';

export const getDashboardStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;

  // Base where conditions - for non-admin roles, filter by user's customers/sites
  const customerWhere: Prisma.CustomerWhereInput = {};
  const siteWhere: Prisma.SiteWhereInput = {};
  const ticketWhere: Prisma.TicketWhereInput = {};
  const paymentWhere: Prisma.PaymentWhereInput = {};

  // For CLIENT role, only show their own data
  if (role === 'CLIENT') {
    const customer = await prisma.customer.findFirst({
      where: { createdById: userId },
    });
    if (customer) {
      customerWhere.id = customer.id;
      siteWhere.customerId = customer.id;
      ticketWhere.customerId = customer.id;
      paymentWhere.customerId = customer.id;
    } else {
      // No customer found for this client
      sendSuccess(res, {
        totalCustomers: 0,
        totalSites: 0,
        activeSites: 0,
        openTickets: 0,
        totalTickets: 0,
        totalPayments: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        pendingRenewals: 0,
        totalIsps: 0,
        activeIsps: 0,
      }, 'Dashboard stats fetched successfully');
      return;
    }
  }

  // For SALES, NOC, FINANCE, SUPPORT - they can see all (depending on permissions)
  // But typically they see everything unless restricted

  const [
    totalCustomers,
    totalSites,
    activeSites,
    openTickets,
    totalTickets,
    totalPayments,
    totalRevenue,
    monthlyRevenue,
    pendingRenewals,
    totalIsps,
    activeIsps,
  ] = await Promise.all([
    prisma.customer.count({ where: customerWhere }),
    prisma.site.count({ where: siteWhere }),
    prisma.site.count({
      where: {
        ...siteWhere,
        status: 'DELIVERED_ACTIVE',
      },
    }),
    prisma.ticket.count({
      where: {
        ...ticketWhere,
        status: 'OPEN',
      },
    }),
    prisma.ticket.count({ where: ticketWhere }),
    prisma.payment.count({ where: paymentWhere }),
    prisma.payment.aggregate({
      where: paymentWhere,
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        ...paymentWhere,
        paymentDate: {
          gte: new Date(new Date().setDate(1)), // First day of current month
        },
      },
      _sum: { amount: true },
    }),
    prisma.site.count({
      where: {
        ...siteWhere,
        status: 'RENEWAL_DUE',
      },
    }),
    prisma.iSP.count(),
    prisma.iSP.count({ where: { isActive: true } }),
  ]);

  sendSuccess(
    res,
    {
      totalCustomers,
      totalSites,
      activeSites,
      openTickets,
      totalTickets,
      totalPayments,
      totalRevenue: Number(totalRevenue._sum.amount) || 0,
      monthlyRevenue: Number(monthlyRevenue._sum.amount) || 0,
      pendingRenewals,
      totalIsps,
      activeIsps,
    },
    'Dashboard stats fetched successfully'
  );
});

export const getRecentTickets = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;

  const ticketWhere: Prisma.TicketWhereInput = {};

  if (role === 'CLIENT') {
    const customer = await prisma.customer.findFirst({
      where: { createdById: userId },
    });
    if (customer) {
      ticketWhere.customerId = customer.id;
    } else {
      sendSuccess(res, [], 'No tickets found');
      return;
    }
  }

  const tickets = await prisma.ticket.findMany({
    where: ticketWhere,
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, customerCode: true, companyName: true } },
      site: { select: { id: true, siteCode: true, planName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { messages: true } },
    },
  });

  sendSuccess(res, tickets, 'Recent tickets fetched successfully');
});

export const getRenewals = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;

  const siteWhere: Prisma.SiteWhereInput = {
    renewalDate: {
      lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
    },
    status: { not: 'DISCONNECTED' },
  };

  if (role === 'CLIENT') {
    const customer = await prisma.customer.findFirst({
      where: { createdById: userId },
    });
    if (customer) {
      siteWhere.customerId = customer.id;
    } else {
      sendSuccess(res, [], 'No renewals found');
      return;
    }
  }

  const renewals = await prisma.site.findMany({
    where: siteWhere,
    take: 10,
    orderBy: { renewalDate: 'asc' },
    include: {
      customer: { select: { id: true, customerCode: true, companyName: true } },
      isp: { select: { id: true, name: true, displayName: true } },
    },
  });

  sendSuccess(res, renewals, 'Upcoming renewals fetched successfully');
});

export const getChartData = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const role = req.user?.role;

  const siteWhere: Prisma.SiteWhereInput = {};
  const paymentWhere: Prisma.PaymentWhereInput = {};

  if (role === 'CLIENT') {
    const customer = await prisma.customer.findFirst({
      where: { createdById: userId },
    });
    if (customer) {
      siteWhere.customerId = customer.id;
      paymentWhere.customerId = customer.id;
    } else {
      sendSuccess(res, { sitesByStatus: [], revenueByMonth: [] }, 'Chart data fetched successfully');
      return;
    }
  }

  // Sites by status
  const sitesByStatusRaw = await prisma.site.groupBy({
    by: ['status'],
    where: siteWhere,
    _count: { status: true },
  });

  const sitesByStatus = sitesByStatusRaw.map(item => ({
    status: item.status,
    count: item._count.status,
  }));

  // Revenue by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const payments = await prisma.payment.findMany({
    where: {
      ...paymentWhere,
      paymentDate: { gte: sixMonthsAgo },
    },
    select: {
      amount: true,
      paymentDate: true,
      type: true,
    },
  });

  // Group by month
  const monthlyData: Record<string, { mrc: number; otc: number; other: number }> = {};

  payments.forEach(payment => {
    const monthKey = payment.paymentDate.toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { mrc: 0, otc: 0, other: 0 };
    }
    const amount = Number(payment.amount);
    if (payment.type === 'MRC') {
      monthlyData[monthKey].mrc += amount;
    } else if (payment.type === 'OTC') {
      monthlyData[monthKey].otc += amount;
    } else {
      monthlyData[monthKey].other += amount;
    }
  });

  const revenueByMonth = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      mrc: data.mrc,
      otc: data.otc,
      other: data.other,
      total: data.mrc + data.otc + data.other,
    }));

  sendSuccess(res, { sitesByStatus, revenueByMonth }, 'Chart data fetched successfully');
});