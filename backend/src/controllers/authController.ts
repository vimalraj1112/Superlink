import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@/config/db';
import { generateTokenPair, verifyRefreshToken, JwtPayload } from '@/utils/jwt';
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendValidationError,
  sendConflict,
} from '@/utils/apiResponse';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { z } from 'zod';

// Validation schemas
const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
});

/**
 * POST /api/v1/auth/login
 * Login with email and password
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    sendUnauthorized(res, 'Invalid credentials');
    return;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    sendUnauthorized(res, 'Invalid credentials');
    return;
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate tokens
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
  });

  sendSuccess(
    res,
    {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role.name,
      },
      tokens,
    },
    'Login successful'
  );
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    sendUnauthorized(res, 'Invalid or expired refresh token');
    return;
  }

  // Verify user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    sendUnauthorized(res, 'User no longer exists or is inactive');
    return;
  }

  // Generate new token pair
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
  });

  sendSuccess(res, { tokens }, 'Token refreshed successfully');
});

/**
 * GET /api/v1/auth/me
 * Get current authenticated user profile
 */
export const me = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    sendUnauthorized(res, 'Not authenticated');
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { role: true },
  });

  if (!user) {
    sendUnauthorized(res, 'User not found');
    return;
  }

  sendSuccess(
    res,
    {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        permissions: user.role.permissions,
      },
    },
    'Profile fetched successfully'
  );
});

/**
 * POST /api/v1/auth/change-password
 * Change password for authenticated user
 */
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!req.user) {
    sendUnauthorized(res, 'Not authenticated');
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
  });

  if (!user) {
    sendUnauthorized(res, 'User not found');
    return;
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValidPassword) {
    sendValidationError(res, 'Current password is incorrect');
    return;
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash },
  });

  sendSuccess(res, null, 'Password changed successfully');
});

/**
 * POST /api/v1/auth/logout
 * Logout (client-side token removal, server-side could blacklist)
 */
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // In a production app, you might want to blacklist the token here
  // For now, just return success - client should delete tokens
  sendSuccess(res, null, 'Logged out successfully');
});

// Validation schema for profile update
const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().optional(),
  }),
});

/**
 * PATCH /api/v1/auth/profile
 * Update current authenticated user's profile
 */
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { firstName, lastName, phone } = req.body;

  if (!req.user) {
    sendUnauthorized(res, 'Not authenticated');
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone !== undefined && { phone }),
    },
    include: { role: true },
  });

  sendSuccess(
    res,
    {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        permissions: user.role.permissions,
      },
    },
    'Profile updated successfully'
  );
});

export { loginSchema, refreshTokenSchema, changePasswordSchema, updateProfileSchema };