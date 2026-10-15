import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Wiping example / test data (customers, sites, ISPs + dependents)...');

  const before = {
    customers: await prisma.customer.count(),
    sites: await prisma.site.count(),
    isps: await prisma.iSP.count(),
    payments: await prisma.payment.count(),
    tickets: await prisma.ticket.count(),
    quotations: await prisma.quotation.count(),
    chatSessions: await prisma.chatSession.count(),
    siteCredentials: await prisma.siteCredential.count(),
  };
  console.log('   before:', before);

  // FK-safe order. Users, roles and audit logs are preserved.
  await prisma.$transaction([
    prisma.chatMessage.deleteMany(),
    prisma.chatSession.deleteMany(),
    prisma.ticketMessage.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.quotationItem.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.siteCredential.deleteMany(),
    prisma.site.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.iSP.deleteMany(),
  ]);

  const after = {
    customers: await prisma.customer.count(),
    sites: await prisma.site.count(),
    isps: await prisma.iSP.count(),
    payments: await prisma.payment.count(),
    tickets: await prisma.ticket.count(),
    quotations: await prisma.quotation.count(),
    chatSessions: await prisma.chatSession.count(),
    siteCredentials: await prisma.siteCredential.count(),
  };
  console.log('   after: ', after);
  console.log('✅ Wipe complete. Users, roles and audit logs preserved.');
}

main()
  .catch((e) => {
    console.error('❌ Wipe failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
