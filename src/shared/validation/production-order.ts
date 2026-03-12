import { z } from 'zod';

import {
  DEMAND_SOURCE_VALUES,
  MARKET_SCOPE_VALUES,
  PACKAGING_TYPE_VALUES
} from '@/modules/production-orders/constants';
import { PRODUCT_TYPE_VALUES } from '@/modules/stocks/constants';

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD formatında olmalıdır.');

export const productionOrderMaterialSchema = z.object({
  materialProductType: z.enum(PRODUCT_TYPE_VALUES),
  materialName: z
    .string()
    .trim()
    .min(1, 'Malzeme adı zorunludur.')
    .max(120, 'Malzeme adı en fazla 120 karakter olabilir.'),
  materialQuantityText: z
    .string()
    .trim()
    .min(1, 'Miktar zorunludur.')
    .max(120, 'Miktar en fazla 120 karakter olabilir.')
});

export const productionOrderCreateSchema = z.object({
  orderDate: isoDateSchema,
  orderNo: z
    .string()
    .trim()
    .min(1, 'İş emri no zorunludur.')
    .max(64, 'İş emri no en fazla 64 karakter olabilir.'),
  customerName: z
    .string()
    .trim()
    .min(1, 'Müşteri adı zorunludur.')
    .max(120, 'Müşteri adı en fazla 120 karakter olabilir.'),
  marketScope: z.enum(MARKET_SCOPE_VALUES),
  demandSource: z.enum(DEMAND_SOURCE_VALUES),
  orderQuantity: z
    .string()
    .trim()
    .min(1, 'Sipariş miktarı zorunludur.')
    .max(64, 'Sipariş miktarı en fazla 64 karakter olabilir.'),
  deadlineDate: isoDateSchema,
  finalProductName: z
    .string()
    .trim()
    .min(1, 'Son ürün adı zorunludur.')
    .max(120, 'Son ürün adı en fazla 120 karakter olabilir.'),
  packagingType: z.enum(PACKAGING_TYPE_VALUES),
  totalAmountText: z
    .string()
    .trim()
    .min(1, 'Toplam ambalaj miktarı zorunludur.')
    .max(120, 'Toplam ambalaj miktarı en fazla 120 karakter olabilir.'),
  dispatchUnits: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Sevk birimi zorunludur.')
        .max(32, 'Sevk birimi en fazla 32 karakter olabilir.')
    )
    .min(1, 'En az bir sevk birimi seçilmelidir.')
    .max(20, 'Aynı emirde en fazla 20 birim seçilebilir.')
    .refine((items) => new Set(items).size === items.length, {
      message: 'Sevk birimleri tekrar edemez.'
    }),
  materials: z.array(productionOrderMaterialSchema).min(1, 'En az bir malzeme satırı zorunludur.')
});

export const productionOrderListScopeSchema = z.enum([
  'all',
  'warehouse',
  'monitor',
  'unit'
]);

export const productionOrderListQuerySchema = z.object({
  scope: productionOrderListScopeSchema.default('all')
});

export const productionOrderMaterialAvailabilitySchema = z.object({
  isAvailable: z.boolean()
});

export const productionOrderDispatchCreateSchema = z.object({
  unitCodes: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'Sevk birimi zorunludur.')
        .max(32, 'Sevk birimi en fazla 32 karakter olabilir.')
    )
    .min(1, 'En az bir hedef birim seçilmelidir.')
    .max(20)
    .refine((items) => new Set(items).size === items.length, {
      message: 'Hedef birimler tekrar edemez.'
    })
});
