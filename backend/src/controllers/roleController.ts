import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { asyncHandler } from '@/middleware/errorHandler';
import { sendSuccess, sendPaginatedSuccess, sendNotFound } from '@/utils/apiResponse';
import { getPaginationParams, getSearchQuery } from '@/utils/pagination';
import { UserRole } from '@prisma/client';

export const roleCreateSchema = z.object({
  body: z.object({
    name: z.nativeEnum(UserRole),
    description: z.string().optional(),
    permissions: z.record(z.array(z.string())).optional(),
  }),
});

export const roleUpdateSchema = z.object({
  body: z.object({
    description: z.string().optional(),
    permissions: z.record(z.array(z.string())).optional(),
  }),
});

export const listRoles = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, take } = getPaginationParams(req);
  const search = req.query.search as string | undefined;

  const where: Prisma.RoleWhereInput = {
    ...(search
      ? {
          OR: [
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [roles, totalItems] = await Promise.all([
    prisma.role.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true } },
      },
    }),
    prisma.role.count({ where }),
  ]);

  sendPaginatedSuccess(res, roles, 'Roles fetched successfully', page, limit, totalItems);
});

export const getRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  if (!role) {
    sendNotFound(res, 'Role not found');
    return;
  }

  sendSuccess(res, role, 'Role fetched successfully');
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, permissions } = req.body;

  const existingRole = await prisma.role.findUnique({ where: { name } });
  if (existingRole) {
    return sendNotFound(res, 'Role already exists');
  }

  const role = await prisma.role.create({
    data: {
      name,
      description,
      permissions: permissions || {},
    },
  });

  sendSuccess(res, role, 'Role created successfully', 201);
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { description, permissions } = req.body;

  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) {
    sendNotFound(res, 'Role not found');
    return;
  }

  const role = await prisma.role.update({
    where: { id },
    data: {
      description,
      permissions,
    },
  });

  sendSuccess(res, role, 'Role updated successfully');
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) {
    sendNotFound(res, 'Role not found');
    return;
  }

  // Check if role has users assigned
  const userCount = await prisma.user.count({ where: { roleId: id } });
  if (userCount > 0) {
    return sendNotFound(res, 'Cannot delete role with assigned users');
  }

  await prisma.role.delete({ where: { id } });
  sendSuccess(res, null, 'Role deleted successfully');
});