import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { sendSuccess, sendError } from '@/utils/apiResponse';
import * as XLSX from 'xlsx';

// Validation schemas
export const importCustomersSchema = z.object({
  body: z.object({
    customers: z.array(z.object({
      customerCode: z.string().optional(),
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
    })).min(1, 'At least one customer is required'),
    previewOnly: z.boolean().optional(),
  }),
});

export const importSitesSchema = z.object({
  body: z.object({
    sites: z.array(z.object({
      siteCode: z.string().optional(),
      customerId: z.string().min(1, 'Customer is required'),
      ispId: z.string().optional(),
      planName: z.string().min(1),
      bandwidth: z.string().min(1),
      mrc: z.number().min(0).optional(),
      otc: z.number().min(0).optional(),
      staticIpCharge: z.number().min(0).optional(),
      staticIpCount: z.number().min(0).optional(),
      otherCharges: z.number().min(0).optional(),
      status: z.string().optional(),
      installationAddress: z.string().min(1),
      installationCity: z.string().min(1),
      installationState: z.string().min(1),
      installationPincode: z.string().min(3),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      connectionType: z.string().optional(),
      circuitId: z.string().optional(),
      provisionedAt: z.string().datetime().optional().nullable(),
      renewalDate: z.string().datetime().optional().nullable(),
      notes: z.string().optional(),
    })).min(1, 'At least one site is required'),
    previewOnly: z.boolean().optional(),
  }),
});

async function generateCustomerCode(): Promise<string> {
  const count = await prisma.customer.count();
  return `CUST-${String(count + 1).padStart(5, '0')}`;
}

async function generateSiteCode(): Promise<string> {
  const count = await prisma.site.count();
  return `SITE-${String(count + 1).padStart(5, '0')}`;
}

