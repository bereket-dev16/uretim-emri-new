'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import type { ProductionOrderListItemDTO } from '@/shared/types/domain';
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
import {
  DetailSection,
  DispatchGroupOverview,
  DispatchHistoryTable,
  getRowToneClasses,
  OrderMetaGrid,
  OrderNotePanel,
} from './order-view';
import { AttachmentList } from './AttachmentList';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ProductionUnitTasksPanelProps {
  initialItems: ProductionOrderListItemDTO[];
  page: number;
  pageSize: number;
  actorUnitCode: string | null;
  canViewAttachments: boolean;
  canDownloadAttachments: boolean;
}

export function ProductionUnitTasksPanel({
  initialItems,
  page,
  pageSize,
  actorUnitCode,
  canViewAttachments,
  canDownloadAttachments
}: ProductionUnitTasksPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<ProductionOrderListItemDTO | null>(null);
  const [reportedOutputQuantity, setReportedOutputQuantity] = useState('');
  const [boxCount, setBoxCount] = useState('');
  const [cartonCount, setCartonCount] = useState('');
  const [palletCount, setPalletCount] = useState('');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
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
        const response = await fetch(`/api/production-orders?scope=unit&page=${page}&pageSize=${pageSize}`, {
          credentials: 'same-origin',
          cache: 'no-store'
        });
        const payload = await response.json();

        if (!response.ok || !Array.isArray(payload.items)) {
          return;
        }

        setItems(payload.items as ProductionOrderListItemDTO[]);
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
  }, [busyOrderId, page, pageSize]);

  const rows = useMemo(
    () => [...items].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [items]
  );

  const completeTargetDispatch =
    completeTarget?.dispatches.find(
      (dispatch) => dispatch.status === 'in_progress' && dispatch.unitCode === actorUnitCode
    ) ?? null;
  const requiresBoxAndCarton =
    completeTargetDispatch?.unitCode === 'PAKET' || completeTargetDispatch?.unitCode === 'DEPO';
  const requiresPallet = completeTargetDispatch?.unitCode === 'DEPO';

  function resetCompleteForm() {
    setCompleteTarget(null);
    setReportedOutputQuantity('');
    setBoxCount('');
    setCartonCount('');
    setPalletCount('');
  }

  function openCompleteDialog(order: ProductionOrderListItemDTO) {
    setReportedOutputQuantity('');
    setBoxCount('');
    setCartonCount('');
    setPalletCount('');
    setCompleteTarget(order);
  }

  async function handleComplete() {
    if (!completeTarget) {
      return;
    }

    const activeDispatch = completeTarget.dispatches.find(
      (dispatch) => dispatch.status === 'in_progress' && dispatch.unitCode === actorUnitCode
    );

    if (!activeDispatch) {
      setErrorMessage('Çalışan görev bulunamadı.');
      return;
    }

    if (!reportedOutputQuantity.trim()) {
      setErrorMessage('Son sipariş miktarı zorunludur.');
      return;
    }

    if (requiresBoxAndCarton && (!boxCount.trim() || !cartonCount.trim())) {
      setErrorMessage('Kutu sayısı ve koli sayısı zorunludur.');
      return;
    }

    if (requiresPallet && !palletCount.trim()) {
      setErrorMessage('Palet sayısı zorunludur.');
      return;
    }

    setBusyOrderId(completeTarget.id);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const body = {
        reportedOutputQuantity: Number(reportedOutputQuantity),
        ...(requiresBoxAndCarton
          ? {
              boxCount: Number(boxCount),
              cartonCount: Number(cartonCount)
            }
          : {}),
        ...(requiresPallet ? { palletCount: Number(palletCount) } : {})
      };

      const response = await fetch(`/api/production-orders/dispatches/${activeDispatch.id}/complete`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Görev tamamlanamadı.');
        return;
      }

      setItems((current) => current.filter((item) => item.id !== completeTarget.id));
      setStatusMessage(`Emir #${completeTarget.orderNo} tamamlandı olarak iletildi.`);
      resetCompleteForm();
    } catch {
      setErrorMessage('Sunucuya erişilemedi.');
    } finally {
      setBusyOrderId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
        Çalışan görev bulunmuyor.
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
            <TableHead>Durum</TableHead>
            <TableHead className="text-right">Aksiyon</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((order) => {
            const isExpanded = expandedId === order.id;
            const toneClasses = getRowToneClasses('in_progress');

            return (
              <Fragment key={order.id}>
                <TableRow className={toneClasses.summaryRow}>
                  <TableCell className="font-medium text-slate-900">#{order.orderNo}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.finalProductName}</TableCell>
                  <TableCell>{new Date(order.deadlineDate).toLocaleDateString('tr-TR')}</TableCell>
                  <TableCell>
                    <span className="status-chip" data-status="in_progress">
                      Çalışıyor
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {isExpanded ? 'Kapat' : 'Detay'}
                      </Button>
                      <Button type="button" size="sm" onClick={() => openCompleteDialog(order)}>
                        Bitir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {isExpanded ? (
                  <TableRow>
                    <TableCell colSpan={6} className={`${toneClasses.detailCell} px-3 py-3`}>
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
                        <DetailSection title="Sevk Geçmişi">
                          <DispatchHistoryTable order={order} />
                        </DetailSection>
                        {canViewAttachments ? (
                          <DetailSection title="Ek Dosyalar">
                            <AttachmentList order={order} canDownload={canDownloadAttachments} />
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

      <Dialog open={Boolean(completeTarget)} onOpenChange={(open) => (!open ? resetCompleteForm() : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi Bitir</DialogTitle>
            <DialogDescription>
              {completeTarget
                ? `#${completeTarget.orderNo} numaralı emir tamamlandı olarak iletilecek.`
                : 'Seçili görev tamamlanacak.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="reportedOutputQuantity">
              Son Sipariş Miktarı
              <Input
                id="reportedOutputQuantity"
                className="mt-1"
                inputMode="numeric"
                value={reportedOutputQuantity}
                onChange={(event) => setReportedOutputQuantity(event.target.value.replace(/\D/g, ''))}
              />
            </label>

            {requiresBoxAndCarton ? (
              <>
                <label className="text-sm font-medium text-slate-700" htmlFor="boxCount">
                  Kutu Sayısı
                  <Input
                    id="boxCount"
                    className="mt-1"
                    inputMode="numeric"
                    value={boxCount}
                    onChange={(event) => setBoxCount(event.target.value.replace(/\D/g, ''))}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700" htmlFor="cartonCount">
                  Koli Sayısı
                  <Input
                    id="cartonCount"
                    className="mt-1"
                    inputMode="numeric"
                    value={cartonCount}
                    onChange={(event) => setCartonCount(event.target.value.replace(/\D/g, ''))}
                  />
                </label>
              </>
            ) : null}

            {requiresPallet ? (
              <label className="text-sm font-medium text-slate-700" htmlFor="palletCount">
                Palet Sayısı
                <Input
                  id="palletCount"
                  className="mt-1"
                  inputMode="numeric"
                  value={palletCount}
                  onChange={(event) => setPalletCount(event.target.value.replace(/\D/g, ''))}
                />
              </label>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetCompleteForm}>
              Vazgeç
            </Button>
            <Button type="button" onClick={() => void handleComplete()} disabled={busyOrderId === completeTarget?.id}>
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
