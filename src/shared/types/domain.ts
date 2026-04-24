export type Role = 'admin' | 'production_manager' | 'raw_preparation' | 'machine_operator';

export type MarketScope = 'ihracat' | 'ic_piyasa';
export type DemandSource = 'numune' | 'musteri_talebi' | 'stok';
export type PackagingType = 'kapsul' | 'tablet' | 'sivi' | 'sase' | 'softjel';

export type ProductionUnit = string;
export type ProductionUnitGroup = 'HAMMADDE' | 'MAKINE';
export type ProductionDispatchStatus = 'pending' | 'in_progress' | 'completed';
export type ProductionOrderStatus = 'active' | 'completed';

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
  unitGroup: ProductionUnitGroup;
  isActive: boolean;
}

export interface DashboardSummary {
  ordersCreatedToday: number;
  completedOrders: number;
  activeOrders: number;
}

export interface ProductionOrderAttachmentDTO {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedByUsername: string | null;
}

export interface ProductionOrderDispatchDTO {
  id: string;
  unitCode: ProductionUnit;
  unitName: string;
  unitGroup: ProductionUnitGroup;
  status: ProductionDispatchStatus;
  dispatchedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  reportedOutputQuantity: number | null;
  boxCount: number | null;
  cartonCount: number | null;
  palletCount: number | null;
}

export interface ProductionOrderListItemDTO {
  id: string;
  orderDate: string;
  orderNo: number;
  customerName: string;
  orderQuantity: number;
  deadlineDate: string;
  finalProductName: string;
  totalPackagingQuantity: number;
  color: string;
  moldText: string;
  hasProspectus: boolean;
  marketScope: MarketScope;
  demandSource: DemandSource;
  packagingType: PackagingType;
  noteText: string | null;
  plannedRawUnitCode: ProductionUnit;
  plannedMachineUnitCode: ProductionUnit | null;
  status: ProductionOrderStatus;
  createdByUsername: string;
  createdAt: string;
  updatedAt: string;
  attachments: ProductionOrderAttachmentDTO[];
  dispatches: ProductionOrderDispatchDTO[];
}

export interface PaginatedProductionOrdersDTO {
  items: ProductionOrderListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
}