// Export customers to Excel
export const exportCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { search, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const where: Prisma.CustomerWhereInput = {
    ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
    ...(search
      ? {
          OR: [
            { customerCode: { contains: search as string, mode: 'insensitive' } },
            { companyName: { contains: search as string, mode: 'insensitive' } },
            { contactPerson: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } },
            { phone: { contains: search as string, mode: 'insensitive' } },
            { city: { contains: search as string, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { [sortBy as string]: sortOrder },
    include: {
      _count: {
        select: { sites: true, tickets: true, payments: true },
      },
    },
  });

  const workbook = XLSX.utils.book_new();

  // Main customers sheet
  const customersData = customers.map((c, index) => ({
    'S.No': index + 1,
    'Customer Code': c.customerCode,
    'Company Name': c.companyName,
    'Contact Person': c.contactPerson,
    'Email': c.email,
    'Phone': c.phone,
    'Alternate Phone': c.alternatePhone || '',
    'Address': c.address,
    'City': c.city,
    'State': c.state,
    'Pincode': c.pincode,
    'GST Number': c.gstNumber || '',
    'PAN Number': c.panNumber || '',
    'Billing Address': c.billingAddress || '',
    'Billing City': c.billingCity || '',
    'Billing State': c.billingState || '',
    'Billing Pincode': c.billingPincode || '',
    'Notes': c.notes || '',
    'Status': c.isActive ? 'Active' : 'Inactive',
    'Sites Count': c._count.sites,
    'Tickets Count': c._count.tickets,
    'Payments Count': c._count.payments,
    'Created At': c.createdAt.toISOString().split('T')[0],
    'Updated At': c.updatedAt.toISOString().split('T')[0],
  }));

  const customersSheet = XLSX.utils.json_to_sheet(customersData);
  XLSX.utils.book_append_sheet(workbook, customersSheet, 'Customers');

  // Template sheet
  const templateData = [{
    'Customer Code': '(Auto-generated if empty)',
    'Company Name': 'Sample Company Pvt Ltd',
    'Contact Person': 'John Doe',
    'Email': 'john@sample.com',
    'Phone': '+91-9876543210',
    'Alternate Phone': '+91-9876543211',
    'Address': '123 Main Street',
    'City': 'Chennai',
    'State': 'Tamil Nadu',
    'Pincode': '600001',
    'GST Number': '33AAACT1234F1Z5',
    'PAN Number': 'AAACT1234F',
    'Billing Address': '123 Main Street',
    'Billing City': 'Chennai',
    'Billing State': 'Tamil Nadu',
    'Billing Pincode': '600001',
    'Notes': 'Sample customer',
    'Status': 'Active',
  }];

  const templateSheet = XLSX.utils.json_to_sheet(templateData);
  XLSX.utils.book_append_sheet(workbook, templateSheet, 'Template');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="customers-export-${new Date().toISOString().split('T')[0]}.xlsx"`);
  res.send(buffer);
});

// Export sites to Excel
export const exportSites = asyncHandler(async (req: Request, res: Response) => {
  const { search, status, customerId, ispId, connectionType, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const where: Prisma.SiteWhereInput = {
    ...(status ? { status: status as any } : {}),
    ...(customerId ? { customerId: customerId as string } : {}),
    ...(ispId ? { ispId: ispId as string } : {}),
    ...(connectionType ? { connectionType: connectionType as any } : {}),
    ...(search
      ? {
          OR: [
            { siteCode: { contains: search as string, mode: 'insensitive' } },
            { planName: { contains: search as string, mode: 'insensitive' } },
            { circuitId: { contains: search as string, mode: 'insensitive' } },
            { customer: { companyName: { contains: search as string, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const sites = await prisma.site.findMany({
    where,
    orderBy: { [sortBy as string]: sortOrder },
    include: {
      customer: { select: { customerCode: true, companyName: true } },
      isp: { select: { name: true, displayName: true } },
      _count: { select: { tickets: true, payments: true } },
    },
  });

  const workbook = XLSX.utils.book_new();

  const sitesData = sites.map((s, index) => ({
    'S.No': index + 1,
    'Site Code': s.siteCode,
    'Customer Code': s.customer?.customerCode || '',
    'Customer Name': s.customer?.companyName || '',
    'ISP': s.isp?.displayName || s.isp?.name || '',
    'Plan Name': s.planName,
    'Bandwidth': s.bandwidth,
    'MRC': s.mrc,
    'OTC': s.otc,
    'Static IP Charge': s.staticIpCharge,
    'Static IP Count': s.staticIpCount,
    'Other Charges': s.otherCharges,
    'Status': s.status,
    'Installation Address': s.installationAddress,
    'Installation City': s.installationCity,
    'Installation State': s.installationState,
    'Installation Pincode': s.installationPincode,
    'Latitude': s.latitude || '',
    'Longitude': s.longitude || '',
    'Connection Type': s.connectionType || '',
    'Circuit ID': s.circuitId || '',
    'Provisioned At': s.provisionedAt ? s.provisionedAt.toISOString().split('T')[0] : '',
    'Renewal Date': s.renewalDate ? s.renewalDate.toISOString().split('T')[0] : '',
    'Notes': s.notes || '',
    'Tickets Count': s._count.tickets,
    'Payments Count': s._count.payments,
    'Created At': s.createdAt.toISOString().split('T')[0],
    'Updated At': s.updatedAt.toISOString().split('T')[0],
  }));

  const sitesSheet = XLSX.utils.json_to_sheet(sitesData);
  XLSX.utils.book_append_sheet(workbook, sitesSheet, 'Sites');

  // Template sheet
  const templateData = [{
    'Site Code': '(Auto-generated if empty)',
    'Customer ID': 'customer-uuid-here',
    'ISP ID': 'isp-uuid-here (optional)',
    'Plan Name': 'Enterprise 100Mbps',
    'Bandwidth': '100 Mbps',
    'MRC': 25000,
    'OTC': 15000,
    'Static IP Charge': 2000,
    'Static IP Count': 4,
    'Other Charges': 500,
    'Status': 'FEASIBILITY_PENDING',
    'Installation Address': '456 IT Park Road, Building A',
    'Installation City': 'Chennai',
    'Installation State': 'Tamil Nadu',
    'Installation Pincode': '600001',
    'Latitude': 13.0827,
    'Longitude': 80.2707,
    'Connection Type': 'Fiber',
    'Circuit ID': 'SL-FBR-CHN-001',
    'Provisioned At': '2024-01-15',
    'Renewal Date': '2025-01-15',
    'Notes': 'Primary office connection',
  }];

  const templateSheet = XLSX.utils.json_to_sheet(templateData);
  XLSX.utils.book_append_sheet(workbook, templateSheet, 'Template');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="sites-export-${new Date().toISOString().split('T')[0]}.xlsx"`);
  res.send(buffer);
});

// Export payments to Excel
export const exportPayments = asyncHandler(async (req: Request, res: Response) => {
  const { search, type, customerId, siteId, dateFrom, dateTo, sortBy = 'paymentDate', sortOrder = 'desc' } = req.query;

  const where: Prisma.PaymentWhereInput = {
    ...(type ? { type: type as any } : {}),
    ...(customerId ? { customerId: customerId as string } : {}),
    ...(siteId ? { siteId: siteId as string } : {}),
    ...(dateFrom || dateTo ? {
      paymentDate: {
        ...(dateFrom ? { gte: new Date(dateFrom as string) } : {}),
        ...(dateTo ? { lte: new Date(dateTo as string) } : {}),
      },
    } : {}),
    ...(search
      ? {
          OR: [
            { paymentNumber: { contains: search as string, mode: 'insensitive' } },
            { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
            { transactionId: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { [sortBy as string]: sortOrder },
    include: {
      customer: { select: { customerCode: true, companyName: true } },
      site: { select: { siteCode: true, planName: true } },
      recordedBy: { select: { firstName: true, lastName: true } },
    },
  });

  const workbook = XLSX.utils.book_new();

  const paymentsData = payments.map((p, index) => ({
    'S.No': index + 1,
    'Payment Number': p.paymentNumber,
    'Customer Code': p.customer?.customerCode || '',
    'Customer Name': p.customer?.companyName || '',
    'Site Code': p.site?.siteCode || '',
    'Plan': p.site?.planName || '',
    'Amount': p.amount,
    'Type': p.type,
    'Description': p.description,
    'Payment Date': p.paymentDate.toISOString().split('T')[0],
    'Payment Method': p.paymentMethod,
    'Transaction ID': p.transactionId || '',
    'Reference Number': p.referenceNumber || '',
    'Invoice Number': p.invoiceNumber || '',
    'Recorded By': `${p.recordedBy?.firstName} ${p.recordedBy?.lastName}`,
    'Notes': p.notes || '',
    'Created At': p.createdAt.toISOString().split('T')[0],
  }));

  const paymentsSheet = XLSX.utils.json_to_sheet(paymentsData);
  XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'Payments');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="payments-export-${new Date().toISOString().split('T')[0]}.xlsx"`);
  res.send(buffer);
});

// Export tickets to Excel
export const exportTickets = asyncHandler(async (req: Request, res: Response) => {
  const { search, status, priority, source, customerId, siteId, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const where: Prisma.TicketWhereInput = {
    ...(status ? { status: status as any } : {}),
    ...(priority ? { priority: priority as any } : {}),
    ...(source ? { source: source as any } : {}),
    ...(customerId ? { customerId: customerId as string } : {}),
    ...(siteId ? { siteId: siteId as string } : {}),
    ...(dateFrom || dateTo ? {
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom as string) } : {}),
        ...(dateTo ? { lte: new Date(dateTo as string) } : {}),
      },
    } : {}),
    ...(search
      ? {
          OR: [
            { ticketNumber: { contains: search as string, mode: 'insensitive' } },
            { title: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { [sortBy as string]: sortOrder },
    include: {
      customer: { select: { customerCode: true, companyName: true } },
      site: { select: { siteCode: true, planName: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      _count: { select: { messages: true } },
    },
  });

  const workbook = XLSX.utils.book_new();

  const ticketsData = tickets.map((t, index) => ({
    'S.No': index + 1,
    'Ticket Number': t.ticketNumber,
    'Title': t.title,
    'Description': t.description,
    'Status': t.status,
    'Priority': t.priority,
    'Source': t.source,
    'Customer Code': t.customer?.customerCode || '',
    'Customer Name': t.customer?.companyName || '',
    'Site Code': t.site?.siteCode || '',
    'Plan': t.site?.planName || '',
    'Assigned To': t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : 'Unassigned',
    'Created By': `${t.createdBy.firstName} ${t.createdBy.lastName}`,
    'SLA Due At': t.slaDueAt ? t.slaDueAt.toISOString().split('T')[0] : '',
    'Resolved At': t.resolvedAt ? t.resolvedAt.toISOString().split('T')[0] : '',
    'Closed At': t.closedAt ? t.closedAt.toISOString().split('T')[0] : '',
    'Messages Count': t._count.messages,
    'Created At': t.createdAt.toISOString().split('T')[0],
    'Updated At': t.updatedAt.toISOString().split('T')[0],
  }));

  const ticketsSheet = XLSX.utils.json_to_sheet(ticketsData);
  XLSX.utils.book_append_sheet(workbook, ticketsSheet, 'Tickets');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="tickets-export-${new Date().toISOString().split('T')[0]}.xlsx"`);
  res.send(buffer);
});

// Import customers preview
export const previewImportCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { customers } = req.body;

  const results = [];
  const errors = [];

  for (let i = 0; i < customers.length; i++) {
    const row = customers[i];
    const rowErrors: string[] = [];

    if (!row.companyName) rowErrors.push('Company name is required');
    if (!row.contactPerson) rowErrors.push('Contact person is required');
    if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) rowErrors.push('Valid email is required');
    if (!row.phone) rowErrors.push('Phone is required');
    if (!row.address) rowErrors.push('Address is required');
    if (!row.city) rowErrors.push('City is required');
    if (!row.state) rowErrors.push('State is required');
    if (!row.pincode || !/^\d{6}$/.test(row.pincode)) rowErrors.push('Valid 6-digit pincode is required');

    // Check duplicate email
    if (row.email) {
      const existing = await prisma.customer.findFirst({ where: { email: row.email } });
      if (existing) rowErrors.push('Email already exists');
    }

    // Check duplicate customerCode
    if (row.customerCode) {
      const existing = await prisma.customer.findUnique({ where: { customerCode: row.customerCode } });
      if (existing) rowErrors.push('Customer code already exists');
    }

    results.push({
      row: i + 1,
      data: row,
      valid: rowErrors.length === 0,
      errors: rowErrors,
    });

    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, errors: rowErrors });
    }
  }

  sendSuccess(res, {
    totalRows: customers.length,
    validRows: results.filter(r => r.valid).length,
    invalidRows: errors.length,
    results,
    errors,
  }, 'Import preview completed');
});

