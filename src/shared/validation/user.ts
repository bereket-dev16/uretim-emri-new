import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'production_manager', 'hat']);

function hatUnitRequirement(
  value: {
    role?: z.infer<typeof roleSchema>;
    hatUnitCode?: string | null;
  },
  ctx: z.RefinementCtx
) {
  if (value.role === 'hat' && !value.hatUnitCode?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['hatUnitCode'],
      message: 'Hat rolü için birim seçimi zorunludur.'
    });
  }
}

export const userCreateSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Kullanıcı adı en az 3 karakter olmalı.')
      .max(64, 'Kullanıcı adı en fazla 64 karakter olabilir.'),
    password: z
      .string()
      .min(4, 'Şifre en az 4 karakter olmalı.')
      .max(128, 'Şifre en fazla 128 karakter olabilir.'),
    role: roleSchema,
    hatUnitCode: z.string().trim().max(32).nullable().optional()
  })
  .superRefine(hatUnitRequirement);

export const userPatchSchema = z
  .object({
    username: z.string().trim().min(3).max(64).optional(),
    role: roleSchema.optional(),
    hatUnitCode: z.string().trim().max(32).nullable().optional(),
    isActive: z.boolean().optional()
  })
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Güncelleme için en az bir alan gönderilmelidir.'
      });
      return;
    }

    hatUnitRequirement(value, ctx);
  });

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(4, 'Şifre en az 4 karakter olmalı.')
    .max(128, 'Şifre en fazla 128 karakter olabilir.')
});
