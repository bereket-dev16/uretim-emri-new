'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import {
  availableDispatchTargets,
  DetailSection,
  DispatchGroupOverview,
  DispatchHistoryTable,
  formatDate,
  getDisplayDispatchForGroup,
  getOrderStateLabel,
  getOrderRowTone,
  getRowToneClasses,
  getVisibleGroups,
  hasAnyOpenDispatch,
  hasOpenDispatchForGroup,
  OrderMetaGrid,
  OrderNotePanel,
  suggestedDispatchUnit
} from './order-view';
import { AttachmentList } from './AttachmentList';
import {
  PRODUCTION_ORDERS_POLL_INTERVAL_MS,
  PRODUCTION_ORDERS_POLL_JITTER_MS
} from '@/shared/config/client-polling';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type {
  ProductionOrderListItemDTO,
  ProductionUnitDTO,
  ProductionUnitGroup
} from '@/shared/types/domain';
import { PRODUCTION_UNIT_GROUP_LABELS, getProductionUnitLabel } from '@/modules/production-orders/constants';

interface ProductionOrderCardListProps {
  initialItems: ProductionOrderListItemDTO[];
  scope: 'active' | 'completed';
  page: number;
  pageSize: number;
  productionUnits?: ProductionUnitDTO[];
}

interface DispatchDialogTarget {
  order: ProductionOrderListItemDTO;
  group: ProductionUnitGroup;
}

const EMPTY_PRODUCTION_UNITS: ProductionUnitDTO[] = [];
function selectionKey(orderId: string, group: ProductionUnitGroup): string {
  return `${orderId}:${group}`;
}

