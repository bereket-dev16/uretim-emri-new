import { describe, expect, it } from 'vitest';

import { stockCreateSchema, stockListQuerySchema } from '@/shared/validation/stock';

describe('stock validation', () => {
  it('accepts valid stock payload', () => {
    const payload = {
      irsaliyeNo: 'IRS-1001',
      productName: 'Test Ürün',
      quantityNumeric: 12,
      quantityUnit: 'adet',
      productType: 'kutu',
      stockEntryDate: '2026-02-27',
      productCategory: 'hammadde'
    };

    expect(stockCreateSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects invalid unit', () => {
    const payload = {
      irsaliyeNo: 'IRS-1001',
      productName: 'Test Ürün',
      quantityNumeric: 12,
      quantityUnit: 'kg',
      productType: 'kutu',
      stockEntryDate: '2026-02-27',
      productCategory: 'hammadde'
    };

    expect(stockCreateSchema.safeParse(payload).success).toBe(false);
  });

  it('treats empty stock list filters as undefined', () => {
    const result = stockListQuerySchema.safeParse({
      query: '',
      role: '',
      productType: '',
      productCategory: '',
      stockEntryDate: '',
      page: '1',
      sort: 'newest'
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.role).toBeUndefined();
    expect(result.data.productType).toBeUndefined();
    expect(result.data.productCategory).toBeUndefined();
    expect(result.data.stockEntryDate).toBeUndefined();
    expect(result.data.query).toBeUndefined();
  });
});
