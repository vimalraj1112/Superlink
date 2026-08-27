import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { AuthenticatedRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { sendSuccess, sendPaginatedSuccess, sendNotFound } from '@/utils/apiResponse';
import { getPaginationParams, getSearchQuery } from '@/utils/pagination';
import { UserRole } from '@prisma/client';

export const userCreateSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    roleId: z.string().min(1, 'Role is required'),
    isActive: z.boolean().optional(),
  }),
});

export const userUpdateSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().optional(),
    roleId: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).optional(),
  }),
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip, take } = getPaginationParams(req);
  const search = getSearchQuery(req);
  const roleId = req.query.roleId as string | undefined;
  const isActive = req.query.isActive as string | undefined;

  const where: Prisma.UserWhereInput = {
    ...(roleId ? { roleId } : {}),
    ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [users, totalItems] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        role: {
          select: { id: true, name: true, description: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  sendPaginatedSuccess(res, users, 'Users fetched successfully', page, limit, totalItems);
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: true,
    },
  });

  if (!user) {
    sendNotFound(res, 'User not found');
    return;
  }

  // Remove password hash from response
  const { passwordHash, ...userWithoutPassword } = user;
  sendSuccess(res, userWithoutPassword, 'User fetched successfully');
});

export const createUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { password, ...userData } = req.body;

  // Hash password
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.default.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      ...userData,
      passwordHash,
    },
    include: {
      role: {
        select: { id: true, name: true, description: true },
      },
    },
  });

  // Remove password hash from response
  const { passwordHash: _, ...userWithoutPassword } = user;
  sendSuccess(res, userWithoutPassword, 'User created successfully', 201);
});

export const updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Extract password from body before spreading
  const { password, ...updateBody } = req.body;

  const updateData: Prisma.UserUpdateInput = {
    ...updateBody,
  };

  // Hash password if provided
  if (password) {
    const bcrypt = await import('bcryptjs');
    updateData.passwordHash = await bcrypt.default.hash(password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    include: {
      role: {
        select: { id: true, name: true, description: true },
      },
    },
  });

  // Remove password hash from response
  const { passwordHash: _, ...userWithoutPassword } = user;
  sendSuccess(res, userWithoutPassword, 'User updated successfully');
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Soft delete - deactivate instead of deleting
  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  sendSuccess(res, null, 'User deactivated successfully');
});

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
  });

  if (!user) {
    sendNotFound(res, 'User not found');
    return;
  }

  const bcrypt = await import('bcryptjs');
  const isValid = await bcrypt.default.compare(currentPassword, user.passwordHash);

  if (!isValid) {
    sendNotFound(res, 'Current password is incorrect');
    return;
  }

  const passwordHash = await bcrypt.default.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { passwordHash },
  });

  sendSuccess(res, null, 'Password changed successfully');
});