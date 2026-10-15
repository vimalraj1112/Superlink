import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🗄  Backing up current database data...');

  const data = {
    exportedAt: new Date().toISOString(),
    users: await prisma.user.findMany(),
    roles: await prisma.role.findMany(),
    customers: await prisma.customer.findMany(),
    isps: await prisma.iSP.findMany(),
    sites: await prisma.site.findMany(),
    siteCredentials: await prisma.siteCredential.findMany(),
    payments: await prisma.payment.findMany(),
    tickets: await prisma.ticket.findMany(),
    ticketMessages: await prisma.ticketMessage.findMany(),
    quotations: await prisma.quotation.findMany(),
    quotationItems: await prisma.quotationItem.findMany(),
    chatSessions: await prisma.chatSession.findMany(),
    chatMessages: await prisma.chatMessage.findMany(),
    auditLogs: await prisma.auditLog.findMany(),
  };

  const dir = path.resolve(process.cwd(), '..', `backup-${new Date().toISOString().split('T')[0]}`);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'db-backup.json');
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');

  console.log('✅ Backup written to:', file);
  console.log('   rows:', {
    customers: data.customers.length,
    isps: data.isps.length,
    sites: data.sites.length,
    payments: data.payments.length,
    tickets: data.tickets.length,
    quotations: data.quotations.length,
    chatSessions: data.chatSessions.length,
  });
}

main()
  .catch((e) => {
    console.error('❌ Backup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