// Import sites preview
export const previewImportSites = asyncHandler(async (req: Request, res: Response) => {
  const { sites } = req.body;

  const results = [];
  const errors = [];

  for (let i = 0; i < sites.length; i++) {
    const row = sites[i];
    const rowErrors: string[] = [];

    if (!row.customerId) rowErrors.push('Customer ID is required');
    if (!row.planName) rowErrors.push('Plan name is required');
    if (!row.bandwidth) rowErrors.push('Bandwidth is required');
    if (!row.installationAddress) rowErrors.push('Installation address is required');
    if (!row.installationCity) rowErrors.push('Installation city is required');
    if (!row.installationState) rowErrors.push('Installation state is required');
    if (!row.installationPincode) rowErrors.push('Installation pincode is required');

    // Validate customer exists
    if (row.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: row.customerId } });
      if (!customer) rowErrors.push('Customer not found');
    }

    // Validate ISP exists
    if (row.ispId) {
      const isp = await prisma.iSP.findUnique({ where: { id: row.ispId } });
      if (!isp) rowErrors.push('ISP not found');
    }

    // Check duplicate siteCode
    if (row.siteCode) {
      const existing = await prisma.site.findUnique({ where: { siteCode: row.siteCode } });
      if (existing) rowErrors.push('Site code already exists');
    }

    results.push({
      row: i + 1,
      data: row,
      valid: rowErrors.length === 0,
      errors: rowErrors,
    });

    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, errors: rowErrors });
    }
  }

  sendSuccess(res, {
    totalRows: sites.length,
    validRows: results.filter(r => r.valid).length,
    invalidRows: errors.length,
    results,
    errors,
  }, 'Import preview completed');
});

