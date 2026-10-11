import bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@prdforge/shared';
import { env } from '../../config/env.js';
import { db } from '../../db/client.js';
import { refreshTokens, users } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';

const PASSWORD_COST = 12;
const durationUnits = { s: 1, m: 60, h: 3600, d: 86400 } as const;

function durationSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error('Durasi token tidak valid');
  return Number(match[1]) * durationUnits[match[2] as keyof typeof durationUnits];
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  locale: 'id' | 'en';
  theme: 'light' | 'dark' | 'system';
  createdAt: Date;
}
export interface SessionMeta {
  userAgent: string | undefined;
  ip: string | undefined;
}

function publicUser(user: typeof users.$inferSelect): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    locale: user.locale,
    theme: user.theme,
    createdAt: user.createdAt,
  };
}

function accessToken(userId: string) {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: durationSeconds(env.ACCESS_TOKEN_TTL),
  });
}

async function createRefreshToken(userId: string, meta: SessionMeta) {
  const token = randomBytes(48).toString('base64url');
  await db.insert(refreshTokens).values({
    id: randomUUID(),
    userId,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + durationSeconds(env.REFRESH_TOKEN_TTL) * 1000),
    userAgent: meta.userAgent?.slice(0, 500),
    ip: meta.ip?.slice(0, 45),
  });
  return token;
}

export interface AuthService {
  register(
    input: RegisterInput,
    meta: SessionMeta,
  ): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }>;
  login(
    input: LoginInput,
    meta: SessionMeta,
  ): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }>;
  refresh(
    token: string,
    meta: SessionMeta,
  ): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }>;
  logout(token: string): Promise<void>;
  getUser(userId: string): Promise<PublicUser>;
  updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser>;
  changePassword(userId: string, input: ChangePasswordInput): Promise<void>;
  deleteAccount(userId: string, password: string): Promise<void>;
}

export const authService: AuthService = {
  async register(input, meta) {
    const email = input.email.toLowerCase();
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });
    if (existing) throw new AppError(409, 'EMAIL_EXISTS', 'Email sudah terdaftar.');
    const user = {
      id: randomUUID(),
      name: input.name.trim(),
      email,
      passwordHash: await bcrypt.hash(input.password, PASSWORD_COST),
      locale: 'id' as const,
      theme: 'system' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    try {
      await db.insert(users).values(user);
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY')
        throw new AppError(409, 'EMAIL_EXISTS', 'Email sudah terdaftar.');
      throw error;
    }
    return {
      user: publicUser(user),
      accessToken: accessToken(user.id),
      refreshToken: await createRefreshToken(user.id, meta),
    };
  },

  async login(input, meta) {
    const user = await db.query.users.findFirst({
      where: and(eq(users.email, input.email.toLowerCase()), isNull(users.deletedAt)),
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash)))
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau password salah.');
    return {
      user: publicUser(user),
      accessToken: accessToken(user.id),
      refreshToken: await createRefreshToken(user.id, meta),
    };
  },

  async refresh(token, meta) {
    const stored = await db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.tokenHash, tokenHash(token)),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
      with: { user: true },
    });
    if (!stored || stored.user.deletedAt)
      throw new AppError(
        401,
        'REFRESH_TOKEN_INVALID',
        'Sesi sudah berakhir. Silakan masuk kembali.',
      );
    const nextToken = await db.transaction(async (tx) => {
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, stored.id));
      const raw = randomBytes(48).toString('base64url');
      await tx.insert(refreshTokens).values({
        id: randomUUID(),
        userId: stored.userId,
        tokenHash: tokenHash(raw),
        expiresAt: new Date(Date.now() + durationSeconds(env.REFRESH_TOKEN_TTL) * 1000),
        userAgent: meta.userAgent?.slice(0, 500),
        ip: meta.ip?.slice(0, 45),
      });
      return raw;
    });
    return {
      user: publicUser(stored.user),
      accessToken: accessToken(stored.userId),
      refreshToken: nextToken,
    };
  },

  async logout(token) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.tokenHash, tokenHash(token)), isNull(refreshTokens.revokedAt)));
  },

  async getUser(userId) {
    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt)),
    });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Akun tidak ditemukan.');
    return publicUser(user);
  },

  async updateProfile(userId, input) {
    await db
      .update(users)
      .set(input)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));
    return this.getUser(userId);
  },

  async changePassword(userId, input) {
    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt)),
    });
    if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash)))
      throw new AppError(400, 'PASSWORD_INCORRECT', 'Password saat ini salah.');
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash: await bcrypt.hash(input.newPassword, PASSWORD_COST) })
        .where(eq(users.id, userId));
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    });
  },

  async deleteAccount(userId, password) {
    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt)),
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      throw new AppError(400, 'PASSWORD_INCORRECT', 'Password salah.');
    await db.transaction(async (tx) => {
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
      await tx
        .update(users)
        .set({
          deletedAt: new Date(),
          email: `deleted-${userId}@invalid.local`,
          name: 'Akun dihapus',
          passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), PASSWORD_COST),
        })
        .where(eq(users.id, userId));
    });
  },
};
