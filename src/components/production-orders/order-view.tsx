import Link from 'next/link';

import { DEMAND_SOURCE_LABELS, MARKET_SCOPE_LABELS, PACKAGING_TYPE_LABELS, getProductionUnitLabel } from '@/modules/production-orders/constants';
import type { ProductionOrderDispatchDTO, ProductionOrderListItemDTO, ProductionUnitDTO } from '@/shared/types/domain';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('tr-TR');
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('tr-TR');
}

export function getStatusTone(status: string): 'pending' | 'in_progress' | 'completed' | 'finished' {
  switch (status) {
    case 'pending':
    case 'in_progress':
    case 'completed':
      return status;
    default:
      return 'finished';
  }
}

export function getCurrentDispatch(order: ProductionOrderListItemDTO): ProductionOrderDispatchDTO | null {
  const openDispatch =
    order.dispatches.find((dispatch) => dispatch.status === 'in_progress') ??
    order.dispatches.find((dispatch) => dispatch.status === 'pending');

  if (openDispatch) {
    return openDispatch;
  }

  return order.dispatches[order.dispatches.length - 1] ?? null;
}

export function getDispatchStatusLabel(status: ProductionOrderDispatchDTO['status']): string {
  switch (status) {
    case 'pending':
      return 'Bekliyor';
    case 'in_progress':
      return 'Çalışıyor';
    case 'completed':
      return 'Tamamlandı';
    default:
      return status;
  }
}

export function getOrderStateLabel(order: ProductionOrderListItemDTO): string {
  if (order.status === 'completed') {
    return 'Bitti';
  }

  const currentDispatch = getCurrentDispatch(order);

  if (!currentDispatch) {
    return 'Hazır';
  }

  return `${getProductionUnitLabel(currentDispatch.unitCode, currentDispatch.unitName)} / ${getDispatchStatusLabel(currentDispatch.status)}`;
}

export function buildOrderMetaRows(order: ProductionOrderListItemDTO) {
  return [
    { label: 'İş Emri Tarihi', value: formatDate(order.orderDate) },
    { label: 'İş Emri No', value: String(order.orderNo) },
    { label: 'Müşteri Adı', value: order.customerName },
    { label: 'Sipariş Miktarı', value: String(order.orderQuantity) },
    { label: 'Termin Tarihi', value: formatDate(order.deadlineDate) },
    { label: 'Son Ürün Adı', value: order.finalProductName },
    { label: 'Toplam Ambalaj Miktarı', value: String(order.totalPackagingQuantity) },
    { label: 'Renk', value: order.color },
    { label: 'Kapsül/Tablet/Softjel Kalıbı', value: order.moldText },
    { label: 'Prospektüs', value: order.hasProspectus ? 'Var' : 'Yok' },
    { label: 'İhracat / İç Piyasa', value: MARKET_SCOPE_LABELS[order.marketScope] },
    { label: 'Numune / Müşteri Talebi / Stok', value: DEMAND_SOURCE_LABELS[order.demandSource] },
    { label: 'Ambalaj Türü', value: PACKAGING_TYPE_LABELS[order.packagingType] },
    { label: 'Hammadde Hazırlama', value: getProductionUnitLabel(order.plannedRawUnitCode) },
    { label: 'Önerilen Makine', value: getProductionUnitLabel(order.plannedMachineUnitCode) },
    { label: 'Oluşturan', value: order.createdByUsername }
  ];
}

export function availableDispatchTargets(
  order: ProductionOrderListItemDTO,
  units: ProductionUnitDTO[]
): Array<ProductionUnitDTO & { disabled: boolean }> {
  const usedUnits = new Set(order.dispatches.map((dispatch) => dispatch.unitCode));

  return units.map((unit) => ({
    ...unit,
    disabled: usedUnits.has(unit.code)
  }));
}

