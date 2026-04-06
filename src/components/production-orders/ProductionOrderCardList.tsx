'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import {
  availableDispatchTargets,
  DispatchGroupOverview,
  DispatchHistoryTable,
  formatDate,
  getVisibleGroups,
  hasAnyOpenDispatch,
  hasOpenDispatchForGroup,
  OrderMetaGrid,
  OrderNotePanel,
  OrderSummaryLine,
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
      <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
        Bu listede gösterilecek üretim emri bulunmuyor.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statusMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {statusMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {sortedItems.map((order) => {
        const isExpanded = expandedId === order.id;
        const orderHasOpenDispatch = hasAnyOpenDispatch(order);
        const visibleGroups = getVisibleGroups(order);

        return (
          <div key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <OrderSummaryLine order={order} />

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="text-sm text-slate-600">
                {scope === 'active'
                  ? orderHasOpenDispatch
                    ? 'Hammadde ve makine süreçlerini grup bazlı izleyin, yalnız boşta olan gruba yeni sevk açın.'
                    : 'İki grupta da açık görev yok. Yeni adım göndermeye veya emri bitirmeye hazır.'
                  : `Tamamlanma tarihi: ${formatDate(order.updatedAt)}`}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {isExpanded ? 'Detayı Gizle' : 'Detaylı Göster'}
                </Button>
              </div>
            </div>

            {isExpanded ? (
              <div className="space-y-6 border-t border-slate-200 px-5 py-5">
                <section className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-950">Form Bilgileri</h3>
                  <OrderMetaGrid order={order} />
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-950">Operasyon Notu</h3>
                  <OrderNotePanel order={order} />
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-950">Mevcut Süreç</h3>
                  <DispatchGroupOverview order={order} />
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-950">Ek Dosyalar</h3>
                  <AttachmentList order={order} canDownload />
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-950">Sevk Geçmişi</h3>
                  <DispatchHistoryTable order={order} />
                </section>

                {scope === 'active' ? (
                  <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-slate-950">Yönetim İşlemleri</h3>
                      <p className="text-sm text-slate-600">
                        Her grup aynı anda en fazla bir açık görev taşıyabilir. Bir grup boşta ise o grup için yeni sevk açabilir, iki grup da boşta ise emri bitirebilirsiniz.
                      </p>
                    </div>

                    <div className={`grid gap-4 ${visibleGroups.length > 1 ? 'xl:grid-cols-2' : ''}`}>
                      {visibleGroups.map((group) => {
                        const groupTargets = availableDispatchTargets(order, productionUnits, group);
                        const groupHasOpenDispatch = hasOpenDispatchForGroup(order, group);
                        const key = selectionKey(order.id, group);

                        return (
                          <div key={group} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                            <div>
                              <div className="text-sm font-semibold text-slate-950">
                                {PRODUCTION_UNIT_GROUP_LABELS[group]} grubu
                              </div>
                              <div className="mt-1 text-sm text-slate-600">
                                {groupHasOpenDispatch
                                  ? 'Bu grupta açık görev var. Yeni sevk açılamaz.'
                                  : 'Bu grupta yeni sevk açabilirsiniz.'}
                              </div>
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
                      <Button type="button" variant="outline" onClick={() => setFinishTarget(order)} disabled={orderHasOpenDispatch}>
                        Emri Bitir
                      </Button>
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

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
