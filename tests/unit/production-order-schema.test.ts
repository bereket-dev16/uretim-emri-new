import { describe, expect, it } from 'vitest';

import {
  productionOrderCreateSchema,
  productionOrderDeleteSchema,
  productionOrderDispatchCreateSchema
} from '@/shared/validation/production-order';

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

describe('production order dispatch schema', () => {
  it('normalizes single unitCode payload into unitCodes array', () => {
    const parsed = productionOrderDispatchCreateSchema.parse({
      unitCode: 'TABLET1'
    });

    expect(parsed.unitCodes).toEqual(['TABLET1']);
  });

  it('accepts multi-unit batch payload', () => {
    const parsed = productionOrderDispatchCreateSchema.parse({
      unitCodes: ['TABLET1', 'BLISTER1']
    });

    expect(parsed.unitCodes).toEqual(['TABLET1', 'BLISTER1']);
  });

  it('rejects duplicated unit selections', () => {
    const parsed = productionOrderDispatchCreateSchema.safeParse({
      unitCodes: ['TABLET1', 'TABLET1']
    });

    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.unitCodes).toContain('Aynı birim birden fazla kez seçilemez.');
    }
  });
});

describe('production order delete schema', () => {
  it('normalizes confirmation text to SIL', () => {
    const parsed = productionOrderDeleteSchema.parse({
      orderNo: 1201,
      confirmationText: ' sil '
    });

    expect(parsed.orderNo).toBe(1201);
    expect(parsed.confirmationText).toBe('SIL');
  });

  it('rejects invalid confirmation text', () => {
    const parsed = productionOrderDeleteSchema.safeParse({
      orderNo: 1201,
      confirmationText: 'iptal'
    });

    expect(parsed.success).toBe(false);
  });
});
