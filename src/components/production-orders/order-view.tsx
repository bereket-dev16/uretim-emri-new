import Link from 'next/link';

import {
  DEMAND_SOURCE_LABELS,
  MARKET_SCOPE_LABELS,
  PACKAGING_TYPE_LABELS,
  PRODUCTION_UNIT_GROUP_LABELS,
  getProductionUnitLabel
} from '@/modules/production-orders/constants';
import type {
  ProductionOrderDispatchDTO,
  ProductionOrderListItemDTO,
  ProductionUnitDTO,
  ProductionUnitGroup
} from '@/shared/types/domain';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const GROUP_ORDER: ProductionUnitGroup[] = ['HAMMADDE', 'MAKINE'];

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

export function getDispatchesForGroup(
  order: ProductionOrderListItemDTO,
  group: ProductionUnitGroup
): ProductionOrderDispatchDTO[] {
  return order.dispatches.filter((dispatch) => dispatch.unitGroup === group);
}

export function getOpenDispatchForGroup(
  order: ProductionOrderListItemDTO,
  group: ProductionUnitGroup
): ProductionOrderDispatchDTO | null {
  const inProgress = order.dispatches.find(
    (dispatch) => dispatch.unitGroup === group && dispatch.status === 'in_progress'
  );

  if (inProgress) {
    return inProgress;
  }

  return (
    order.dispatches.find((dispatch) => dispatch.unitGroup === group && dispatch.status === 'pending') ?? null
  );
}

export function getLastDispatchForGroup(
  order: ProductionOrderListItemDTO,
  group: ProductionUnitGroup
): ProductionOrderDispatchDTO | null {
  const list = getDispatchesForGroup(order, group);
  return list[list.length - 1] ?? null;
}

export function getDisplayDispatchForGroup(
  order: ProductionOrderListItemDTO,
  group: ProductionUnitGroup
): ProductionOrderDispatchDTO | null {
  return getOpenDispatchForGroup(order, group) ?? getLastDispatchForGroup(order, group);
}

export function getCurrentDispatch(order: ProductionOrderListItemDTO): ProductionOrderDispatchDTO | null {
  return (
    order.dispatches.find((dispatch) => dispatch.status === 'in_progress') ??
    order.dispatches.find((dispatch) => dispatch.status === 'pending') ??
    order.dispatches[order.dispatches.length - 1] ??
    null
  );
}

export function hasAnyOpenDispatch(order: ProductionOrderListItemDTO): boolean {
  return order.dispatches.some(
    (dispatch) => dispatch.status === 'pending' || dispatch.status === 'in_progress'
  );
}

export function hasOpenDispatchForGroup(
  order: ProductionOrderListItemDTO,
  group: ProductionUnitGroup
): boolean {
  return getOpenDispatchForGroup(order, group) !== null;
}

export function getOrderStateLabel(order: ProductionOrderListItemDTO): string {
  if (order.status === 'completed') {
    return 'Bitti';
  }

  const summary = getVisibleGroups(order).map((group) => {
    const dispatch = getDisplayDispatchForGroup(order, group);
    const label = dispatch ? getDispatchStatusLabel(dispatch.status) : 'Hazır';
    return `${PRODUCTION_UNIT_GROUP_LABELS[group]}: ${label}`;
  });

  return summary.join(' • ');
}

export function hasGroupActivity(
  order: ProductionOrderListItemDTO,
  group: ProductionUnitGroup
): boolean {
  if (group === 'HAMMADDE') {
    return true;
  }

  return Boolean(order.plannedMachineUnitCode) || getDispatchesForGroup(order, group).length > 0;
}

export function getVisibleGroups(order: ProductionOrderListItemDTO): ProductionUnitGroup[] {
  return GROUP_ORDER.filter((group) => hasGroupActivity(order, group));
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
  units: ProductionUnitDTO[],
  group: ProductionUnitGroup
): Array<ProductionUnitDTO & { disabled: boolean }> {
  const usedUnits = new Set(order.dispatches.map((dispatch) => dispatch.unitCode));

  return units
    .filter((unit) => unit.unitGroup === group)
    .map((unit) => ({
      ...unit,
      disabled: usedUnits.has(unit.code)
    }));
}

