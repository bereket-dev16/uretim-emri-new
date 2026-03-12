import { z } from 'zod';

export const loginInputSchema = z.object({
  username: z.string().trim().min(3, 'Kullanıcı adı en az 3 karakter olmalı.').max(64),
  password: z.string().min(4, 'Şifre en az 4 karakter olmalı.').max(128)
});

export type LoginInput = z.infer<typeof loginInputSchema>;
