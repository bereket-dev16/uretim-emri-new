'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { getProductionUnitLabel, PRODUCTION_UNIT_VALUES } from '@/modules/production-orders/constants';
import {
  PRODUCTION_ORDERS_POLL_INTERVAL_MS,
  PRODUCTION_ORDERS_POLL_JITTER_MS
} from '@/shared/config/client-polling';
import type { ProductionOrderListItemDTO, ProductionUnit } from '@/shared/types/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  dispatchSummary,
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

interface WarehouseIncomingPanelProps {
  initialItems: ProductionOrderListItemDTO[];
}

interface ListResponse {
  items: ProductionOrderListItemDTO[];
}

interface RefreshListOptions {
  silent?: boolean;
  showError?: boolean;
}

const TARGET_UNITS = PRODUCTION_UNIT_VALUES.filter((unit) => unit !== 'DEPO');

export function WarehouseIncomingPanel({ initialItems }: WarehouseIncomingPanelProps) {
  const [items, setItems] = useState(initialItems);
  const [expandedId, setExpandedId] = useState<string | null>(initialItems[0]?.id ?? null);
  const [selectedUnits, setSelectedUnits] = useState<Record<string, ProductionUnit[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items]
  );

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  async function refreshList(options: RefreshListOptions = {}) {
    const silent = options.silent ?? false;
    const showError = options.showError ?? true;

    if (!silent) {
      setIsLoading(true);
    }

    try {
      const response = await fetch('/api/production-orders?scope=warehouse', {
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
    } finally {
      if (!silent) {
        setIsLoading(false);
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
      if (disposed || inFlight || busyKey || document.visibilityState === 'hidden') {
        return;
      }

      inFlight = true;
      try {
        await refreshList({ silent: true, showError: false });
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
  }, [busyKey]);

  async function toggleMaterial(orderId: string, materialId: string, nextValue: boolean) {
    setBusyKey(materialId);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(
        `/api/production-orders/${orderId}/materials/${materialId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isAvailable: nextValue })
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Malzeme durumu güncellenemedi.');
        return;
      }

      await refreshList();
      setStatusMessage('Malzeme kontrol durumu güncellendi.');
    } catch {
      setErrorMessage('Sunucuya erişilemedi.');
    } finally {
      setBusyKey(null);
    }
  }

  function toggleTargetUnit(orderId: string, unit: ProductionUnit, checked: boolean) {
    setSelectedUnits((prev) => {
      const current = prev[orderId] ?? [];

      if (checked) {
        if (current.includes(unit)) {
          return prev;
        }

        return { ...prev, [orderId]: [...current, unit] };
      }

      return { ...prev, [orderId]: current.filter((value) => value !== unit) };
    });
  }

  async function dispatchOrder(orderId: string) {
    const unitCodes = selectedUnits[orderId] ?? [];

    if (unitCodes.length === 0) {
      setErrorMessage('Sevk için en az bir birim seçmelisiniz.');
      return;
    }

    setBusyKey(orderId);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/production-orders/${orderId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitCodes })
      });

      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Sevk işlemi yapılamadı.');
        return;
      }

      setSelectedUnits((prev) => ({ ...prev, [orderId]: [] }));
      await refreshList();
      setStatusMessage('Üretim emri seçili birimlere sevk edildi.');
    } catch {
      setErrorMessage('Sunucuya erişilemedi.');
    } finally {
      setBusyKey(null);
    }
  }

  if (sortedItems.length === 0) {
    return (
      <Card className="ops-panel rounded-[18px] border-border/70 bg-card">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Bekleyen depo üretim emri bulunmuyor.
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

      {sortedItems.map((item) => {
        const isExpanded = expandedId === item.id;
        const orderSelectedUnits = selectedUnits[item.id] ?? [];

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

                <ResponsiveDetailSection title="Malzeme kontrolü" summary={materialSummary(item)}>
                  <MaterialsList
                    materials={item.materials}
                    mode="warehouse"
                    busyMaterialId={busyKey}
                    onToggleMaterial={(materialId, nextValue) => {
                      void toggleMaterial(item.id, materialId, nextValue);
                    }}
                  />
                </ResponsiveDetailSection>

                <ResponsiveDetailSection
                  title="Sevk edilecek birimler"
                  summary={
                    orderSelectedUnits.length > 0
                      ? `${orderSelectedUnits.length} birim seçildi`
                      : 'Birim seçin'
                  }
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {TARGET_UNITS.map((unit) => (
                      <label
                        key={`${item.id}-${unit}`}
                        className="flex items-center gap-2 rounded-xl border border-border/70 bg-white p-3 text-sm"
                      >
                        <Checkbox
                          checked={orderSelectedUnits.includes(unit)}
                          onCheckedChange={(checked) =>
                            toggleTargetUnit(item.id, unit, Boolean(checked))
                          }
                          aria-label={`${item.orderNo} için ${getProductionUnitLabel(unit)} sevk birimi`}
                        />
                        <span>{getProductionUnitLabel(unit)}</span>
                      </label>
                    ))}
                  </div>
                  <Button
                    type="button"
                    disabled={busyKey === item.id || isLoading}
                    onClick={() => void dispatchOrder(item.id)}
                  >
                    {busyKey === item.id ? 'Sevk Ediliyor...' : 'Sevk Et'}
                  </Button>
                </ResponsiveDetailSection>

                <ResponsiveDetailSection title="Sevk durumu" summary={dispatchSummary(item)}>
                  <DispatchStatusGrid
                    dispatches={item.dispatches}
                    emptyMessage="Henüz sevk yapılmadı."
                  />
                </ResponsiveDetailSection>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
