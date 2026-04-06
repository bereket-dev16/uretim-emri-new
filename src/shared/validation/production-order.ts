import { z } from 'zod';

import {
  ALL_PRODUCTION_UNIT_VALUES,
  DEMAND_SOURCE_VALUES,
  MACHINE_UNIT_VALUES,
  MARKET_SCOPE_VALUES,
  PACKAGING_TYPE_VALUES,
  RAW_UNIT_VALUES
} from '@/modules/production-orders/constants';

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD formatında olmalıdır.');

const positiveInteger = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} sayısal olmalıdır.` })
    .int(`${label} tam sayı olmalıdır.`)
    .positive(`${label} 0'dan büyük olmalıdır.`);

export const productionOrderCreateSchema = z.object({
  orderDate: isoDateSchema,
  orderNo: positiveInteger('İş emri numarası'),
  customerName: z.string().trim().min(1, 'Müşteri adı zorunludur.').max(120),
  orderQuantity: positiveInteger('Sipariş miktarı'),
  deadlineDate: isoDateSchema,
  finalProductName: z.string().trim().min(1, 'Son ürün adı zorunludur.').max(160),
  totalPackagingQuantity: positiveInteger('Toplam ambalaj miktarı'),
  color: z.string().trim().min(1, 'Renk zorunludur.').max(64),
  moldText: z.string().trim().min(1, 'Kalıp bilgisi zorunludur.').max(120),
  hasProspectus: z.boolean(),
  marketScope: z.enum(MARKET_SCOPE_VALUES),
  demandSource: z.enum(DEMAND_SOURCE_VALUES),
  packagingType: z.enum(PACKAGING_TYPE_VALUES),
  noteText: z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return null;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    },
    z.string().max(2000, 'Not alanı en fazla 2000 karakter olabilir.').nullable()
  ),
  plannedRawUnitCode: z.enum(RAW_UNIT_VALUES),
  plannedMachineUnitCode: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.enum(MACHINE_UNIT_VALUES).nullable()
  )
});

export const productionOrderListScopeSchema = z.enum(['active', 'completed', 'incoming', 'unit']);

export const productionOrderListQuerySchema = z.object({
  scope: productionOrderListScopeSchema.default('active'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10)
});

export const productionOrderDispatchCreateSchema = z.object({
  unitCode: z.enum(ALL_PRODUCTION_UNIT_VALUES)
});

export const productionOrderCompleteSchema = z.object({
  reportedOutputQuantity: positiveInteger('Son sipariş miktarı')
});
