import type {
  ProductCategory,
  ProductType,
  QuantityUnit,
  Role
} from '@/shared/types/domain';

export interface EditableRow {
  irsaliyeNo: string;
  productName: string;
  quantityNumeric: string;
  quantityUnit: QuantityUnit;
  productType: ProductType;
  productCategory: ProductCategory;
  stockEntryDate: string;
}

export interface StocksPaginationFilters {
  query?: string;
  role?: Role;
  productType?: ProductType;
  productCategory?: ProductCategory;
  stockEntryDate?: string;
  sort: 'newest' | 'oldest';
}
