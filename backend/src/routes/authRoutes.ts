import { Router } from 'express';
import { login, refresh, me, changePassword, logout, updateProfile, loginSchema, refreshTokenSchema, changePasswordSchema, updateProfileSchema } from '@/controllers/authController';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/auth';
import { authRateLimiter, passwordResetRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

// Public routes with strict rate limiting
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refresh);
router.post('/logout', logout); // Public - logout doesn't require valid token

// Protected routes
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.patch('/profile', authenticate, validate(updateProfileSchema), updateProfile);

export default router;