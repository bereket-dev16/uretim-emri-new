import type {
  DemandSource,
  MarketScope,
  PackagingType,
  ProductionUnit,
  ProductionUnitGroup
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

export const RAW_UNIT_VALUES = ['TOZ_KARISIM', 'SIVI_KARISIM', 'SOFTJEL'] as const satisfies ReadonlyArray<ProductionUnit>;
export const MACHINE_UNIT_VALUES = ['DEPO', 'TABLET1', 'TABLET2', 'BOYA', 'KAPSUL', 'BLISTER1', 'BLISTER2', 'PAKET'] as const satisfies ReadonlyArray<ProductionUnit>;
export const ALL_PRODUCTION_UNIT_VALUES = [...RAW_UNIT_VALUES, ...MACHINE_UNIT_VALUES] as const satisfies ReadonlyArray<ProductionUnit>;

export const PRODUCTION_UNIT_LABELS: Record<string, string> = {
  TOZ_KARISIM: 'Toz Karışım',
  SIVI_KARISIM: 'Sıvı Karışım',
  SOFTJEL: 'Softjel',
  DEPO: 'Depo',
  TABLET1: 'Tablet 1',
  TABLET2: 'Tablet 2',
  BOYA: 'Boya',
  KAPSUL: 'Kapsül',
  BLISTER1: 'Blister 1',
  BLISTER2: 'Blister 2',
  PAKET: 'Paket'
};

export const PRODUCTION_UNIT_GROUP_LABELS: Record<ProductionUnitGroup, string> = {
  HAMMADDE: 'Hammadde',
  MAKINE: 'Makine'
};

export function getProductionUnitLabel(unitCode: string | null | undefined, unitName?: string | null): string {
  if (unitName && unitName.trim().length > 0) {
    return unitName;
  }

  if (!unitCode || unitCode.trim().length === 0) {
    return '-';
  }

  return PRODUCTION_UNIT_LABELS[unitCode] ?? unitCode;
}
