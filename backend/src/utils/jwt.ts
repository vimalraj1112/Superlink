import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '@/config/env';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const accessTokenOptions: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
const refreshTokenOptions: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] };

export function generateAccessToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    env.JWT_SECRET,
    accessTokenOptions
  );
}

export function generateRefreshToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    env.JWT_SECRET,
    refreshTokenOptions
  );
}

export function generateTokenPair(payload: Omit<JwtPayload, 'type'>): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}