export function ProductionOrderCardList({
  initialItems,
  scope,
  page,
  pageSize,
  productionUnits = EMPTY_PRODUCTION_UNITS
}: ProductionOrderCardListProps) {
  const [items, setItems] = useState(initialItems);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dispatchSelections, setDispatchSelections] = useState<Record<string, string>>({});
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState<DispatchDialogTarget | null>(null);
  const [finishTarget, setFinishTarget] = useState<ProductionOrderListItemDTO | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (scope === 'completed') {
      return;
    }

    setDispatchSelections((current) => {
      const next = { ...current };
      let changed = false;

      for (const order of initialItems) {
        for (const group of getVisibleGroups(order)) {
          const key = selectionKey(order.id, group);
          const nextValue = current[key] ?? suggestedDispatchUnit(order, productionUnits, group) ?? '';

          if (next[key] !== nextValue) {
            next[key] = nextValue;
            changed = true;
          }
        }
      }

      return changed ? next : current;
    });
  }, [initialItems, productionUnits, scope]);

  useEffect(() => {
    if (scope === 'completed') {
      return;
    }

    let disposed = false;
    let inFlight = false;
    const intervalMs =
      PRODUCTION_ORDERS_POLL_INTERVAL_MS +
      Math.floor(Math.random() * (PRODUCTION_ORDERS_POLL_JITTER_MS + 1));

    async function sync() {
      if (disposed || inFlight || busyOrderId || document.visibilityState === 'hidden') {
        return;
      }

      inFlight = true;

      try {
        const response = await fetch(
          `/api/production-orders?scope=${scope}&page=${page}&pageSize=${pageSize}`,
          {
            credentials: 'same-origin',
            cache: 'no-store'
          }
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload || !Array.isArray(payload.items)) {
          return;
        }

        setItems(payload.items as ProductionOrderListItemDTO[]);
      } catch {
        // Polling hatalari UI'yi kilitlememeli.
      } finally {
        inFlight = false;
      }
    }

    const timer = window.setInterval(() => {
      void sync();
    }, intervalMs);

    void sync();

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        void sync();
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [busyOrderId, page, pageSize, scope]);

  const sortedItems = useMemo(
    () => [...items].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [items]
  );

  async function handleDispatch() {
    if (!dispatchTarget) {
      return;
    }

    const unitCode = dispatchSelections[selectionKey(dispatchTarget.order.id, dispatchTarget.group)];

    if (!unitCode) {
      setErrorMessage('Gönderilecek birim seçin.');
      return;
    }

    setBusyOrderId(dispatchTarget.order.id);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/production-orders/${dispatchTarget.order.id}/dispatch`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ unitCode })
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Sevk işlemi yapılamadı.');
        return;
      }

      setItems((current) =>
        current.map((item) => (item.id === dispatchTarget.order.id ? (payload.item as ProductionOrderListItemDTO) : item))
      );
      setStatusMessage(
        `${PRODUCTION_UNIT_GROUP_LABELS[dispatchTarget.group]} grubu için emir ${getProductionUnitLabel(unitCode)} birimine gönderildi.`
      );
      setDispatchTarget(null);
    } catch {
      setErrorMessage('Sunucuya erişilemedi.');
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleFinish() {
    if (!finishTarget) {
      return;
    }

    setBusyOrderId(finishTarget.id);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/production-orders/${finishTarget.id}/finish`, {
        method: 'POST',
        credentials: 'same-origin'
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Emir bitirilemedi.');
        return;
      }

      setItems((current) =>
        scope === 'active'
          ? current.filter((item) => item.id !== finishTarget.id)
          : current.map((item) => (item.id === finishTarget.id ? (payload.item as ProductionOrderListItemDTO) : item))
      );
      setStatusMessage(`Emir #${finishTarget.orderNo} tamamlandı olarak kapatıldı.`);
      setFinishTarget(null);
    } catch {
      setErrorMessage('Sunucuya erişilemedi.');
    } finally {
      setBusyOrderId(null);
    }
  }

  if (sortedItems.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
        Bu listede gösterilecek üretim emri bulunmuyor.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statusMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {statusMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>İş Emri</TableHead>
            <TableHead>Müşteri</TableHead>
            <TableHead>Son Ürün</TableHead>
            <TableHead>Termin</TableHead>
            <TableHead>Hammadde</TableHead>
            <TableHead>Makine</TableHead>
            <TableHead>Genel</TableHead>
            <TableHead className="text-right">Aksiyon</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.map((order) => {
            const isExpanded = expandedId === order.id;
            const orderHasOpenDispatch = hasAnyOpenDispatch(order);
            const visibleGroups = getVisibleGroups(order);
            const toneClasses = getRowToneClasses(getOrderRowTone(order));
            const rawDispatch = getDisplayDispatchForGroup(order, 'HAMMADDE');
            const machineDispatch = visibleGroups.includes('MAKINE')
              ? getDisplayDispatchForGroup(order, 'MAKINE')
              : null;

            return (
              <Fragment key={order.id}>
                <TableRow className={toneClasses.summaryRow}>
                  <TableCell className={`${toneClasses.stripeCell} font-medium text-slate-900`}>#{order.orderNo}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.finalProductName}</TableCell>
                  <TableCell>{formatDate(order.deadlineDate)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div>{rawDispatch ? getProductionUnitLabel(rawDispatch.unitCode, rawDispatch.unitName) : '-'}</div>
                      <span className="status-chip" data-status={rawDispatch?.status ?? 'finished'}>
                        {rawDispatch ? rawDispatch.status === 'in_progress' ? 'Çalışıyor' : rawDispatch.status === 'completed' ? 'Tamamlandı' : 'Bekliyor' : '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {machineDispatch ? (
                      <div className="space-y-1">
                        <div>{getProductionUnitLabel(machineDispatch.unitCode, machineDispatch.unitName)}</div>
                        <span className="status-chip" data-status={machineDispatch.status}>
                          {machineDispatch.status === 'in_progress' ? 'Çalışıyor' : machineDispatch.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                        </span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{getOrderStateLabel(order)}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {isExpanded ? 'Kapat' : 'Detay'}
                    </Button>
                  </TableCell>
                </TableRow>

                {isExpanded ? (
                  <TableRow>
                    <TableCell colSpan={8} className={`${toneClasses.detailCell} px-3 py-3`}>
                      <div className={`space-y-3 ${toneClasses.detailPanel}`}>
                        <DetailSection title="Form Bilgileri">
                          <OrderMetaGrid order={order} />
                        </DetailSection>

                        <DetailSection title="Operasyon Notu">
                          <OrderNotePanel order={order} showLabel={false} />
                        </DetailSection>

                        <DetailSection title="Mevcut Süreç">
                          <DispatchGroupOverview order={order} />
                        </DetailSection>

                        <DetailSection title="Ek Dosyalar">
                          <AttachmentList order={order} canDownload />
                        </DetailSection>

                        <DetailSection title="Sevk Geçmişi">
                          <DispatchHistoryTable order={order} />
                        </DetailSection>

                        {scope === 'active' ? (
                          <DetailSection title="Yönetim İşlemleri">
                            <div className="space-y-3">
                            <div className="space-y-2">
                              {visibleGroups.map((group) => {
                                const groupTargets = availableDispatchTargets(order, productionUnits, group);
                                const groupHasOpenDispatch = hasOpenDispatchForGroup(order, group);
                                const key = selectionKey(order.id, group);
                                const currentDispatch = getDisplayDispatchForGroup(order, group);

                                return (
                                  <div
                                    key={group}
                                    className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 lg:grid-cols-[150px_minmax(0,1fr)_220px_auto] lg:items-center"
                                  >
                                    <div>
                                      <div className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">
                                        {PRODUCTION_UNIT_GROUP_LABELS[group]}
                                      </div>
                                      <div className="mt-1 text-sm text-slate-900">
                                        {currentDispatch
                                          ? getProductionUnitLabel(currentDispatch.unitCode, currentDispatch.unitName)
                                          : 'Henüz işlem yok'}
                                      </div>
                                    </div>
                                    <div className="text-sm text-slate-600">
                                      {groupHasOpenDispatch
                                        ? 'Bu grupta açık görev var, yeni sevk açılamaz.'
                                        : 'Bu grup boşta. İsterseniz sonraki birime gönderin.'}
                                    </div>
                                    <Select
                                      value={dispatchSelections[key] ?? ''}
                                      onValueChange={(value) =>
                                        setDispatchSelections((current) => ({
                                          ...current,
                                          [key]: value
                                        }))
                                      }
                                      disabled={groupHasOpenDispatch}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Birim seçin" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {groupTargets.map((unit) => (
                                          <SelectItem key={unit.code} value={unit.code} disabled={unit.disabled}>
                                            {unit.name} {unit.disabled ? '(kullanıldı)' : ''}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => setDispatchTarget({ order, group })}
                                      disabled={groupHasOpenDispatch || !dispatchSelections[key]}
                                    >
                                      Gönder
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-end">
                              <Button type="button" variant="outline" size="sm" onClick={() => setFinishTarget(order)} disabled={orderHasOpenDispatch}>
                                Emri Bitir
                              </Button>
                            </div>
                            </div>
                          </DetailSection>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={Boolean(dispatchTarget)} onOpenChange={(open) => (!open ? setDispatchTarget(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emri Gönder</DialogTitle>
            <DialogDescription>
              {dispatchTarget
                ? `#${dispatchTarget.order.orderNo} numaralı emir ${PRODUCTION_UNIT_GROUP_LABELS[dispatchTarget.group]} grubu için seçilen birime gönderilecek.`
                : 'Seçilen emir gönderilecek.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDispatchTarget(null)}>
              Vazgeç
            </Button>
            <Button type="button" onClick={() => void handleDispatch()} disabled={busyOrderId === dispatchTarget?.order.id}>
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(finishTarget)} onOpenChange={(open) => (!open ? setFinishTarget(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emri Bitir</DialogTitle>
            <DialogDescription>
              {finishTarget
                ? `#${finishTarget.orderNo} numaralı emir tamamlandı olarak kapatılacak.`
                : 'Seçilen emir tamamlanacak.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFinishTarget(null)}>
              Vazgeç
            </Button>
            <Button type="button" onClick={() => void handleFinish()} disabled={busyOrderId === finishTarget?.id}>
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
