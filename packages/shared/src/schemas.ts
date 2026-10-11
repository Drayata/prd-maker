import { z } from 'zod';

export const providerTypeSchema = z.enum([
  'openai_compatible',
  'anthropic',
  'google_gemini',
  'ollama_native',
]);

export type ProviderType = z.infer<typeof providerTypeSchema>;

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  app: z.literal('ok'),
  database: z.enum(['ok', 'unavailable']),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
