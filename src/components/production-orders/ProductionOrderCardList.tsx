'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import {
  availableDispatchTargets,
  DetailSection,
  DispatchGroupOverview,
  DispatchHistoryTable,
  formatDate,
  getGroupDispatchSummary,
  getOrderStateLabel,
  getOrderRowTone,
  getRowToneClasses,
  getVisibleGroups,
  hasAnyOpenDispatch,
  OrderMetaGrid,
  OrderNotePanel
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ProductionOrderListItemDTO, ProductionUnitDTO } from '@/shared/types/domain';
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
  unitCodes: string[];
}

const EMPTY_PRODUCTION_UNITS: ProductionUnitDTO[] = [];

function selectionKey(orderId: string): string {
  return orderId;
}

function normalizeDispatchSelections(value?: string[]): string[] {
  return value && value.length > 0 ? value : [''];
}

function areSelectionsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function getSelectedUnitCodes(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
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
  const [dispatchSelections, setDispatchSelections] = useState<Record<string, string[]>>({});
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState<DispatchDialogTarget | null>(null);
  const [finishTarget, setFinishTarget] = useState<ProductionOrderListItemDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductionOrderListItemDTO | null>(null);
  const [deleteOrderNoInput, setDeleteOrderNoInput] = useState('');
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

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
        const key = selectionKey(order.id);
        const nextValue = normalizeDispatchSelections(current[key]);

        if (!areSelectionsEqual(next[key] ?? [], nextValue)) {
          next[key] = nextValue;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [initialItems, scope]);

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

    const unitCodes = getSelectedUnitCodes(dispatchTarget.unitCodes);

    if (unitCodes.length === 0) {
      setErrorMessage('Gönderilecek en az bir birim seçin.');
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
        body: JSON.stringify({ unitCodes })
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Sevk işlemi yapılamadı.');
        return;
      }

      setItems((current) =>
        current.map((item) => (item.id === dispatchTarget.order.id ? (payload.item as ProductionOrderListItemDTO) : item))
      );
      setDispatchSelections((current) => ({
        ...current,
        [selectionKey(dispatchTarget.order.id)]: ['']
      }));
      setStatusMessage(
        `Emir şu birimlere gönderildi: ${unitCodes
          .map((unitCode) => {
            const targetUnit = productionUnits.find((unit) => unit.code === unitCode);
            return targetUnit
              ? `${getProductionUnitLabel(unitCode, targetUnit.name)} (${PRODUCTION_UNIT_GROUP_LABELS[targetUnit.unitGroup]})`
              : getProductionUnitLabel(unitCode);
          })
          .join(', ')}.`
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

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setBusyOrderId(deleteTarget.id);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/production-orders/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderNo: Number(deleteOrderNoInput),
          confirmationText: deleteConfirmationText
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Emir silinemedi.');
        return;
      }

      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      setStatusMessage(
        `Emir #${deleteTarget.orderNo} kalıcı olarak silindi ve ilgili birim ekranlarından kaldırıldı.`
      );
      setDeleteTarget(null);
      setDeleteOrderNoInput('');
      setDeleteConfirmationText('');
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
            const dispatchTargets = availableDispatchTargets(order, productionUnits);
            const selectionValues = normalizeDispatchSelections(dispatchSelections[selectionKey(order.id)]);
            const selectedUnitCodes = getSelectedUnitCodes(selectionValues);
            const unusedTargets = dispatchTargets.filter((unit) => !unit.disabled);
            const canAddSelection = !orderHasOpenDispatch && selectionValues.length < unusedTargets.length;
            const rawSummary = getGroupDispatchSummary(order, 'HAMMADDE');
            const machineSummary = visibleGroups.includes('MAKINE')
              ? getGroupDispatchSummary(order, 'MAKINE')
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
                      <div>{rawSummary.unitLabel}</div>
                      <span className="status-chip" data-status={rawSummary.statusTone}>
                        {rawSummary.statusLabel}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {machineSummary ? (
                      <div className="space-y-1">
                        <div>{machineSummary.unitLabel}</div>
                        <span className="status-chip" data-status={machineSummary.statusTone}>
                          {machineSummary.statusLabel}
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
                              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">
                                  Gönderilecek Birimler
                                </div>
                                <div className="mt-1 text-sm text-slate-600">
                                  {orderHasOpenDispatch
                                    ? 'Açık görevler tamamlanmadan yeni sevk açılamaz.'
                                    : 'Sıradaki sevk için bir veya daha fazla birim seçin. Daha önce kullanılan birimler pasif görünür.'}
                                </div>
                              </div>

                              <div className="space-y-2">
                                {selectionValues.map((selectedCode, rowIndex) => {
                                  const selectedInOtherRows = new Set(
                                    selectionValues.filter((value, index) => index !== rowIndex && value)
                                  );

                                  return (
                                    <div
                                      key={`${order.id}:${rowIndex}`}
                                      className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]"
                                    >
                                      <Select
                                        value={selectedCode || undefined}
                                        onValueChange={(value) =>
                                          setDispatchSelections((current) => {
                                            const next = [...normalizeDispatchSelections(current[selectionKey(order.id)])];
                                            next[rowIndex] = value;

                                            return {
                                              ...current,
                                              [selectionKey(order.id)]: next
                                            };
                                          })
                                        }
                                        disabled={orderHasOpenDispatch || unusedTargets.length === 0}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Birim seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {dispatchTargets.map((unit) => {
                                            const disabledBecauseSelectedElsewhere = selectedInOtherRows.has(unit.code);

                                            return (
                                              <SelectItem
                                                key={unit.code}
                                                value={unit.code}
                                                disabled={unit.disabled || disabledBecauseSelectedElsewhere}
                                              >
                                                {unit.name} ({PRODUCTION_UNIT_GROUP_LABELS[unit.unitGroup]}){' '}
                                                {unit.disabledBecauseUsed
                                                  ? '(kullanıldı)'
                                                  : disabledBecauseSelectedElsewhere
                                                    ? '(seçildi)'
                                                    : ''}
                                              </SelectItem>
                                            );
                                          })}
                                        </SelectContent>
                                      </Select>

                                      {selectionValues.length > 1 ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setDispatchSelections((current) => {
                                              const next = normalizeDispatchSelections(current[selectionKey(order.id)]).filter(
                                                (_, index) => index !== rowIndex
                                              );

                                              return {
                                                ...current,
                                                [selectionKey(order.id)]: next.length > 0 ? next : ['']
                                              };
                                            })
                                          }
                                          disabled={orderHasOpenDispatch}
                                        >
                                          Sil
                                        </Button>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>

                              {unusedTargets.length === 0 ? (
                                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                  Bu emir kullanılabilir tüm birimlere daha önce gönderildi.
                                </div>
                              ) : null}

                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setDispatchSelections((current) => ({
                                      ...current,
                                      [selectionKey(order.id)]: [
                                        ...normalizeDispatchSelections(current[selectionKey(order.id)]),
                                        ''
                                      ]
                                    }))
                                  }
                                  disabled={!canAddSelection}
                                >
                                  Birim Ekle
                                </Button>

                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setDispatchTarget({ order, unitCodes: selectedUnitCodes })}
                                    disabled={orderHasOpenDispatch || selectedUnitCodes.length === 0}
                                  >
                                    Gönder
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFinishTarget(order)}
                                    disabled={orderHasOpenDispatch}
                                  >
                                    Emri Bitir
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setDeleteTarget(order);
                                      setDeleteOrderNoInput('');
                                      setDeleteConfirmationText('');
                                    }}
                                  >
                                    Emri Sil
                                  </Button>
                                </div>
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
                ? `#${dispatchTarget.order.orderNo} numaralı emir şu birimlere gönderilecek: ${dispatchTarget.unitCodes
                    .map((unitCode) => {
                      const unit = productionUnits.find((item) => item.code === unitCode);
                      return unit
                        ? `${getProductionUnitLabel(unit.code, unit.name)} (${PRODUCTION_UNIT_GROUP_LABELS[unit.unitGroup]})`
                        : getProductionUnitLabel(unitCode);
                    })
                    .join(', ')}.`
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

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteOrderNoInput('');
            setDeleteConfirmationText('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emri Kalıcı Sil</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `#${deleteTarget.orderNo} numaralı emir veritabanından kalıcı olarak silinecek ve gönderildiği tüm birim ekranlarından düşecek. Onay için iş emri numarasını ve SIL metnini girin.`
                : 'Seçilen emir kalıcı olarak silinecek.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">
                İş Emri Numarası
              </label>
              <Input
                inputMode="numeric"
                placeholder={deleteTarget ? String(deleteTarget.orderNo) : 'İş emri no'}
                value={deleteOrderNoInput}
                onChange={(event) => setDeleteOrderNoInput(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">
                Onay Metni
              </label>
              <Input
                placeholder="SIL"
                value={deleteConfirmationText}
                onChange={(event) => setDeleteConfirmationText(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteOrderNoInput('');
                setDeleteConfirmationText('');
              }}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={
                busyOrderId === deleteTarget?.id ||
                !deleteTarget ||
                deleteOrderNoInput.trim() !== String(deleteTarget.orderNo) ||
                deleteConfirmationText.trim().toUpperCase() !== 'SIL'
              }
            >
              Kalıcı Olarak Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
