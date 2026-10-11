import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { AppError } from '../src/lib/errors.js';
import type { LoginInput, UpdateProfileInput } from '@prdforge/shared';
import type { AuthService, PublicUser } from '../src/modules/auth/service.js';

vi.mock('../src/db/client.js', () => ({ checkDatabase: vi.fn().mockResolvedValue(true), db: {} }));

const user: PublicUser = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Budi Produk',
  email: 'budi@example.com',
  locale: 'id',
  theme: 'system',
  createdAt: new Date('2026-01-01'),
};
const service: AuthService = {
  register: vi.fn(async () => ({
    user,
    accessToken: jwt.sign({}, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: 900 }),
    refreshToken: 'refresh-register',
  })),
  login: vi.fn(async (input: LoginInput) => {
    if (input.password === 'salah')
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau password salah.');
    return {
      user,
      accessToken: jwt.sign({}, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: 900 }),
      refreshToken: 'refresh-login',
    };
  }),
  refresh: vi.fn(async () => ({ user, accessToken: 'access-baru', refreshToken: 'refresh-baru' })),
  logout: vi.fn(async () => undefined),
  getUser: vi.fn(async () => user),
  updateProfile: vi.fn(async (_id: string, input: UpdateProfileInput) => ({ ...user, ...input })),
  changePassword: vi.fn(async () => undefined),
  deleteAccount: vi.fn(async () => undefined),
};

let server: Server;
let baseUrl: string;
beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = createApp({ authService: service }).listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Alamat test tidak tersedia');
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}/api/v1${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
}

describe('Auth API', () => {
  it('mendaftarkan user, tidak membocorkan refresh token, dan memasang cookie httpOnly', async () => {
    const response = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Budi Produk',
        email: 'BUDI@example.com',
        password: 'password-aman',
      }),
    });
    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toHaveProperty('accessToken');
    expect(body).not.toHaveProperty('refreshToken');
  });
  it('menolak body invalid dengan format error seragam', async () => {
    const response = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'B', email: 'rusak', password: '123' }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });
  it('menolak kredensial salah tanpa mengungkap field mana yang salah', async () => {
    const response = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'budi@example.com', password: 'salah' }),
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVALID_CREDENTIALS', message: 'Email atau password salah.' },
    });
  });
  it('melindungi endpoint profil dengan access token', async () => {
    expect((await request('/auth/me')).status).toBe(401);
    const token = jwt.sign({}, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: 900 });
    const response = await request('/auth/me', { headers: { authorization: `Bearer ${token}` } });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      user: { id: user.id, email: user.email },
    });
  });
  it('merotasi refresh token lewat cookie', async () => {
    const response = await request('/auth/refresh', {
      method: 'POST',
      headers: { cookie: 'prdforge_refresh=lama' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('refresh-baru');
    expect(service.refresh).toHaveBeenCalledWith('lama', expect.any(Object));
  });
});
