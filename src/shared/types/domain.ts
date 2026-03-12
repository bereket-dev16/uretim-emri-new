export type Role = 'admin' | 'production_manager' | 'warehouse_manager' | 'hat' | 'tablet1';

export type QuantityUnit = 'gr' | 'adet';

export type ProductType =
  | 'kutu'
  | 'blister_folyo'
  | 'sase_folyo'
  | 'prospektus'
  | 'sise'
  | 'etiket'
  | 'kapak'
  | 'sleeve';

export type ProductCategory = 'sarf' | 'hammadde';

export type MarketScope = 'ihracat' | 'ic_piyasa';

export type DemandSource = 'numune' | 'musteri_talebi' | 'stok';

export type PackagingType = 'kapsul' | 'tablet' | 'sivi' | 'sase' | 'softjel';

export type ProductionUnit = string;

export type ProductionDispatchStatus = 'pending' | 'in_progress' | 'completed';

export interface SessionDTO {
  userId: string;
  username: string;
  role: Role;
  hatUnitCode: string | null;
  expiresAt: string;
}

export interface UserDTO {
  id: string;
  username: string;
  role: Role;
  hatUnitCode: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionUnitDTO {
  code: string;
  name: string;
  isActive: boolean;
}

export interface StockCreateInput {
  irsaliyeNo: string;
  productName: string;
  quantityNumeric: number;
  quantityUnit: QuantityUnit;
  productType: ProductType;
  stockEntryDate: string;
  productCategory: ProductCategory;
}

export interface StockListItem {
  id: string;
  irsaliyeNo: string;
  productName: string;
  quantityNumeric: number;
  quantityUnit: QuantityUnit;
  productType: ProductType;
  stockEntryDate: string;
  productCategory: ProductCategory;
  barcodeNo: string;
  createdByRole: Role;
  createdAt: string;
}

export interface DashboardSummary {
  totalStockRecords: number;
  stockRecordsToday: number;
  activeUserCount: number;
}

export interface ProductionOrderMaterialDTO {
  id: string;
  materialProductType: ProductType;
  materialName: string;
  materialQuantityText: string;
  isAvailable: boolean;
  checkedAt: string | null;
  checkedByUsername: string | null;
}

export interface ProductionOrderDispatchDTO {
  id: string;
  unitCode: ProductionUnit;
  unitName: string;
  status: ProductionDispatchStatus;
  dispatchedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
}

export interface ProductionOrderListItemDTO {
  id: string;
  orderDate: string;
  orderNo: string;
  customerName: string;
  marketScope: MarketScope;
  demandSource: DemandSource;
  orderQuantity: string;
  deadlineDate: string;
  finalProductName: string;
  packagingType: PackagingType;
  totalAmountText: string;
  dispatchUnitCode: ProductionUnit;
  createdByRole: Role;
  createdAt: string;
  materials: ProductionOrderMaterialDTO[];
  dispatches: ProductionOrderDispatchDTO[];
}
