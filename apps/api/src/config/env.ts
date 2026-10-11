import 'dotenv/config';
import { z } from 'zod';

const durationSchema = z.string().regex(/^\d+[smhd]$/, 'harus berupa durasi, contoh: 15m');
const booleanSchema = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().startsWith('mysql://'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: durationSchema.default('15m'),
  REFRESH_TOKEN_TTL: durationSchema.default('30d'),
  ENCRYPTION_KEY: z.string().refine((value) => {
    try {
      return Buffer.from(value, 'base64').length === 32;
    } catch {
      return false;
    }
  }, 'harus berupa base64 dari tepat 32 byte'),
  ENCRYPTION_KEY_VERSION: z.coerce.number().int().positive().default(1),
  ALLOW_PRIVATE_PROVIDER_URLS: booleanSchema.default(false),
  MAIL_DRIVER: z.enum(['console', 'smtp']).default('console'),
  RATE_LIMIT_GENERATE_PER_MIN: z.coerce.number().int().positive().default(10),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Konfigurasi environment tidak valid: ${issues}`);
}

export const env = parsed.data;