export function suggestedDispatchUnit(
  order: ProductionOrderListItemDTO,
  units: ProductionUnitDTO[],
  group: ProductionUnitGroup
): string | null {
  const targets = availableDispatchTargets(order, units, group);
  const preferredCode = group === 'HAMMADDE' ? order.plannedRawUnitCode : order.plannedMachineUnitCode;

  if (!preferredCode) {
    return null;
  }

  const preferred = targets.find((unit) => unit.code === preferredCode);

  if (preferred && !preferred.disabled) {
    return preferred.code;
  }

  return null;
}

export function OrderSummaryLine({ order }: { order: ProductionOrderListItemDTO }) {
  const visibleGroups = getVisibleGroups(order);
  const gridColumns =
    visibleGroups.length === 1
      ? 'lg:grid-cols-[0.8fr_1.1fr_0.7fr_0.95fr]'
      : 'lg:grid-cols-[0.8fr_1.1fr_0.7fr_0.95fr_0.95fr]';

  return (
    <div className={`grid gap-3 border-b border-slate-200 px-5 py-4 ${gridColumns} lg:items-start`}>
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
      {visibleGroups.map((group) => {
        const dispatch = getDisplayDispatchForGroup(order, group);

        return (
          <div key={group} className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
              {PRODUCTION_UNIT_GROUP_LABELS[group]}
            </div>
            <div className="text-sm text-slate-700">
              {dispatch ? getProductionUnitLabel(dispatch.unitCode, dispatch.unitName) : '-'}
            </div>
            <span
              className="status-chip"
              data-status={getStatusTone(order.status === 'completed' && !dispatch ? 'finished' : dispatch?.status ?? 'finished')}
            >
              {order.status === 'completed' && !dispatch ? 'Bitti' : dispatch ? getDispatchStatusLabel(dispatch.status) : 'Hazır'}
            </span>
          </div>
        );
      })}
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

export function OrderNotePanel({ order }: { order: ProductionOrderListItemDTO }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Operasyon Notu</div>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
        {order.noteText?.trim() ? order.noteText : 'Not girilmedi.'}
      </div>
    </div>
  );
}

export function DispatchGroupOverview({ order }: { order: ProductionOrderListItemDTO }) {
  const visibleGroups = getVisibleGroups(order);

  return (
    <div className={`grid gap-3 ${visibleGroups.length > 1 ? 'lg:grid-cols-2' : ''}`}>
      {visibleGroups.map((group) => {
        const openDispatch = getOpenDispatchForGroup(order, group);
        const lastDispatch = getLastDispatchForGroup(order, group);
        const displayDispatch = openDispatch ?? lastDispatch;

        return (
          <div key={group} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">{PRODUCTION_UNIT_GROUP_LABELS[group]}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {displayDispatch
                    ? getProductionUnitLabel(displayDispatch.unitCode, displayDispatch.unitName)
                    : 'Henüz bu grup için işlem başlatılmadı.'}
                </div>
              </div>
              <span
                className="status-chip"
                data-status={getStatusTone(displayDispatch?.status ?? (order.status === 'completed' ? 'finished' : 'pending'))}
              >
                {displayDispatch
                  ? getDispatchStatusLabel(displayDispatch.status)
                  : order.status === 'completed'
                    ? 'Bitti'
                    : 'Hazır'}
              </span>
            </div>
            {displayDispatch ? (
              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <span className="font-medium text-slate-700">Gönderim:</span> {formatDateTime(displayDispatch.dispatchedAt)}
                </div>
                <div>
                  <span className="font-medium text-slate-700">Bitiş:</span> {formatDateTime(displayDispatch.completedAt)}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function AttachmentListFallback({ order }: { order: ProductionOrderListItemDTO }) {
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
              {Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB • {attachment.mimeType} • {formatDateTime(attachment.createdAt)}
            </div>
          </div>
          <Link
            href={`/api/production-orders/${order.id}/attachments/${attachment.id}?download=1`}
            className="text-sm font-medium text-blue-700"
          >
            İndir
          </Link>
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
            <TableCell>{PRODUCTION_UNIT_GROUP_LABELS[dispatch.unitGroup]}</TableCell>
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