// Execute customer import
export const executeImportCustomers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { customers } = req.body;

  const created = [];
  const errors = [];

  for (const row of customers) {
    try {
      const customerCode = row.customerCode || await generateCustomerCode();

      // Check duplicates
      const existingEmail = await prisma.customer.findFirst({ where: { email: row.email } });
      if (existingEmail) {
        errors.push({ data: row, error: 'Email already exists' });
        continue;
      }

      const existingCode = await prisma.customer.findUnique({ where: { customerCode } });
      if (existingCode) {
        errors.push({ data: row, error: 'Customer code already exists' });
        continue;
      }

      const customer = await prisma.customer.create({
        data: {
          ...row,
          customerCode,
          createdById: req.user!.userId,
        },
      });
      created.push(customer);
    } catch (err: any) {
      errors.push({ data: row, error: err.message });
    }
  }

  sendSuccess(res, {
    created: created.length,
    failed: errors.length,
    customers: created,
    errors,
  }, `Import completed: ${created.length} created, ${errors.length} failed`);
});

// Execute site import
export const executeImportSites = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sites } = req.body;

  const created = [];
  const errors = [];

  for (const row of sites) {
    try {
      const siteCode = row.siteCode || await generateSiteCode();

      // Validate customer
      const customer = await prisma.customer.findUnique({ where: { id: row.customerId } });
      if (!customer) {
        errors.push({ data: row, error: 'Customer not found' });
        continue;
      }

      // Validate ISP
      if (row.ispId) {
        const isp = await prisma.iSP.findUnique({ where: { id: row.ispId } });
        if (!isp) {
          errors.push({ data: row, error: 'ISP not found' });
          continue;
        }
      }

      // Check duplicate siteCode
      const existingCode = await prisma.site.findUnique({ where: { siteCode } });
      if (existingCode) {
        errors.push({ data: row, error: 'Site code already exists' });
        continue;
      }

      const site = await prisma.site.create({
        data: {
          ...row,
          siteCode,
          mrc: row.mrc || 0,
          otc: row.otc || 0,
          staticIpCharge: row.staticIpCharge || 0,
          staticIpCount: row.staticIpCount || 0,
          otherCharges: row.otherCharges || 0,
          status: row.status || 'FEASIBILITY_PENDING',
          provisionedAt: row.provisionedAt ? new Date(row.provisionedAt) : null,
          renewalDate: row.renewalDate ? new Date(row.renewalDate) : null,
          createdById: req.user!.userId,
        },
      });
      created.push(site);
    } catch (err: any) {
      errors.push({ data: row, error: err.message });
    }
  }

  sendSuccess(res, {
    created: created.length,
    failed: errors.length,
    sites: created,
    errors,
  }, `Import completed: ${created.length} created, ${errors.length} failed`);
});

