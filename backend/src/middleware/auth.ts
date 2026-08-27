import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '@/utils/jwt';
import { prisma } from '@/config/db';
import { sendUnauthorized, sendForbidden } from '@/utils/apiResponse';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & {
    permissions?: Record<string, string[]>;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendUnauthorized(res, 'Authentication required. No token provided.');
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    let payload: JwtPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      sendUnauthorized(res, 'Invalid or expired token');
      return;
    }

    // Fetch user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      sendUnauthorized(res, 'User no longer exists or is inactive');
      return;
    }

    // Attach user info to request
    req.user = {
      ...payload,
      permissions: user.role.permissions as Record<string, string[]> | undefined,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    sendUnauthorized(res, 'Authentication failed');
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
  } catch {
    // Silently ignore invalid tokens for optional auth
  }

  next();
}