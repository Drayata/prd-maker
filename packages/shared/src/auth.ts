import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Email tidak valid.').max(320);
export const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter.')
  .max(128, 'Password maksimal 128 karakter.');
export const nameSchema = z.string().trim().min(2, 'Nama minimal 2 karakter.').max(120);

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password wajib diisi.'),
});
export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    locale: z.enum(['id', 'en']).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Tidak ada perubahan.');
export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1), newPassword: passwordSchema })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'Password baru harus berbeda.',
    path: ['newPassword'],
  });
export const deleteAccountSchema = z.object({
  password: z.string().min(1),
  confirmation: z.literal('HAPUS'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
