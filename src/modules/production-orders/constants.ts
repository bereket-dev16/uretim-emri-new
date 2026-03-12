import type {
  DemandSource,
  MarketScope,
  PackagingType,
  ProductionUnit
} from '@/shared/types/domain';

export const MARKET_SCOPE_VALUES = ['ihracat', 'ic_piyasa'] as const satisfies ReadonlyArray<MarketScope>;

export const MARKET_SCOPE_LABELS: Record<(typeof MARKET_SCOPE_VALUES)[number], string> = {
  ihracat: 'İhracat',
  ic_piyasa: 'İç Piyasa'
};

export const DEMAND_SOURCE_VALUES = ['numune', 'musteri_talebi', 'stok'] as const satisfies ReadonlyArray<DemandSource>;

export const DEMAND_SOURCE_LABELS: Record<(typeof DEMAND_SOURCE_VALUES)[number], string> = {
  numune: 'Numune',
  musteri_talebi: 'Müşteri Talebi',
  stok: 'Stok'
};

export const PACKAGING_TYPE_VALUES = ['kapsul', 'tablet', 'sivi', 'sase', 'softjel'] as const satisfies ReadonlyArray<PackagingType>;

export const PACKAGING_TYPE_LABELS: Record<(typeof PACKAGING_TYPE_VALUES)[number], string> = {
  kapsul: 'Kapsül',
  tablet: 'Tablet',
  sivi: 'Sıvı',
  sase: 'Saşe',
  softjel: 'Softjel'
};

export const PRODUCTION_UNIT_VALUES = [
  'DEPO',
  'TABLET1',
  'TABLET2',
  'BOYA',
  'KAPSUL',
  'BLISTER1',
  'BLISTER2',
  'PAKET'
] as const satisfies ReadonlyArray<ProductionUnit>;

export const PRODUCTION_UNIT_LABELS: Record<(typeof PRODUCTION_UNIT_VALUES)[number], string> = {
  DEPO: 'DEPO',
  TABLET1: 'TABLET1',
  TABLET2: 'TABLET2',
  BOYA: 'BOYA',
  KAPSUL: 'KAPSÜL',
  BLISTER1: 'BLISTER1',
  BLISTER2: 'BLISTER2',
  PAKET: 'PAKET'
};

export function getProductionUnitLabel(unitCode: string, unitName?: string | null): string {
  if (unitName && unitName.trim().length > 0) {
    return unitName;
  }

  return PRODUCTION_UNIT_LABELS[unitCode as keyof typeof PRODUCTION_UNIT_LABELS] ?? unitCode;
}
