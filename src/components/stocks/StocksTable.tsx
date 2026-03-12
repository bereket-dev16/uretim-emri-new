'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

import type {
  ProductCategory,
  ProductType,
  Role,
  StockListItem
} from '@/shared/types/domain';

import { StocksMobileCard } from './StocksMobileCard';
import { StocksTableRow } from './StocksTableRow';
import type { StocksPaginationFilters } from './types';
import { useStocksTableState } from './useStocksTableState';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CLIENT_POLL_INTERVAL_MS, CLIENT_POLL_JITTER_MS } from '@/shared/config/client-polling';

interface StocksTableProps {
  items: StockListItem[];
  total: number;
  page: number;
  pageSize: number;
  query?: string;
  role?: Role;
  productType?: ProductType;
  productCategory?: ProductCategory;
  stockEntryDate?: string;
  sort: 'newest' | 'oldest';
  canManage: boolean;
}

interface StocksListResponse {
  items: StockListItem[];
  total: number;
}

function isSameItem(left: StockListItem, right: StockListItem): boolean {
  return (
    left.id === right.id &&
    left.irsaliyeNo === right.irsaliyeNo &&
    left.productName === right.productName &&
    left.quantityNumeric === right.quantityNumeric &&
    left.quantityUnit === right.quantityUnit &&
    left.productType === right.productType &&
    left.productCategory === right.productCategory &&
    left.stockEntryDate === right.stockEntryDate &&
    left.barcodeNo === right.barcodeNo &&
    left.createdByRole === right.createdByRole &&
    left.createdAt === right.createdAt
  );
}

function isSnapshotEqual(
  currentRows: StockListItem[],
  nextRows: StockListItem[],
  currentTotal: number,
  nextTotal: number
): boolean {
  if (currentTotal !== nextTotal || currentRows.length !== nextRows.length) {
    return false;
  }

  for (let index = 0; index < currentRows.length; index += 1) {
    if (!isSameItem(currentRows[index], nextRows[index])) {
      return false;
    }
  }

  return true;
}

function buildPageUrl(page: number, pageSize: number, filters: StocksPaginationFilters) {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('pageSize', String(pageSize));
  searchParams.set('sort', filters.sort);

  if (filters.query) {
    searchParams.set('query', filters.query);
  }

  if (filters.role) {
    searchParams.set('role', filters.role);
  }

  if (filters.productType) {
    searchParams.set('productType', filters.productType);
  }

  if (filters.productCategory) {
    searchParams.set('productCategory', filters.productCategory);
  }

  if (filters.stockEntryDate) {
    searchParams.set('stockEntryDate', filters.stockEntryDate);
  }

  return `/stocks?${searchParams.toString()}`;
}

interface PaginationFooterProps {
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  filters: StocksPaginationFilters;
}

function PaginationFooter({
  totalCount,
  page,
  totalPages,
  pageSize,
  filters
}: PaginationFooterProps) {
  return (
    <footer className="mt-4 flex flex-col items-center justify-between gap-4 rounded-xl border border-border/70 bg-slate-50 px-4 py-4 sm:flex-row">
      <span className="text-sm text-muted-foreground">
        Toplam <strong className="text-foreground">{totalCount}</strong> kayıt | Sayfa <strong className="text-foreground">{page} / {totalPages}</strong>
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          <Link
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            href={buildPageUrl(Math.max(1, page - 1), pageSize, filters)}
          >
            Önceki
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
          <Link
            aria-disabled={page >= totalPages}
            className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
            href={buildPageUrl(Math.min(totalPages, page + 1), pageSize, filters)}
          >
            Sonraki
          </Link>
        </Button>
      </div>
    </footer>
  );
}

