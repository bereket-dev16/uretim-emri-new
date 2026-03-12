import { describe, expect, it } from 'vitest';

import { createCombinedCode, formatBarcodeNo } from '@/modules/stocks/barcode';

describe('barcode helpers', () => {
  it('formats barcode with B prefix and 10 digits', () => {
    expect(formatBarcodeNo(123)).toBe('B0000000123');
  });

  it('creates combined code as irsaliye + barcode', () => {
    expect(createCombinedCode('IRS-1', 'B0000000005')).toBe('IRS-1-B0000000005');
  });

  it('throws for invalid serial', () => {
    expect(() => formatBarcodeNo(0)).toThrow();
    expect(() => formatBarcodeNo(-2)).toThrow();
  });
});
