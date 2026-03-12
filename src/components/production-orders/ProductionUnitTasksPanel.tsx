'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { getProductionUnitLabel } from '@/modules/production-orders/constants';
import {
  PRODUCTION_ORDERS_POLL_INTERVAL_MS,
  PRODUCTION_ORDERS_POLL_JITTER_MS
} from '@/shared/config/client-polling';
import type { ProductionOrderListItemDTO, ProductionUnit } from '@/shared/types/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  findDispatchByUnit,
  formatDate,
  materialSummary,
  orderMetaRows,
  statusClass,
  statusLabel
} from './utils';
import {
  DetailFieldGrid,
  DispatchStatusGrid,
  MaterialsList,
  ResponsiveDetailSection
} from './OrderDetailBlocks';
import { ProductionOrderCardHeader } from './ProductionOrderCardHeader';

interface ProductionUnitTasksPanelProps {
  initialItems: ProductionOrderListItemDTO[];
  unitCode: ProductionUnit | null;
}

interface ListResponse {
  items: ProductionOrderListItemDTO[];
}

interface RefreshListOptions {
  showError?: boolean;
}

export function ProductionUnitTasksPanel({ initialItems, unitCode }: ProductionUnitTasksPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [expandedId, setExpandedId] = useState<string | null>(initialItems[0]?.id ?? null);
  const [busyDispatchId, setBusyDispatchId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const filteredItems = useMemo(() => {
    if (!unitCode) {
      return [];
    }

    return items
      .filter((item) => Boolean(findDispatchByUnit(item, unitCode)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, unitCode]);

  async function refreshList(options: RefreshListOptions = {}) {
    const showError = options.showError ?? true;

    try {
      const response = await fetch('/api/production-orders?scope=unit', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store'
      });
      const payload = (await response.json()) as ListResponse;

      if (!response.ok) {
        if (showError) {
          setErrorMessage((payload as { error?: { message?: string } }).error?.message ?? 'Liste güncellenemedi.');
        }
        return;
      }

      setItems(payload.items);
    } catch {
      if (showError) {
        setErrorMessage('Sunucuya erişilemedi.');
      }
    }
  }

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    const pollIntervalMs =
      PRODUCTION_ORDERS_POLL_INTERVAL_MS +
      Math.floor(Math.random() * (PRODUCTION_ORDERS_POLL_JITTER_MS + 1));

    async function syncList() {
      if (disposed || inFlight || busyDispatchId || document.visibilityState === 'hidden') {
        return;
      }

      inFlight = true;
      try {
        await refreshList({ showError: false });
      } finally {
        inFlight = false;
      }
    }

    const intervalId = window.setInterval(() => {
      void syncList();
    }, pollIntervalMs);
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
  }, [busyDispatchId]);

  async function acceptTask(dispatchId: string) {
    setBusyDispatchId(dispatchId);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/production-orders/dispatches/${dispatchId}/accept`, {
        method: 'POST'
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Görev kabul edilemedi.');
        return;
      }

      await refreshList();
      setStatusMessage('Görev kabul edildi. Durum: Çalışıyor.');
    } catch {
      setErrorMessage('Sunucuya erişilemedi.');
    } finally {
      setBusyDispatchId(null);
    }
  }

  async function completeTask(dispatchId: string) {
    setBusyDispatchId(dispatchId);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/production-orders/dispatches/${dispatchId}/complete`, {
        method: 'POST'
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Görev tamamlanamadı.');
        return;
      }

      await refreshList();
      setStatusMessage('Görev bitti olarak işaretlendi.');
    } catch {
      setErrorMessage('Sunucuya erişilemedi.');
    } finally {
      setBusyDispatchId(null);
    }
  }

  if (!unitCode) {
    return (
      <Card className="ops-panel rounded-[18px] border-border/70 bg-card">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Bu hesap bir üretim birimine bağlı değil.
        </CardContent>
      </Card>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <Card className="ops-panel rounded-[18px] border-border/70 bg-card">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {getProductionUnitLabel(unitCode)} için bekleyen görev bulunmuyor.
        </CardContent>
      </Card>
    );
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

      {filteredItems.map((item) => {
        const dispatch = findDispatchByUnit(item, unitCode);
        const isExpanded = expandedId === item.id;

        if (!dispatch) {
          return null;
        }

        return (
          <Card key={item.id} className="ops-panel rounded-[18px] border-border/70 bg-card">
            <CardHeader className="pb-4">
              <ProductionOrderCardHeader
                customerName={item.customerName}
                finalProductName={item.finalProductName}
                orderNo={item.orderNo}
                deadlineLabel={formatDate(item.deadlineDate)}
                statusBadge={
                  <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass(dispatch.status)}`}>
                    {statusLabel(dispatch.status)}
                  </span>
                }
                summaryItems={[materialSummary(item)]}
                actions={
                  <>
                    {dispatch.status === 'pending' && (
                      <Button
                        type="button"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => void acceptTask(dispatch.id)}
                        disabled={busyDispatchId === dispatch.id}
                      >
                        {busyDispatchId === dispatch.id ? 'İşleniyor...' : 'Görevi Kabul Et'}
                      </Button>
                    )}
                    {dispatch.status === 'in_progress' && (
                      <Button
                        type="button"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => void completeTask(dispatch.id)}
                        disabled={busyDispatchId === dispatch.id}
                      >
                        {busyDispatchId === dispatch.id ? 'İşleniyor...' : 'Bitti'}
                      </Button>
                    )}
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
                  </>
                }
              />
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-5">
                <ResponsiveDetailSection
                  title="Genel bilgiler"
                  summary={`Durum: ${statusLabel(dispatch.status)} • Termin ${formatDate(item.deadlineDate)}`}
                  defaultOpen
                >
                  <DetailFieldGrid
                    rows={[
                      ...orderMetaRows(item),
                      { label: 'Görev Durumu', value: statusLabel(dispatch.status) }
                    ]}
                  />
                </ResponsiveDetailSection>

                <ResponsiveDetailSection title="Malzemeler" summary={materialSummary(item)}>
                  <MaterialsList materials={item.materials} mode="unit" />
                </ResponsiveDetailSection>

                <ResponsiveDetailSection title="Görev akışı" summary={statusLabel(dispatch.status)}>
                  <DispatchStatusGrid dispatches={[dispatch]} />
                </ResponsiveDetailSection>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