export function suggestedDispatchUnit(
  order: ProductionOrderListItemDTO,
  units: ProductionUnitDTO[]
): string | null {
  if (!order.plannedMachineUnitCode) {
    return null;
  }

  const preferred = units.find((unit) => unit.code === order.plannedMachineUnitCode);

  if (preferred && !availableDispatchTargets(order, [preferred])[0]?.disabled) {
    return preferred.code;
  }

  return availableDispatchTargets(order, units).find((unit) => !unit.disabled)?.code ?? null;
}

export function OrderSummaryLine({ order }: { order: ProductionOrderListItemDTO }) {
  const currentDispatch = getCurrentDispatch(order);

  return (
    <div className="grid gap-3 border-b border-slate-200 px-5 py-4 lg:grid-cols-[1.1fr_1.2fr_0.8fr_0.8fr_0.8fr] lg:items-center">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">İş Emri</div>
        <div className="mt-1 text-base font-semibold text-slate-950">#{order.orderNo}</div>
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-950">{order.customerName}</div>
        <div className="mt-1 text-sm text-slate-600">{order.finalProductName}</div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Termin</div>
        <div className="mt-1 text-sm text-slate-700">{formatDate(order.deadlineDate)}</div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Mevcut Birim</div>
        <div className="mt-1 text-sm text-slate-700">
          {currentDispatch ? getProductionUnitLabel(currentDispatch.unitCode, currentDispatch.unitName) : '-'}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <span className="status-chip" data-status={getStatusTone(order.status === 'completed' ? 'finished' : currentDispatch?.status ?? 'pending')}>
          {getOrderStateLabel(order)}
        </span>
      </div>
    </div>
  );
}

export function OrderMetaGrid({ order }: { order: ProductionOrderListItemDTO }) {
  const rows = buildOrderMetaRows(order);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{row.label}</div>
          <div className="mt-1 text-sm text-slate-900">{row.value}</div>
        </div>
      ))}
    </div>
  );
}

export function AttachmentList({ order, canDownload }: { order: ProductionOrderListItemDTO; canDownload: boolean }) {
  if (order.attachments.length === 0) {
    return <div className="text-sm text-slate-500">Ek dosya bulunmuyor.</div>;
  }

  return (
    <div className="space-y-2">
      {order.attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="text-sm font-medium text-slate-900">{attachment.originalFilename}</div>
            <div className="mt-1 text-xs text-slate-500">
              {Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB • {formatDateTime(attachment.createdAt)}
            </div>
          </div>
          {canDownload ? (
            <Link
              href={`/api/production-orders/${order.id}/attachments/${attachment.id}`}
              target="_blank"
              className="text-sm font-medium text-blue-700"
            >
              Dosyayı Aç
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function DispatchHistoryTable({ order }: { order: ProductionOrderListItemDTO }) {
  if (order.dispatches.length === 0) {
    return <div className="text-sm text-slate-500">Sevk kaydı bulunmuyor.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Birim</TableHead>
          <TableHead>Grup</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead>Gönderildi</TableHead>
          <TableHead>Kabul</TableHead>
          <TableHead>Bitiş</TableHead>
          <TableHead>Son Sipariş Miktarı</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {order.dispatches.map((dispatch) => (
          <TableRow key={dispatch.id}>
            <TableCell>{getProductionUnitLabel(dispatch.unitCode, dispatch.unitName)}</TableCell>
            <TableCell>{dispatch.unitGroup}</TableCell>
            <TableCell>
              <span className="status-chip" data-status={getStatusTone(dispatch.status)}>
                {getDispatchStatusLabel(dispatch.status)}
              </span>
            </TableCell>
            <TableCell>{formatDateTime(dispatch.dispatchedAt)}</TableCell>
            <TableCell>{formatDateTime(dispatch.acceptedAt)}</TableCell>
            <TableCell>{formatDateTime(dispatch.completedAt)}</TableCell>
            <TableCell>{dispatch.reportedOutputQuantity ?? '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
