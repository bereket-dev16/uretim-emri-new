import { describe, expect, it } from 'vitest';

import { productionOrderCreateSchema } from '@/shared/validation/production-order';

const basePayload = {
  orderDate: '2026-04-06',
  orderNo: 1201,
  customerName: 'Müşteri A',
  orderQuantity: 1000,
  deadlineDate: '2026-04-12',
  finalProductName: 'Omega Plus',
  totalPackagingQuantity: 1000,
  color: 'Mavi',
  moldText: 'Kalıp 2',
  hasProspectus: true,
  marketScope: 'ihracat',
  demandSource: 'numune',
  packagingType: 'kapsul',
  plannedRawUnitCode: 'TOZ_KARISIM'
} as const;

describe('production order create schema', () => {
  it('accepts null machine unit and trims note text', () => {
    const parsed = productionOrderCreateSchema.parse({
      ...basePayload,
      noteText: '  Parti onceligi vardir.  ',
      plannedMachineUnitCode: null
    });

    expect(parsed.noteText).toBe('Parti onceligi vardir.');
    expect(parsed.plannedMachineUnitCode).toBeNull();
  });

  it('normalizes empty note text to null', () => {
    const parsed = productionOrderCreateSchema.parse({
      ...basePayload,
      noteText: '   ',
      plannedMachineUnitCode: ''
    });

    expect(parsed.noteText).toBeNull();
    expect(parsed.plannedMachineUnitCode).toBeNull();
  });
});
