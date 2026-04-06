import type { ProductionUnitDTO, Role } from '@/shared/types/domain';

export function roleRequiresAssignedUnit(role: Role): boolean {
  return role === 'raw_preparation' || role === 'machine_operator';
}

export function getUnitsForRole(role: Role, productionUnits: ProductionUnitDTO[]): ProductionUnitDTO[] {
  if (role === 'raw_preparation') {
    return productionUnits.filter((unit) => unit.unitGroup === 'HAMMADDE');
  }

  if (role === 'machine_operator') {
    return productionUnits.filter((unit) => unit.unitGroup === 'MAKINE');
  }

  return productionUnits;
}