// Download import template
export const downloadTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;

  const workbook = XLSX.utils.book_new();

  if (type === 'customers') {
    const templateData = [{
      'Customer Code': '(Auto-generated if empty)',
      'Company Name': 'Sample Company Pvt Ltd',
      'Contact Person': 'John Doe',
      'Email': 'john@sample.com',
      'Phone': '+91-9876543210',
      'Alternate Phone': '+91-9876543211',
      'Address': '123 Main Street',
      'City': 'Chennai',
      'State': 'Tamil Nadu',
      'Pincode': '600001',
      'GST Number': '33AAACT1234F1Z5',
      'PAN Number': 'AAACT1234F',
      'Billing Address': '123 Main Street',
      'Billing City': 'Chennai',
      'Billing State': 'Tamil Nadu',
      'Billing Pincode': '600001',
      'Notes': 'Sample customer',
      'Status': 'Active',
    }];

    const templateSheet = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Customers Template');
  } else if (type === 'sites') {
    const templateData = [{
      'Site Code': '(Auto-generated if empty)',
      'Customer ID': 'customer-uuid-here',
      'ISP ID': 'isp-uuid-here (optional)',
      'Plan Name': 'Enterprise 100Mbps',
      'Bandwidth': '100 Mbps',
      'MRC': 25000,
      'OTC': 15000,
      'Static IP Charge': 2000,
      'Static IP Count': 4,
      'Other Charges': 500,
      'Status': 'FEASIBILITY_PENDING',
      'Installation Address': '456 IT Park Road, Building A',
      'Installation City': 'Chennai',
      'Installation State': 'Tamil Nadu',
      'Installation Pincode': '600001',
      'Latitude': 13.0827,
      'Longitude': 80.2707,
      'Connection Type': 'Fiber',
      'Circuit ID': 'SL-FBR-CHN-001',
      'Provisioned At': '2024-01-15',
      'Renewal Date': '2025-01-15',
      'Notes': 'Primary office connection',
    }];

    const templateSheet = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Sites Template');
  } else if (type === 'payments') {
    const templateData = [{
      'Payment Number': '(Auto-generated)',
      'Customer ID': 'customer-uuid-here',
      'Site ID': 'site-uuid-here (optional)',
      'Amount': 25000,
      'Type': 'MRC',
      'Description': 'Monthly recurring charges',
      'Payment Date': '2024-01-01',
      'Payment Method': 'Bank Transfer',
      'Transaction ID': 'TXN-001',
      'Reference Number': 'REF-001',
      'Invoice Number': 'INV-001',
      'Notes': 'Sample payment',
    }];

    const templateSheet = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Payments Template');
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const fileName = `${type}-template-${new Date().toISOString().split('T')[0]}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buffer);
});