interface DeleteModalProps {
  open: boolean;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteModal({ open, isBusy, onCancel, onConfirm }: DeleteModalProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="rounded-[18px] border-border/70 bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Stok Kaydını Sil
          </DialogTitle>
          <DialogDescription>
            Bu kayıt veritabanından kalıcı olarak silinecek. Devam etmek istiyor musunuz?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onCancel} disabled={isBusy}>
            Vazgeç
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isBusy}>
            {isBusy ? 'Siliniyor...' : 'Evet, Sil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StocksTable({
  items,
  total,
  page,
  pageSize,
  query,
  role,
  productType,
  productCategory,
  stockEntryDate,
  sort,
  canManage
}: StocksTableProps) {
  const router = useRouter();
  const {
    state,
    totalPages,
    syncFromServer,
    startEditing,
    cancelEditing,
    patchDraft,
    openDeleteModal,
    closeDeleteModal,
    setBusyId,
    setErrorMessage,
    setStatusMessage,
    replaceRow,
    removeRow
  } = useStocksTableState({ items, total, pageSize });

  const paginationFilters: StocksPaginationFilters = {
    query,
    role,
    productType,
    productCategory,
    stockEntryDate,
    sort
  };

  const rowsRef = useRef(state.rows);
  const totalCountRef = useRef(state.totalCount);
  const pollIntervalMs = useMemo(
    () => CLIENT_POLL_INTERVAL_MS + Math.floor(Math.random() * (CLIENT_POLL_JITTER_MS + 1)),
    []
  );
  const shouldPauseAutoSync = Boolean(state.editingId || state.deleteCandidateId || state.busyId);

  const syncQueryString = useMemo(() => {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(page));
    searchParams.set('pageSize', String(pageSize));
    searchParams.set('sort', sort);

    if (query) {
      searchParams.set('query', query);
    }

    if (role) {
      searchParams.set('role', role);
    }

    if (productType) {
      searchParams.set('productType', productType);
    }

    if (productCategory) {
      searchParams.set('productCategory', productCategory);
    }

    if (stockEntryDate) {
      searchParams.set('stockEntryDate', stockEntryDate);
    }

    return searchParams.toString();
  }, [page, pageSize, query, role, productType, productCategory, stockEntryDate, sort]);

  useEffect(() => {
    rowsRef.current = state.rows;
    totalCountRef.current = state.totalCount;
  }, [state.rows, state.totalCount]);

  useEffect(() => {
    if (shouldPauseAutoSync) {
      return;
    }

    let isDisposed = false;
    let inFlight = false;

    async function syncFromApi(): Promise<void> {
      if (isDisposed || inFlight || document.visibilityState === 'hidden') {
        return;
      }

      inFlight = true;

      try {
        const response = await fetch(`/api/stocks?${syncQueryString}`, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store'
        });

        if (!response.ok || isDisposed) {
          return;
        }

        const payload = (await response.json()) as StocksListResponse;

        if (
          !isSnapshotEqual(
            rowsRef.current,
            payload.items,
            totalCountRef.current,
            payload.total
          )
        ) {
          syncFromServer(payload.items, payload.total);
        }
      } catch {
        // Polling hataları UI akışını kesmemeli.
      } finally {
        inFlight = false;
      }
    }

    const intervalId = window.setInterval(syncFromApi, pollIntervalMs);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void syncFromApi();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    void syncFromApi();

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollIntervalMs, shouldPauseAutoSync, syncFromServer, syncQueryString]);

  async function saveEditing(id: string) {
    if (!state.draft) {
      return;
    }

    const quantityValue = Number(state.draft.quantityNumeric);

    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setErrorMessage('Ürün miktarı 0 dan büyük olmalıdır.');
      return;
    }

    if (!state.draft.stockEntryDate) {
      setErrorMessage('Stok giriş tarihi zorunludur.');
      return;
    }

    setBusyId(id);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/stocks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          irsaliyeNo: state.draft.irsaliyeNo,
          productName: state.draft.productName,
          quantityNumeric: quantityValue,
          quantityUnit: state.draft.quantityUnit,
          productType: state.draft.productType,
          productCategory: state.draft.productCategory,
          stockEntryDate: state.draft.stockEntryDate
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Stok kaydı güncellenemedi.');
        return;
      }

      replaceRow(payload.item as StockListItem);
      setStatusMessage('Stok kaydı güncellendi.');
      cancelEditing();
      router.refresh();
    } catch {
      setErrorMessage('Sunucuya erişilemedi.');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDeleteRow() {
    if (!state.deleteCandidateId) {
      return;
    }

    const targetId = state.deleteCandidateId;

    setBusyId(targetId);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/stocks/${targetId}`, {
        method: 'DELETE'
      });

      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? 'Stok kaydı silinemedi.');
        return;
      }

      removeRow(targetId);
      setStatusMessage('Stok kaydı silindi.');
      router.refresh();
    } catch {
      setErrorMessage('Sunucuya erişilemedi.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex w-full flex-col md:gap-4">
      {state.statusMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {state.statusMessage}
        </div>
      )}
      {state.errorMessage && (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          {state.errorMessage}
        </div>
      )}

      <div className="space-y-3 lg:hidden">
        {state.rows.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-white px-4 py-10 text-center text-sm text-muted-foreground">
            Kayıt bulunamadı.
          </div>
        ) : (
          state.rows.map((item) => (
            <StocksMobileCard
              key={item.id}
              item={item}
              isEditing={state.editingId === item.id}
              isBusy={state.busyId === item.id}
              canManage={canManage}
              draft={state.draft}
              onDraftChange={patchDraft}
              onStartEdit={() => startEditing(item)}
              onCancelEdit={cancelEditing}
              onSaveEdit={() => saveEditing(item.id)}
              onOpenDeleteModal={() => openDeleteModal(item.id)}
            />
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-white lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="whitespace-nowrap font-semibold">İrsaliye No</TableHead>
              <TableHead className="whitespace-nowrap font-semibold">Ürün</TableHead>
              <TableHead className="whitespace-nowrap font-semibold">Miktar</TableHead>
              <TableHead className="whitespace-nowrap font-semibold">Tip</TableHead>
              <TableHead className="whitespace-nowrap font-semibold">Kategori</TableHead>
              <TableHead className="whitespace-nowrap font-semibold">Tarih</TableHead>
              <TableHead className="whitespace-nowrap font-semibold">Barkod</TableHead>
              <TableHead className="whitespace-nowrap font-semibold">Ekleyen</TableHead>
              <TableHead className="whitespace-nowrap text-right font-semibold">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              state.rows.map((item) => (
                <StocksTableRow
                  key={item.id}
                  item={item}
                  isEditing={state.editingId === item.id}
                  isBusy={state.busyId === item.id}
                  canManage={canManage}
                  draft={state.draft}
                  onDraftChange={patchDraft}
                  onStartEdit={() => startEditing(item)}
                  onCancelEdit={cancelEditing}
                  onSaveEdit={() => saveEditing(item.id)}
                  onOpenDeleteModal={() => openDeleteModal(item.id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationFooter
        totalCount={state.totalCount}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        filters={paginationFilters}
      />

      <DeleteModal
        open={Boolean(state.deleteCandidateId)}
        isBusy={Boolean(state.deleteCandidateId && state.busyId === state.deleteCandidateId)}
        onCancel={() => {
          if (state.deleteCandidateId && state.busyId === state.deleteCandidateId) {
            return;
          }
          closeDeleteModal();
        }}
        onConfirm={confirmDeleteRow}
      />
    </div>
  );
}
