'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

import type { ProductionOrderListItemDTO } from '@/shared/types/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  dispatchSummary,
  formatDate,
  materialSummary,
  orderMetaRows,
  statusClass,
  statusLabel
} from './utils';
import {
  PRODUCTION_ORDERS_POLL_INTERVAL_MS,
  PRODUCTION_ORDERS_POLL_JITTER_MS
} from '@/shared/config/client-polling';
import {
  DetailFieldGrid,
  DispatchStatusGrid,
  MaterialsList,
  ResponsiveDetailSection
} from './OrderDetailBlocks';
import { ProductionOrderCardHeader } from './ProductionOrderCardHeader';

interface ProductionOrderCardListProps {
  items: ProductionOrderListItemDTO[];
  emptyMessage: string;
  showMonitorBadges?: boolean;
  pollScope?: 'all' | 'monitor';
  canDelete?: boolean;
}

export function ProductionOrderCardList({
  items,
  emptyMessage,
  showMonitorBadges = false,
  pollScope,
  canDelete = false
}: ProductionOrderCardListProps) {
  const [rows, setRows] = useState(items);
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null);
  const [deleteTarget, setDeleteTarget] = useState<ProductionOrderListItemDTO | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const sortedItems = useMemo(
    () => [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [rows]
  );

  useEffect(() => {
    setRows(items);
  }, [items]);

  useEffect(() => {
    if (!pollScope) {
      return;
    }

    let disposed = false;
    let inFlight = false;
    const pollIntervalMs =
      PRODUCTION_ORDERS_POLL_INTERVAL_MS +
      Math.floor(Math.random() * (PRODUCTION_ORDERS_POLL_JITTER_MS + 1));

    async function syncList() {
      if (disposed || inFlight || busyDeleteId || document.visibilityState === 'hidden') {
        return;
      }

      inFlight = true;

      try {
        const response = await fetch(`/api/production-orders?scope=${pollScope}`, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store'
        });

        const payload = await response.json();

        if (!response.ok || disposed || !Array.isArray(payload.items)) {
          return;
        }

        setRows(payload.items as ProductionOrderListItemDTO[]);
      } catch {
        // Polling hataları kullanıcı akışını kesmemeli.
      } finally {
        inFlight = false;
      }
    }

    const intervalId = window.setInterval(syncList, pollIntervalMs);
    void syncList();

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void syncList();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollScope, busyDeleteId]);

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setBusyDeleteId(deleteTarget.id);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/production-orders/${deleteTarget.id}`, {
        method: 'DELETE'
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Üretim emri silinemedi.');
        return;
      }

      setRows((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setExpandedId((prev) => (prev === deleteTarget.id ? null : prev));
      setStatusMessage(`Üretim emri silindi: ${deleteTarget.orderNo}`);
      setDeleteTarget(null);
    } catch {
      setErrorMessage('Sunucuya erişilemedi. Lütfen tekrar deneyin.');
    } finally {
      setBusyDeleteId(null);
    }
  }

  return (
    <div className="space-y-4">
      {statusMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {statusMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {sortedItems.length === 0 ? (
        <Card className="ops-panel rounded-[18px] border-border/70 bg-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      ) : null}

      {sortedItems.map((item) => {
        const isExpanded = expandedId === item.id;

        return (
          <Card key={item.id} className="ops-panel rounded-[18px] border-border/70 bg-card">
            <CardHeader className="pb-4">
              <ProductionOrderCardHeader
                customerName={item.customerName}
                finalProductName={item.finalProductName}
                orderNo={item.orderNo}
                deadlineLabel={formatDate(item.deadlineDate)}
                summaryItems={[materialSummary(item), dispatchSummary(item)]}
                actions={
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="mr-1 h-4 w-4" />
                          Detayı Gizle
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-1 h-4 w-4" />
                          Detayı Göster
                        </>
                      )}
                    </Button>
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => setDeleteTarget(item)}
                        disabled={busyDeleteId === item.id}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Sil
                      </Button>
                    ) : null}
                  </>
                }
              />
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-5">
                <ResponsiveDetailSection
                  title="Genel bilgiler"
                  summary={`İş Emri ${item.orderNo} • Termin ${formatDate(item.deadlineDate)}`}
                  defaultOpen
                >
                  <DetailFieldGrid rows={orderMetaRows(item)} />
                </ResponsiveDetailSection>

                <ResponsiveDetailSection title="Malzemeler" summary={materialSummary(item)}>
                  <MaterialsList materials={item.materials} mode="readonly" />
                </ResponsiveDetailSection>

                <ResponsiveDetailSection title="Sevk durumu" summary={dispatchSummary(item)}>
                  <DispatchStatusGrid dispatches={item.dispatches} />
                </ResponsiveDetailSection>

                {showMonitorBadges && (
                  <section className="flex flex-wrap gap-2">
                    {item.dispatches.map((dispatch) => (
                      <span
                        key={`${item.id}-${dispatch.id}`}
                        className={`inline-flex rounded-xl px-2 py-1 text-xs font-semibold ${statusClass(dispatch.status)}`}
                      >
                        {dispatch.unitName || dispatch.unitCode}: {statusLabel(dispatch.status)}
                      </span>
                    ))}
                  </section>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : null)}>
        <DialogContent className="sm:max-w-md rounded-[18px] border-border/70 bg-white">
          <DialogHeader>
            <DialogTitle>Üretim Emrini Sil</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `${deleteTarget.orderNo} numaralı üretim emri kalıcı olarak silinecek.`
                : 'Seçili üretim emri silinecek.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(busyDeleteId)}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={Boolean(busyDeleteId)}
            >
              {busyDeleteId ? 'Siliniyor...' : 'Evet, Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
