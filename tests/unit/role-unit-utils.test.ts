import { describe, expect, it } from 'vitest';

import { getUnitsForRole, roleRequiresAssignedUnit } from '@/components/admin/role-unit-utils';

const units = [
  { code: 'TOZ_KARISIM', name: 'Toz Karışım', unitGroup: 'HAMMADDE', isActive: true },
  { code: 'TABLET1', name: 'Tablet 1', unitGroup: 'MAKINE', isActive: true }
] as const;

describe('role unit helpers', () => {
  it('requires assigned unit only for operator roles', () => {
    expect(roleRequiresAssignedUnit('admin')).toBe(false);
    expect(roleRequiresAssignedUnit('production_manager')).toBe(false);
    expect(roleRequiresAssignedUnit('raw_preparation')).toBe(true);
    expect(roleRequiresAssignedUnit('machine_operator')).toBe(true);
  });

  it('filters units by role group', () => {
    expect(getUnitsForRole('raw_preparation', [...units]).map((unit) => unit.code)).toEqual(['TOZ_KARISIM']);
    expect(getUnitsForRole('machine_operator', [...units]).map((unit) => unit.code)).toEqual(['TABLET1']);
    expect(getUnitsForRole('admin', [...units]).map((unit) => unit.code)).toEqual(['TOZ_KARISIM', 'TABLET1']);
  });
});
