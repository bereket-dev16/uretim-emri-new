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

interface ProductionUnitIncomingPanelProps {
  initialItems: ProductionOrderListItemDTO[];
  page: number;
  pageSize: number;
  actorUnitCode: string | null;
  canViewAttachments: boolean;
  canDownloadAttachments: boolean;
}

export function ProductionUnitIncomingPanel({
  initialItems,
  page,
  pageSize,
  actorUnitCode,
  canViewAttachments,
  canDownloadAttachments
}: ProductionUnitIncomingPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<ProductionOrderListItemDTO | null>(null);
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
        const response = await fetch(`/api/production-orders?scope=incoming&page=${page}&pageSize=${pageSize}`, {
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
    () => [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [items]
  );

  async function handleAccept() {
    if (!acceptTarget) {
      return;
    }

    const pendingDispatch = acceptTarget.dispatches.find(
      (dispatch) => dispatch.status === 'pending' && dispatch.unitCode === actorUnitCode
    );

    if (!pendingDispatch) {
      setErrorMessage('Bekleyen sevk kaydı bulunamadı.');
      return;
    }

    setBusyOrderId(acceptTarget.id);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/production-orders/dispatches/${pendingDispatch.id}/accept`, {
        method: 'POST',
        credentials: 'same-origin'
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Görev kabul edilemedi.');
        return;
      }

      setItems((current) => current.filter((item) => item.id !== acceptTarget.id));
      setStatusMessage(`Emir #${acceptTarget.orderNo} kabul edildi.`);
      setAcceptTarget(null);
    } catch {
      setErrorMessage('Sunucuya erişilemedi.');
    } finally {
      setBusyOrderId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
        Bekleyen emir bulunmuyor.
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
            const toneClasses = getRowToneClasses('pending');

            return (
              <Fragment key={order.id}>
                <TableRow className={toneClasses.summaryRow}>
                  <TableCell className="font-medium text-slate-900">#{order.orderNo}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.finalProductName}</TableCell>
                  <TableCell>{new Date(order.deadlineDate).toLocaleDateString('tr-TR')}</TableCell>
                  <TableCell>
                    <span className="status-chip" data-status="pending">
                      Bekliyor
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {isExpanded ? 'Kapat' : 'Detay'}
                      </Button>
                      <Button type="button" size="sm" onClick={() => setAcceptTarget(order)}>
                        Kabul Et
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

      <Dialog open={Boolean(acceptTarget)} onOpenChange={(open) => (!open ? setAcceptTarget(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi Kabul Et</DialogTitle>
            <DialogDescription>
              {acceptTarget ? `#${acceptTarget.orderNo} numaralı emir çalışıyor durumuna alınacak.` : 'Seçili emir kabul edilecek.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAcceptTarget(null)}>
              Vazgeç
            </Button>
            <Button type="button" onClick={() => void handleAccept()} disabled={busyOrderId === acceptTarget?.id}>
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
