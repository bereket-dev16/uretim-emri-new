import {
  DEMAND_SOURCE_LABELS,
  getProductionUnitLabel,
  MARKET_SCOPE_LABELS,
  PACKAGING_TYPE_LABELS
} from '@/modules/production-orders/constants';
import { PRODUCT_TYPE_LABELS } from '@/modules/stocks/constants';
import { ROLE_LABELS } from '@/shared/constants/role-labels';
import type {
  ProductionDispatchStatus,
  ProductionOrderDispatchDTO,
  ProductionOrderListItemDTO,
  ProductionUnit
} from '@/shared/types/domain';

export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('tr-TR');
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('tr-TR');
}

export function statusLabel(status: ProductionDispatchStatus): string {
  switch (status) {
    case 'pending':
      return 'Beklemede';
    case 'in_progress':
      return 'Çalışıyor';
    case 'completed':
      return 'Bitti';
    default:
      return status;
  }
}

export function statusClass(status: ProductionDispatchStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'in_progress':
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

export function findDispatchByUnit(
  item: ProductionOrderListItemDTO,
  unitCode: ProductionUnit
): ProductionOrderDispatchDTO | null {
  return item.dispatches.find((dispatch) => dispatch.unitCode === unitCode) ?? null;
}

export function materialSummary(item: ProductionOrderListItemDTO): string {
  const total = item.materials.length;
  const ready = item.materials.filter((material) => material.isAvailable).length;

  return `${ready}/${total} malzeme hazır`;
}

export function dispatchSummary(item: ProductionOrderListItemDTO): string {
  if (item.dispatches.length === 0) {
    return 'Henüz sevk edilmedi';
  }

  const completed = item.dispatches.filter((dispatch) => dispatch.status === 'completed').length;
  const inProgress = item.dispatches.filter((dispatch) => dispatch.status === 'in_progress').length;
  const pending = item.dispatches.filter((dispatch) => dispatch.status === 'pending').length;

  return `${completed} bitti • ${inProgress} çalışıyor • ${pending} beklemede`;
}

export function orderMetaRows(item: ProductionOrderListItemDTO): Array<{ label: string; value: string }> {
  return [
    { label: 'İş Emri No', value: item.orderNo },
    { label: 'İş Emri Tarihi', value: formatDate(item.orderDate) },
    { label: 'Müşteri', value: item.customerName },
    { label: 'Pazar', value: MARKET_SCOPE_LABELS[item.marketScope] },
    { label: 'Talep Türü', value: DEMAND_SOURCE_LABELS[item.demandSource] },
    { label: 'Sipariş Miktarı', value: item.orderQuantity },
    { label: 'Termin', value: formatDate(item.deadlineDate) },
    { label: 'Son Ürün', value: item.finalProductName },
    { label: 'Ambalaj', value: PACKAGING_TYPE_LABELS[item.packagingType] },
    { label: 'Toplam Ambalaj Miktarı', value: item.totalAmountText },
    { label: 'Depo Sevk Noktası', value: getProductionUnitLabel(item.dispatchUnitCode) },
    { label: 'Oluşturan Rol', value: ROLE_LABELS[item.createdByRole] }
  ];
}

export function materialTypeLabel(materialType: keyof typeof PRODUCT_TYPE_LABELS): string {
  return PRODUCT_TYPE_LABELS[materialType];
}
