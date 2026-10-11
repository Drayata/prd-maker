import { z } from 'zod';
export const templateSectionSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(100),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(2000),
  promptInstruction: z.string().trim().min(1).max(4000),
  required: z.boolean(),
  minDepth: z.enum(['ringkas', 'standar', 'mendalam']),
});
export const templateInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(1).max(2000),
  depthDefault: z.enum(['ringkas', 'standar', 'mendalam']).default('standar'),
  sections: z
    .array(templateSectionSchema)
    .min(1)
    .max(40)
    .refine(
      (items) => new Set(items.map((item) => item.key)).size === items.length,
      'Key section harus unik.',
    ),
});
export const documentInputSchema = z.object({
  title: z.string().trim().min(2).max(255),
  templateId: z.string().uuid(),
  providerId: z.string().uuid(),
  model: z.string().trim().min(1).max(255),
  language: z.enum(['id', 'en']).default('id'),
  depth: z.enum(['ringkas', 'standar', 'mendalam']).default('standar'),
  generationMode: z.enum(['per_section', 'single_shot']).default('per_section'),
  input: z.object({
    description: z.string().trim().min(20).max(20000),
    prdType: z.enum(['produk_baru', 'fitur_baru', 'iterasi', 'internal']),
    targetUsers: z.string().max(4000).optional(),
    platforms: z.array(z.enum(['web', 'mobile', 'desktop', 'api', 'lainnya'])).min(1),
    constraints: z.string().max(4000).optional(),
    competitors: z.string().max(4000).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().max(100000).optional(),
  }),
  clarifications: z
    .array(z.object({ id: z.string(), question: z.string(), answer: z.string() }))
    .default([]),
});
export const clarificationRequestSchema = documentInputSchema.pick({
  title: true,
  providerId: true,
  model: true,
  language: true,
  input: true,
});
export const clarificationQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  why: z.string().min(1),
  suggestedAnswers: z.array(z.string()).max(5),
});
export const clarificationResponseSchema = z.object({
  questions: z.array(clarificationQuestionSchema).min(5).max(8),
});
export type TemplateInput = z.infer<typeof templateInputSchema>;
export type DocumentInput = z.infer<typeof documentInputSchema>;
export type ClarificationRequest = z.infer<typeof clarificationRequestSchema>;
