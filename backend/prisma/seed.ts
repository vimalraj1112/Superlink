import { PrismaClient, UserRole, SiteStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

let encryptionKey: Buffer;

function getEncryptionKey(): Buffer {
  if (!encryptionKey) {
    const keyMaterial = process.env.ENCRYPTION_KEY || 'superlink-encryption-key-32-chars-min';
    encryptionKey = crypto.scryptSync(keyMaterial, 'superlink-salt', KEY_LENGTH);
  }
  return encryptionKey;
}

function encrypt(text: string): string {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, ciphertext, authTag]);
  return combined.toString('base64');
}

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Roles
  const rolesData = [
    {
      name: UserRole.SUPER_ADMIN,
      description: 'Complete administrative oversight, tenant setup, seed data management, audit inspection',
      permissions: {
        users: ['create', 'read', 'update', 'delete'],
        roles: ['create', 'read', 'update', 'delete'],
        customers: ['create', 'read', 'update', 'delete'],
        sites: ['create', 'read', 'update', 'delete'],
        isps: ['create', 'read', 'update', 'delete'],
        tickets: ['create', 'read', 'update', 'delete', 'assign'],
        payments: ['create', 'read', 'update', 'delete'],
        dashboard: ['read'],
        gis: ['read'],
        importExport: ['create', 'read', 'update', 'delete'],
        settings: ['read', 'update'],
        auditLogs: ['read'],
        credentials: ['create', 'read', 'update', 'delete', 'reveal'],
      },
    },
    {
      name: UserRole.ISP_OWNER,
      description: 'Complete end-to-end operational access across all business modules for small-scale ISPs',
      permissions: {
        users: ['create', 'read', 'update'],
        customers: ['create', 'read', 'update', 'delete'],
        sites: ['create', 'read', 'update', 'delete'],
        isps: ['create', 'read', 'update', 'delete'],
        tickets: ['create', 'read', 'update', 'assign'],
        payments: ['create', 'read', 'update', 'delete'],
        dashboard: ['read'],
        gis: ['read'],
        importExport: ['create', 'read', 'update', 'delete'],
        settings: ['read', 'update'],
        credentials: ['create', 'read', 'update', 'delete', 'reveal'],
      },
    },
    {
      name: UserRole.SALES,
      description: 'Customer registration, feasibility initiation, commercial proposals',
      permissions: {
        customers: ['create', 'read', 'update'],
        sites: ['create', 'read', 'update'],
        tickets: ['create', 'read'],
        payments: ['read'],
        quotations: ['create', 'read', 'update', 'delete'],
        dashboard: ['read'],
      },
    },
    {
      name: UserRole.NOC,
      description: 'Feasibility surveys, GIS coordinates mapping, technical provisioning, credential management, speed tests',
      permissions: {
        customers: ['read'],
        sites: ['create', 'read', 'update'],
        isps: ['read'],
        tickets: ['create', 'read', 'update'],
        gis: ['read'],
        credentials: ['create', 'read', 'update', 'reveal'],
        dashboard: ['read'],
      },
    },
    {
      name: UserRole.FINANCE,
      description: 'Invoicing, OTC/MRC payment logging, renewal confirmation, financial reporting',
      permissions: {
        customers: ['read'],
        sites: ['read'],
        payments: ['create', 'read', 'update', 'delete'],
        tickets: ['read'],
        dashboard: ['read'],
        importExport: ['read'],
      },
    },
    {
      name: UserRole.SUPPORT,
      description: 'Complaint ticket creation, resolution workflow, SLA monitoring',
      permissions: {
        customers: ['read'],
        sites: ['read'],
        tickets: ['create', 'read', 'update', 'assign'],
        payments: ['read'],
        dashboard: ['read'],
      },
    },
    {
      name: UserRole.CLIENT,
      description: 'Read-only access to customer\'s own sites, GIS link map, billing statements, and ticket tracking',
      permissions: {
        sites: ['read'],
        tickets: ['create', 'read'],
        payments: ['read'],
        gis: ['read'],
      },
    },
  ];

  console.log('Creating roles...');
  for (const roleData of rolesData) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description, permissions: roleData.permissions },
      create: roleData,
    });
  }
  console.log('✅ Roles created');

  // 2. Create default SUPER_ADMIN user
  const superAdminRole = await prisma.role.findUnique({
    where: { name: UserRole.SUPER_ADMIN },
  });

  if (!superAdminRole) {
    throw new Error('SUPER_ADMIN role not found after creation');
  }

  const defaultPassword = await bcrypt.hash('SuperLink@2024!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@superlinkit.com' },
    update: {},
    create: {
      email: 'admin@superlinkit.com',
      passwordHash: defaultPassword,
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+91-9876543210',
      isActive: true,
      roleId: superAdminRole.id,
    },
  });
  console.log('✅ Default SUPER_ADMIN user created (admin@superlinkit.com / SuperLink@2024!)');

  // 3. Create a sample ISP
  const sampleIsp = await prisma.iSP.upsert({
    where: { name: 'SuperLink Broadband' },
    update: {},
    create: {
      name: 'SuperLink Broadband',
      displayName: 'SuperLink Broadband Services',
      contactPerson: 'Vimal Raj',
      email: 'info@superlinkbroadband.com',
      phone: '+91-9876543210',
      address: '123 Main Street, Tech Park',
      city: 'Chennai',
      state: 'Tamil Nadu',
      website: 'https://superlinkbroadband.com',
      latitude: 13.0827,
      longitude: 80.2707,
      isActive: true,
      notes: 'Primary ISP for SuperLink IT Services',
      createdById: superAdmin.id,
    },
  });
  console.log('✅ Sample ISP created');

  // 4. Create sample customers
  const customer1 = await prisma.customer.upsert({
    where: { customerCode: 'CUST-001' },
    update: {},
    create: {
      customerCode: 'CUST-001',
      companyName: 'TechCorp Solutions Pvt Ltd',
      contactPerson: 'Rajesh Kumar',
      email: 'rajesh@techcorp.com',
      phone: '+91-9876543211',
      alternatePhone: '+91-9876543212',
      address: '456 IT Park Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      gstNumber: '33AAACT1234F1Z5',
      panNumber: 'AAACT1234F',
      billingAddress: '456 IT Park Road',
      billingCity: 'Chennai',
      billingState: 'Tamil Nadu',
      billingPincode: '600001',
      notes: 'Enterprise customer - multiple sites',
      isActive: true,
      createdById: superAdmin.id,
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { customerCode: 'CUST-002' },
    update: {},
    create: {
      customerCode: 'CUST-002',
      companyName: 'GreenField Industries',
      contactPerson: 'Priya Sharma',
      email: 'priya@greenfield.com',
      phone: '+91-9876543213',
      address: '789 Industrial Estate',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      gstNumber: '29BBBBD5678G2Z6',
      panNumber: 'BBBBD5678G',
      billingAddress: '789 Industrial Estate',
      billingCity: 'Bangalore',
      billingState: 'Karnataka',
      billingPincode: '560001',
      notes: 'Manufacturing unit - leased line',
      isActive: true,
      createdById: superAdmin.id,
    },
  });
  console.log('✅ Sample customers created');

  // 5. Create sample sites
  const site1 = await prisma.site.upsert({
    where: { siteCode: 'SITE-001' },
    update: {},
    create: {
      siteCode: 'SITE-001',
      customerId: customer1.id,
      ispId: sampleIsp.id,
      planName: 'Enterprise 100Mbps Dedicated',
      bandwidth: '100 Mbps',
      mrc: 25000,
      otc: 15000,
      staticIpCharge: 2000,
      staticIpCount: 4,
      otherCharges: 500,
      status: SiteStatus.DELIVERED_ACTIVE,
      installationAddress: '456 IT Park Road, Building A, Floor 3',
      installationCity: 'Chennai',
      installationState: 'Tamil Nadu',
      installationPincode: '600001',
      latitude: 13.0827,
      longitude: 80.2707,
      connectionType: 'Fiber',
      circuitId: 'SL-FBR-CHN-001',
      provisionedAt: new Date('2024-01-15'),
      renewalDate: new Date('2025-01-15'),
      notes: 'Primary office connection',
      createdById: superAdmin.id,
    },
  });

  const site2 = await prisma.site.upsert({
    where: { siteCode: 'SITE-002' },
    update: {},
    create: {
      siteCode: 'SITE-002',
      customerId: customer1.id,
      ispId: sampleIsp.id,
      planName: 'Business 50Mbps Broadband',
      bandwidth: '50 Mbps',
      mrc: 8000,
      otc: 5000,
      staticIpCharge: 1000,
      staticIpCount: 1,
      otherCharges: 200,
      status: SiteStatus.FEASIBILITY_PENDING,
      installationAddress: '456 IT Park Road, Building B, Floor 1',
      installationCity: 'Chennai',
      installationState: 'Tamil Nadu',
      installationPincode: '600001',
      latitude: 13.0830,
      longitude: 80.2710,
      connectionType: 'Fiber',
      notes: 'Branch office - feasibility pending',
      createdById: superAdmin.id,
    },
  });

  const site3 = await prisma.site.upsert({
    where: { siteCode: 'SITE-003' },
    update: {},
    create: {
      siteCode: 'SITE-003',
      customerId: customer2.id,
      ispId: sampleIsp.id,
      planName: 'Leased Line 10Mbps',
      bandwidth: '10 Mbps',
      mrc: 15000,
      otc: 25000,
      staticIpCharge: 3000,
      staticIpCount: 8,
      otherCharges: 1000,
      status: SiteStatus.PROVISIONING,
      installationAddress: '789 Industrial Estate, Unit 12',
      installationCity: 'Bangalore',
      installationState: 'Karnataka',
      installationPincode: '560001',
      latitude: 12.9716,
      longitude: 77.5946,
      connectionType: 'Leased Line',
      circuitId: 'SL-LL-BLR-001',
      notes: 'Factory floor connectivity',
      createdById: superAdmin.id,
    },
  });
  console.log('✅ Sample sites created');

  // 6. Create site credentials (encrypted)
  await prisma.siteCredential.upsert({
    where: { siteId: site1.id },
    update: {
      username: 'admin',
      passwordEnc: encrypt('admin123'),
      routerIp: '192.168.1.1',
      routerModel: 'MikroTik CCR1036',
      vlanId: '100',
      pppoeUsername: 'sl_enterprise_001',
      pppoePasswordEnc: encrypt('pppoe123'),
      staticIps: [
        { ip: '203.0.113.10', gateway: '203.0.113.1', subnet: '255.255.255.248' },
        { ip: '203.0.113.11', gateway: '203.0.113.1', subnet: '255.255.255.248' },
        { ip: '203.0.113.12', gateway: '203.0.113.1', subnet: '255.255.255.248' },
        { ip: '203.0.113.13', gateway: '203.0.113.1', subnet: '255.255.255.248' },
      ],
      notes: 'Primary router credentials',
    },
    create: {
      siteId: site1.id,
      username: 'admin',
      passwordEnc: encrypt('admin123'),
      routerIp: '192.168.1.1',
      routerModel: 'MikroTik CCR1036',
      vlanId: '100',
      pppoeUsername: 'sl_enterprise_001',
      pppoePasswordEnc: encrypt('pppoe123'),
      staticIps: [
        { ip: '203.0.113.10', gateway: '203.0.113.1', subnet: '255.255.255.248' },
        { ip: '203.0.113.11', gateway: '203.0.113.1', subnet: '255.255.255.248' },
        { ip: '203.0.113.12', gateway: '203.0.113.1', subnet: '255.255.255.248' },
        { ip: '203.0.113.13', gateway: '203.0.113.1', subnet: '255.255.255.248' },
      ],
      notes: 'Primary router credentials',
    },
  });

  await prisma.siteCredential.upsert({
    where: { siteId: site2.id },
    update: {
      username: 'admin',
      passwordEnc: encrypt('admin123'),
      routerIp: '192.168.2.1',
      routerModel: 'MikroTik hAP ac2',
      vlanId: '200',
      notes: 'Branch office router - pending installation',
    },
    create: {
      siteId: site2.id,
      username: 'admin',
      passwordEnc: encrypt('admin123'),
      routerIp: '192.168.2.1',
      routerModel: 'MikroTik hAP ac2',
      vlanId: '200',
      notes: 'Branch office router - pending installation',
    },
  });

  await prisma.siteCredential.upsert({
    where: { siteId: site3.id },
    update: {
      username: 'noc_admin',
      passwordEnc: encrypt('admin123'),
      routerIp: '10.0.0.1',
      routerModel: 'Cisco ISR 4321',
      vlanId: '10',
      pppoeUsername: 'sl_factory_001',
      pppoePasswordEnc: encrypt('pppoe123'),
      staticIps: [
        { ip: '198.51.100.10', gateway: '198.51.100.1', subnet: '255.255.255.240' },
        { ip: '198.51.100.11', gateway: '198.51.100.1', subnet: '255.255.255.240' },
      ],
      notes: 'Factory edge router',
    },
    create: {
      siteId: site3.id,
      username: 'noc_admin',
      passwordEnc: encrypt('admin123'),
      routerIp: '10.0.0.1',
      routerModel: 'Cisco ISR 4321',
      vlanId: '10',
      pppoeUsername: 'sl_factory_001',
      pppoePasswordEnc: encrypt('pppoe123'),
      staticIps: [
        { ip: '198.51.100.10', gateway: '198.51.100.1', subnet: '255.255.255.240' },
        { ip: '198.51.100.11', gateway: '198.51.100.1', subnet: '255.255.255.240' },
      ],
      notes: 'Factory edge router',
    },
  });
  console.log('✅ Sample site credentials created');

  // 7. Create sample payments
  await prisma.payment.upsert({
    where: { paymentNumber: 'PAY-2024001' },
    update: {},
    create: {
      paymentNumber: 'PAY-2024001',
      customerId: customer1.id,
      siteId: site1.id,
      amount: 42500,
      type: 'OTC',
      description: 'One-time installation and setup charges',
      paymentDate: new Date('2024-01-10'),
      paymentMethod: 'Bank Transfer',
      transactionId: 'TXN-20240110-001',
      referenceNumber: 'INV-2024-001',
      recordedById: superAdmin.id,
      invoiceNumber: 'INV-2024-001',
      notes: 'OTC for SITE-001',
    },
  });

  await prisma.payment.upsert({
    where: { paymentNumber: 'PAY-2024002' },
    update: {},
    create: {
      paymentNumber: 'PAY-2024002',
      customerId: customer1.id,
      siteId: site1.id,
      amount: 25000,
      type: 'MRC',
      description: 'Monthly recurring charges - January 2024',
      paymentDate: new Date('2024-02-01'),
      paymentMethod: 'UPI',
      transactionId: 'TXN-20240201-001',
      referenceNumber: 'INV-2024-002',
      recordedById: superAdmin.id,
      invoiceNumber: 'INV-2024-002',
      notes: 'MRC for SITE-001',
    },
  });

  await prisma.payment.upsert({
    where: { paymentNumber: 'PAY-2024003' },
    update: {},
    create: {
      paymentNumber: 'PAY-2024003',
      customerId: customer2.id,
      siteId: site3.id,
      amount: 40000,
      type: 'OTC',
      description: 'Leased line installation and setup',
      paymentDate: new Date('2024-03-01'),
      paymentMethod: 'Bank Transfer',
      transactionId: 'TXN-20240301-001',
      referenceNumber: 'INV-2024-003',
      recordedById: superAdmin.id,
      invoiceNumber: 'INV-2024-003',
      notes: 'OTC for SITE-003',
    },
  });
  console.log('✅ Sample payments created');

  // 8. Create sample tickets
  const ticket1 = await prisma.ticket.upsert({
    where: { ticketNumber: 'TKT-2024001' },
    update: {},
    create: {
      ticketNumber: 'TKT-2024001',
      title: 'Internet down at head office',
      description: 'Complete internet outage since morning. Cannot access any external websites.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      source: 'MANUAL',
      customerId: customer1.id,
      siteId: site1.id,
      assignedToId: superAdmin.id,
      createdById: superAdmin.id,
      slaDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours SLA
    },
  });

  await prisma.ticketMessage.upsert({
    where: { id: ticket1.id },
    update: {},
    create: {
      ticketId: ticket1.id,
      userId: superAdmin.id,
      message: 'Ticket created by support team. Investigating the issue.',
      isInternal: true,
    },
  });

  const ticket2 = await prisma.ticket.upsert({
    where: { ticketNumber: 'TKT-2024002' },
    update: {},
    create: {
      ticketNumber: 'TKT-2024002',
      title: 'Slow speed complaint',
      description: 'Getting only 20Mbps on a 50Mbps plan. Speed test shows consistent low speeds.',
      status: 'OPEN',
      priority: 'MEDIUM',
      source: 'MANUAL',
      customerId: customer1.id,
      siteId: site2.id,
      createdById: superAdmin.id,
      slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours SLA
    },
  });

  await prisma.ticketMessage.upsert({
    where: { id: ticket2.id },
    update: {},
    create: {
      ticketId: ticket2.id,
      userId: superAdmin.id,
      message: 'Customer reported slow speeds. Will schedule a speed test.',
      isInternal: true,
    },
  });
  console.log('✅ Sample tickets created');

  // 9. Create sample audit log
  await prisma.auditLog.create({
    data: {
      userId: superAdmin.id,
      action: 'SEED',
      entityType: 'Database',
      entityId: 'initial',
      newData: { message: 'Initial database seed completed' },
      ipAddress: '127.0.0.1',
      userAgent: 'prisma-seed',
    },
  });
  console.log('✅ Audit log entry created');

  console.log('\\n🎉 Database seed completed successfully!');
  console.log('\\n📋 Login Credentials:');
  console.log('   Email: admin@superlinkit.com');
  console.log('   Password: SuperLink@2024!');
  console.log('\\n🔐 Roles available: SUPER_ADMIN, ISP_OWNER, SALES, NOC, FINANCE, SUPPORT, CLIENT');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });