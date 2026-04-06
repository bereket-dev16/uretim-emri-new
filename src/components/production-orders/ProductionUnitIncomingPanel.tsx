'use client';

import { useEffect, useMemo, useState } from 'react';
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
  DispatchGroupOverview,
  DispatchHistoryTable,
  OrderMetaGrid,
  OrderNotePanel,
  OrderSummaryLine
} from './order-view';
import { AttachmentList } from './AttachmentList';

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
      <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
        Bekleyen emir bulunmuyor.
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

      {rows.map((order) => {
        const isExpanded = expandedId === order.id;

        return (
          <div key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <OrderSummaryLine order={order} />
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="text-sm text-slate-600">Bu emir biriminize gönderildi ve kabul bekliyor.</div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {isExpanded ? 'Detayı Gizle' : 'Detaylı Göster'}
                </Button>
                <Button type="button" size="sm" onClick={() => setAcceptTarget(order)}>
                  Kabul Et
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
                  <h3 className="text-base font-semibold text-slate-950">Sevk Geçmişi</h3>
                  <DispatchHistoryTable order={order} />
                </section>
                {canViewAttachments ? (
                  <section className="space-y-3">
                    <h3 className="text-base font-semibold text-slate-950">Ek Dosyalar</h3>
                    <AttachmentList order={order} canDownload={canDownloadAttachments} />
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

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
