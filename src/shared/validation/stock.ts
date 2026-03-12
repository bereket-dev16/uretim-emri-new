import { z } from 'zod';

import { PRODUCT_CATEGORY_VALUES, PRODUCT_TYPE_VALUES } from '@/modules/stocks/constants';
import { roleSchema } from '@/shared/validation/user';

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD formatında olmalıdır.');

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim() === '' ? undefined : value;
}

export const stockCreateSchema = z.object({
  irsaliyeNo: z
    .string()
    .trim()
    .min(1, 'İrsaliye no zorunludur.')
    .max(64, 'İrsaliye no en fazla 64 karakter olabilir.'),
  productName: z
    .string()
    .trim()
    .min(2, 'Ürün adı en az 2 karakter olmalıdır.')
    .max(120, 'Ürün adı en fazla 120 karakter olabilir.'),
  quantityNumeric: z
    .number({ invalid_type_error: 'Ürün miktarı sayısal olmalıdır.' })
    .positive('Ürün miktarı 0 dan büyük olmalıdır.')
    .max(1000000000, 'Ürün miktarı çok büyük.'),
  quantityUnit: z.enum(['gr', 'adet']),
  productType: z.enum(PRODUCT_TYPE_VALUES),
  stockEntryDate: isoDateSchema,
  productCategory: z.enum(PRODUCT_CATEGORY_VALUES)
});

export const stockUpdateSchema = z
  .object({
    irsaliyeNo: z
      .string()
      .trim()
      .min(1, 'İrsaliye no zorunludur.')
      .max(64, 'İrsaliye no en fazla 64 karakter olabilir.')
      .optional(),
    productName: z
      .string()
      .trim()
      .min(2, 'Ürün adı en az 2 karakter olmalıdır.')
      .max(120, 'Ürün adı en fazla 120 karakter olabilir.')
      .optional(),
    quantityNumeric: z
      .number({ invalid_type_error: 'Ürün miktarı sayısal olmalıdır.' })
      .positive('Ürün miktarı 0 dan büyük olmalıdır.')
      .max(1000000000, 'Ürün miktarı çok büyük.')
      .optional(),
    quantityUnit: z.enum(['gr', 'adet']).optional(),
    productType: z.enum(PRODUCT_TYPE_VALUES).optional(),
    stockEntryDate: isoDateSchema.optional(),
    productCategory: z.enum(PRODUCT_CATEGORY_VALUES).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Güncelleme için en az bir alan gönderilmelidir.'
  });

export const stockListQuerySchema = z.object({
  query: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  role: z.preprocess(emptyToUndefined, roleSchema.optional()),
  productType: z.preprocess(emptyToUndefined, z.enum(PRODUCT_TYPE_VALUES).optional()),
  productCategory: z.preprocess(
    emptyToUndefined,
    z.enum(PRODUCT_CATEGORY_VALUES).optional()
  ),
  stockEntryDate: z.preprocess(emptyToUndefined, isoDateSchema.optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(10).default(10),
  sort: z.enum(['newest', 'oldest']).default('newest')
});

export type StockListQuery = z.infer<typeof stockListQuerySchema>;
