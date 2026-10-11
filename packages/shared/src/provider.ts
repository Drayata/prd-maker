import { z } from 'zod';
import { providerTypeSchema } from './schemas.js';

const jsonRecord = z.record(z.string(), z.unknown());
export const providerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: providerTypeSchema,
  baseUrl: z.string().url().max(2048),
  apiKey: z.string().max(10000).optional(),
  defaultModel: z.string().trim().min(1).max(255),
  customHeaders: z.record(z.string(), z.string()).default({}),
  extraBodyParams: jsonRecord.default({}),
  defaultParams: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().positive().max(1_000_000).optional(),
      topP: z.number().min(0).max(1).optional(),
    })
    .default({}),
  supportsStreaming: z.boolean().default(true),
  supportsJsonMode: z.boolean().default(false),
  modelProfile: z.enum(['small', 'medium', 'large']).default('medium'),
  timeoutMs: z.number().int().min(1000).max(600000).default(120000),
  inputPricePerM: z.number().nonnegative().nullable().optional(),
  outputPricePerM: z.number().nonnegative().nullable().optional(),
  isDefault: z.boolean().default(false),
});
export const providerUpdateSchema = providerInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Tidak ada perubahan.');
export type ProviderInput = z.infer<typeof providerInputSchema>;
export type ProviderUpdate = z.infer<typeof providerUpdateSchema>;
