import { Prisma, UserRole } from '@prisma/client';

export interface AccessUser {
  userId: string;
  role: UserRole;
}

/**
 * Row-level read scoping.
 *
 * Only the CLIENT role is restricted to records it "owns"; ownership is defined
 * as having created or updated the customer record (the same rule used by the
 * `canAccessCustomer` / `canAccessSite` middleware in `src/middleware/rbac.ts`).
 *
 * All internal/staff roles (SUPER_ADMIN, ISP_OWNER, SALES, NOC, FINANCE,
 * SUPPORT) are left unrestricted and continue to be governed by their
 * permission grants. Returning `{}` means "no additional restriction" and is
 * safe to spread into a Prisma `where` clause.
 */
export function customerReadScope(user?: AccessUser): Prisma.CustomerWhereInput {
  if (!user || user.role !== UserRole.CLIENT) {
    return {};
  }

  return {
    OR: [{ createdById: user.userId }, { updatedById: user.userId }],
  };
}

export function siteReadScope(user?: AccessUser): Prisma.SiteWhereInput {
  if (!user || user.role !== UserRole.CLIENT) {
    return {};
  }

  return { customer: customerReadScope(user) };
}

export function ticketReadScope(user?: AccessUser): Prisma.TicketWhereInput {
  if (!user || user.role !== UserRole.CLIENT) {
    return {};
  }

  return { customer: customerReadScope(user) };
}

export function paymentReadScope(user?: AccessUser): Prisma.PaymentWhereInput {
  if (!user || user.role !== UserRole.CLIENT) {
    return {};
  }

  return { customer: customerReadScope(user) };
}
