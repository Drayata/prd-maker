import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  changePasswordSchema,
  deleteAccountSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type LoginInput,
  type RegisterInput,
  type UpdateProfileInput,
} from '@prdforge/shared';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireTrustedOrigin } from '../../middleware/csrf.js';
import { validateBody } from '../../middleware/validate.js';
import { AppError } from '../../lib/errors.js';
import type { AuthService } from './service.js';
import { authService } from './service.js';

const COOKIE_NAME = 'prdforge_refresh';
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
};
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT',
      message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.',
    },
  },
});

function sessionMeta(request: { get(name: string): string | undefined; ip: string | undefined }) {
  return { userAgent: request.get('user-agent'), ip: request.ip };
}
function refreshCookie(request: { cookies: unknown }): string | undefined {
  if (typeof request.cookies !== 'object' || request.cookies === null) return undefined;
  const value = (request.cookies as Record<string, unknown>)[COOKIE_NAME];
  return typeof value === 'string' ? value : undefined;
}

export function createAuthRouter(service: AuthService = authService) {
  const router = Router();
  router.post('/register', authLimiter, validateBody(registerSchema), async (request, response) => {
    const result = await service.register(request.body as RegisterInput, sessionMeta(request));
    response
      .cookie(COOKIE_NAME, result.refreshToken, cookieOptions)
      .status(201)
      .json({ user: result.user, accessToken: result.accessToken });
  });
  router.post('/login', authLimiter, validateBody(loginSchema), async (request, response) => {
    const result = await service.login(request.body as LoginInput, sessionMeta(request));
    response
      .cookie(COOKIE_NAME, result.refreshToken, cookieOptions)
      .json({ user: result.user, accessToken: result.accessToken });
  });
  router.post('/refresh', authLimiter, requireTrustedOrigin, async (request, response) => {
    const token = refreshCookie(request);
    if (!token) throw new AppError(401, 'REFRESH_TOKEN_MISSING', 'Sesi tidak ditemukan.');
    const result = await service.refresh(token, sessionMeta(request));
    response
      .cookie(COOKIE_NAME, result.refreshToken, cookieOptions)
      .json({ user: result.user, accessToken: result.accessToken });
  });
  router.post('/logout', requireTrustedOrigin, async (request, response) => {
    const token = refreshCookie(request);
    if (token) await service.logout(token);
    response.clearCookie(COOKIE_NAME, cookieOptions).status(204).end();
  });
  router.get('/me', requireAuth, async (request, response) =>
    response.json({ user: await service.getUser(request.userId!) }),
  );
  router.patch('/me', requireAuth, validateBody(updateProfileSchema), async (request, response) =>
    response.json({
      user: await service.updateProfile(request.userId!, request.body as UpdateProfileInput),
    }),
  );
  router.post(
    '/change-password',
    requireAuth,
    validateBody(changePasswordSchema),
    async (request, response) => {
      await service.changePassword(request.userId!, request.body as ChangePasswordInput);
      response.clearCookie(COOKIE_NAME, cookieOptions).status(204).end();
    },
  );
  router.delete(
    '/me',
    requireAuth,
    validateBody(deleteAccountSchema),
    async (request, response) => {
      await service.deleteAccount(request.userId!, (request.body as { password: string }).password);
      response.clearCookie(COOKIE_NAME, cookieOptions).status(204).end();
    },
  );
  return router;
}
